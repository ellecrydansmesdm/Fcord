const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\f\\Desktop\\fcord';

const binaryExtensions = new Set([
    '.png', '.ico', '.jpg', '.jpeg', '.gif', '.webp', '.ani', '.wav', 
    '.node', '.dll', '.tflite', '.zip', '.exe', '.asar', '.pdb', '.mp3', '.mp4'
]);

const ignoreDirs = new Set([
    '.git', 'node_modules', 'dist', 'release'
]);

// Step 1: Global Search & Replace in File Contents
function processFileContents(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (ignoreDirs.has(file)) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processFileContents(fullPath);
        } else if (stat.isFile()) {
            const ext = path.extname(file).toLowerCase();
            if (binaryExtensions.has(ext)) {
                // Skip binary files
                continue;
            }
            
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                let original = content;
                
                // Perform case-sensitive replacements
                content = content.replace(/fcord/g, 'fcord');
                content = content.replace(/Fcord/g, 'Fcord');
                content = content.replace(/FCORD/g, 'FCORD');
                content = content.replace(/FCord/g, 'FCord');
                
                if (content !== original) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log(`Replaced text in: ${fullPath}`);
                }
            } catch (err) {
                console.error(`Error processing file content ${fullPath}: ${err.message}`);
            }
        }
    }
}

// Step 2: Bottom-up Rename Files and Folders
function collectPathsToRename(dir, list = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (ignoreDirs.has(file)) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        // Push current path
        list.push({ path: fullPath, isDir: stat.isDirectory(), name: file });
        
        if (stat.isDirectory()) {
            collectPathsToRename(fullPath, list);
        }
    }
    return list;
}

function processRenames() {
    let items = collectPathsToRename(rootDir);
    
    // Sort items by depth descending (bottom-up) so we rename children before parent folders
    items.sort((a, b) => b.path.split(path.sep).length - a.path.split(path.sep).length);
    
    for (const item of items) {
        const name = item.name;
        if (name.toLowerCase().includes('fcord')) {
            let newName = name;
            newName = newName.replace(/fcord/g, 'fcord');
            newName = newName.replace(/Fcord/g, 'Fcord');
            newName = newName.replace(/FCORD/g, 'FCORD');
            newName = newName.replace(/FCord/g, 'FCord');
            
            const dir = path.dirname(item.path);
            const newFullPath = path.join(dir, newName);
            
            try {
                fs.renameSync(item.path, newFullPath);
                console.log(`Renamed: ${item.path} -> ${newFullPath}`);
            } catch (err) {
                console.error(`Error renaming ${item.path} to ${newFullPath}: ${err.message}`);
            }
        }
    }
}

console.log('--- Starting processing file contents ---');
processFileContents(rootDir);
console.log('--- Starting renaming files/folders ---');
processRenames();
console.log('--- Done! ---');
