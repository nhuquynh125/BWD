/**
 * rename-assets.js
 * ────────────────────────────────────────────────────────────────────────────
 * Scans `uploads/ex/` and renames every image file to a URL-safe,
 * lowercase, hyphenated, ASCII-only filename.
 *
 * Usage:  node rename-assets.js
 *         node rename-assets.js --dry-run   (preview only, no actual rename)
 *
 * Works with Node.js ≥ 14, no extra dependencies required.
 * ────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const TARGET_DIR = path.join(__dirname, 'uploads', 'ex');
const DRY_RUN    = process.argv.includes('--dry-run');

// ── Vietnamese → ASCII transliteration map ───────────────────────────────────
// Covers all toned vowels + consonants used in Vietnamese place names.

const VI_MAP = {
  // a-family
  'à':'a','á':'a','ả':'a','ã':'a','ạ':'a',
  'ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
  'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
  // e-family
  'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
  'ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
  // i-family
  'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
  // o-family
  'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o',
  'ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
  'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
  // u-family
  'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
  'ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
  // y-family
  'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
  // d
  'đ':'d',
  // Upper-case mirrors (in case filenames contain capitals)
  'À':'a','Á':'a','Ả':'a','Ã':'a','Ạ':'a',
  'Ă':'a','Ằ':'a','Ắ':'a','Ẳ':'a','Ẵ':'a','Ặ':'a',
  'Â':'a','Ầ':'a','Ấ':'a','Ẩ':'a','Ẫ':'a','Ậ':'a',
  'È':'e','É':'e','Ẻ':'e','Ẽ':'e','Ẹ':'e',
  'Ê':'e','Ề':'e','Ế':'e','Ể':'e','Ễ':'e','Ệ':'e',
  'Ì':'i','Í':'i','Ỉ':'i','Ĩ':'i','Ị':'i',
  'Ò':'o','Ó':'o','Ỏ':'o','Õ':'o','Ọ':'o',
  'Ô':'o','Ồ':'o','Ố':'o','Ổ':'o','Ỗ':'o','Ộ':'o',
  'Ơ':'o','Ờ':'o','Ớ':'o','Ở':'o','Ỡ':'o','Ợ':'o',
  'Ù':'u','Ú':'u','Ủ':'u','Ũ':'u','Ụ':'u',
  'Ư':'u','Ừ':'u','Ứ':'u','Ử':'u','Ữ':'u','Ự':'u',
  'Ỳ':'y','Ý':'y','Ỷ':'y','Ỹ':'y','Ỵ':'y',
  'Đ':'d',
};

// ── Explicit overrides ────────────────────────────────────────────────────────
// For filenames that are already corrupted/abbreviated and can't be
// recovered by transliteration alone, map them to the correct target name
// (extension is handled automatically – specify basename only, no extension).

const OVERRIDES = {
  'vnh-h-long':      'vinh-ha-long',
  'thanglong':       'thang-long',
  'trangan':         'trang-an',
  'ruong-bc-thang':  'ruong-bac-thang',
  'thanh-co-nha-ho': 'thanh-nha-ho',
};

// ── Helper: transliterate + slugify ──────────────────────────────────────────

function slugify(str) {
  return str
    // 1. Replace each Vietnamese char via the map
    .split('').map(ch => VI_MAP[ch] ?? ch).join('')
    // 2. Lower-case everything
    .toLowerCase()
    // 3. Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // 4. Strip any remaining non-ASCII / special characters
    .replace(/[^a-z0-9\-\.]/g, '')
    // 5. Collapse consecutive hyphens
    .replace(/-{2,}/g, '-')
    // 6. Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`❌  Directory not found: ${TARGET_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(TARGET_DIR);
  const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);

  let renamed = 0;
  let skipped = 0;
  let already = 0;

  console.log(`\n📂  Scanning: ${TARGET_DIR}`);
  console.log(DRY_RUN ? '🔍  DRY-RUN mode – no files will be changed.\n' : '');
  console.log('─'.repeat(70));

  for (const entry of entries.sort()) {
    const ext      = path.extname(entry).toLowerCase();
    const basename = path.basename(entry, ext);      // name without extension

    // Skip non-image files
    if (!IMAGE_EXT.has(ext)) {
      console.log(`  SKIP  (non-image) ${entry}`);
      skipped++;
      continue;
    }

    // Determine target basename: check override first, then slugify
    let newBasename = OVERRIDES[basename] ?? slugify(basename);
    const newName   = newBasename + ext;

    if (newName === entry) {
      console.log(`  OK    (no change) ${entry}`);
      already++;
      continue;
    }

    const oldPath = path.join(TARGET_DIR, entry);
    const newPath = path.join(TARGET_DIR, newName);

    // Guard: don't clobber an existing file with a different source
    if (fs.existsSync(newPath) && newPath !== oldPath) {
      console.warn(`  ⚠️   CONFLICT – target already exists, skipping: ${entry} → ${newName}`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  RENAME (dry-run)  ${entry}  →  ${newName}`);
    } else {
      fs.renameSync(oldPath, newPath);
      console.log(`  ✅  RENAMED  ${entry}  →  ${newName}`);
    }
    renamed++;
  }

  console.log('─'.repeat(70));
  console.log(`\nDone.  Renamed: ${renamed}  |  Already clean: ${already}  |  Skipped: ${skipped}\n`);
}

main();
