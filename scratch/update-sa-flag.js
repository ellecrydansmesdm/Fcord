const fs = require('fs');
const img = fs.readFileSync('SA.png');
const b64 = 'data:image/png;base64,' + img.toString('base64');
let content = fs.readFileSync('src/components/settings/tabs/LanguageTab.tsx', 'utf8');
content = content.replace(/const SA_B64 = ".*";/, 'const SA_B64 = "' + b64 + '";');
fs.writeFileSync('src/components/settings/tabs/LanguageTab.tsx', content);
console.log("Replaced SA_B64");
