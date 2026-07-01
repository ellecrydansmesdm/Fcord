const fs = require('fs');
const path = require('path');

const downloadsJsonPath = 'C:\\Users\\f\\Downloads\\plugins.json';
const workspaceRoot = 'c:\\Users\\f\\Desktop\\fcord';

try {
    // Read and parse file (stripping BOM if present)
    let content = fs.readFileSync(downloadsJsonPath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    const downloadsPlugins = JSON.parse(content);
    
    console.log(`Total plugins in downloads plugins.json: ${downloadsPlugins.length}`);
    
    const missing = [];
    
    for (const plugin of downloadsPlugins) {
        const filePath = plugin.filePath; // e.g. "src/plugins/ads.ts"
        // Since we renamed src/nightcordplugins to src/fcordplugins, we should check both
        const possiblePaths = [
            path.join(workspaceRoot, filePath),
            path.join(workspaceRoot, filePath.replace('src/nightcordplugins/', 'src/fcordplugins/'))
        ];
        
        const exists = possiblePaths.some(p => fs.existsSync(p));
        
        if (!exists) {
            missing.push({
                name: plugin.name,
                filePath: filePath,
                description: plugin.description
            });
        }
    }
    
    console.log(`\nFound ${missing.length} missing plugins:`);
    for (const m of missing) {
        console.log(`- ${m.name} (${m.filePath})`);
        console.log(`  Description: ${m.description}\n`);
    }
    
} catch (err) {
    console.error(`Error: ${err.message}`);
}
