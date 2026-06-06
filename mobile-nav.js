/**
 * mobile-nav.js  —  Lunar Heritage · Hamburger / Slide-out Navigation  v3.0
 * ─────────────────────────────────────────────────────────────────────────
 * Auto-injects the hamburger button + drawer overlay into every page
 * that uses <nav class="site-nav">.
 *
 * WHAT IT DOES
 *  1. Reads the existing .nav-links items (or a [data-mobile-nav] list).
 *  2. Creates: .hamburger-btn, #mobile-nav-overlay, #mobile-nav-drawer.
 *  3. Wires up open / close / Escape / focus-trap / scroll-lock.
 *  4. Works on ALL pages — no per-page configuration needed.
 *
 * CUSTOM LINKS (optional)
 *  On pages without .nav-links you can hard-code drawer content by
 *  adding <template id="mobile-nav-tpl"> ... </template> before this
 *  script. Its innerHTML will be used as the link list.
 *
 * ACCESSIBILITY  (WCAG 2.1 AA)
 *  • aria-expanded on the toggle button
 *  • aria-controls → drawer id
 *  • aria-modal + role="dialog" on the drawer
 *  • Escape key closes
 *  • Focus is trapped inside while open (Tab / Shift+Tab)
 *  • First focusable element receives focus on open
 *  • Focus returns to toggle button on close
 *
 * MOBILE TOOLTIP FIX
 *  All .nav-icon tooltip hover styles in global.css are already wrapped
 *  inside @media (hover: hover) and (pointer: fine) so they never
 *  trigger on touch screens. This script additionally removes tooltip
 *  DOM nodes on touch-only viewports (< 640 px) for extra safety.
 */
