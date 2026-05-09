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

  // ── Spline enabled on all pages ──────────────────
  var isContactPage = false;

  /* ─────────────────────────────────────────────────
     SPLINE LOADER
  ───────────────────────────────────────────────── */
  function loadSplineScenes() {
    var containers = document.querySelectorAll('[data-spline-scene]');

    containers.forEach(function (container) {
      var sceneUrl = container.getAttribute('data-spline-scene');
      if (!sceneUrl) return;
      if (container.dataset.orbBuilt === 'true') return;

      // Start hidden — will fade in on load
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.9s ease';

      // If a scene hangs/fails, switch to fallback quickly.
      var fallbackTimer = setTimeout(function () {
        if (container.dataset.splineLoaded !== 'true') {
          buildOrbCanvas(container);
        }
      }, 4500);

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

      viewer.addEventListener('load', function () {
        clearTimeout(fallbackTimer);
        // Fade in smoothly
        requestAnimationFrame(function () {
          container.style.opacity = '1';
          container.classList.add('spline-loaded');
        });

        // Mark container as loaded so orb fallback never runs
        container.dataset.splineLoaded = 'true';

        // Watermark removal — try multiple shadow DOM paths
        hideSplineWatermark(viewer);
      });

      viewer.addEventListener('error', function () {
        clearTimeout(fallbackTimer);
        buildOrbCanvas(container);
      });

      container.appendChild(viewer);
    });
  }

  /* ─────────────────────────────────────────────────
     WATERMARK REMOVAL
  ───────────────────────────────────────────────── */
  function hideSplineWatermark(viewer) {
    var attempts = 0;
    var maxAttempts = 20;

    function tryHide() {
      attempts++;
      try {
        var shadow = viewer.shadowRoot;
        if (shadow) {
          var selectors = ['#logo', 'a[href*="spline"]', '[class*="logo"]', '[class*="watermark"]', '[class*="brand"]'];
          selectors.forEach(function (sel) {
            shadow.querySelectorAll(sel).forEach(function (el) {
              el.style.display = 'none';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
            });
          });

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

      if (attempts < maxAttempts) {
        setTimeout(tryHide, 300);
      }
    }

    setTimeout(tryHide, 200);
  }

  /* ─────────────────────────────────────────────────
     CANVAS ORB FALLBACK
     Only runs when Spline CDN script fails to load.
     On contact page: always runs (no Spline there).
  ───────────────────────────────────────────────── */
  function buildOrbCanvas(container) {
    // Skip orb if Spline already loaded
    if (container.dataset.splineLoaded === 'true') return;

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

    container.style.background = 'radial-gradient(120% 80% at 50% 10%, hsla(228, 75%, 17%, 0.55) 0%, hsla(228, 42%, 9%, 0.92) 52%, hsl(228, 32%, 7%) 100%)';

    function draw() {
      time += 0.016;
      ctx.clearRect(0, 0, W, H);

      var cx = W * (0.48 + (mx - 0.5) * 0.06);
      var cy = H * (0.42 + (my - 0.5) * 0.06);
      var r = Math.min(W, H) * 0.30;

      // Main orb glow (blue/purple)
      var core = ctx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r);
      core.addColorStop(0, 'hsla(206, 95%, 76%, 0.60)');
      core.addColorStop(0.45, 'hsla(226, 95%, 66%, 0.38)');
      core.addColorStop(1, 'hsla(264, 95%, 62%, 0.06)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Slow breathing ring
      var ringR = r * (1.05 + Math.sin(time * 1.1) * 0.05);
      var ring = ctx.createRadialGradient(cx, cy, ringR * 0.88, cx, cy, ringR * 1.02);
      ring.addColorStop(0, 'hsla(225, 90%, 62%, 0)');
      ring.addColorStop(1, 'hsla(225, 90%, 62%, 0.20)');
      ctx.strokeStyle = ring;
      ctx.lineWidth = Math.max(2, r * 0.05);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Soft vertical ambient gradient
      var ambient = ctx.createLinearGradient(0, 0, 0, H);
      ambient.addColorStop(0, 'hsla(225, 78%, 56%, 0.08)');
      ambient.addColorStop(1, 'hsla(225, 78%, 56%, 0)');
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, W, H);

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

    if (isContactPage) return;

    // If URL is blocked by host policy (for example raw.githubusercontent),
    // use fallback immediately instead of hanging.
    containers.forEach(function (container) {
      var sceneUrl = (container.getAttribute('data-spline-scene') || '').trim();
      if (/raw\.githubusercontent\.com/i.test(sceneUrl)) {
        buildOrbCanvas(container);
      }
    });

    var script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

    script.onload = function () {
      setTimeout(loadSplineScenes, 80);
    };

    script.onerror = function () {
      console.warn('Spline CDN failed — canvas fallback active');
      containers.forEach(buildOrbCanvas);
    };

    document.head.appendChild(script);

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
     BOOT
  ───────────────────────────────────────────────── */
  function boot() {
    initScenes();
    // keep tilt, glow, cursor trail if you want
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
