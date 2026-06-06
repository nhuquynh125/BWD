const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let updated = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove existing cursor lines
    content = content.replace(/<div id="cur"><\/div>/g, '');
    content = content.replace(/\/\* Cursor \*\//g, '');
    content = content.replace(/const cur = document\.getElementById\('cur'\);/g, '');
    content = content.replace(/let tx = 0, ty = 0, cx = 0, cy = 0;/g, '');
    content = content.replace(/document\.addEventListener\('mousemove', e => \{ tx = e\.clientX; ty = e\.clientY \}\);/g, '');
    content = content.replace(/\(function tick\(\) \{ cx \+= \(tx - cx\) \* \.16; cy \+= \(ty - cy\) \* \.16; cur\.style\.left = cx \+ 'px'; cur\.style\.top = cy \+ 'px'; requestAnimationFrame\(tick\) \}\)\(\);/g, '');
    content = content.replace(/\(function tick\(\)\{ cx\+=\(tx-cx\)\*\.16; cy\+=\(ty-cy\)\*\.16; cur\.style\.left=cx\+'px'; cur\.style\.top=cy\+'px'; requestAnimationFrame\(tick\); \}\)\(\);/g, '');
    content = content.replace(/document\.querySelectorAll\('a,button,\.card-featured,\.card-reg,\.intang-card'\)\.forEach\(el => \{[\s\S]*?\}\);/g, '');
    content = content.replace(/<!-- Custom cursor -->/g, '');
    content = content.replace(/<!-- Custom cursor \(skips touch devices\) -->/g, '');
    
    // Add cursor.js before </body>
    if (!content.includes('cursor.js')) {
        if (content.includes('</body>')) {
            content = content.replace('</body>', '  <script src="cursor.js"></script>\n</body>');
            updated++;
        }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
}
console.log(`Updated ${updated} HTML files.`);
