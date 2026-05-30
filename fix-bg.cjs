const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/bg-obs-text\/40/g, 'bg-obs-dark-3');
code = code.replace(/bg-obs-text\/20/g, 'bg-obs-dark-2');
code = code.replace(/bg-obs-text\/60/g, 'bg-obs-dark-1');
code = code.replace(/bg-obs-text\/10/g, 'bg-obs-dark-2');
code = code.replace(/bg-obs-text\/30/g, 'bg-obs-dark-3');
code = code.replace(/bg-obs-text\/5/g, 'bg-obs-dark-2');
code = code.replace(/bg-obs-text\/80/g, 'bg-obs-bg/90');

fs.writeFileSync('src/App.tsx', code);
