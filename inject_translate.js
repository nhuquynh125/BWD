const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;

fs.readdir(directoryPath, function (err, files) {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    
    files.forEach(function (file) {
        if (path.extname(file) === '.html') {
            const filePath = path.join(directoryPath, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Check if it already has the script
            if (!content.includes('global-translate.js')) {
                // Insert before </head> or </body>
                if (content.includes('</head>')) {
                    content = content.replace('</head>', '    <script src="global-translate.js"></script>\n</head>');
                } else if (content.includes('</body>')) {
                    content = content.replace('</body>', '    <script src="global-translate.js"></script>\n</body>');
                } else {
                    content += '\n<script src="global-translate.js"></script>';
                }
                
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('Injected into ' + file);
            }
        }
    });
});
