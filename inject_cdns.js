const fs = require('fs');
const glob = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const inject = '<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js"></script>\n<script src="api.js"></script>';
for (const file of glob) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<script src="api.js"></script>') && !content.includes('purify.min.js')) {
    content = content.replace('<script src="api.js"></script>', inject);
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}
