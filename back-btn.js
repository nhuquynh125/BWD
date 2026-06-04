/**
 * back-btn.js  —  Lunar Heritage · Universal "← Quay về" Button  v3.0
 * ─────────────────────────────────────────────────────────────────────
 * Dynamically injects a styled "← Quay về" (Back to Home) anchor into
 * any sub-page that has a .site-nav navbar, without overlapping it.
 *
 * DESIGN PRINCIPLES
 *  • The button ALWAYS lives INSIDE the navbar — never floating on top of it.
 *  • It occupies the left-most slot of .nav-inner, before the logo,
 *    OR replaces a legacy "quay về / thoát / home" link when found.
 *  • On pages WITHOUT .site-nav (rare fallback) it is positioned
 *    fixed + top = var(--nav-height) + 12px so it sits below any nav.
 *  • Fully replaces any legacy "quay về / thoát / home" link it finds.
 *  • Skipped on the homepage, social pages, and the login/signup pages.
 *
 * ACCESSIBILITY  (WCAG 2.1 AA)
 *  • <a> element (not <button>) — it navigates, not performs an action.
 *  • Descriptive aria-label for screen readers.
 *  • :focus-visible ring visible only via keyboard navigation.
 *  • Arrow icon wrapped in aria-hidden="true".
 *
 * SKIP CONDITIONS (early-exit)
 *  1. Current page IS the homepage (BWD.html / index.html / root "/")
 *  2. Page loads style-zen.css → social section (uses sidenav instead)
 *  3. Page is login.html or signup.html (they manage their own back link)
 */
