const fs = require('fs');
const path = require('path');

const faviconTag = `    <link rel="icon" type="image/png" href="https://res.cloudinary.com/dwbdopxe1/image/upload/e_trim/v1780973282/logo-k_n%E1%BB%81n_lj2bzm.png">\n`;
const dir = 'd:/BaiTapHTML/files/web';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let updatedCount = 0;

for (const file of files) {
    if (file === 'index.html') continue;
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('rel="icon"')) {
        console.log(`Skipping ${file}, already has an icon tag.`);
        continue;
    }
    
    if (content.includes('</head>')) {
        content = content.replace('</head>', faviconTag + '</head>');
        fs.writeFileSync(filePath, content, 'utf8');
        updatedCount++;
        console.log(`Updated ${file}`);
    } else {
        console.log(`No </head> found in ${file}`);
    }
}
console.log(`Total files updated: ${updatedCount}`);
