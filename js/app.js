/**
 * app.js
 * -----------------------------------------------------------------------
 * Global site behavior shared across index.html / about.html / dashboard.html:
 *   - Loading screen
 *   - Navbar (scroll state, mobile menu, active link)
 *   - Particle background
 *   - Hero watermark parallax + glow
 *   - Lenis smooth scroll + GSAP entrance animations
 *   - Social icon wiring from config.js (hides/disables missing links)
 *   - Footer year, logo injection
 *
 * Depends on: config.js (must load first). GSAP / Lenis are optional —
 * every block below feature-detects them so the site still works if a
 * CDN script hasn't been added to a given page yet.
 * -----------------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  initLoadingScreen();
  initLogos();
  initSocialLinks();
  initNavbar();
  initSmoothScroll();
  initParticles();
  initWatermarkParallax();
  initScrollAnimations();
  initFooterYear();
});

// ---------------------------------------------------------------------
// Loading screen
// ---------------------------------------------------------------------
function initLoadingScreen() {
  const loader = document.querySelector("[data-loader]");
  if (!loader) return;

  const start = Date.now();
  const minMs = (window.CONFIG && CONFIG.UX.LOADING_SCREEN_MIN_MS) || 1200;

  const hide = () => {
    const elapsed = Date.now() - start;
    const wait = Math.max(0, minMs - elapsed);
    setTimeout(() => {
      loader.classList.add("is-hidden");
      document.body.classList.remove("no-scroll");
      setTimeout(() => loader.remove(), 600);
    }, wait);
  };

  if (document.readyState === "complete") {
    hide();
  } else {
    window.addEventListener("load", hide);
  }
}

// ---------------------------------------------------------------------
// Inject logo image sources from config into every [data-logo] element
// (navbar, footer, favicon, loading screen)
// ---------------------------------------------------------------------
function initLogos() {
  if (!window.CONFIG) return;

  document.querySelectorAll("[data-logo]").forEach((el) => {
    const variant = el.getAttribute("data-logo"); // "mark" | "banner"
    const src = variant === "banner"
      ? CONFIG.ASSETS.LOGO_BANNER
      : CONFIG.ASSETS.LOGO_MARK;

    if (el.tagName === "IMG") {
      el.src = src;
      el.alt = `${CONFIG.TOKEN.NAME} (${CONFIG.TOKEN.SYMBOL})`;
    } else {
      el.style.backgroundImage = `url("${src}")`;
    }
  });

  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = CONFIG.ASSETS.FAVICON;

  document.querySelectorAll("[data-token-symbol]").forEach((el) => {
    el.textContent = CONFIG.TOKEN.SYMBOL;
  });
  document.querySelectorAll("[data-token-name]").forEach((el) => {
    el.textContent = CONFIG.TOKEN.NAME;
  });
  document.querySelectorAll("[data-token-tagline]").forEach((el) => {
    el.textContent = CONFIG.TOKEN.TAGLINE;
  });
}

// ---------------------------------------------------------------------
// Social icons: wire hrefs from config, hide any icon with no URL set,
// and mark the X icon as "placeholder" until a real link is added.
// ---------------------------------------------------------------------
function initSocialLinks() {
  if (!window.CONFIG) return;

  const map = {
    telegram: CONFIG.SOCIALS.TELEGRAM,
    x: CONFIG.SOCIALS.X,
    discord: CONFIG.SOCIALS.DISCORD,
    website: CONFIG.SOCIALS.WEBSITE
  };

  document.querySelectorAll("[data-social]").forEach((link) => {
    const key = link.getAttribute("data-social");
    const url = map[key];

    if (!url || !url.trim()) {
      if (key === "x") {
        // Per spec: show the X icon even without a URL yet, just inert.
        link.setAttribute("aria-disabled", "true");
        link.classList.add("is-placeholder");
        link.removeAttribute("href");
        link.addEventListener("click", (e) => e.preventDefault());
      } else {
        // Any other unset social link is fully hidden.
        link.style.display = "none";
      }
      return;
    }

    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
}

// ---------------------------------------------------------------------
// Navbar: scrolled state + mobile menu toggle + active link highlight
// ---------------------------------------------------------------------
function initNavbar() {
  const nav = document.querySelector("[data-navbar]");
  if (!nav) return;

  const toggle = nav.querySelector("[data-nav-toggle]");
  const menu = nav.querySelector("[data-nav-menu]");

  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("no-scroll", isOpen);
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("no-scroll");
      });
    });
  }

  // Highlight the current page's nav link
  const current = window.location.pathname.split("/").pop() || "index.html";
  nav.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === current || (current === "" && href === "index.html")) {
      link.classList.add("is-active");
    }
  });
}

// ---------------------------------------------------------------------
// Lenis smooth scroll (feature-detected; no-op if the CDN script isn't
// included on a page or the user prefers reduced motion)
// ---------------------------------------------------------------------
function initSmoothScroll() {
  if (!window.CONFIG || !CONFIG.UX.ENABLE_LENIS_SMOOTH_SCROLL) return;
  if (typeof window.Lenis === "undefined") return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const lenis = new window.Lenis({
    duration: 1.1,
    smoothWheel: true
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  window.__lenis = lenis;

  // Keep GSAP ScrollTrigger (if present) in sync with Lenis
  if (window.gsap && window.ScrollTrigger) {
    lenis.on("scroll", window.ScrollTrigger.update);
    window.gsap.ticker.add((time) => lenis.raf(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
  }
}

// ---------------------------------------------------------------------
// Lightweight canvas particle background
// (self-contained — no external library required)
// ---------------------------------------------------------------------
function initParticles() {
  if (!window.CONFIG || !CONFIG.UX.ENABLE_PARTICLES) return;

  const canvas = document.querySelector("[data-particles]");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];
  let width, height;
  let animationId;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    width = canvas.width = canvas.offsetWidth * devicePixelRatio;
    height = canvas.height = canvas.offsetHeight * devicePixelRatio;
  }

  function makeParticles() {
    const count = Math.min(90, Math.floor((width * height) / 60000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.5 + 0.15
    }));
  }

  const primary = (window.CONFIG && CONFIG.THEME.PRIMARY) || "#8B5CF6";
  const accent = (window.CONFIG && CONFIG.THEME.ACCENT) || "#3B82F6";

  function hexToRgb(hex) {
    const m = hex.replace("#", "").match(/.{1,2}/g);
    return m.map((h) => parseInt(h, 16)).join(",");
  }
  const primaryRgb = hexToRgb(primary);
  const accentRgb = hexToRgb(accent);

  function draw() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      const color = i % 3 === 0 ? accentRgb : primaryRgb;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * devicePixelRatio, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color}, ${p.alpha})`;
      ctx.fill();
    });

    if (!prefersReduced) {
      animationId = requestAnimationFrame(draw);
    }
  }

  resize();
  makeParticles();
  draw();

  window.addEventListener("resize", () => {
    cancelAnimationFrame(animationId);
    resize();
    makeParticles();
    draw();
  });
}

// ---------------------------------------------------------------------
// Hero watermark: subtle glow pulse + mouse/scroll parallax
// ---------------------------------------------------------------------
function initWatermarkParallax() {
  if (!window.CONFIG || !CONFIG.UX.ENABLE_PARALLAX) return;

  const watermark = document.querySelector("[data-watermark]");
  if (!watermark) return;

  watermark.style.opacity = String(CONFIG.UX.WATERMARK_OPACITY);

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

  window.addEventListener("mousemove", (e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    targetX = ((e.clientX - cx) / cx) * 14;
    targetY = ((e.clientY - cy) / cy) * 14;
  });

  window.addEventListener("scroll", () => {
    targetY += 0; // scroll-driven parallax handled via translateY below
  }, { passive: true });

  function animate() {
    currentX += (targetX - currentX) * 0.05;
    currentY += (targetY - currentY) * 0.05;
    const scrollOffset = window.scrollY * 0.08;

    watermark.style.transform =
      `translate3d(${currentX}px, ${currentY - scrollOffset}px, 0) scale(1.02)`;

    requestAnimationFrame(animate);
  }
  animate();
}

// ---------------------------------------------------------------------
// GSAP scroll-triggered entrance animations (feature-detected)
// ---------------------------------------------------------------------
function initScrollAnimations() {
  if (typeof window.gsap === "undefined") {
    // Fallback: simple IntersectionObserver reveal so content isn't
    // invisible if GSAP isn't loaded on a given page.
    const els = document.querySelectorAll("[data-animate]");
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    els.forEach((el) => io.observe(el));
    return;
  }

  window.gsap.registerPlugin(window.ScrollTrigger || {});

  document.querySelectorAll("[data-animate]").forEach((el, i) => {
    window.gsap.fromTo(
      el,
      { autoAlpha: 0, y: 32 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: (i % 4) * 0.06,
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true
        }
      }
    );
  });

  // Hero entrance (elements marked [data-hero-in] animate immediately,
  // not on scroll, once the loader clears)
  const heroEls = document.querySelectorAll("[data-hero-in]");
  if (heroEls.length) {
    window.gsap.fromTo(
      heroEls,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.12, delay: 0.3 }
    );
  }
}

// ---------------------------------------------------------------------
// Footer year
// ---------------------------------------------------------------------
function initFooterYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}
