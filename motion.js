// NOIR Motion System — tasteful, physics-based animations
(function () {
  'use strict';

  // ── Easings ────────────────────────────────────────────────────────────────
  const SPRING   = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  const SMOOTH   = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  const SNAPPY   = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  const OVERSHOOT = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  // ── Custom cursor ──────────────────────────────────────────────────────────
  function initCursor() {
    if (window.matchMedia('(pointer:coarse)').matches) return; // no touch
    const dot = document.createElement('div');
    dot.id = 'noir-cursor';
    dot.style.cssText = `
      position:fixed; top:0; left:0; width:8px; height:8px;
      border-radius:50%; background:var(--accent);
      pointer-events:none; z-index:99999;
      transform:translate(-50%,-50%) scale(1);
      transition:transform .15s ${SPRING}, width .2s ${SMOOTH}, height .2s ${SMOOTH}, background .2s;
      mix-blend-mode:difference;
    `;
    document.body.appendChild(dot);

    let mx = 0, my = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    let raf;
    (function loop() {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      dot.style.left = cx + 'px';
      dot.style.top  = cy + 'px';
      raf = requestAnimationFrame(loop);
    })();

    document.addEventListener('mousedown', () => dot.style.transform = 'translate(-50%,-50%) scale(0.6)');
    document.addEventListener('mouseup',   () => dot.style.transform = 'translate(-50%,-50%) scale(1)');
    document.addEventListener('mouseleave', () => dot.style.opacity = '0');
    document.addEventListener('mouseenter', () => dot.style.opacity = '1');

    // Grow on interactive elements
    document.addEventListener('mouseover', e => {
      const el = e.target.closest('button,a,[role=button],.card,.btn');
      if (el) {
        dot.style.width = '32px'; dot.style.height = '32px';
        dot.style.opacity = '0.5';
      } else {
        dot.style.width = '8px'; dot.style.height = '8px';
        dot.style.opacity = '1';
      }
    });
  }

  // ── Scroll reveal ──────────────────────────────────────────────────────────
  function initScrollReveal() {
    const style = document.createElement('style');
    style.textContent = `
      .reveal { opacity:0; transform:translateY(24px); transition:opacity .6s ${SNAPPY}, transform .7s ${SNAPPY}; }
      .reveal.stagger-1 { transition-delay:.07s }
      .reveal.stagger-2 { transition-delay:.14s }
      .reveal.stagger-3 { transition-delay:.21s }
      .reveal.stagger-4 { transition-delay:.28s }
      .reveal.stagger-5 { transition-delay:.35s }
      .reveal.stagger-6 { transition-delay:.42s }
      .reveal.stagger-7 { transition-delay:.49s }
      .reveal.stagger-8 { transition-delay:.56s }
      .reveal.in { opacity:1; transform:none; }
      .reveal-scale { opacity:0; transform:scale(.94); transition:opacity .5s ${SMOOTH}, transform .6s ${OVERSHOOT}; }
      .reveal-scale.in { opacity:1; transform:none; }
      .reveal-left  { opacity:0; transform:translateX(-20px); transition:opacity .6s ${SNAPPY}, transform .7s ${SNAPPY}; }
      .reveal-left.in  { opacity:1; transform:none; }
    `;
    document.head.appendChild(style);

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    function observe(root) {
      root.querySelectorAll('.reveal,.reveal-scale,.reveal-left').forEach(el => io.observe(el));
    }

    observe(document);
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) observe(n); }));
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ── 3D card tilt ──────────────────────────────────────────────────────────
  function initCardTilt() {
    const MAX = 8; // max degrees
    document.addEventListener('mousemove', e => {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const card = e.target.closest('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * MAX}deg) rotateX(${-y * MAX}deg) translateZ(8px)`;
      card.style.transition = 'transform .1s linear';
      const img = card.querySelector('.card-img img, .card-img .blob');
      if (img) img.style.transform = `scale(1.04) translate(${x*6}px,${y*6}px)`;
    });
    document.addEventListener('mouseleave', e => {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const card = e.target.closest('.card');
      if (!card) return;
      card.style.transform = '';
      card.style.transition = `transform .6s ${SPRING}`;
      const img = card.querySelector('.card-img img, .card-img .blob');
      if (img) { img.style.transform = ''; img.style.transition = `transform .6s ${SPRING}`; }
    }, true);
  }

  // ── Magnetic buttons ──────────────────────────────────────────────────────
  function initMagneticBtns() {
    if (window.matchMedia('(pointer:coarse)').matches) return;
    const STRENGTH = 0.35;
    document.addEventListener('mousemove', e => {
      document.querySelectorAll('.btn-primary,.btn-lg').forEach(btn => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < 80) {
          const dx = (e.clientX - cx) * STRENGTH;
          const dy = (e.clientY - cy) * STRENGTH;
          btn.style.transform = `translate(${dx}px,${dy}px)`;
          btn.style.transition = `transform .2s ${SMOOTH}`;
        } else if (btn.style.transform) {
          btn.style.transform = '';
          btn.style.transition = `transform .5s ${SPRING}`;
        }
      });
    });
  }

  // ── Page transition overlay ────────────────────────────────────────────────
  function initPageTransitions() {
    const style = document.createElement('style');
    style.textContent = `
      .page.active { animation: pageReveal .18s ease; }
      @keyframes pageReveal {
        from { opacity:0.4; }
        to   { opacity:1; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Shimmer on images loading ─────────────────────────────────────────────
  function initShimmer() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position:  200% 0; }
      }
      .card-img:not(:has(img[src])) {
        background: linear-gradient(90deg, var(--bg-elev) 25%, var(--bg-elev-2) 50%, var(--bg-elev) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.6s infinite;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Number count-up ───────────────────────────────────────────────────────
  window.countUp = function(el, target, dur = 900) {
    const start = Date.now();
    const from = parseFloat(el.textContent) || 0;
    (function tick() {
      const p = Math.min(1, (Date.now() - start) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (target - from) * ease);
      if (p < 1) requestAnimationFrame(tick);
    })();
  };

  // ── Button press ripple ────────────────────────────────────────────────────
  function initRipple() {
    const style = document.createElement('style');
    style.textContent = `
      .btn { overflow:hidden; position:relative; }
      .ripple {
        position:absolute; border-radius:50%; background:rgba(255,255,255,.18);
        transform:scale(0); animation:rippleAnim .5s ${SMOOTH};
        pointer-events:none;
      }
      @keyframes rippleAnim { to { transform:scale(4); opacity:0; } }
    `;
    document.head.appendChild(style);

    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const r = document.createElement('span');
      r.className = 'ripple';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
      btn.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  }

  // ── Hero text reveal ──────────────────────────────────────────────────────
  function initHeroReveal() {
    const style = document.createElement('style');
    style.textContent = `
      .hero-text .hero-tag  { animation: slideDown .6s ${SNAPPY} .1s both; }
      .hero-text h1         { animation: slideDown .7s ${SNAPPY} .2s both; }
      .hero-text .row       { animation: slideDown .6s ${SNAPPY} .35s both; }
      .hero-text .hero-meta { animation: slideDown .5s ${SNAPPY} .5s both; }
      .hero-art             { animation: fadeScale .8s ${SMOOTH} .15s both; }
      @keyframes slideDown {
        from { opacity:0; transform:translateY(-16px); }
        to   { opacity:1; transform:none; }
      }
      @keyframes fadeScale {
        from { opacity:0; transform:scale(.96); }
        to   { opacity:1; transform:none; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Toast spring entrance ─────────────────────────────────────────────────
  function initToastMotion() {
    const style = document.createElement('style');
    style.textContent = `
      .toast.show { animation: toastIn .4s ${OVERSHOOT} both; }
      @keyframes toastIn {
        from { opacity:0; transform:translateY(12px) scale(.9); }
        to   { opacity:1; transform:none; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Card scroll reveal ────────────────────────────────────────────────────
  function initGridStagger() {
    const style = document.createElement('style');
    style.textContent = `
      .card[data-m="hidden"] {
        opacity: 0;
        transform: translateY(30px) scale(.97);
        transition: opacity .55s ${SNAPPY}, transform .62s ${SNAPPY};
        transition-delay: calc(var(--ci, 0) * 65ms);
      }
      .card[data-m="show"] {
        opacity: 1 !important;
        transform: none !important;
      }
    `;
    document.head.appendChild(style);

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.dataset.m = 'show';
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });

    function register(card, idx) {
      if (card.dataset.m) return;
      card.dataset.m = 'hidden';
      card.style.setProperty('--ci', idx % 6);
      io.observe(card);
    }

    function scanCards(root) {
      const cards = (root.querySelectorAll ? root : document.body).querySelectorAll('.card');
      cards.forEach((c, i) => register(c, i));
    }

    // Scan after a tick so React has rendered
    setTimeout(() => scanCards(document), 100);

    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (!n.querySelectorAll) return;
        if (n.classList && n.classList.contains('card')) register(n, 0);
        else n.querySelectorAll('.card').forEach((c, i) => register(c, i));
      }));
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ── Sheet spring ──────────────────────────────────────────────────────────
  function initSheetMotion() {
    const style = document.createElement('style');
    style.textContent = `
      .sheet.open { animation: sheetUp .45s ${OVERSHOOT} both; }
      @keyframes sheetUp {
        from { transform:translateY(100%); }
        to   { transform:translateY(0); }
      }
      .sheet-backdrop.open { animation: backdropIn .3s ease both; }
      @keyframes backdropIn { from { opacity:0; } to { opacity:1; } }
    `;
    document.head.appendChild(style);
  }

  // ── Init all ──────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initCardTilt();
    initMagneticBtns();
    initPageTransitions();
    initShimmer();
    initRipple();
    initHeroReveal();
    initToastMotion();
    initGridStagger();
    initSheetMotion();
  });

})();
