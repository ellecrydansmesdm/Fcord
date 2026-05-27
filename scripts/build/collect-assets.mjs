import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');
const distDir = path.join(rootDir, 'dist', 'desktop');

console.log("[collect] Collecting extra assets into dist/desktop...");

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Helper
function copyIfExists(src, dst) {
    if (fs.existsSync(src)) {
        if (fs.statSync(src).isDirectory()) {
            fs.cpSync(src, dst, { recursive: true });
        } else {
            fs.copyFileSync(src, dst);
        }
        return true;
    }
    return false;
}

// ── ffmpeg ──
const ffmpegCandidates = [
    path.join(rootDir, "ffmpeg.exe"),
    path.join(process.env.LOCALAPPDATA || "", "ffmpeg", "bin", "ffmpeg.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
    path.join(rootDir, "..", "..", "Dossier", "Joiner", "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    path.join(rootDir, "..", "..", "nightcord2", "dist", "nightcord", "ffmpeg.exe"),
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
];
let foundFfmpeg = false;
let ffmpegSrcPath = null;
for (const c of ffmpegCandidates) {
    if (copyIfExists(c, path.join(distDir, "ffmpeg.exe"))) {
        console.log(`[collect] ffmpeg.exe copied to dist/desktop/ from ${c}`);
        ffmpegSrcPath = c;
        foundFfmpeg = true;
        break;
    }
}
if (!foundFfmpeg) {
    // Fallback : essayer ffmpeg du PATH
    try {
        const { execSync: exs } = await import('child_process');
        const ffmpegPath = exs('where ffmpeg', { encoding: 'utf8' }).trim().split('\n')[0];
        if (ffmpegPath && fs.existsSync(ffmpegPath)) {
            fs.copyFileSync(ffmpegPath, path.join(distDir, "ffmpeg.exe"));
            ffmpegSrcPath = ffmpegPath;
            foundFfmpeg = true;
            console.log(`[collect] ffmpeg.exe copied from PATH: ${ffmpegPath}`);
        }
    } catch { }
}
if (!foundFfmpeg) console.warn("[collect] ⚠️ ffmpeg.exe NOT FOUND — le ghost account ne pourra pas streamer l'audio");

// ── ffmpeg.dll ──
for (const c of ffmpegCandidates) {
    const dll = path.join(path.dirname(c), "ffmpeg.dll");
    if (copyIfExists(dll, path.join(distDir, "ffmpeg.dll"))) {
        console.log(`[collect] ffmpeg.dll copied from ${dll}`);
        break;
    }
}


// ── yt-dlp ──
const ytdlpCandidates = [
    path.join(rootDir, "yt-dlp.exe"),
    "C:\\yt-dlp\\yt-dlp.exe",
    path.join(process.env.USERPROFILE || "", "Desktop", "yt-dlp.exe"),
];
let foundYt = false;
for (const c of ytdlpCandidates) {
    if (copyIfExists(c, path.join(distDir, "yt-dlp.exe"))) {
        console.log(`[collect] yt-dlp.exe copied from ${c}`);
        foundYt = true; break;
    }
}
if (!foundYt) console.warn("[collect] ⚠️ yt-dlp.exe NOT FOUND");

// ── node.exe ──
const nodeCandidates = [
    process.execPath,
    "C:\\nvm4w\\nodejs\\node.exe",
    "C:\\Program Files\\nodejs\\node.exe",
    "C:\\Program Files (x86)\\nodejs\\node.exe",
    path.join(process.env.LOCALAPPDATA || "", "Programs", "nodejs", "node.exe")
];
let foundNode = false;
for (const c of nodeCandidates) {
    if (copyIfExists(c, path.join(distDir, "node.exe"))) {
        console.log(`[collect] node.exe copied from ${c}`);
        foundNode = true; break;
    }
}
if (!foundNode) console.warn("[collect] ⚠️ node.exe NOT FOUND");

// ── modules (patched discord_voice) ──
const desktopModules = path.join(process.env.USERPROFILE || "", "Desktop", "modules");
const repoModules = path.join(rootDir, "static", "modules_override");
const backupModules = path.join(rootDir, "static", "modules_backup_working_stereo");

let patchedSrc = fs.existsSync(desktopModules) && fs.readdirSync(desktopModules).length > 0 ? desktopModules
               : fs.existsSync(repoModules) && fs.readdirSync(repoModules).length > 0 ? repoModules
               : fs.existsSync(backupModules) && fs.readdirSync(backupModules).length > 0 ? backupModules
               : null;

if (patchedSrc) {
    console.log(`[collect] Copying patched modules from ${patchedSrc}...`);
    for (const voiceDir of ["discord_voice", "discord_voice-1", "discord_voice1"]) {
        const voiceDst = path.join(distDir, "modules", voiceDir, "discord_voice");
        fs.mkdirSync(voiceDst, { recursive: true });
        for (const f of fs.readdirSync(patchedSrc)) {
            if (f === "CHECKSUMS.sha256") continue;
            const src = path.join(patchedSrc, f);
            if (fs.statSync(src).isFile()) {
                fs.copyFileSync(src, path.join(voiceDst, f));
            }
        }
    }
    console.log("[collect] Modules copied");
} else {
    console.warn("[collect] ⚠️ Patched modules NOT FOUND");
}

// ── multi-instance-icons ──
const lolllSrc = path.join(process.env.USERPROFILE || "", "Desktop", "lolll");
const outMIIcons = path.join(distDir, "multi-instance-icons");
fs.mkdirSync(outMIIcons, { recursive: true });
if (fs.existsSync(lolllSrc)) {
    let copied = 0;
    for (let i = 1; i <= 5; i++) {
        const src = path.join(lolllSrc, `${i}.ico`);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(outMIIcons, `${i}.ico`));
            copied++;
        }
    }
    console.log(`[collect] ${copied} multi-instance icons copied from Desktop/lolll`);
} else {
    console.warn("[collect] ⚠️ Desktop/lolll NOT FOUND");
}

