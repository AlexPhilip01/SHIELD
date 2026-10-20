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
      if (el.classList.contains('sh-interactive-visible')) return;
      el.classList.add('sh-interactive-reveal');
      observer.observe(el);
    });
  }

  // Hand-built projected 3D shield: no external WebGL dependency, modest draw cost,
  // pauses off-screen/in background, and becomes a static illustration for reduced motion.
  function initHeroShield() {
    const home = document.getElementById('home');
    if (!home || home.querySelector('.shield-3d-hero')) return;
    const figure = home.querySelector('figure');
    if (!figure) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'shield-3d-hero';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');
    figure.prepend(canvas);
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const outline = [
      [-.62, -.87], [.62, -.87], [.76, -.22],
      [.56, .42], [0, .94], [-.56, .42], [-.76, -.22]
    ];
    let width = 1, height = 1, visible = false, raf = 0, lastDraw = 0;
    let angle = -.28, targetX = 0, targetY = 0, time = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const project = (point, scale) => {
      const cy = Math.cos(angle), sy = Math.sin(angle);
      const cx = Math.cos(targetX), sx = Math.sin(targetX);
      const x = point[0] * cy + point[2] * sy;
      const z0 = -point[0] * sy + point[2] * cy;
      const y = point[1] * cx - z0 * sx;
      const z = point[1] * sx + z0 * cx;
      const perspective = 3.8 / (3.8 - z);
      return { x: width * .5 + x * scale * perspective, y: height * .49 + y * scale * perspective, z };
    };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now(), true);
    }

    function draw(now, force = false) {
      if (!force && (reduceMotion || !visible || document.hidden)) return;
      if (!force && now - lastDraw < 24) { raf = requestAnimationFrame(draw); return; }
      lastDraw = now;
      time = now * .00035;
      if (!reduceMotion && finePointer) {
        angle += (targetY * .22 + Math.sin(time) * .0015 - angle) * .04;
      } else {
        angle += (Math.sin(time) * .025 - angle) * .025;
      }
      targetX += ((pointerY * .11) - targetX) * .035;
      const scale = Math.min(width, height) * .39;
      ctx.clearRect(0, 0, width, height);

      // Elliptical orbital traces sit behind the model.
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        const rx = scale * (.92 + ring * .08);
        const ry = scale * (.27 + ring * .035);
        for (let i = 0; i <= 90; i++) {
          const a = i / 90 * Math.PI * 2 + time * (ring % 2 ? -.2 : .15);
          const pt = project([Math.cos(a) * rx / scale, Math.sin(a) * ry / scale * .7, Math.sin(a) * .34], scale);
          if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = ring === 1 ? 'rgba(228,188,106,.28)' : 'rgba(214,168,78,.16)';
        ctx.lineWidth = 1;
        ctx.setLineDash(ring === 1 ? [3, 7] : []);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const front = outline.map(([x,y]) => project([x,y,.16], scale));
      const back = outline.map(([x,y]) => project([x,y,-.16], scale));
      const centerFront = project([0,0,.18], scale);
      const sideFaces = [];
      for (let i = 0; i < outline.length; i++) {
        const j = (i + 1) % outline.length;
        sideFaces.push({ i, j, depth:(front[i].z+front[j].z+back[i].z+back[j].z)/4 });
      }
      sideFaces.sort((a,b)=>a.depth-b.depth);
      sideFaces.forEach(({i,j}) => {
        ctx.beginPath();
        ctx.moveTo(front[i].x,front[i].y);
        ctx.lineTo(front[j].x,front[j].y);
        ctx.lineTo(back[j].x,back[j].y);
        ctx.lineTo(back[i].x,back[i].y);
        ctx.closePath();
        const grad = ctx.createLinearGradient(front[i].x,front[i].y,back[j].x,back[j].y);
        grad.addColorStop(0,'rgba(228,188,106,.8)');
        grad.addColorStop(.55,'rgba(90,60,20,.9)');
        grad.addColorStop(1,'rgba(35,29,19,.9)');
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = 'rgba(245,215,140,.38)'; ctx.lineWidth = 1; ctx.stroke();
      });

      // Faceted front plate with fine gold mesh lines.
      ctx.beginPath();
      front.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
      ctx.closePath();
      const faceGrad = ctx.createLinearGradient(width*.25,height*.1,width*.75,height*.9);
      faceGrad.addColorStop(0,'rgba(249,224,155,.95)');
      faceGrad.addColorStop(.38,'rgba(214,168,78,.94)');
      faceGrad.addColorStop(1,'rgba(105,73,28,.96)');
      ctx.fillStyle = faceGrad; ctx.fill();
      ctx.strokeStyle = 'rgba(255,235,178,.88)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.save();
      ctx.beginPath(); front.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y)); ctx.closePath(); ctx.clip();
      ctx.strokeStyle = 'rgba(255,245,208,.32)'; ctx.lineWidth = .9;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(front[0].x + i*4, front[0].y + i*5);
        ctx.lineTo(front[3].x - i*5, front[3].y - i*3);
        ctx.lineTo(front[5].x + i*2, front[5].y - i*4);
        ctx.stroke();
      }
      ctx.restore();

      // Shield keyhole insignia.
      ctx.beginPath(); ctx.arc(centerFront.x, centerFront.y-6, scale*.075, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(15,16,18,.86)'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(centerFront.x-scale*.055,centerFront.y-2);
      ctx.lineTo(centerFront.x+scale*.055,centerFront.y-2);
      ctx.lineTo(centerFront.x+scale*.04,centerFront.y+scale*.13);
      ctx.lineTo(centerFront.x-scale*.04,centerFront.y+scale*.13);
      ctx.closePath(); ctx.fill();

      // A single orbiting light gives the object a readable sense of rotation.
      const lightAngle = time * 1.25;
      const light = project([Math.cos(lightAngle)*.92, Math.sin(lightAngle)*.23, Math.sin(lightAngle)*.62], scale);
      ctx.beginPath(); ctx.arc(light.x,light.y,2.1,0,Math.PI*2);
      ctx.fillStyle = '#fff0bd'; ctx.shadowColor = 'rgba(228,188,106,.95)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;

      if (!force && !reduceMotion && visible && !document.hidden) raf = requestAnimationFrame(draw);
    }

    const observer = ('IntersectionObserver' in window)
      ? new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          if (visible && !document.hidden && !reduceMotion && !raf) raf = requestAnimationFrame(draw);
        }, { threshold: .01 })
      : null;
    if (observer) observer.observe(figure); else visible = true;

    if (finePointer) {
      figure.addEventListener('pointermove', event => {
        const rect = figure.getBoundingClientRect();
        pointerX = clamp((event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1, -1, 1);
        pointerY = clamp((event.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1, -1, 1);
        targetY = pointerX * .42;
      }, { passive: true });
      figure.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; targetY = 0; }, { passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (visible && !reduceMotion && !raf) {
        raf = requestAnimationFrame(draw);
      } else if (visible && reduceMotion) {
        draw(performance.now(), true);
      }
    });
    window.addEventListener('resize', resize, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(figure);
    resize();
    if (reduceMotion) draw(performance.now(), true);
    else if (!observer && visible) raf = requestAnimationFrame(draw);
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