(function () {
  'use strict';

  /* ── 1. Constants ──────────────────────────────────────────────────── */
  const BREAKPOINT = 768;         // px — matches CSS @media (max-width: 768px)
  const DRAWER_ID  = 'mobile-nav-drawer';
  const OVERLAY_ID = 'mobile-nav-overlay';
  const TOGGLE_CLS = 'hamburger-btn';
  const OPEN_CLS   = 'open';
  const BODY_LOCK  = 'mnav-open';

  // Emoji icons keyed on href pattern for auto-generated link list
  const LINK_ICONS = {
    'bwd':        '🏛️',
    'di-san':     '🏺',
    'ai':         '🤖',
    'explore':    '🔭',
    'dashboard':  '📰',
    'map':        '🗺️',
    'passport':   '🛂',
    'messages':   '💬',
    'settings':   '⚙️',
    'login':      '🔑',
    'signup':     '✨',
    '#heritage':  '🏔️',
    '#folk':      '🎎',
    '#join':      '🏮',
  };

  function guessIcon(href) {
    if (!href) return '🔗';
    const h = href.toLowerCase();
    for (const [key, icon] of Object.entries(LINK_ICONS)) {
      if (h.includes(key)) return icon;
    }
    return '🔗';
  }

  /* ── 2. Guard: only run on pages with .site-nav ────────────────────── */
  const nav = document.querySelector('nav.site-nav, nav[class*="site-nav"]');
  if (!nav) return;

  // Guard against double-inclusion
  if (document.getElementById(DRAWER_ID)) return;

  /* ── 3. Collect link data ──────────────────────────────────────────── */
  let linkData = [];
  const tpl    = document.getElementById('mobile-nav-tpl');

  if (!tpl) {
    // Priority 1: harvest from existing .nav-links <a> elements
    const desktopLinks = nav.querySelectorAll('.nav-links a');
    desktopLinks.forEach(a => {
      linkData.push({
        href:     a.getAttribute('href') || '#',
        label:    a.textContent.trim(),
        icon:     guessIcon(a.getAttribute('href')),
        active:   a.classList.contains('active'),
        external: a.target === '_blank',
      });
    });

    // Priority 2: fallback list for pages without .nav-links
    if (linkData.length === 0) {
      linkData = [
        { href: '#heritage',   label: 'Di sản',      icon: '🏔️' },
        { href: '#folk-games', label: 'Trò chơi',    icon: '🎎' },
        { href: '#join',       label: 'Ước nguyện',  icon: '🏮' },
        { href: 'ai.html',     label: 'Thầy Đồ AI',  icon: '🤖' },
        { href: 'di-san.html', label: 'Bộ sưu tập',  icon: '🏺' },
      ];
    }
  }

  /* ── 4. Build HTML elements ────────────────────────────────────────── */

  // 4a. Hamburger button — 3 animated bars
  const toggleBtn = document.createElement('button');
  toggleBtn.className = TOGGLE_CLS;
  toggleBtn.id        = 'hamburger-toggle';
  toggleBtn.type      = 'button';
  toggleBtn.setAttribute('aria-label',    'Mở menu điều hướng');
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.setAttribute('aria-controls', DRAWER_ID);
  toggleBtn.innerHTML = `
    <span class="bar" aria-hidden="true"></span>
    <span class="bar" aria-hidden="true"></span>
    <span class="bar" aria-hidden="true"></span>
  `;

  // 4b. Scrim overlay (click-to-close backdrop)
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('aria-hidden', 'true');

  // 4c. Drawer panel
  const drawer = document.createElement('div');
  drawer.id = DRAWER_ID;
  drawer.setAttribute('role',       'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Menu điều hướng di động');

  // Build drawer links HTML
  let linksHTML = '';
  if (tpl) {
    linksHTML = tpl.innerHTML;
  } else {
    linksHTML = linkData.map(item => `
      <a href="${item.href}"
         ${item.active   ? 'class="active" aria-current="page"' : ''}
         ${item.external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
        <span class="mnav-icon" aria-hidden="true">${item.icon}</span>
        ${item.label}
      </a>
    `).join('');
  }

  // Mirror any auth/CTA buttons from the desktop nav into a drawer footer
  const loginBtn  = nav.querySelector('#navLoginLink, a[href*="login"]');
  const signupBtn = nav.querySelector('a[href*="signup"], a[href*="dashboard"]');
  let footerHTML  = '';
  if (loginBtn || signupBtn) {
    footerHTML = `<div class="mnav-footer">`;
    if (signupBtn) {
      footerHTML += `<a href="${signupBtn.getAttribute('href')}" class="btn btn-primary w-full" style="justify-content:center">${signupBtn.textContent.trim()}</a>`;
    }
    if (loginBtn) {
      footerHTML += `<a href="${loginBtn.getAttribute('href')}" class="btn btn-outline w-full" style="justify-content:center">${loginBtn.textContent.trim()}</a>`;
    }
    footerHTML += `</div>`;
  }

  drawer.innerHTML = `
    <div class="mnav-header">
      <span class="mnav-brand" aria-hidden="true">LUNAR HERITAGE</span>
      <button class="mnav-close" id="mnav-close-btn" type="button"
              aria-label="Đóng menu">&#x2715;</button>
    </div>
    <nav class="mnav-links" aria-label="Liên kết điều hướng chính">
      ${linksHTML}
    </nav>
    ${footerHTML}
  `;

  /* ── 5. Mount elements into the DOM ────────────────────────────────── */
  // Find the best injection point for the hamburger button
  const navInner = nav.querySelector('.nav-inner, .container, [class*="nav-in"]') || nav;

  // Append to the right-side action group if it exists, else to nav itself
  const actionGroup =
    navInner.querySelector('#nav-actions, .nav-actions, .nav-right') ||
    navInner.querySelector('[style*="display:flex"]')                 ||
    null;

  if (actionGroup) {
    actionGroup.appendChild(toggleBtn);
  } else {
    navInner.appendChild(toggleBtn);
  }

  // Append overlay and drawer to <body> so no z-index fights with the nav
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  /* ── 6. State management ───────────────────────────────────────────── */
  let isOpen = false;

  function openDrawer() {
    isOpen = true;
    drawer.classList.add(OPEN_CLS);
    overlay.classList.add(OPEN_CLS);
    document.body.classList.add(BODY_LOCK);
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.setAttribute('aria-label',    'Đóng menu điều hướng');

    // Move focus to first focusable element inside the drawer
    requestAnimationFrame(() => {
      const first = getFocusables()[0];
      if (first) first.focus();
    });
  }

  function closeDrawer() {
    if (!isOpen) return;
    isOpen = false;
    drawer.classList.remove(OPEN_CLS);
    overlay.classList.remove(OPEN_CLS);
    document.body.classList.remove(BODY_LOCK);
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-label',    'Mở menu điều hướng');
    toggleBtn.focus();   // return focus to the trigger
  }

  function toggleDrawer() {
    isOpen ? closeDrawer() : openDrawer();
  }

  /* ── 7. Focus trap — keeps keyboard focus inside the open drawer ──── */
  function getFocusables() {
    return Array.from(
      drawer.querySelectorAll(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.closest('[hidden]'));
  }

  function trapFocus(e) {
    if (!isOpen || e.key !== 'Tab') return;
    const focusables = getFocusables();
    if (focusables.length === 0) { e.preventDefault(); return; }

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  /* ── 8. Event wiring ───────────────────────────────────────────────── */
  toggleBtn.addEventListener('click', toggleDrawer);
  overlay.addEventListener('click', closeDrawer);
  document.getElementById('mnav-close-btn').addEventListener('click', closeDrawer);

  // Escape key closes the drawer
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) { e.preventDefault(); closeDrawer(); }
    trapFocus(e);
  });

  // Close when an anchor link inside the drawer is clicked
  drawer.querySelectorAll('.mnav-links a').forEach(link => {
    link.addEventListener('click', () => {
      // Always close on link click — page will navigate anyway
      closeDrawer();
    });
  });

  // Close if the viewport is resized above the mobile breakpoint
  const resizeObserver = window.ResizeObserver
    ? new ResizeObserver(() => { if (window.innerWidth > BREAKPOINT && isOpen) closeDrawer(); })
    : null;

  if (resizeObserver) {
    resizeObserver.observe(document.documentElement);
  } else {
    window.addEventListener('resize', () => {
      if (window.innerWidth > BREAKPOINT && isOpen) closeDrawer();
    }, { passive: true });
  }

  /* ── 9. Highlight the active link based on the current page ─────────── */
  const currentFile = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
  drawer.querySelectorAll('.mnav-links a').forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (href && !href.startsWith('#') && href.includes(currentFile)) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  /* ── 10. Mobile tooltip suppression ─────────────────────────────────── *
   *  The CSS @media (hover: hover) guard in global.css already prevents    *
   *  .nav-icon tooltip :hover styles on touch devices.                     *
   *  As a belt-and-suspenders measure, we also remove tooltip DOM nodes    *
   *  entirely on true touch viewports so they cannot be accidentally shown  *
   *  via programmatic focus or platform edge-cases.                         */
  function suppressTouchTooltips() {
    // Only act on devices that lack a fine pointer (touch-primary)
    if (window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.nav-icon .tooltip').forEach(tip => tip.remove());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', suppressTouchTooltips);
  } else {
    suppressTouchTooltips();
  }

})();
