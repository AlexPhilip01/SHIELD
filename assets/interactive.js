/* Shield InfoSec — interactive visual layer. No third-party runtime or tracking. */
(() => {
  if (window.__shieldInteractiveLayer) return;
  window.__shieldInteractiveLayer = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  let scrollFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  // Progress indicator is driven only by scroll events (no perpetual timer).
  const progress = document.createElement('div');
  progress.id = 'shield-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  const toTop = document.createElement('button');
  toTop.id = 'shield-back-to-top';
  toTop.type = 'button';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.title = 'Back to top';
  toTop.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 14 7-7 7 7"/><path d="M12 7v13"/></svg>';
  document.body.appendChild(toTop);
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  function updateScrollUI() {
    scrollFrame = 0;
    const max = Math.max(1, root.scrollHeight - window.innerHeight);
    const ratio = Math.max(0, Math.min(1, (window.scrollY || root.scrollTop || 0) / max));
    progress.style.width = (ratio * 100).toFixed(2) + '%';
    toTop.classList.toggle('is-visible', (window.scrollY || root.scrollTop || 0) > Math.max(480, window.innerHeight * .65));
  }
  function queueScrollUI() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollUI);
  }
  window.addEventListener('scroll', queueScrollUI, { passive: true });
  window.addEventListener('resize', queueScrollUI, { passive: true });
  updateScrollUI();

  // Subtle perspective on actual content cards. Touch users get a clean static design.
  const cardSelector = [
    '#sectors a.group',
    '#services a.group',
    '#tools .grid > div.rounded-2xl',
    '#about ul.divide-y > li',
    '.service-card', '.sector-card', '.tool-card', '.feature-card',
    '.benefit-card', '.process-card', '.why-card', '.industry-card'
  ].join(',');
  const initCards = (scope = document) => {
    const cards = scope.querySelectorAll(cardSelector);
    cards.forEach(card => {
      if (card.dataset.shTiltReady) return;
      card.dataset.shTiltReady = 'true';
      card.classList.add('sh-tilt-card');
      if (!finePointer || reduceMotion) return;
      card.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = ((event.clientX - rect.left) / rect.width - .5) * 2;
        const ny = ((event.clientY - rect.top) / rect.height - .5) * 2;
        card.style.setProperty('--sh-tilt-y', (nx * 3.8).toFixed(2) + 'deg');
        card.style.setProperty('--sh-tilt-x', (-ny * 3.2).toFixed(2) + 'deg');
        card.classList.add('sh-tilting');
      }, { passive: true });
      const reset = () => {
        card.style.setProperty('--sh-tilt-y', '0deg');
        card.style.setProperty('--sh-tilt-x', '0deg');
        card.classList.remove('sh-tilting');
      };
      card.addEventListener('pointerleave', reset, { passive: true });
      card.addEventListener('blur', reset, true);
    });
  };

  // Reveal and card effects must never leave content hidden if IntersectionObserver is unavailable.
  function initReveal(scope = document) {
    const candidates = scope.querySelectorAll(
      'main article > section, main .service-card, main .sector-card, main .tool-card, main .feature-card'
    );
    if (!('IntersectionObserver' in window) || reduceMotion) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('sh-interactive-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -35px 0px' });
    candidates.forEach(el => {
      if (el.classList.contains('sh-interactive-visible') || el.classList.contains('sh-interactive-reveal')) return;
      el.classList.add('sh-interactive-reveal');
      observer.observe(el);
    });
  }

  // Hero emblem: the real Shield InfoSec logo, floating gently behind the pipeline card.
  function initHeroShield() {
    const home = document.getElementById('home');
    if (!home || home.querySelector('.shield-3d-hero')) return;
    const figure = home.querySelector('figure');
    if (!figure) return;

    const logo = document.createElement('img');
    logo.className = 'shield-3d-hero';
    logo.src = '/assets/shield-logo.png';
    logo.alt = '';
    logo.width = 221;
    logo.height = 300;
    logo.decoding = 'async';
    logo.setAttribute('aria-hidden', 'true');
    figure.prepend(logo);

    if (finePointer && !reduceMotion) {
      figure.addEventListener('pointermove', event => {
        const rect = figure.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1));
        const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1));
        logo.style.setProperty('--tilt-y', (x * 14).toFixed(1) + 'deg');
        logo.style.setProperty('--tilt-x', (-y * 10).toFixed(1) + 'deg');
      }, { passive: true });
      figure.addEventListener('pointerleave', () => {
        logo.style.setProperty('--tilt-y', '0deg');
        logo.style.setProperty('--tilt-x', '0deg');
      }, { passive: true });
    }
  }

  function enhance() {
    initCards();
    initReveal();
    initHeroShield();
  }
  enhance();
  if ('MutationObserver' in window) {
    const observer = new MutationObserver(() => enhance());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }
})();