(function () {
  'use strict';

  /* ── 1. Determine current page filename ──────────────────────────────── */
  const page = (window.location.pathname.split('/').pop() || '').toLowerCase();

  /* ── 2. Skip conditions ─────────────────────────────────────────────── */
  // 2a. Homepage
  if (page === 'bwd.html' || page === '' || page === 'index.html') return;

  // 2b. Auth pages (they have their own back controls)
  if (page === 'login.html' || page === 'signup.html') return;

  // 2c. Social / sidenav pages
  const isSocialPage =
    !!document.querySelector('link[href*="style-zen"]') ||
    !!document.querySelector('.sidenav');
  if (isSocialPage) return;

  /* ── 3. Prevent double-injection ────────────────────────────────────── */
  if (document.getElementById('lunar-back-btn')) return;

  /* ── 4. Design tokens (mirror of global.css :root values) ───────────── */
  const GOLD       = '#d4af37';
  const GOLD_ALPHA = 'rgba(212, 175, 55, 0.10)';
  const GOLD_GLOW  = 'rgba(212, 175, 55, 0.20)';

  /* ── 5. Inject scoped CSS ───────────────────────────────────────────── */
  if (!document.getElementById('lunar-back-btn-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'lunar-back-btn-style';
    styleEl.textContent = `
      /* ─── Back button — base layout ─── */
      #lunar-back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 7px 14px;

        /* Colours — matches .nav-cta in global.css */
        background-color: transparent;
        color: ${GOLD};
        border: 1px solid rgba(212, 175, 55, 0.22);
        border-radius: 3px;

        /* Typography */
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.09em;
        text-decoration: none;
        text-transform: uppercase;
        white-space: nowrap;

        /* Layout behaviour */
        cursor: pointer;
        flex-shrink: 0;

        /* Transitions */
        transition:
          background    0.22s ease,
          border-color  0.22s ease,
          box-shadow    0.22s ease,
          transform     0.18s ease;
      }

      /* Hover state — only on pointer devices to avoid stuck state on touch */
      @media (hover: hover) and (pointer: fine) {
        #lunar-back-btn:hover {
          background: ${GOLD_ALPHA};
          border-color: rgba(212, 175, 55, 0.55);
          box-shadow: 0 0 18px ${GOLD_GLOW};
        }
      }

      #lunar-back-btn:active {
        transform: translateY(1px) scale(0.98);
      }

      /* Keyboard focus ring */
      #lunar-back-btn:focus-visible {
        outline: 2px solid ${GOLD};
        outline-offset: 3px;
      }

      /* Animated left-arrow icon */
      #lunar-back-btn .lhbb-arrow {
        display: inline-block;
        font-style: normal;
        font-size: 13px;
        line-height: 1;
        transition: transform 0.2s ease;
      }
      @media (hover: hover) and (pointer: fine) {
        #lunar-back-btn:hover .lhbb-arrow {
          transform: translateX(-3px);
        }
      }

      /* ─── Fixed fallback mode (no .site-nav found) ───────────────────
         Floats just BELOW the navbar height token so it never overlaps.
         Uses the CSS custom property with a safe pixel fallback.        */
      #lunar-back-btn.lhbb-fixed {
        position: fixed;
        top: calc(var(--nav-height, 72px) + 12px);
        left: 20px;
        z-index: 999;           /* intentionally below site-nav z-index 1000 */
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
      }

      /* ─── On very small screens, shrink padding so it doesn't crowd ─── */
      @media (max-width: 400px) {
        #lunar-back-btn {
          padding: 6px 10px;
          font-size: 10px;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  /* ── 6. Create the button element ───────────────────────────────────── */
  const btn = document.createElement('a');
  btn.id    = 'lunar-back-btn';
  btn.href  = 'BWD.html';
  btn.setAttribute('aria-label', 'Quay về trang chủ Lunar Heritage');
  btn.title = 'Quay về trang chủ';
  btn.innerHTML =
    '<span class="lhbb-arrow" aria-hidden="true">&#8592;</span>' +
    '<span>Quay về</span>';

  /* ── 7. Mounting strategy ───────────────────────────────────────────── *
   *                                                                        *
   * Priority order:                                                        *
   *  P1 — Replace an existing "quay về / thoát / home" anchor in the nav. *
   *  P2 — Prepend into .nav-inner BEFORE the logo (visually left-most).   *
   *  P3 — Append into the first rendered flex-row div inside the nav.     *
   *  P4 — Append into the <nav> itself.                                   *
   *  P5 — Fixed overlay (pushed below nav height; emergency fallback).    *
   ×                                                                        */
  function mount() {
    if (document.getElementById('lunar-back-btn')) return; // guard

    const siteNav = document.querySelector('nav.site-nav, nav[class*="site-nav"]');

    /* P1 — Replace an existing redundant home link */
    if (siteNav) {
      const links = siteNav.querySelectorAll('a');
      for (const link of links) {
        const text = link.textContent.toLowerCase();
        const href = (link.getAttribute('href') || '').toLowerCase();
        if (
          (text.includes('quay') || text.includes('thoát') || text.includes('home')) &&
          (href.includes('bwd') || href.includes('index') || href === '/')
        ) {
          link.replaceWith(btn);
          return;
        }
      }
    }

    /* P2 — Prepend to .nav-inner so it sits at the far left */
    if (siteNav) {
      const navInner = siteNav.querySelector('.nav-inner, [class*="nav-in"]');
      if (navInner) {
        // Insert as first child so the button appears at the left edge of the bar
        navInner.insertBefore(btn, navInner.firstChild);
        return;
      }
    }

    /* P3 — Append to first flex-row div inside the nav */
    if (siteNav) {
      const divs = siteNav.querySelectorAll('div');
      for (const d of divs) {
        if (window.getComputedStyle(d).display.includes('flex')) {
          d.appendChild(btn);
          return;
        }
      }
      /* P4 — nav itself */
      siteNav.appendChild(btn);
      return;
    }

    /* P5 — Fixed fallback: no site-nav found at all */
    btn.classList.add('lhbb-fixed');
    document.body.appendChild(btn);
  }

  /* ── 8. Run after DOM is ready ──────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

})();
