const fs = require('fs');
const path = require('path');

function pngToIco(pngPath, icoPath) {
    const pngData = fs.readFileSync(pngPath);
    
    // ICO Header (6 bytes)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type (1 = Icon)
    header.writeUInt16LE(1, 4); // Number of images (1)
    
    // Directory Entry (16 bytes)
    const entry = Buffer.alloc(16);
    entry.writeUInt8(0, 0); // Width (256, represented as 0)
    entry.writeUInt8(0, 1); // Height (256, represented as 0)
    entry.writeUInt8(0, 2); // Colors (0 = no palette)
    entry.writeUInt8(0, 3); // Reserved (0)
    entry.writeUInt16LE(1, 4); // Color planes (1)
    entry.writeUInt16LE(32, 6); // Bits per pixel (32)
    entry.writeUInt32LE(pngData.length, 8); // Image size
    entry.writeUInt32LE(6 + 16, 12); // Image offset (header + 1 entry = 22)
    
    const icoData = Buffer.concat([header, entry, pngData]);
    fs.writeFileSync(icoPath, icoData);
    console.log(`Successfully converted ${pngPath} to ${icoPath}`);
}

const pngPath = 'c:\\Users\\f\\Desktop\\fcord\\icon.png';
const targets = [
    'c:\\Users\\f\\Desktop\\fcord\\icon.ico',
    'c:\\Users\\f\\Desktop\\fcord\\fcord.ico',
    'c:\\Users\\f\\Desktop\\fcord\\static\\icon.ico',
    'c:\\Users\\f\\Desktop\\fcord\\installer-src\\icon.ico',
    'c:\\Users\\f\\Desktop\\fcord\\installer-src\\assets\\icon.ico'
];

for (const target of targets) {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    pngToIco(pngPath, target);
}
