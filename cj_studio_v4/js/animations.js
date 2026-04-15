/* ═══════════════════════════════════════════════════
   CJ Web Studio v4 — Scene Loader + Fallback + FX
   Priority: Spline 3D → Canvas Orb fallback
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────
     SPLINE LOADER — supports multiple scenes with mouse interactions
  ───────────────────────────────────────────────── */
  var SPLINE_TIMEOUT = 9000; // ms before fallback kicks in

  function loadSplineScenes() {
    var containers = document.querySelectorAll('[data-spline-scene]');
    var loadedScenes = new Map(); // Track loaded scenes

    containers.forEach(function(container) {
      var sceneUrl = container.getAttribute('data-spline-scene');
      if (!sceneUrl || container.dataset.orbBuilt) return;

      // Create the web component
      var viewer = document.createElement('spline-viewer');
      viewer.setAttribute('url', sceneUrl);
      viewer.setAttribute('loading-anim-type', 'none');
      viewer.style.cssText = 'width:100%;height:100%;display:block;position:absolute;inset:0;pointer-events:auto;';

      var loaded = false;
      var splineApp = null;

      viewer.addEventListener('load', function() {
        loaded = true;
        container.classList.add('spline-loaded');

        // Get the Spline application instance for mouse interactions
        try {
          splineApp = viewer.getApplication();
          if (splineApp) {
            loadedScenes.set(container, splineApp);

            // Add mouse hover interactions
            setupMouseInteractions(container, splineApp);
          }
        } catch(e) {
          console.warn('Could not get Spline application instance:', e);
        }

        // Hide Spline watermark
        try {
          var shadow = viewer.shadowRoot;
          if (shadow) {
            var logo = shadow.querySelector('#logo');
            if (logo) logo.style.display = 'none';
            // Inject style to hide watermark
            var style = document.createElement('style');
            style.textContent = '#logo { display:none!important; } a[href*="spline"] { display:none!important; }';
            shadow.appendChild(style);
          }
        } catch(e) {}
      });

      container.appendChild(viewer);

      // Fallback: if Spline hasn't loaded after timeout, show canvas orb
      setTimeout(function() {
        if (!loaded && !container.dataset.orbBuilt) {
          console.warn('Spline timeout — activating canvas fallback for:', sceneUrl);
          viewer.remove();
          buildOrbCanvas(container);
        }
      }, SPLINE_TIMEOUT);
    });
  }

  /* ─────────────────────────────────────────────────
     MOUSE INTERACTIONS FOR SPLINE SCENES
  ───────────────────────────────────────────────── */
  function setupMouseInteractions(container, splineApp) {
    if (!splineApp) return;

    var isHovering = false;
    var mousePos = { x: 0, y: 0 };

    // Mouse enter - enable interactions
    container.addEventListener('mouseenter', function(e) {
      isHovering = true;
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;

      // Trigger hover animation or interaction
      try {
        // You can customize these interactions based on your Spline scene setup
        // This is a generic approach - adjust based on your specific scene objects
        var variables = splineApp.getVariables();
        if (variables && variables.onHover) {
          variables.onHover = true;
        }
      } catch(e) {}
    });

    // Mouse move - track position for interactions
    container.addEventListener('mousemove', function(e) {
      if (!isHovering) return;

      mousePos.x = e.clientX;
      mousePos.y = e.clientY;

      // Convert to normalized coordinates (0-1)
      var rect = container.getBoundingClientRect();
      var normalizedX = (e.clientX - rect.left) / rect.width;
      var normalizedY = (e.clientY - rect.top) / rect.height;

      try {
        // Update mouse position variables in Spline
        var variables = splineApp.getVariables();
        if (variables) {
          if (variables.mouseX !== undefined) variables.mouseX = normalizedX;
          if (variables.mouseY !== undefined) variables.mouseY = normalizedY;
        }
      } catch(e) {}
    });

    // Mouse leave - disable interactions
    container.addEventListener('mouseleave', function(e) {
      isHovering = false;

      try {
        var variables = splineApp.getVariables();
        if (variables && variables.onHover) {
          variables.onHover = false;
        }
      } catch(e) {}
    });
  }

  /* ─────────────────────────────────────────────────
     CANVAS ORB FALLBACK — animated 3D orbit sphere
  ───────────────────────────────────────────────── */
  function buildOrbCanvas(container) {
    if (container.dataset.orbBuilt) return;
    container.dataset.orbBuilt = 'true';

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    container.appendChild(canvas);
    container.classList.add('spline-loaded');

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
    requestAnimationFrame(function() { resize(); });

    document.addEventListener('mousemove', function(e) {
      mx = e.clientX / window.innerWidth;
      my = e.clientY / window.innerHeight;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (e.touches[0]) {
        mx = e.touches[0].clientX / window.innerWidth;
        my = e.touches[0].clientY / window.innerHeight;
      }
    }, { passive: true });

    var RINGS = [
      { n:60,  r:0.26, tilt:0.40,  spd:0.0006,   h:225, s:80, l:60, sz:1.9 },
      { n:48,  r:0.33, tilt:-0.60, spd:-0.0004,  h:263, s:70, l:65, sz:1.5 },
      { n:36,  r:0.20, tilt:0.80,  spd:0.00095,  h:199, s:90, l:55, sz:1.2 },
      { n:52,  r:0.40, tilt:0.20,  spd:-0.00035, h:290, s:60, l:62, sz:1.0 },
      { n:28,  r:0.15, tilt:-0.30, spd:0.0012,   h:180, s:70, l:58, sz:0.9 },
    ];

    var BLOBS = Array.from({ length: 5 }, function(_, i) {
      return {
        x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.7,
        r: 0.12 + Math.random() * 0.18, phase: (i / 5) * Math.PI * 2,
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

      BLOBS.forEach(function(b) {
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

      var cg = ctx.createRadialGradient(cx - baseR*0.2, cy - baseR*0.25, 0, cx, cy, baseR*1.35);
      cg.addColorStop(0, 'hsla(225,80%,76%,0.22)');
      cg.addColorStop(0.4, 'hsla(263,70%,65%,0.10)');
      cg.addColorStop(1, 'transparent');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, baseR*1.35, 0, Math.PI*2); ctx.fill();

      RINGS.forEach(function(ring) {
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
          ctx.fillStyle = 'hsla(' + ring.h + ',' + ring.s + '%,' + (ring.l * (0.55 + depth*0.5)) + '%,' + alpha + ')';
          ctx.fill();
        }
      });

      var cd = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.09);
      cd.addColorStop(0,   'hsla(200,90%,90%,0.95)');
      cd.addColorStop(0.5, 'hsla(225,80%,72%,0.55)');
      cd.addColorStop(1,   'transparent');
      ctx.fillStyle = cd;
      ctx.beginPath(); ctx.arc(cx, cy, baseR * 0.09, 0, Math.PI*2); ctx.fill();

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    window.addEventListener('beforeunload', function() { cancelAnimationFrame(raf); });
  }

  /* ─────────────────────────────────────────────────
     LOAD SPLINE RUNTIME + INIT SCENES (Optimized)
  ───────────────────────────────────────────────── */
  function initScenes() {
    var hasSceneContainers = document.querySelectorAll('[data-spline-scene]').length > 0;
    if (!hasSceneContainers) return;

    // Use a more recent, optimized version of Spline viewer
    var script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

    script.onload = function() {
      // Reduced delay for faster loading
      setTimeout(loadSplineScenes, 100);
    };

    script.onerror = function() {
      console.warn('Spline CDN unavailable — using canvas fallback');
      document.querySelectorAll('[data-spline-scene]').forEach(buildOrbCanvas);
    };

    document.head.appendChild(script);

    // Optimized CSS injection
    var style = document.createElement('style');
    style.textContent = [
      'spline-viewer { width:100%; height:100%; display:block; }',
      'spline-viewer::part(logo) { display:none!important; }',
      '.hero__spline, .page-hero__bg { position:absolute!important; inset:0!important; overflow:hidden; }',
      /* Performance optimizations */
      'spline-viewer canvas { image-rendering: optimizeSpeed; }',
      '.spline-loaded { contain: layout style paint; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────────────
     3D CARD TILT
  ───────────────────────────────────────────────── */
  function initTilt() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    var els = document.querySelectorAll('.card, .bento-cell, .hero-card, .team-card, .portfolio-card, .process-strip__item');
    els.forEach(function(el) {
      el.addEventListener('mousemove', function(e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width  - 0.5;
        var y = (e.clientY - r.top)  / r.height - 0.5;
        var mag = el.classList.contains('portfolio-card') ? 10 : 6;
        el.style.transform  = 'perspective(900px) rotateY(' + (x*mag) + 'deg) rotateX(' + (-y*mag) + 'deg) translateZ(4px)';
        el.style.transition = 'transform 0.05s linear';
      });
      el.addEventListener('mouseleave', function() {
        el.style.transform  = '';
        el.style.transition = 'transform 0.55s cubic-bezier(0.16,1,0.3,1)';
      });
    });
  }

  /* ─────────────────────────────────────────────────
     TEAM CARD CURSOR GLOW
  ───────────────────────────────────────────────── */
  function initTeamGlow() {
    document.querySelectorAll('.team-card').forEach(function(card) {
      card.addEventListener('mousemove', function(e) {
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
      position:'fixed', width:'360px', height:'360px', borderRadius:'50%',
      pointerEvents:'none', zIndex:'0',
      background:'radial-gradient(circle, hsla(225,80%,56%,0.07) 0%, transparent 70%)',
      transform:'translate(-50%,-50%)', mixBlendMode:'screen', willChange:'left,top',
    });
    document.body.appendChild(trail);
    var tx=0, ty=0, lx=0, ly=0;
    document.addEventListener('mousemove', function(e) { tx=e.clientX; ty=e.clientY; }, { passive:true });
    (function loop() {
      lx += (tx-lx)*0.08; ly += (ty-ly)*0.08;
      trail.style.left = lx+'px'; trail.style.top = ly+'px';
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
