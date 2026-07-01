const fs = require('fs');
const path = require('path');

const contentPath = 'C:\\Users\\f\\.gemini\\antigravity\\brain\\563bc006-10c8-43a1-be6e-7834cd55eb60\\.system_generated\\steps\\345\\content.md';
const workspaceRoot = 'c:\\Users\\f\\Desktop\\fcord';

try {
    const content = fs.readFileSync(contentPath, 'utf8');
    const regex = /\/Equicord\/Equicord\/tree\/main\/src\/plugins\/([^/"'\s>]+)/g;
    let match;
    const equicordPlugins = new Set();
    while ((match = regex.exec(content)) !== null) {
        const pluginName = match[1].split('/')[0];
        equicordPlugins.add(pluginName);
    }
    
    const equicordList = Array.from(equicordPlugins);
    console.log(`Equicord total plugins found: ${equicordList.length}`);
    
    const missing = [];
    for (const plugin of equicordList) {
        const possiblePaths = [
            path.join(workspaceRoot, 'src', 'plugins', plugin),
            path.join(workspaceRoot, 'src', 'fcordplugins', plugin)
        ];
        
        const exists = possiblePaths.some(p => fs.existsSync(p));
        if (!exists) {
            missing.push(plugin);
        }
    }
    
    console.log(`Truly missing plugins compared to Equicord:`);
    console.log(missing);
} catch (err) {
    console.error(`Error: ${err.message}`);
}
