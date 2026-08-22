/* ==========================================================================
   Fieldnote Travel — shared behaviour
   Vanilla JS, no dependencies, no build step.
   Every module guards for the absence of its own markup so a single file can
   be shared across every page.
   ========================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     1. Image fallback
     If a remote photograph fails to load we swap in an equivalent hosted
     photo rather than leaving a broken image on the page.
     ---------------------------------------------------------------------- */
  function slugify(text) {
    return String(text || 'travel')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'travel';
  }

  document.addEventListener(
    'error',
    function (event) {
      var el = event.target;
      if (!el || el.tagName !== 'IMG' || el.dataset.fallbackApplied) return;
      el.dataset.fallbackApplied = 'true';
      var w = el.getAttribute('width') || 1200;
      var h = el.getAttribute('height') || 800;
      el.src = 'https://picsum.photos/seed/' + slugify(el.alt) + '/' + w + '/' + h;
    },
    true
  );

  /* ----------------------------------------------------------------------
     2. Sticky header shadow
     ---------------------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ----------------------------------------------------------------------
     3. Mobile drawer menu
     ---------------------------------------------------------------------- */
  var navToggle = document.querySelector('[data-nav-toggle]');
  var drawer = document.getElementById('navDrawer');

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
    }
  }

  if (navToggle && drawer) {
    navToggle.addEventListener('click', function () {
      var open = drawer.classList.toggle('is-open');
      document.body.classList.toggle('nav-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        var firstLink = drawer.querySelector('a, button');
        if (firstLink) firstLink.focus();
      }
    });

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-drawer-close]') || e.target.closest('a')) closeDrawer();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });

    // Keep focus inside the drawer while it is open.
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusables = drawer.querySelectorAll('a[href], button:not([disabled])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ----------------------------------------------------------------------
     4. Section reveal on scroll (enhances an already-visible default)
     ---------------------------------------------------------------------- */
  var revealables = document.querySelectorAll('.reveal');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealables.forEach(function (el) { el.classList.add('is-revealed'); });
    } else {
      var revealObserver = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              obs.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
      );
      revealables.forEach(function (el) { revealObserver.observe(el); });
      // Safety net: never leave content hidden.
      window.setTimeout(function () {
        revealables.forEach(function (el) { el.classList.add('is-revealed'); });
      }, 3000);
    }
  }

  /* ----------------------------------------------------------------------
     5. Accordions (FAQ, guides, checklists)
     ---------------------------------------------------------------------- */
  document.querySelectorAll('.accordion-trigger').forEach(function (trigger) {
    var panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;

    if (trigger.getAttribute('aria-expanded') === 'true') {
      panel.style.height = 'auto';
    }

    trigger.addEventListener('click', function () {
      var expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));

      if (reduceMotion) {
        panel.style.height = expanded ? '0px' : 'auto';
        return;
      }

      if (expanded) {
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(function () { panel.style.height = '0px'; });
      } else {
        panel.style.height = panel.scrollHeight + 'px';
        panel.addEventListener('transitionend', function handler() {
          panel.style.height = 'auto';
          panel.removeEventListener('transitionend', handler);
        });
      }
    });
  });

  /* ----------------------------------------------------------------------
     6. Card filters (destinations, itineraries, guides)
     ---------------------------------------------------------------------- */
  var filterRoot = document.querySelector('[data-filter-root]');
  if (filterRoot) {
    var chips = filterRoot.querySelectorAll('.filter-chip');
    var items = filterRoot.querySelectorAll('[data-tags]');
    var statusEl = filterRoot.querySelector('[data-filter-status]');
    var searchInput = filterRoot.querySelector('[data-filter-search]');
    var active = { region: 'all', budget: 'all', length: 'all', topic: 'all' };

    function applyFilters() {
      var term = searchInput ? searchInput.value.trim().toLowerCase() : '';
      var shown = 0;

      items.forEach(function (item) {
        var tags = (item.dataset.tags || '').toLowerCase();
        var name = (item.dataset.name || item.textContent || '').toLowerCase();
        var match = true;

        Object.keys(active).forEach(function (group) {
          if (active[group] !== 'all' && tags.indexOf(active[group]) === -1) match = false;
        });
        if (term && name.indexOf(term) === -1 && tags.indexOf(term) === -1) match = false;

        item.classList.toggle('is-hidden', !match);
        if (match) shown++;
      });

      if (statusEl) {
        statusEl.textContent =
          shown === items.length
            ? 'Showing all ' + items.length + ' entries.'
            : 'Showing ' + shown + ' of ' + items.length + ' entries.';
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var group = chip.dataset.group;
        filterRoot
          .querySelectorAll('.filter-chip[data-group="' + group + '"]')
          .forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        active[group] = chip.dataset.value;
        applyFilters();
      });
    });

    if (searchInput) searchInput.addEventListener('input', applyFilters);

    var resetBtn = filterRoot.querySelector('[data-filter-reset]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        Object.keys(active).forEach(function (k) { active[k] = 'all'; });
        chips.forEach(function (c) {
          c.setAttribute('aria-pressed', String(c.dataset.value === 'all'));
        });
        if (searchInput) searchInput.value = '';
        applyFilters();
      });
    }

    applyFilters();
  }

  /* ----------------------------------------------------------------------
     7. Sticky day-tab navigation (itinerary pages)
     ---------------------------------------------------------------------- */
  var dayTabs = document.querySelector('[data-day-tabs]');
  if (dayTabs) {
    var tabLinks = Array.prototype.slice.call(dayTabs.querySelectorAll('a[href^="#"]'));
    var targets = tabLinks
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    if (targets.length && 'IntersectionObserver' in window) {
      var tabObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            tabLinks.forEach(function (a) {
              a.classList.toggle(
                'is-active',
                a.getAttribute('href') === '#' + entry.target.id
              );
            });
          });
        },
        { rootMargin: '-120px 0px -65% 0px' }
      );
      targets.forEach(function (t) { tabObserver.observe(t); });
    }
  }

  /* ----------------------------------------------------------------------
     8. Trip planner — add/remove days and stops, live cost summary
     ---------------------------------------------------------------------- */
  var planner = document.getElementById('tripPlanner');
  if (planner) {
    var daysWrap = planner.querySelector('[data-planner-days]');
    var addDayBtn = planner.querySelector('[data-add-day]');
    var dayCount = 0;

    var summaryDays = document.querySelector('[data-summary-days]');
    var summaryStops = document.querySelector('[data-summary-stops]');
    var summaryTotal = document.querySelector('[data-summary-total]');
    var summaryPerDay = document.querySelector('[data-summary-perday]');
    var summaryTravellers = document.getElementById('plannerTravellers');
    var summaryPerPerson = document.querySelector('[data-summary-perperson]');

    function money(n) {
      return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function recalc() {
      var days = daysWrap.querySelectorAll('.planner-day');
      var stops = daysWrap.querySelectorAll('.planner-stops li[data-cost]');
      var total = 0;
      stops.forEach(function (li) { total += parseFloat(li.dataset.cost) || 0; });

      days.forEach(function (day, i) {
        var heading = day.querySelector('[data-day-label]');
        if (heading) heading.textContent = 'Day ' + (i + 1);
        var dayTotal = 0;
        day.querySelectorAll('.planner-stops li[data-cost]').forEach(function (li) {
          dayTotal += parseFloat(li.dataset.cost) || 0;
        });
        var badge = day.querySelector('[data-day-total]');
        if (badge) badge.textContent = money(dayTotal);
      });

      var travellers = summaryTravellers ? (parseInt(summaryTravellers.value, 10) || 1) : 1;
      if (summaryDays) summaryDays.textContent = String(days.length);
      if (summaryStops) summaryStops.textContent = String(stops.length);
      if (summaryTotal) summaryTotal.textContent = money(total);
      if (summaryPerDay) summaryPerDay.textContent = days.length ? money(Math.round(total / days.length)) : '$0';
      if (summaryPerPerson) summaryPerPerson.textContent = money(Math.round(total * travellers));
    }

    function buildDay() {
      dayCount++;
      var idx = dayCount;
      var day = document.createElement('article');
      day.className = 'planner-day';
      day.innerHTML =
        '<div class="planner-day-head">' +
          '<h3 data-day-label>Day ' + idx + '</h3>' +
          '<div style="display:flex;gap:12px;align-items:center;">' +
            '<span class="price num" data-day-total>$0</span>' +
            '<button type="button" class="btn-remove" data-remove-day aria-label="Remove day ' + idx + '">&times;</button>' +
          '</div>' +
        '</div>' +
        '<ul class="planner-stops" data-stops>' +
          '<li class="planner-empty-row"><span class="planner-empty">No stops added yet. Add your first stop below.</span></li>' +
        '</ul>' +
        '<div class="planner-add">' +
          '<div class="field"><label for="t' + idx + '">Time</label>' +
            '<input type="time" id="t' + idx + '" data-stop-time value="09:00"></div>' +
          '<div class="field"><label for="s' + idx + '">Stop or activity</label>' +
            '<input type="text" id="s' + idx + '" data-stop-name placeholder="Ferry to Bruny Island"></div>' +
          '<div class="field"><label for="c' + idx + '">Cost (AUD)</label>' +
            '<input type="number" id="c' + idx + '" data-stop-cost min="0" step="1" value="0"></div>' +
          '<button type="button" class="btn btn-secondary" data-add-stop>Add stop</button>' +
        '</div>';
      daysWrap.appendChild(day);
      recalc();
    }

    if (addDayBtn) {
      addDayBtn.addEventListener('click', function () {
        buildDay();
        var last = daysWrap.querySelector('.planner-day:last-child [data-stop-name]');
        if (last) last.focus();
      });
    }

    planner.addEventListener('click', function (e) {
      var addStop = e.target.closest('[data-add-stop]');
      if (addStop) {
        var day = addStop.closest('.planner-day');
        var timeEl = day.querySelector('[data-stop-time]');
        var nameEl = day.querySelector('[data-stop-name]');
        var costEl = day.querySelector('[data-stop-cost]');
        var name = nameEl.value.trim();

        if (!name) {
          nameEl.setAttribute('aria-invalid', 'true');
          nameEl.focus();
          return;
        }
        nameEl.removeAttribute('aria-invalid');

        var cost = Math.max(0, parseFloat(costEl.value) || 0);
        var list = day.querySelector('[data-stops]');
        var placeholder = list.querySelector('.planner-empty-row');
        if (placeholder) placeholder.remove();

        var li = document.createElement('li');
        li.dataset.cost = String(cost);
        li.innerHTML =
          '<div><span class="planner-stop-time">' + (timeEl.value || '--:--') + '</span>' +
          '<span>' + name.replace(/</g, '&lt;') + '</span></div>' +
          '<div style="display:flex;gap:10px;align-items:center;">' +
          '<span class="planner-stop-cost">$' + cost + '</span>' +
          '<button type="button" class="btn-remove" data-remove-stop aria-label="Remove stop ' +
          name.replace(/"/g, '') + '">&times;</button></div>';
        list.appendChild(li);

        nameEl.value = '';
        costEl.value = '0';
        nameEl.focus();
        recalc();
        return;
      }

      var removeStop = e.target.closest('[data-remove-stop]');
      if (removeStop) {
        var host = removeStop.closest('[data-stops]');
        removeStop.closest('li').remove();
        if (!host.children.length) {
          var empty = document.createElement('li');
          empty.className = 'planner-empty-row';
          empty.innerHTML = '<span class="planner-empty">No stops added yet. Add your first stop below.</span>';
          host.appendChild(empty);
        }
        recalc();
        return;
      }

      var removeDay = e.target.closest('[data-remove-day]');
      if (removeDay) {
        removeDay.closest('.planner-day').remove();
        recalc();
      }
    });

    if (summaryTravellers) summaryTravellers.addEventListener('input', recalc);

    // Seed the planner with two days so it is usable immediately.
    buildDay();
    buildDay();
  }

  /* ----------------------------------------------------------------------
     9. Form validation with inline errors and a real success state
     ---------------------------------------------------------------------- */
  document.querySelectorAll('[data-validate]').forEach(function (form) {
    var successBox = document.querySelector(form.dataset.success || '');

    function setError(field, message) {
      var wrap = field.closest('.field') || field.parentElement;
      var errorEl = wrap ? wrap.querySelector('.field-error') : null;
      if (message) {
        field.setAttribute('aria-invalid', 'true');
        if (errorEl) errorEl.textContent = message;
      } else {
        field.removeAttribute('aria-invalid');
        if (errorEl) errorEl.textContent = '';
      }
    }

    function validateField(field) {
      var value = (field.value || '').trim();
      var label = field.dataset.label || 'This field';

      if (field.hasAttribute('required')) {
        if (field.type === 'checkbox' && !field.checked) {
          setError(field, 'Please tick this box to continue.');
          return false;
        }
        if (field.type !== 'checkbox' && !value) {
          setError(field, label + ' is required.');
          return false;
        }
      }
      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        setError(field, 'Enter an email address in the format name@example.com.');
        return false;
      }
      if (field.type === 'tel' && value && !/^[+0-9\s()\-]{8,20}$/.test(value)) {
        setError(field, 'Enter a phone number, for example +61 2 8000 0000.');
        return false;
      }
      if (field.tagName === 'TEXTAREA' && field.hasAttribute('required') && value.length < 20) {
        setError(field, 'Please give us at least 20 characters so we can help properly.');
        return false;
      }
      setError(field, '');
      return true;
    }

    form.querySelectorAll('input, textarea, select').forEach(function (field) {
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll('input, textarea, select');
      var firstInvalid = null;

      fields.forEach(function (field) {
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      if (successBox) {
        successBox.hidden = false;
        successBox.setAttribute('tabindex', '-1');
        successBox.focus();
        successBox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }
      form.reset();
    });
  });

  /* ----------------------------------------------------------------------
     10. Pricing monthly / annual toggle
     ---------------------------------------------------------------------- */
  var priceToggle = document.querySelector('[data-price-toggle]');
  if (priceToggle) {
    priceToggle.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-cycle]');
      if (!btn) return;
      priceToggle.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      var cycle = btn.dataset.cycle;
      document.querySelectorAll('[data-price-monthly]').forEach(function (el) {
        el.textContent = cycle === 'annual' ? el.dataset.priceAnnual : el.dataset.priceMonthly;
      });
      document.querySelectorAll('[data-billing-note]').forEach(function (el) {
        el.textContent = cycle === 'annual' ? el.dataset.noteAnnual : el.dataset.noteMonthly;
      });
    });
  }

  /* ----------------------------------------------------------------------
     11. Checklist progress (packing page)
     ---------------------------------------------------------------------- */
  var checklistRoot = document.querySelector('[data-checklist-root]');
  if (checklistRoot) {
    var counter = checklistRoot.querySelector('[data-checklist-count]');
    var boxes = checklistRoot.querySelectorAll('.checklist input[type="checkbox"]');

    function updateCount() {
      var done = 0;
      boxes.forEach(function (b) { if (b.checked) done++; });
      if (counter) counter.textContent = done + ' of ' + boxes.length + ' items packed';
    }
    boxes.forEach(function (b) { b.addEventListener('change', updateCount); });

    var clearBtn = checklistRoot.querySelector('[data-checklist-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        boxes.forEach(function (b) { b.checked = false; });
        updateCount();
      });
    }
    updateCount();
  }

  /* ----------------------------------------------------------------------
     12. Back to top
     ---------------------------------------------------------------------- */
  var toTop = document.getElementById('backToTop');
  if (toTop) {
    var topSentinel = document.createElement('div');
    topSentinel.setAttribute('aria-hidden', 'true');
    topSentinel.style.cssText = 'position:absolute;top:700px;height:1px;width:1px;';
    document.body.appendChild(topSentinel);
    new IntersectionObserver(function (entries) {
      toTop.classList.toggle('is-visible', !entries[0].isIntersecting);
    }).observe(topSentinel);

    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      var skip = document.querySelector('.skip-link');
      if (skip) skip.focus();
    });
  }

  /* ----------------------------------------------------------------------
     13. Cookie consent
     No non-essential cookie or analytics script is loaded before consent.
     Consent is stored in localStorage, which is strictly functional.
     ---------------------------------------------------------------------- */
  var banner = document.getElementById('cookieBanner');
  if (banner) {
    var STORE_KEY = 'fieldnote-cookie-consent-v1';
    var stored = null;
    try { stored = window.localStorage.getItem(STORE_KEY); } catch (err) { stored = null; }

    if (!stored) {
      banner.hidden = false;
    }

    function save(consent) {
      try { window.localStorage.setItem(STORE_KEY, JSON.stringify(consent)); } catch (err) { /* storage blocked */ }
      banner.hidden = true;
      // Non-essential scripts would be initialised here, only for granted categories.
      window.fieldnoteConsent = consent;
    }

    banner.addEventListener('click', function (e) {
      if (e.target.closest('[data-cookie-accept]')) {
        save({ essential: true, analytics: true, advertising: true });
      } else if (e.target.closest('[data-cookie-reject]')) {
        save({ essential: true, analytics: false, advertising: false });
      } else if (e.target.closest('[data-cookie-manage]')) {
        var prefs = banner.querySelector('[data-cookie-prefs]');
        var trigger = e.target.closest('[data-cookie-manage]');
        var open = prefs.hidden;
        prefs.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
      } else if (e.target.closest('[data-cookie-save]')) {
        save({
          essential: true,
          analytics: banner.querySelector('#cookieAnalytics').checked,
          advertising: banner.querySelector('#cookieAdvertising').checked
        });
      }
    });
  }

  /* ----------------------------------------------------------------------
     14. Print itinerary
     ---------------------------------------------------------------------- */
  document.querySelectorAll('[data-print]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });

  /* ----------------------------------------------------------------------
     15. Current year in footers
     ---------------------------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
