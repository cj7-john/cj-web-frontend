/* ═══════════════════════════════════════════════════
   CJ Web Studio v4 — Scene Loader + Fallback + FX
   Strategy:
     - Spline loads with opacity:0, fades in on load event
     - Canvas orb ONLY fires if Spline script fails entirely
     - Contact page gets no Spline (grid-bg + orb CSS only)
     - Watermark removed via shadow DOM + injected style
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Skip Spline on contact page ──────────────────
  var isContactPage = window.location.pathname.includes('contact');

  /* ─────────────────────────────────────────────────
     SPLINE LOADER
  ───────────────────────────────────────────────── */
  function loadSplineScenes() {
    var containers = document.querySelectorAll('[data-spline-scene]');

    containers.forEach(function (container) {
      var sceneUrl = container.getAttribute('data-spline-scene');
      if (!sceneUrl) return;

      // Start hidden — will fade in on load
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.9s ease';

      var viewer = document.createElement('spline-viewer');
      viewer.setAttribute('url', sceneUrl);
      viewer.setAttribute('loading-anim-type', 'none');
      viewer.style.cssText = [
        'width:100%',
        'height:100%',
        'display:block',
        'position:absolute',
        'inset:0',
        'pointer-events:none',  // don't block page interaction
      ].join(';');

      var loaded = false;

      viewer.addEventListener('load', function () {
        loaded = true;

        // Fade in smoothly
        requestAnimationFrame(function () {
          container.style.opacity = '1';
          container.classList.add('spline-loaded');
        });

        // Watermark removal — try multiple shadow DOM paths
        hideSplineWatermark(viewer);
      });

      container.appendChild(viewer);

      // No canvas fallback on timeout — just leave it loading
      // Canvas orb only fires on script load failure (see initScenes)
    });
  }

  /* ─────────────────────────────────────────────────
     WATERMARK REMOVAL
     Spline's shadow DOM structure varies by version.
     We target every known selector.
  ───────────────────────────────────────────────── */
  function hideSplineWatermark(viewer) {
    var attempts = 0;
    var maxAttempts = 20;

    function tryHide() {
      attempts++;
      try {
        var shadow = viewer.shadowRoot;
        if (shadow) {
          // Known watermark selectors across Spline viewer versions
          var selectors = ['#logo', 'a[href*="spline"]', '[class*="logo"]', '[class*="watermark"]', '[class*="brand"]'];
          selectors.forEach(function (sel) {
            shadow.querySelectorAll(sel).forEach(function (el) {
              el.style.display = 'none';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
            });
          });

          // Inject a persistent style tag into shadow root
          if (!shadow.querySelector('#cj-hide-watermark')) {
            var style = document.createElement('style');
            style.id = 'cj-hide-watermark';
            style.textContent = [
              '#logo { display:none!important; }',
              'a[href*="spline"] { display:none!important; }',
              '[class*="logo"] { display:none!important; }',
              '[class*="watermark"] { display:none!important; }',
              '[class*="brand"] { display:none!important; }',
              'canvas { cursor:default!important; }',
            ].join('\n');
            shadow.appendChild(style);
          }
        }
      } catch (e) {}

      // Keep retrying for a few seconds in case DOM isn't ready
      if (attempts < maxAttempts) {
        setTimeout(tryHide, 300);
      }
    }

    // Start immediately and retry
    setTimeout(tryHide, 200);
  }

  /* ─────────────────────────────────────────────────
     CANVAS ORB FALLBACK
     Only runs when Spline CDN script fails to load.
     On contact page: always runs (no Spline there).
  ───────────────────────────────────────────────── */
  function buildOrbCanvas(container) {
    if (container.dataset.orbBuilt) return;
    container.dataset.orbBuilt = 'true';

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    container.appendChild(canvas);
    container.style.opacity = '1';

    var ctx = canvas.getContext('2d');
    var W = 1, H = 1, mx = 0.5, my = 0.5, time = 0, raf;

    function resize() {
      var rect = container.getBoundingClientRect();
      W = (rect.width > 2 ? rect.width : container.offsetWidth) || window.innerWidth;
      H = (rect.height > 2 ? rect.height : container.offsetHeight) || window.innerHeight;
      var dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(container);
    }
    window.addEventListener('resize', resize, { passive: true });
    requestAnimationFrame(function () { resize(); });

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX / window.innerWidth;
      my = e.clientY / window.innerHeight;
    }, { passive: true });

    var RINGS = [
      { n:60,  r:0.26, tilt:0.40,  spd:0.0006,   h:225, s:80, l:60, sz:1.9 },
      { n:48,  r:0.33, tilt:-0.60, spd:-0.0004,  h:263, s:70, l:65, sz:1.5 },
      { n:36,  r:0.20, tilt:0.80,  spd:0.00095,  h:199, s:90, l:55, sz:1.2 },
      { n:52,  r:0.40, tilt:0.20,  spd:-0.00035, h:290, s:60, l:62, sz:1.0 },
      { n:28,  r:0.15, tilt:-0.30, spd:0.0012,   h:180, s:70, l:58, sz:0.9 },
    ];

    var BLOBS = Array.from({ length: 5 }, function (_, i) {
      return {
        x: 0.15 + Math.random() * 0.7,
        y: 0.15 + Math.random() * 0.7,
        r: 0.12 + Math.random() * 0.18,
        phase: (i / 5) * Math.PI * 2,
        spd: 0.00018 + Math.random() * 0.00022,
        h: [225, 263, 290, 199, 210][i],
      };
    });

    function draw() {
      time++;
      ctx.clearRect(0, 0, W, H);
      var isWide = W > 900;
      var cx = isWide ? W * 0.65 + (mx - 0.5) * W * 0.05 : W * 0.50 + (mx - 0.5) * W * 0.03;
      var cy = H  * 0.46 + (my - 0.5) * H  * 0.04;
      var baseR = Math.min(W, H) * (isWide ? 0.22 : 0.28);

      BLOBS.forEach(function (b) {
        var bx = W * (b.x + Math.sin(time * b.spd + b.phase) * 0.09);
        var by = H * (b.y + Math.cos(time * b.spd * 0.7 + b.phase) * 0.07);
        var br = Math.min(W, H) * b.r;
        var g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0,   'hsla(' + b.h + ',70%,58%,0.10)');
        g.addColorStop(0.5, 'hsla(' + b.h + ',70%,58%,0.04)');
        g.addColorStop(1,   'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      });

      var cg = ctx.createRadialGradient(cx - baseR * 0.2, cy - baseR * 0.25, 0, cx, cy, baseR * 1.35);
      cg.addColorStop(0, 'hsla(225,80%,76%,0.22)');
      cg.addColorStop(0.4, 'hsla(263,70%,65%,0.10)');
      cg.addColorStop(1, 'transparent');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, baseR * 1.35, 0, Math.PI * 2); ctx.fill();

      RINGS.forEach(function (ring) {
        var angle = time * ring.spd + mx * 0.35;
        var tilt  = ring.tilt + (my - 0.5) * 0.6;
        for (var i = 0; i < ring.n; i++) {
          var theta = (i / ring.n) * Math.PI * 2 + angle;
          var x3 = Math.cos(theta) * ring.r;
          var y3 = Math.sin(theta) * ring.r;
          var z3 = Math.sin(theta + tilt) * 0.16;
          var px = cx + x3 * baseR * 1.55;
          var py = cy + y3 * baseR * Math.cos(tilt) + z3 * baseR * 0.45;
          var depth = Math.max(0, Math.min(1, (z3 + 0.16) / 0.32));
          var alpha = 0.18 + depth * 0.60;
          var size  = ring.sz * (0.4 + depth * 0.9);
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.3, size), 0, Math.PI * 2);
          ctx.fillStyle = 'hsla(' + ring.h + ',' + ring.s + '%,' + (ring.l * (0.55 + depth * 0.5)) + '%,' + alpha + ')';
          ctx.fill();
        }
      });

      var cd = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.09);
      cd.addColorStop(0,   'hsla(200,90%,90%,0.95)');
      cd.addColorStop(0.5, 'hsla(225,80%,72%,0.55)');
      cd.addColorStop(1,   'transparent');
      ctx.fillStyle = cd;
      ctx.beginPath(); ctx.arc(cx, cy, baseR * 0.09, 0, Math.PI * 2); ctx.fill();

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    window.addEventListener('beforeunload', function () { cancelAnimationFrame(raf); });
  }

  /* ─────────────────────────────────────────────────
     LOAD SPLINE RUNTIME
  ───────────────────────────────────────────────── */
  function initScenes() {
    var containers = document.querySelectorAll('[data-spline-scene]');
    if (!containers.length) return;

    // Contact page: skip Spline, no orb either — just CSS ambience
    if (isContactPage) return;

    var script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

    script.onload = function () {
      // Short pause for custom element to register
      setTimeout(loadSplineScenes, 80);
    };

    script.onerror = function () {
      // CDN failed — fall back to canvas orb
      console.warn('Spline CDN failed — canvas fallback active');
      containers.forEach(buildOrbCanvas);
    };

    document.head.appendChild(script);

    // Global style: hide watermark from any spline-viewer on the page
    var style = document.createElement('style');
    style.textContent = [
      'spline-viewer { width:100%; height:100%; display:block; }',
      'spline-viewer::part(logo) { display:none!important; }',
      'spline-viewer::part(watermark) { display:none!important; }',
      '.hero__spline, .page-hero__bg {',
      '  position:absolute!important;',
      '  inset:0!important;',
      '  overflow:hidden;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────────────
     3D CARD TILT
  ───────────────────────────────────────────────── */
  function initTilt() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    var els = document.querySelectorAll('.card, .bento-cell, .hero-card, .team-card');
    els.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width  - 0.5;
        var y = (e.clientY - r.top)  / r.height - 0.5;
        var mag = 6;
        el.style.transform  = 'perspective(900px) rotateY(' + (x * mag) + 'deg) rotateX(' + (-y * mag) + 'deg) translateZ(4px)';
        el.style.transition = 'transform 0.05s linear';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform  = '';
        el.style.transition = 'transform 0.55s cubic-bezier(0.16,1,0.3,1)';
      });
    });
  }

  /* ─────────────────────────────────────────────────
     TEAM CARD CURSOR GLOW
  ───────────────────────────────────────────────── */
  function initTeamGlow() {
    document.querySelectorAll('.team-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--gx', ((e.clientX - r.left) / r.width  * 100) + '%');
        card.style.setProperty('--gy', ((e.clientY - r.top)  / r.height * 100) + '%');
      });
    });
  }

  /* ─────────────────────────────────────────────────
     CURSOR TRAIL (desktop only)
  ───────────────────────────────────────────────── */
  function initCursorTrail() {
    if (!window.matchMedia('(hover: hover) and (min-width: 1024px)').matches) return;
    var trail = document.createElement('div');
    Object.assign(trail.style, {
      position: 'fixed', width: '360px', height: '360px', borderRadius: '50%',
      pointerEvents: 'none', zIndex: '0',
      background: 'radial-gradient(circle, hsla(225,80%,56%,0.07) 0%, transparent 70%)',
      transform: 'translate(-50%,-50%)', mixBlendMode: 'screen', willChange: 'left,top',
    });
    document.body.appendChild(trail);
    var tx = 0, ty = 0, lx = 0, ly = 0;
    document.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      lx += (tx - lx) * 0.08; ly += (ty - ly) * 0.08;
      trail.style.left = lx + 'px'; trail.style.top = ly + 'px';
      requestAnimationFrame(loop);
    })();
  }

  /* ─────────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────────── */
  function boot() {
    initScenes();
    initTilt();
    initTeamGlow();
    initCursorTrail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();