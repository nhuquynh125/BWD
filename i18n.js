/**
 * i18n.js — LUNAR HERITAGE Internationalization Manager
 * Lightweight i18n without external dependencies.
 * Supports: vi (default), en
 * Usage:
 *   await LunarI18n.init();
 *   LunarI18n.t('heritage:explore_3d');
 *   LunarI18n.switchLang('en');
 */

const LunarI18n = (() => {
  const SUPPORTED = ['vi', 'en'];
  const NAMESPACES = ['common', 'heritage', 'gamification', 'booking'];
  const BASE_PATH  = '/locales';

  let _lang  = 'vi';
  let _cache = {};   // { 'vi:common': { key: val }, ... }

  // ── Internal helpers ─────────────────────────────────────────
  async function _loadNamespace(lang, ns) {
    const key = `${lang}:${ns}`;
    if (_cache[key]) return;
    try {
      const r = await fetch(`${BASE_PATH}/${lang}/${ns}.json`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      _cache[key] = await r.json();
    } catch (e) {
      console.warn(`[i18n] Could not load ${key}:`, e.message);
      _cache[key] = {};
    }
  }

  async function _loadAll(lang) {
    await Promise.all(NAMESPACES.map(ns => _loadNamespace(lang, ns)));
  }

  function _resolve(key, lang) {
    // key format: 'ns:actual_key'  or just 'actual_key' (defaults to 'common')
    let ns = 'common', k = key;
    if (key.includes(':')) {
      [ns, k] = key.split(':', 2);
    }
    const cacheKey = `${lang}:${ns}`;
    return _cache[cacheKey]?.[k];
  }

  function _interpolate(str, vars) {
    if (!vars || typeof str !== 'string') return str;
    return str.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`
    );
  }

  // ── Public API ────────────────────────────────────────────────
  async function init(lang) {
    _lang = lang || localStorage.getItem('lh_lang') || 
            navigator.language?.slice(0, 2) || 'vi';
    if (!SUPPORTED.includes(_lang)) _lang = 'vi';

    await _loadAll(_lang);
    // Pre-load the other language in background for instant switch
    const other = _lang === 'vi' ? 'en' : 'vi';
    _loadAll(other).catch(() => {});

    document.documentElement.setAttribute('lang', _lang);
    _applyDOM();
    return _lang;
  }

  /** Translate a key with optional variable interpolation */
  function t(key, vars) {
    const str = _resolve(key, _lang) 
             ?? _resolve(key, 'vi')   // fallback to Vietnamese
             ?? key;                  // last resort: raw key
    return _interpolate(str, vars);
  }

  /** Switch language and refresh all [data-i18n] elements in the DOM */
  async function switchLang(newLang) {
    if (!SUPPORTED.includes(newLang)) return;
    _lang = newLang;
    localStorage.setItem('lh_lang', newLang);
    await _loadAll(newLang);
    document.documentElement.setAttribute('lang', newLang);
    _applyDOM();
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: newLang } }));
  }

  function getLang() { return _lang; }

  /** Apply translations to all elements with data-i18n attribute */
  function _applyDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key  = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr'); // e.g. 'placeholder'
      const translated = t(key);
      if (attr) {
        el.setAttribute(attr, translated);
      } else {
        el.textContent = translated;
      }
    });

    // Update lang toggle button text
    const btn = document.getElementById('langToggle');
    if (btn) btn.textContent = t('common:lang_switch');
  }

  return { init, t, switchLang, getLang, applyDOM: _applyDOM };
})();

// Auto-init when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => LunarI18n.init());
}

// Make available globally
window.LunarI18n = LunarI18n;
