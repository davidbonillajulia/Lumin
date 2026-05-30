const fs = require('fs');
const file = './src/components/PerfManagerModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/text-\[8px\]/g, 'text-[10px]');
content = content.replace(/text-\[9px\]/g, 'text-[12px]');
content = content.replace(/text-\[10px\]/g, 'text-[13px]');
content = content.replace(/text-xs/g, 'text-[14px]'); // using specific values to avoid cascaded replacement overlap issue

fs.writeFileSync(file, content);
console.log('Bumped text sizes in PerfManagerModal.tsx');
