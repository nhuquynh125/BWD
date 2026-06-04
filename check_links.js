// check_links.js – scans HTML files for local href/src links and reports missing files
const fs = require('fs');
const path = require('path');

const root = path.resolve('d:/BaiTapHTML/files/web');

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name.endsWith('.html')) yield full;
  }
}

const linkRegex = /(?:href|src)=["']([^"'>#]+)["']/gi;
const missing = [];

for (const file of walk(root)) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[1].trim();
    if (!url || url.startsWith('http') || url.startsWith('https') || url.startsWith('mailto:') || url.startsWith('javascript:')) continue;
    const target = path.resolve(path.dirname(file), url);
    if (!fs.existsSync(target)) {
      missing.push({ file, link: url, resolved: target });
    }
  }
}

if (missing.length === 0) {
  console.log('✅ No broken local links found');
} else {
  console.log('🚨 Broken links detected:');
  console.log(JSON.stringify(missing, null, 2));
}
