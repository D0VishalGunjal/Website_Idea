/* ======================================================================
   ForschMedX — script.js (full version with background video + one-shot typewriter)
   Vanilla JS only. No external libraries.

   WHAT THIS FILE DOES
   -------------------
   1) Smooth scroll for in-page links (respects prefers-reduced-motion)
   2) Header shadow when scrolling
   3) Section reveal animations via IntersectionObserver
   4) Navigation active-state syncing while you scroll
   5) HERO TYPEWRITER: types "IMAGINE | INITIATE | INNOVATE" ONCE, then stays.
      - Caret hides at the end. No looping, no deleting.
   6) HERO BACKGROUND VIDEO:
      - Autoplay muted video behind the hero text.
      - Optional "scroll-scrub" mode: as you scroll, the video scrubs forward/back.
        (gives a subtle 3D/progression feel without any 3D library)
   7) iOS fallback for fixed backgrounds
   8) Auto-update the footer year

   HOW TO ENABLE SCROLL-SCRUB VIDEO
   --------------------------------
   - Set options.enableScrollScrub = true (default below).
   - The script maps a scroll range to the video duration.
   - If user prefers reduced motion, this feature is disabled automatically.

   Assumptions in HTML/CSS:
   - <video class="hero-video" ...> is present inside .hero-media
   - .hero has .hero-overlay above the video for contrast
   - .hero.no-fixed is used as iOS fallback
====================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* -------------------------
     0) Options & utilities
  ------------------------- */
  const options = {
    // Typewriter behavior:
    typewriter: {
      words: ["IMAGINE |", "INITIATE |", "INNOVATE"], // final text becomes "IMAGINE | INITIATE | INNOVATE"
      typingSpeed: 90,     // ms per char while typing
      holdDelay: 600,      // pause between words
      loop: false,         // do not loop
      deleteMode: false,   // never delete
      buildAndStay: true,  // cumulatively build and then stop
      caretStyle: "pipe"   // "pipe" | "block" | "underline"
    },

    // Background video behavior:
    enableScrollScrub: true,     // if true, scrubs video with scroll (3D-like progression)
    scrubRangeMultiplier: 1.2,   // range = hero height * multiplier (tune feel)
    initialAutoplay: true        // auto play (muted) on load when not scrubbing
  };

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* -----------------------------------
     1) Smooth scrolling for anchor links
  ----------------------------------- */
  const navLinks = $$(".site-nav a, .cta-row a, .brand, .skip-link");
  navLinks.forEach(a => {
    const href = a.getAttribute("href") || "";
    if (!href.startsWith("#")) return;

    a.addEventListener("click", (e) => {
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      // Prefer instant jump if user asked to reduce motion
      if (prefersReduced) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 72);
        return;
      }

      const y = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: "smooth" });
      target.setAttribute("tabindex", "-1");
      setTimeout(() => target.focus({ preventScroll: true }), 400);
    });
  });

  /* -------------------------------
     2) Sticky header shadow on scroll
  ------------------------------- */
  const header = $(".site-header");
  const onScrollHeader = () => {
    if (window.scrollY > 10) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* --------------------------------------------------
     3) Reveal-on-scroll using IntersectionObserver
  -------------------------------------------------- */
  const revealEls = $$(".reveal");
  const ioReveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => ioReveal.observe(el));

  /* --------------------------------------------------
     4) Navigation active-state while scrolling
  -------------------------------------------------- */
  const sections = $$("section[id][data-nav]");
  const linkMap = new Map();
  sections.forEach(sec => {
    const link = $(`.site-nav a[href="#${sec.id}"]`);
    if (link) linkMap.set(sec, link);
  });
  const ioNav = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const link = linkMap.get(entry.target);
      if (!link) return;
      if (entry.isIntersecting) {
        $$(".site-nav a").forEach(a => a.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -50% 0px", threshold: 0.01 });
  sections.forEach(sec => ioNav.observe(sec));

  /* --------------------------------------------------
     5) Typewriter (runs once and stays)
  -------------------------------------------------- */
  const twNode = $("#typewriter");
  const caret = $("#caret");
  if (caret) {
    caret.classList.remove("pipe","block","underline");
    caret.classList.add(options.typewriter.caretStyle);
  }

  (function runTypewriter(){
    if (!twNode) return;

    const cfg = options.typewriter;
    let wordIndex = 0, charIndex = 0;
    let builtText = "";

    function loop() {
      const current = cfg.words[wordIndex];

      // Build cumulatively and STOP at the end
      if (charIndex < current.length) {
        twNode.textContent = builtText + current.slice(0, charIndex + 1);
        charIndex++;
        setTimeout(loop, cfg.typingSpeed);
        return;
      }

      // Finished a word: append to built string
      builtText += (builtText ? " " : "") + current;
      wordIndex++;

      // If we've typed all words exactly once: set final text, hide caret, stop forever
      if (wordIndex >= cfg.words.length) {
        twNode.textContent = builtText;
        if (caret) caret.style.visibility = "hidden";
        return; // Done until page refresh
      }

      // Move to next word
      charIndex = 0;
      setTimeout(loop, cfg.holdDelay);
    }

    loop();
  })();

  /* --------------------------------------------------
     6) Background video (autoplay + optional scroll-scrub)
  -------------------------------------------------- */
  const hero = $(".hero");
  const video = $(".hero-video");

  // iOS fixed-background fallback (also applies to video positioning)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS && hero) hero.classList.add("no-fixed");

  if (video) {
    // Ensure muted + inline to satisfy autoplay policies
    video.muted = true;
    video.playsInline = true;

    // If we are NOT in scroll scrub mode, attempt to autoplay once ready.
    const tryAutoplay = () => {
      if (options.enableScrollScrub && !prefersReduced) {
        // In scrub mode, keep the video paused; currentTime will be controlled by scroll.
        video.pause();
        return;
      }
      if (options.initialAutoplay) {
        // Some browsers require a play() call; it's safe because video is muted.
        const p = video.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => { /* Ignore autoplay rejection silently */ });
        }
      }
    };

    if (video.readyState >= 2) tryAutoplay();
    else video.addEventListener("canplay", tryAutoplay, { once: true });

    // ------- Scroll-scrub (3D-like progression) -------
    if (options.enableScrollScrub && !prefersReduced) {
      let duration = 0;
      let scrubRangePx = 0;
      let heroTop = 0;

      const computeMetrics = () => {
        duration = video.duration || 0;
        const heroRect = hero ? hero.getBoundingClientRect() : { height: window.innerHeight };
        const heroHeight = heroRect.height || window.innerHeight;
        scrubRangePx = heroHeight * options.scrubRangeMultiplier;

        // Distance from top of document to top of hero
        const rect = hero.getBoundingClientRect();
        heroTop = rect.top + window.scrollY;
      };

      // Update metrics when metadata is known and on resize
      const onMeta = () => { computeMetrics(); onScroll(); };
      if (video.readyState >= 1) onMeta();
      else video.addEventListener("loadedmetadata", onMeta, { once: true });

      window.addEventListener("resize", computeMetrics);

      // Map scroll position to video currentTime
      const onScroll = () => {
        if (!duration) return;
        // progress in [0, 1] across the chosen range starting at the hero
        const sc = window.scrollY - heroTop;
        const progress = Math.min(1, Math.max(0, sc / scrubRangePx));
        const t = progress * duration;

        // Avoid thrashing:
        if (Math.abs(video.currentTime - t) > 0.03) {
          video.currentTime = t;
        }
        // Keep paused so it doesn't keep playing when user stops scrolling
        if (!video.paused) video.pause();
      };

      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  /* -----------------------------
     7) Footer year (dynamic)
  ----------------------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
