import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace any remaining white/black variations
code = code.replace(/ring-white\/([0-9]+)/g, 'ring-obs-text/$1');
code = code.replace(/ring-black\/([0-9]+)/g, 'ring-obs-text/$1');

fs.writeFileSync('src/App.tsx', code);
