 /* Dental Clinic · main.js
   No dependencies. Items marked [ ] must be confirmed by the clinic.
   Clinic time zone: Africa/Luanda (UTC+1). */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  /* ---------- Utilities ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const TZ = 'Africa/Luanda';
  const SLIDE_MS = 7500;

  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (_) { /* storage unavailable */ }
    }
  };

  /* Current date and time in the clinic's time zone */
  function nowInClinic() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  }

  function todayISO(d = nowInClinic()) {
    return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
  }

  function toast(message) {
    const t = $('[data-toast]');
    t.textContent = message;
    t.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('is-visible'), 2800);
  }

  /* Opening hours [to confirm]. Index = day of the week (0 Sunday). null = closed. */
  const HOURS = {
    0: null,
    1: [9, 19],
    2: [9, 19],
    3: [9, 19],
    4: [9, 19],
    5: [9, 19],
    6: [9, 13]
  };

  /* ---------- Header, menu, progress ---------- */
  const header = $('#siteHeader');
  const toggleBtn = $('.menu-toggle');
  const nav = $('#primary-nav');
  const progress = $('[data-progress]');
  const mobileCta = $('.mobile-cta');
  let menuOpen = false;
  let lastY = window.scrollY;
  let ticking = false;

  function setMenu(open) {
    menuOpen = open;
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    if (open) header.classList.remove('is-hidden');
    toggleBtn.setAttribute('aria-expanded', String(open));
    toggleBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);
  }

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle('is-scrolled', y > 40);
    if (!menuOpen) {
      if (y > 480 && y > lastY + 6) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 480) header.classList.remove('is-hidden');
    }
    if (Math.abs(y - lastY) > 6) lastY = y;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    mobileCta.classList.toggle('is-visible', y > window.innerHeight * 0.7);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  toggleBtn.addEventListener('click', () => setMenu(!menuOpen));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  /* ---------- Hero (slider) ---------- */
  function initHero() {
    const hero = $('.hero');
    const slides = $$('.hero-slide', hero);
    const dotsWrap = $('[data-dots]');
    const dots = slides.map((s, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'hero-dot';
      d.setAttribute('aria-label', `View slide ${i + 1}`);
      dotsWrap.append(d);
      return d;
    });

    let current = 0;
    let timer = null;
    let elapsed = 0;
    let startedAt = 0;
    const holds = new Set();
    const autoplay = !reduceMotion;

    function run(ms) {
      clearTimeout(timer);
      startedAt = performance.now();
      timer = setTimeout(() => goTo(current + 1), ms);
    }

    function pause(reason) {
      if (!autoplay || holds.has(reason)) return;
      if (holds.size === 0) {
        clearTimeout(timer);
        elapsed = Math.min(SLIDE_MS, elapsed + performance.now() - startedAt);
      }
      holds.add(reason);
      hero.classList.add('is-paused');
    }

    function resume(reason) {
      if (!holds.delete(reason) || holds.size) return;
      hero.classList.remove('is-paused');
      run(Math.max(300, SLIDE_MS - elapsed));
    }

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      elapsed = 0;
      slides.forEach((s, k) => {
        const on = k === current;
        s.classList.toggle('is-active', on);
        s.inert = !on;
        s.setAttribute('aria-hidden', String(!on));
      });
      dots.forEach((d, k) => {
        d.classList.toggle('is-active', k === current);
        if (k === current) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
      $('[data-current]', hero).textContent = pad(current + 1);
      if (autoplay && holds.size === 0) run(SLIDE_MS);
    }

    $('[data-prev]').addEventListener('click', () => goTo(current - 1));
    $('[data-next]').addEventListener('click', () => goTo(current + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => goTo(k)));

    hero.addEventListener('keydown', (e) => {
      if (e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight') goTo(current + 1);
      if (e.key === 'ArrowLeft') goTo(current - 1);
    });

    let swipeX = null;
    const slidesEl = $('[data-slides]');
    slidesEl.addEventListener('pointerdown', (e) => { swipeX = e.clientX; });
    slidesEl.addEventListener('pointerup', (e) => {
      if (swipeX === null) return;
      const dx = e.clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 50) goTo(dx < 0 ? current + 1 : current - 1);
    });
    slidesEl.addEventListener('pointercancel', () => { swipeX = null; });

    hero.addEventListener('mouseenter', () => pause('hover'));
    hero.addEventListener('mouseleave', () => resume('hover'));
    hero.addEventListener('focusin', () => pause('focus'));
    hero.addEventListener('focusout', (e) => { if (!hero.contains(e.relatedTarget)) resume('focus'); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause('hidden');
      else resume('hidden');
    });

    goTo(0);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) resume('offscreen');
        else pause('offscreen');
      }, { threshold: 0.2 }).observe(hero);
    }
  }

  /* ---------- Services (image tabs) ---------- */
  const SERVICES = [
    {
      title: 'Check-up and diagnosis',
      text: 'We assess your mouth calmly, show you what we found and explain the options in plain language.',
      points: ['Complete clinical examination', 'X-rays when necessary', 'Written treatment plan before any procedure'],
      time: '[to confirm]',
      img: 'img/img-6.jpg',
      alt: 'Dentist explaining an X-ray on screen'
    },
    {
      title: 'Cleaning and prevention',
      text: 'Removal of plaque and tartar and hygiene guidance, to keep your gums and teeth healthy in the long term.',
      points: ['Removal of plaque and tartar', 'Gum assessment', 'Personalised hygiene advice'],
      time: '[to confirm]',
      img: 'img/img-2.jpg',
      alt: 'Dentist working with an X-ray screen in the background'
    },
    {
      title: 'Smile aesthetics',
      text: 'Solutions to improve the appearance of your smile, always after assessing whether they suit your case.',
      points: ['Aesthetic and functional assessment', 'Options explained in advance', 'Results depend on each case'],
      time: '[to confirm]',
      img: 'img/img-5.jpg',
      alt: 'Close-up of a smile, white and aligned teeth'
    },
    {
      title: 'Implants and rehabilitation',
      text: 'Restoring function and your smile with careful planning, using precision equipment.',
      points: ['Planning with imaging', 'Steps explained and approved one by one', 'Follow-up after treatment'],
      time: '[to confirm]',
      img: 'img/img-4.jpg',
      alt: 'Precision equipment and microscope in the clinic'
    }
  ];

  function initServices() {
    const tabs = $$('[data-svc]');
    const panel = $('[data-svc-panel]');

    function show(i, focus = false) {
      const s = SERVICES[i];
      tabs.forEach((t, k) => {
        const on = k === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      $('[data-svc-title]').textContent = s.title;
      $('[data-svc-text]').textContent = s.text;
      $('[data-svc-time]').textContent = s.time;
      $('[data-svc-points]').replaceChildren(...s.points.map((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        return li;
      }));
      const img = $('[data-svc-img]');
      img.src = s.img;
      img.alt = s.alt;
      panel.setAttribute('aria-labelledby', tabs[i].id);
      panel.classList.remove('is-changing');
      void panel.offsetWidth;
      panel.classList.add('is-changing');
      if (focus) tabs[i].focus();
      /* Fill the form with the chosen service, if none is selected */
      const sel = $('[data-b-service]');
      if (sel && !sel.value) sel.value = s.title;
      updateSummary();
    }

    tabs.forEach((t, k) => {
      t.addEventListener('click', () => show(k));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (k + 1) % tabs.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (k - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) {
          e.preventDefault();
          show(n, true);
        }
      });
    });

    show(0);
  }

  /* ---------- Steps ---------- */
  const STEPS = [
    { title: 'Booking', text: 'Book online or by phone. We confirm the date and tell you what to bring, such as previous exams.' },
    { title: 'Assessment', text: 'We carry out the examination, explain what we found and show you the images, without rushing.' },
    { title: 'Plan', text: 'You receive the options in writing, with the cost of each one. We only proceed after your approval.' },
    { title: 'Follow-up', text: 'We review your case after treatment and remain available for any questions. [Confirm follow-up contacts.]' }
  ];

  function initSteps() {
    const buttons = $$('[data-step]');
    const detail = $('[data-step-detail]');

    function show(i) {
      buttons.forEach((b, k) => {
        const on = k === i;
        b.setAttribute('aria-pressed', String(on));
        b.parentElement.classList.toggle('is-active', on);
      });
      $('[data-step-title]').textContent = STEPS[i].title;
      $('[data-step-text]').textContent = STEPS[i].text;
      detail.classList.remove('is-changing');
      void detail.offsetWidth;
      detail.classList.add('is-changing');
    }

    buttons.forEach((b, k) => b.addEventListener('click', () => show(k)));
    show(0);
  }

  /* ---------- Testimonials (carousel) ---------- */
  function initQuotes() {
    const quotes = $$('.quote');
    const dotsWrap = $('[data-q-dots]');
    const dots = quotes.map((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'quote-dot';
      d.setAttribute('aria-label', `Testimonial ${i + 1}`);
      dotsWrap.append(d);
      return d;
    });
    let current = 0;

    function show(i) {
      current = (i + quotes.length) % quotes.length;
      quotes.forEach((q, k) => q.classList.toggle('is-active', k === current));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === current));
    }

    $('[data-q-prev]').addEventListener('click', () => show(current - 1));
    $('[data-q-next]').addEventListener('click', () => show(current + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => show(k)));

    const track = $('[data-quotes]');
    let sx = null;
    track.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    track.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) show(dx < 0 ? current + 1 : current - 1);
    });

    show(0);
  }

  /* ---------- Booking ---------- */
  const form = $('[data-book]');
  const dateInput = $('[data-b-date]');
  const slotsWrap = $('[data-b-slots]');
  const serviceSel = $('[data-b-service]');
  const phoneInput = $('[data-b-phone]');
  const nameInput = $('[data-b-name]');
  const consent = $('[data-b-consent]');
  let selectedTime = '';

  /* Possible hours for a day, according to the opening hours */
  function slotsFor(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay();
    const hours = HOURS[day];
    if (!hours) return [];
    const list = [];
    for (let h = hours[0]; h < hours[1]; h++) list.push(`${pad(h)}:00`);
    return list;
  }

  function isPastSlot(iso, time) {
    const now = nowInClinic();
    if (iso !== todayISO(now)) return false;
    const [h] = time.split(':').map(Number);
    return h <= now.getHours();
  }

  function renderSlots() {
    slotsWrap.replaceChildren();
    const iso = dateInput.value;
    if (!iso) {
      slotsWrap.append(emptyMsg('Choose a day first.'));
      return;
    }
    const list = slotsFor(iso);
    if (!list.length) {
      slotsWrap.append(emptyMsg('The clinic is closed on Sundays. Please choose another day.'));
      selectedTime = '';
      updateSummary();
      return;
    }
    list.forEach((time) => {
      const past = isPastSlot(iso, time);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.textContent = time;
      b.disabled = past;
      b.setAttribute('aria-pressed', String(time === selectedTime && !past));
      b.addEventListener('click', () => {
        selectedTime = time;
        $$('.slot', slotsWrap).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        clearError(slotsWrap.closest('.field'));
        updateSummary();
      });
      slotsWrap.append(b);
    });
    if (selectedTime && !list.includes(selectedTime)) selectedTime = '';
    updateSummary();
  }

  function emptyMsg(text) {
    const p = document.createElement('p');
    p.className = 'slots-empty';
    p.textContent = text;
    return p;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function updateSummary() {
    $('[data-sum-service]').textContent = serviceSel.value || 'Not chosen yet';
    $('[data-sum-date]').textContent = dateInput.value ? fmtDate(dateInput.value) : 'Not chosen yet';
    $('[data-sum-time]').textContent = selectedTime || 'Not chosen yet';
  }

  function setError(field, msg) {
    if (!field) return;
    const err = field.querySelector('.error');
    if (err) err.textContent = msg;
    field.classList.toggle('has-error', !!msg);
  }

  function clearError(field) {
    setError(field, '');
  }

  function initBooking() {
    dateInput.min = todayISO();
    dateInput.addEventListener('change', () => {
      selectedTime = '';
      clearError(dateInput.closest('.field'));
      renderSlots();
    });
    serviceSel.addEventListener('change', () => {
      clearError(serviceSel.closest('.field'));
      updateSummary();
    });
    [nameInput, phoneInput].forEach((i) => i.addEventListener('input', () => clearError(i.closest('.field'))));
    consent.addEventListener('change', () => { if (consent.checked) $('.consent-error', form).textContent = ''; });

    /* Keep past hours updated while the page is open */
    setInterval(() => { if (dateInput.value) renderSlots(); }, 60000);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const phone = phoneInput.value.replace(/[\s()-]/g, '');
      const dateErr = !dateInput.value ? 'Choose a day.'
        : dateInput.value < todayISO() ? 'Please choose a day from today onwards.'
        : (new Date(...dateInput.value.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v))).getDay() === 0 ? 'We are closed on Sundays.' : '');
      const checks = [
        [serviceSel.closest('.field'), serviceSel.value ? '' : 'Choose a service.'],
        [dateInput.closest('.field'), dateErr],
        [slotsWrap.closest('.field'), selectedTime ? '' : 'Choose a time.'],
        [nameInput.closest('.field'), name.length >= 2 ? '' : 'Please enter your name.'],
        [phoneInput.closest('.field'), /^\+?\d{9,15}$/.test(phone) ? '' : 'Invalid phone number (9 digits or more).']
      ];

      let first = null;
      checks.forEach(([field, msg]) => {
        setError(field, msg);
        if (msg && !first) first = field;
      });

      const consentErr = $('.consent-error', form);
      if (!consent.checked) {
        consentErr.textContent = 'We need your authorisation to confirm the appointment.';
        if (!first) first = consent.closest('label');
      } else {
        consentErr.textContent = '';
      }

      if (first) {
        $('[data-b-note]').textContent = 'Please review the highlighted fields.';
        const input = first.querySelector('input, select, button') || first;
        input.focus();
        return;
      }

      const note = $('[data-b-note]');
      note.textContent = `Request received for ${fmtDate(dateInput.value)}, at ${selectedTime}. We will confirm by phone or email.`;
      toast('Request received. We will confirm shortly.');
      form.reset();
      selectedTime = '';
      renderSlots();
      updateSummary();
    });

    updateSummary();
    renderSlots();
  }

  /* ---------- Opening status ---------- */
  function initOpenStatus() {
    const badge = $('[data-open-status]');
    const navStatus = $('[data-open-status-nav]');
    const fmt = (h) => `${pad(h)}h`;

    function update() {
      const now = nowInClinic();
      const hours = HOURS[now.getDay()];
      const minutes = now.getHours() + now.getMinutes() / 60;
      let text;
      let open = false;
      if (hours && minutes >= hours[0] && minutes < hours[1]) {
        open = true;
        text = `Open now · closes at ${fmt(hours[1])}`;
      } else {
        text = 'Currently closed · [confirm hours]';
      }
      badge.textContent = text;
      badge.classList.toggle('is-open', open);
      if (navStatus) navStatus.textContent = open ? 'Open now' : 'Closed now';
    }

    update();
    setInterval(update, 60000);
  }

  /* ---------- Questions (keyword search) ---------- */
  const STOP = new Set([
    'how', 'what', 'which', 'can', 'the', 'for', 'with', 'and', 'are', 'does', 'will',
    'you', 'your', 'this', 'that', 'from', 'when', 'where', 'why', 'have', 'there',
    'about', 'should', 'would', 'could', 'more', 'much', 'very', 'any', 'some', 'not',
    'yes', 'its', 'our', 'into', 'than', 'then', 'them', 'they', 'his', 'her', 'one'
  ]);
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t));

  function initFaq() {
    const askForm = $('[data-ask]');
    const input = $('[data-ask-input]');
    const answer = $('[data-ask-answer]');
    const items = $$('[data-faq] details');
    const index = items.map((d) => {
      const q = $('summary', d).textContent;
      return { el: d, q, words: new Set([...tokens(d.dataset.kw || ''), ...tokens(q)]) };
    });

    askForm.addEventListener('submit', (e) => {
      e.preventDefault();
      items.forEach((d) => d.classList.remove('is-highlight'));
      const words = [...new Set(tokens(input.value))];
      if (!words.length) {
        answer.textContent = 'Write a keyword, for example “pain”, “urgent” or “payment”.';
        answer.classList.add('is-miss');
        return;
      }
      let best = null;
      let bestScore = 0;
      for (const item of index) {
        const score = words.reduce((total, w) => {
          if (item.words.has(w)) return total + 2;
          if (w.length >= 4 && [...item.words].some((x) => x.startsWith(w.slice(0, 4)))) return total + 1;
          return total;
        }, 0);
        if (score > bestScore) {
          best = item;
          bestScore = score;
        }
      }
      if (best) {
        best.el.open = true;
        best.el.classList.add('is-highlight');
        answer.textContent = `This answer may help: “${best.q}”`;
        answer.classList.remove('is-miss');
        best.el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        setTimeout(() => best.el.classList.remove('is-highlight'), 2600);
      } else {
        answer.textContent = 'We could not find a direct answer. Please call us or send your question using the contact details below.';
        answer.classList.add('is-miss');
      }
    });
  }

  /* ---------- Reveal and active section in menu ---------- */
  function initObservers() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach((n) => n.classList.add('is-visible'));
      return;
    }

    const reveal = new IntersectionObserver((entries, io) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((n) => reveal.observe(n));

    const navLinks = $$('.primary-nav > a:not(.nav-cta)');
    const sections = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => sections.observe(s));
  }

  /* ---------- Startup ---------- */
  function init() {
    initHero();
    initServices();
    initSteps();
    initQuotes();
    initBooking();
    initOpenStatus();
    initFaq();
    initObservers();
    onScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();