// Kiln & Cloud: small progressive enhancements. The page is complete without this file.

(() => {
'use strict';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function shouldAnimate() {
  return !reduceMotion.matches && document.documentElement.dataset.motion !== 'off';
}

/* ---------- Scroll reveals (IntersectionObserver, reveal once) ---------- */
function initReveals() {
  if (!shouldAnimate() || !('IntersectionObserver' in window)) return;
  const targets = [
    ...document.querySelectorAll('[data-reveal], [data-stagger-group] > *, [data-kiln-curve]'),
  ];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  // Hide only once the observer exists, so a script failure never leaves content invisible.
  document.documentElement.classList.add('reveal-io');
  targets.forEach((el) => observer.observe(el));
}

/* ---------- Mobile menu ---------- */
function initMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (!toggle || !nav) return;
  const label = toggle.querySelector('.menu-toggle-label');

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Close' : 'Menu';
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
}

/* ---------- Booking dialog ---------- */
const STUDIO_EMAIL = 'ola@kilnandcloud.pt';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateField(input, errorEl, isValid) {
  input.setAttribute('aria-invalid', String(!isValid));
  if (isValid) {
    input.removeAttribute('aria-describedby');
    errorEl.hidden = true;
  } else {
    input.setAttribute('aria-describedby', errorEl.id);
    errorEl.hidden = false;
  }
  return isValid;
}

function buildMailto({ date, name, email, seats, waitlist }) {
  const subject = `${waitlist ? 'Waitlist' : 'Workshop booking'}: ${date}`;
  const body = [
    `Olá Inês and Rui,`,
    ``,
    `I'd like ${seats === '1' ? 'one seat' : 'two seats'} at the wheel workshop on ${date}${waitlist ? ' (waitlist)' : ''}.`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
  ].join('\n');
  return `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function initBooking() {
  const dialog = document.querySelector('[data-booking]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const form = dialog.querySelector('[data-booking-form]');
  const dateEl = dialog.querySelector('[data-booking-date]');
  const status = dialog.querySelector('[data-booking-status]');
  const submitLabel = dialog.querySelector('[data-submit-label]');
  const title = dialog.querySelector('#booking-title');
  const name = form.elements.name;
  const email = form.elements.email;
  let current = { date: '', waitlist: false, opener: null };

  document.querySelectorAll('[data-book]').forEach((button) => {
    button.addEventListener('click', () => {
      current = { date: button.dataset.book, waitlist: 'waitlist' in button.dataset, opener: button };
      dateEl.textContent = `${current.date}, 10:00–13:00`;
      title.textContent = current.waitlist ? 'Join the waitlist' : 'Book a Saturday on the wheel';
      submitLabel.textContent = current.waitlist ? 'Send waitlist request' : 'Send booking request';
      status.textContent = '';
      dialog.showModal();
      name.focus();
    });
  });

  dialog.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // click on the backdrop
  });
  dialog.addEventListener('close', () => current.opener?.focus());

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameOk = validateField(name, dialog.querySelector('#b-name-error'), name.value.trim().length > 1);
    const emailOk = validateField(email, dialog.querySelector('#b-email-error'), EMAIL_PATTERN.test(email.value.trim()));
    if (!nameOk) return name.focus();
    if (!emailOk) return email.focus();

    window.location.href = buildMailto({
      date: current.date,
      name: name.value.trim(),
      email: email.value.trim(),
      seats: form.elements.seats.value,
      waitlist: current.waitlist,
    });
    status.textContent = 'Your email app should now be open with the request written. Press send and we’ll reply within a day.';
  });
}

initReveals();
initMenu();
initBooking();
})();
