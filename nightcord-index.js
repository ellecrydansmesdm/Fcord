// Nightcord entry point
"use strict";
process.env.ELECTRON_JS_FLAGS = "--expose-gc --optimize_for_size --max-old-space-size=512";
const path = require("path");
const Module = require("module");
const fs = require("fs");
const { app } = require("electron");



// ── CRITIQUE : userData = dossier Nightcord pour les settings/plugins
// Mais on garde le cache Discord (images, données serveurs) du vrai Discord
// pour éviter de devoir tout retélécharger à chaque installation.
const nightcordData = path.join(app.getPath("appData"), "Nightcord");
app.setPath("userData", nightcordData);

// FIX BUG SALONS INVISIBLES : NE PAS partager le cache HTTP de Discord stable.
// Le cache de Discord stable contient des données de session/permissions calculées
// pour le token Discord stable. Quand Nightcord charge ce cache, il lit des permissions
// appartenant à la session stable — résultat : seuls les salons publics (@everyone) sont
// visibles, les salons privés/restreints disparaissent même pour l'owner.
// Chaque client doit avoir son propre cache isolé (dans userData = Equicord).
// Le léger délai au premier chargement est acceptable vs le bug de permissions.

// AppUserModelId unique — Windows reconnaît Nightcord comme app séparée de Discord
app.setAppUserModelId("com.squirrel.Discord.Discord");

app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");
app.commandLine.appendSwitch("js-flags", "--expose-gc --optimize_for_size --max-old-space-size=512");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("disk-cache-size", "104857600");
app.commandLine.appendSwitch("enable-low-end-device-mode");
app.commandLine.appendSwitch("process-per-site");
app.commandLine.appendSwitch("renderer-process-limit", "2");

app.once("ready", () => {
    try {
        // Liste des modules natifs qui causent des erreurs 403 inutiles
        // NB: discord_overlay est intentionnellement ABSENT de cette liste —
        //     il doit pouvoir s'initialiser localement pour que l'overlay en jeu fonctionne.
        //     Seuls les modules vraiment inutiles pour Nightcord sont bloqués.
        const BLOCKED_MODULES = new Set([
            // "discord_overlay",  // RETIRE — nécessaire pour l'overlay in-game
            "discord_rpc",
            "discord_dispatch",
            "discord_erinn",
        ]);

        // Patch du net.request d'Electron pour bloquer silencieusement les 403 prévisibles
        const originalRequest = app.constructor.prototype.constructor;
        const { session } = require("electron");

        // Intercepter les requêtes vers discord.com/api/modules/* pour les modules bloqués
        app.once("browser-window-created", () => {
            try {
                const ses = session.defaultSession;
                ses.webRequest.onBeforeRequest(
                    { urls: ["https://discord.com/api/modules/*"] },
                    (details, callback) => {
                        const url = details.url;
                        let isBlocked = false;
                        for (const m of BLOCKED_MODULES) { if (url.includes(m)) { isBlocked = true; break; } }
                        if (isBlocked) {
                            // Bloquer silencieusement — évite le 403 + les logs d'erreur
                            console.log("[Nightcord] Module bloqué (inutile pour Nightcord):", url.split("/").slice(-2).join("/"));
                            callback({ cancel: true });
                        } else {
                            callback({});
                        }
                    }
                );
                console.log("[Nightcord] Filtre modules 403 activé ✓");
            } catch (e) {
                console.warn("[Nightcord] Impossible d'activer le filtre modules:", e.message);
            }
        });
    } catch (e) {
        console.warn("[Nightcord] FIX modules 403 failed:", e.message);
    }
});

// Protection contre le freeze après crash — vérifier et réparer le LevelDB localStorage
// Quand Discord crash pendant une écriture localStorage, le fichier LevelDB peut se
// corrompre et géler le renderer au démarrage suivant.
try {
    const lsPath = path.join(nightcordData, "Local Storage", "leveldb");
    if (fs.existsSync(lsPath)) {
        // Détecter la corruption : fichier LOCK verrouillé ou fichier LOG manquant
        const lockFile = path.join(lsPath, "LOCK");
        const logFile = path.join(lsPath, "LOG");
        let corrupted = false;
        if (fs.existsSync(lockFile)) {
            try {
                // Essayer d'ouvrir le LOCK en écriture — si échoue, un process zombie le tient
                const fd = fs.openSync(lockFile, "r+");
                fs.closeSync(fd);
            } catch (e) {
                // LOCK verrouillé par un zombie — supprimer pour débloquer
                try { fs.unlinkSync(lockFile); } catch { }
                corrupted = true;
            }
        }
        // Vérifier aussi les fichiers .ldb corrompus (taille 0)
        if (!corrupted) {
            const files = fs.readdirSync(lsPath).filter(f => f.endsWith(".ldb"));
            for (const f of files) {
                const size = fs.statSync(path.join(lsPath, f)).size;
                if (size === 0) { corrupted = true; break; }
            }
        }
        if (corrupted) {
            console.warn("[Nightcord] LevelDB localStorage corrompu détecté — réparation...");
            try { fs.rmSync(lsPath, { recursive: true, force: true }); } catch { }
            console.warn("[Nightcord] LevelDB supprimé — les données localStorage seront récréées");
        }
    }
} catch (e) { console.warn("[Nightcord] LevelDB check failed:", e.message); }

// Modules bundlés dans nightcord-dist/modules/
const bundledModulesPath = path.join(path.dirname(process.execPath), "modules");
const moduleDataPath = path.join(app.getPath("appData"), "discord", "module_data");