// ── ghost-server : npm install complet puis copie ──
const ghostServerSrc = path.join(rootDir, "ghost-server");
const ghostServerDst = path.join(distDir, "ghost-server");
if (fs.existsSync(ghostServerSrc)) {
    const packageJson = path.join(ghostServerSrc, "package.json");
    if (fs.existsSync(packageJson)) {
        console.log("[collect] Running npm install in ghost-server (full, no --production)...");
        try {
            execSync("npm install", {
                cwd: ghostServerSrc,
                stdio: "inherit"
            });
            console.log("[collect] ghost-server npm install done.");
        } catch (e) {
            console.error("[collect] ❌ npm install failed in ghost-server:", e.message);
        }
    }
    if (copyIfExists(ghostServerSrc, ghostServerDst)) {
        console.log("[collect] ghost-server folder copied (with node_modules)");

        // ── Copier ffmpeg.exe DANS ghost-server/ aussi ──
        // server.js tourne avec __dirname = dist/desktop/ghost-server/
        // It looks for ffmpeg at __dirname/../ffmpeg.exe (dist/desktop/ffmpeg.exe)

        console.log("[collect] ffmpeg.exe also copied to ghost-server/ (local fallback)");
            } catch (e) {
                console.warn("[collect] ⚠️ Impossible de copier ffmpeg dans ghost-server:", e.message);
            }
        }
    }
} else {
    console.warn("[collect] ⚠️ ghost-server folder NOT FOUND");
}

// ── mac ──
if (copyIfExists(path.join(rootDir, "mac"), path.join(distDir, "mac"))) {
    console.log("[collect] mac folder copied");
} else {
    console.warn("[collect] ⚠️ mac folder NOT FOUND");
}

// ── Verification summary ──
console.log("\n[collect] ══════════════════════════════════════════");
console.log("[collect] Critical assets summary for Ghost Account:");
const criticalFiles = [
    { file: path.join(distDir, "ffmpeg.exe"),      name: "ffmpeg.exe (dist/desktop/)" },
    { file: path.join(distDir, "node.exe"),         name: "node.exe (dist/desktop/)" },
    { file: path.join(ghostServerDst, "server.js"), name: "ghost-server/server.js" },
    { file: path.join(ghostServerDst, "ffmpeg.exe"),name: "ghost-server/ffmpeg.exe (fallback)" },
    { file: path.join(ghostServerDst, "node_modules", "@dank074", "discord-video-stream", "package.json"), name: "ghost-server/node_modules/@dank074/discord-video-stream" },
    { file: path.join(ghostServerDst, "node_modules", "opusscript", "package.json"), name: "ghost-server/node_modules/opusscript" },
];
for (const { file, name } of criticalFiles) {
    const exists = fs.existsSync(file);
    console.log(`[collect]   ${exists ? "✅" : "❌"} ${name}`);
}
console.log("[collect] ══════════════════════════════════════════\n");

console.log("[collect] Done collecting assets!");

