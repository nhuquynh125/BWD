const fs = require('fs');
const path = require('path');

const mappings = {
    'vnh-h-long.jpg': 'vinh-ha-long.jpg',
    'Vịnh hạ long.jpg': 'vinh-ha-long.jpg',
    'ruong-bc-thang.jpg': 'ruong-bac-thang.jpg',
    'ruĐộng bậc thang.jpg': 'ruong-bac-thang.jpg',
    'Cố d✨ hu?.jpg': 'co-do-hue.jpg',
    'thanglong.jpg': 'thang-long.jpg',
    'trangan.jpg': 'trang-an.jpg',
    'thanh-co-nha-ho.jpg': 'thanh-nha-ho.jpg',
    'hội an.jpg': 'hoi-an.jpg',
    'phong nha.jpg': 'phong-nha.jpg',
    'thánh địa mỹ sơn.jpg': 'thanh-dia-my-son.jpg'
};

const rootDir = __dirname;

function fixHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            fixHtmlFiles(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            
            for (const [oldName, newName] of Object.entries(mappings)) {
                const search1 = `uploads/ex/${oldName}`;
                const replace1 = `uploads/ex/${newName}`;
                
                if (content.includes(search1)) {
                    content = content.split(search1).join(replace1);
                    changed = true;
                }
                
                const search2 = encodeURI(`uploads/ex/${oldName}`);
                const replace2 = encodeURI(`uploads/ex/${newName}`);
                if (content.includes(search2)) {
                    content = content.split(search2).join(replace2);
                    changed = true;
                }
            }
            
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Fixed paths in ${path.relative(rootDir, fullPath)}`);
            }
        }
    }
}

fixHtmlFiles(rootDir);
console.log('Done fixing HTML files.');
