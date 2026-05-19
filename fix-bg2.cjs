const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/bg-obs-dark-3/g, 'bg-obs-dark-1');
code = code.replace(/bg-obs-dark-2/g, 'bg-obs-dark-1');

fs.writeFileSync('src/App.tsx', code);
