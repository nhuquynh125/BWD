const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const htmlFiles = [];

// Recursively find all HTML files
function getHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        // Skip node_modules if present
        if (file === 'node_modules') continue;
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getHtmlFiles(fullPath);
        } else if (fullPath.endsWith('.html')) {
            htmlFiles.push(fullPath);
        }
    }
}

getHtmlFiles(rootDir);

let hasErrors = false;

// Regex to capture the src attribute of img tags
const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;

console.log('Starting verification of HTML files...\n');

htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativeFilePath = path.relative(rootDir, file);
    
    // 1. Check for leftover inline .hero { styles
    if (content.includes('.hero {')) {
        console.error(`❌ [STYLE ERROR] Leftover '.hero {' style found in: ${relativeFilePath}`);
        hasErrors = true;
    }

    // 2. Check image src resolutions
    let match;
    while ((match = imgSrcRegex.exec(content)) !== null) {
        let src = match[1];
        
        // Ignore external URLs, data URIs, and dynamic template variables
        if (
            src.startsWith('http://') || 
            src.startsWith('https://') || 
            src.startsWith('data:') ||
            src.includes('${') ||
            src.includes('{{')
        ) {
            continue;
        }

        // Determine the absolute path on disk
        let absoluteSrcPath;
        if (src.startsWith('/')) {
            // Absolute to the project root
            absoluteSrcPath = path.join(rootDir, src);
        } else {
            // Relative to the current HTML file
            absoluteSrcPath = path.join(path.dirname(file), src);
        }

        // Verify if the file actually exists
        if (!fs.existsSync(absoluteSrcPath)) {
            console.error(`❌ [ASSET ERROR] Missing image file: '${src}' referenced in ${relativeFilePath}`);
            hasErrors = true;
        }
    }
});

console.log('\n----------------------------------------');
if (!hasErrors) {
    console.log('✅ [SUCCESS] All checks passed! No missing images or leftover hero styles.');
    process.exit(0);
} else {
    console.log('⚠️ [FAILED] Verification found errors. Please fix the issues listed above.');
    process.exit(1);
}
