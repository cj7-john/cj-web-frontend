/* ═══════════════════════════════════════════════════
   CJ Web Studio v3 — Main JS
   Nav · FAQ · Reveal · Counters · Parallax · Scrollytelling
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Navbar ── */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ── Hamburger ── */
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Active nav link ── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__links a, .mobile-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* ── FAQ ── */
  document.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(f => f.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ── Scroll reveal ── */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });
    revealEls.forEach(el => revealObs.observe(el));
  }

  /* ── Counter animation ── */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          const isDecimal = String(target).includes('.');
          const duration = 1800;
          const start = performance.now();
          const animate = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = (isDecimal ? (eased * target).toFixed(1) : Math.floor(eased * target)) + suffix;
            if (t < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          counterObs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => counterObs.observe(el));
  }

  /* ── Contact form submission / Django integration ── */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : null;
      const feedback = document.getElementById('contactFeedback');
      const successPanel = document.getElementById('contactSuccessPanel');
      const formWrapper = document.getElementById('contact-form-wrapper');

      if (feedback) {
        feedback.style.display = 'none';
        feedback.className = 'form-message';
        feedback.textContent = '';
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sending...';
      }

      const formData = new FormData(form);
      const endpoint = form.action || window.location.href;
      const csrfToken = formData.get('csrfmiddlewaretoken') || '';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: formData
        });

        const result = await response.json().catch(() => ({}));
        const message = result.message || result.error || (response.ok ? 'Your message was sent.' : 'We could not submit the form.');

        if (response.ok) {
          if (feedback) {
            feedback.classList.add('form-message--success');
            feedback.textContent = message;
            feedback.style.display = 'block';
          }
          if (formWrapper) formWrapper.style.display = 'none';
          if (successPanel) successPanel.style.display = 'block';
          form.reset();
          if (successPanel) {
            successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          if (feedback) {
            feedback.classList.add('form-message--error');
            feedback.textContent = message;
            feedback.style.display = 'block';
            feedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } catch (error) {
        if (feedback) {
          feedback.classList.add('form-message--error');
          feedback.textContent = 'Network error. Please try again or contact us on WhatsApp.';
          feedback.style.display = 'block';
          feedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        console.error('Contact form submission failed:', error);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          if (originalBtnText) submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  }

  /* ── Parallax on scroll ── */
  const parallaxEls = document.querySelectorAll('.parallax-bg');
  if (parallaxEls.length) {
    window.addEventListener('scroll', () => {
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.speed) || 0.08;
        const offset = window.scrollY;
        el.style.transform = `translateY(${offset * speed}px)`;
      });
    }, { passive: true });
  }

  /* ── Bento progress bars (animate in) ── */
  const progressFills = document.querySelectorAll('.bento-progress__fill[data-width]');
  if (progressFills.length) {
    const progressObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.width = entry.target.dataset.width;
          progressObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    progressFills.forEach(el => {
      el.style.width = '0%';
      progressObs.observe(el);
    });
  }

  /* ── Scrollytelling ── */
  const scrollyPanels = document.querySelectorAll('.scrolly-panel');
  const scrollyVisual = document.querySelector('.scrolly-visual');
  const scrollyIcon = document.querySelector('.scrolly-visual__icon');
  const scrollyBg = document.querySelector('.scrolly-visual__bg');

  if (scrollyPanels.length && scrollyVisual) {
    const panelData = [
      {
        icon: '🎨',
        bg: 'radial-gradient(ellipse at 50% 50%, hsla(225,80%,56%,0.18) 0%, transparent 70%)',
        activeClass: 'scrolly-visual--design'
      },
      {
        icon: '⚡',
        bg: 'radial-gradient(ellipse at 50% 50%, hsla(155,70%,45%,0.18) 0%, transparent 70%)',
        activeClass: 'scrolly-visual--perf'
      },
      {
        icon: '🌐',
        bg: 'radial-gradient(ellipse at 50% 50%, hsla(199,89%,48%,0.18) 0%, transparent 70%)',
        activeClass: 'scrolly-visual--3d'
      },
      {
        icon: '📱',
        bg: 'radial-gradient(ellipse at 50% 50%, hsla(263,70%,60%,0.18) 0%, transparent 70%)',
        activeClass: 'scrolly-visual--mobile'
      }
    ];

    const panelObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = parseInt(entry.target.dataset.panelIndex);
          if (!isNaN(idx) && panelData[idx]) {
            const data = panelData[idx];
            if (scrollyIcon) scrollyIcon.textContent = data.icon;
            if (scrollyBg) scrollyBg.style.background = data.bg;
          }
        }
      });
    }, { threshold: 0.5 });

    scrollyPanels.forEach((panel, i) => {
      panel.dataset.panelIndex = i;
      panelObs.observe(panel);
    });
  }

  /* ── Cursor glow effect (desktop only, optimized) ── */
  if (window.innerWidth > 1024 && window.matchMedia('(hover: hover)').matches) {
    const glow = document.createElement('div');
    glow.style.cssText = `
      position: fixed;
      width: 300px; height: 300px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
      background: radial-gradient(circle, hsla(225,80%,56%,0.06) 0%, transparent 70%);
      transform: translate(-50%, -50%);
      transition: opacity 0.3s;
      mix-blend-mode: screen;
      will-change: transform;
    `;
    document.body.appendChild(glow);

    let rafId = null;
    let lastMove = 0;

    document.addEventListener('mousemove', (e) => {
      // Throttle updates for performance
      const now = Date.now();
      if (now - lastMove < 16) return; // ~60fps
      lastMove = now;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
        rafId = null;
      });
    });
  }

  /* ── Magnetic buttons ── */
  document.querySelectorAll('.btn--primary').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px) translateY(-2px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

});