// ── DÉTECTION AUTOMATIQUE du dossier modules de Discord stable ───────────────
// Les modules natifs (discord_voice, discord_krisp...) sont dans AppData\Local\Discord\app-X.X.XXXX\modules\
// et NON dans AppData\Roaming\discord\module_data\ (qui est souvent vide).
// On détecte automatiquement la version installée pour avoir le bon chemin.
const discordLocalBase = path.join(app.getPath("appData"), "..", "Local", "Discord");
let discordNativeModulesPath = null;
try {
    const entries = fs.readdirSync(discordLocalBase)
        .filter(e => e.startsWith("app-"))
        .map(e => ({ name: e, full: path.join(discordLocalBase, e, "modules") }))
        .filter(e => fs.existsSync(e.full))
        .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
    if (entries.length > 0) {
        discordNativeModulesPath = entries[0].full;
        console.log("[Nightcord] Modules natifs Discord détectés:", discordNativeModulesPath);
    }
} catch (e) {
    console.warn("[Nightcord] Impossible de détecter les modules natifs Discord:", e.message);
}

function addGlobalPath(p) {
    try { if (fs.existsSync(p) && !Module.globalPaths.includes(p)) Module.globalPaths.push(p); } catch (_) { }
}

// Priorité aux modules bundlés (portables, dans nightcord-dist/modules/)
addGlobalPath(bundledModulesPath);

// Ajout des modules natifs Discord (discord_voice, discord_krisp, etc.)
if (discordNativeModulesPath) {
    addGlobalPath(discordNativeModulesPath);
    try {
        for (const mod of fs.readdirSync(discordNativeModulesPath)) {
            const modDir = path.join(discordNativeModulesPath, mod);
            if (!fs.existsSync(modDir) || !fs.statSync(modDir).isDirectory()) continue;
            addGlobalPath(modDir);
            // Entrer dans le sous-dossier du module (ex: discord_voice-1/discord_voice/)
            for (const sub of fs.readdirSync(modDir)) {
                const subDir = path.join(modDir, sub);
                if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) addGlobalPath(subDir);
            }
        }
    } catch (e) { console.warn("[Nightcord] Erreur lors du scan des modules natifs:", e.message); }
}
try {
    for (const mod of fs.readdirSync(bundledModulesPath)) {
        const modDir = path.join(bundledModulesPath, mod);
        if (!fs.existsSync(modDir) || !fs.statSync(modDir).isDirectory()) continue;
        addGlobalPath(modDir);
        for (const ver of fs.readdirSync(modDir)) {
            const verDir = path.join(modDir, ver);
            if (fs.existsSync(verDir) && fs.statSync(verDir).isDirectory()) addGlobalPath(verDir);
        }
    }
} catch (e) { }

// Fallback : module_data utilisateur
addGlobalPath(moduleDataPath);
try {
    for (const mod of fs.readdirSync(moduleDataPath)) {
        const modDir = path.join(moduleDataPath, mod);
        if (!fs.statSync(modDir).isDirectory()) continue;
        addGlobalPath(modDir);
        for (const ver of fs.readdirSync(modDir)) {
            const verDir = path.join(modDir, ver);
            if (fs.existsSync(verDir) && fs.statSync(verDir).isDirectory()) addGlobalPath(verDir);
        }
    }
} catch (e) { }

const _globalPathsArr = [...new Set(Module.globalPaths)];
const _globalPathsSet = new Set(_globalPathsArr);
const _origResolve = Module._resolveLookupPaths;
Module._resolveLookupPaths = function (request, parent) {
    if (parent) {
        if (!parent.paths) {
            parent.paths = _globalPathsArr.slice();
        } else {
            const existing = new Set(parent.paths);
            for (const p of _globalPathsSet) {
                if (!existing.has(p)) parent.paths.push(p);
            }
        }
    }
    return _origResolve.call(this, request, parent);
};

// Chercher discord_desktop_core dans cet ordre :
// 1. modules bundlés (portable)
// 2. modules natifs Discord local (AppData\Local\Discord\app-X\modules\)
// 3. module_data Roaming (fallback)
const coreModuleDir = path.join(bundledModulesPath, "discord_desktop_core-1", "discord_desktop_core");
const coreModuleDirNative = discordNativeModulesPath
    ? path.join(discordNativeModulesPath, "discord_desktop_core-1", "discord_desktop_core")
    : null;
global.mainAppDirname = fs.existsSync(coreModuleDir)
    ? coreModuleDir
    : (coreModuleDirNative && fs.existsSync(coreModuleDirNative))
        ? coreModuleDirNative
        : path.join(moduleDataPath, "discord_desktop_core");
console.log("[Nightcord] mainAppDirname:", global.mainAppDirname);

// ── FIX AUDIO NATIF : patch build_info.json pour que Discord trouve les modules ──
// paths.js (dans _app.asar) utilise buildInfo.localModulesRoot comme chemin prioritaire
// pour tous les modules natifs (discord_voice, discord_krisp, gain micro, Krisp...).
// Sans ça, il cherche dans AppData\Roaming\discord\module_data\ qui est VIDE.
try {
    const buildInfoPath = path.join(
        path.dirname(process.execPath), "resources", "build_info.json"
    );
    const buildInfoRaw = fs.readFileSync(buildInfoPath, "utf-8");
    const buildInfo = JSON.parse(buildInfoRaw);
    const nativeModulesDir = path.join(path.dirname(process.execPath), "modules");
    if (fs.existsSync(nativeModulesDir) && !buildInfo.localModulesRoot) {
        buildInfo.localModulesRoot = nativeModulesDir;
        fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
        console.log("[Nightcord] build_info.json patché → localModulesRoot:", nativeModulesDir);
    }
} catch (e) {
    console.warn("[Nightcord] Impossible de patcher build_info.json:", e.message);
}

require(path.join(__dirname, "dist", "desktop", "patcher.js"));
