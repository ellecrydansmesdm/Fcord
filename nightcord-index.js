// Nightcord entry point
"use strict";
const path = require("path");
const Module = require("module");
const fs = require("fs");
const { app } = require("electron");

// ── CRITIQUE : userData = dossier Nightcord pour les settings/plugins
const nightcordData = path.join(app.getPath("appData"), "Nightcord");
app.setPath("userData", nightcordData);

// AppUserModelId unique — Windows reconnaît Nightcord comme app séparée de Discord
app.setAppUserModelId("com.squirrel.Discord.Discord");

// Flags Chromium utiles uniquement (suppression des flags qui nuisent au démarrage :
// process-per-site, renderer-process-limit, enable-low-end-device-mode forçaient
// des sous-processus et désactivaient l'accélération GPU → freeze sur splash screen)
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("disk-cache-size", "104857600");

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

        const { session, shell } = require("electron");
        const { webContents: webContentsModule } = require("electron");

        // URLs Discord légitimes à ne pas bloquer dans will-navigate
        function isDiscordUrl(url) {
            return url.startsWith("https://discord.com") ||
                url.startsWith("https://canary.discord.com") ||
                url.startsWith("https://ptb.discord.com") ||
                url.startsWith("file://") ||
                url.startsWith("devtools://") ||
                url.startsWith("about:");
        }

        function patchWebContents(wc) {
            // Éviter de patcher deux fois le même webContents
            if (wc._nightcordPatched) return;
            wc._nightcordPatched = true;

            // Intercepte les window.open() :
            // - about:blank est autorisé (Discord en a besoin pour ses popups légitimes)
            //   MAIS on écoute did-create-window pour patcher immédiatement la fenêtre enfant
            // - devtools:// est autorisé
            // - tout le reste → navigateur externe
            wc.setWindowOpenHandler(({ url }) => {
                if (!url || url === "about:blank" || url.startsWith("devtools://")) {
                    return { action: "allow" };
                }
                shell.openExternal(url).catch(() => {});
                console.log("[Nightcord][LINK] Ouverture externe:", url);
                return { action: "deny" };
            });

            // FIX CLEF : quand about:blank crée une fenêtre enfant,
            // Discord navigue ensuite vers une URL externe (TikTok, GitHub, etc.)
            // dans cette fenêtre enfant. On la patche immédiatement à sa création
            // pour bloquer cette navigation et l'ouvrir dans le navigateur.
            wc.on("did-create-window", (childWin) => {
                const childWc = childWin.webContents;
                if (childWc._nightcordPatched) return;
                childWc._nightcordPatched = true;

                // La fenêtre enfant démarre sur about:blank mais va naviguer vers une URL externe
                // On bloque toute navigation non-Discord dès qu'elle se produit
                childWc.on("will-navigate", (event, url) => {
                    if (!isDiscordUrl(url)) {
                        event.preventDefault();
                        shell.openExternal(url).catch(() => {});
                        console.log("[Nightcord][CHILD-NAV] Redirection externe:", url);
                        // Fermer la fenêtre enfant vide après redirection
                        try { childWin.close(); } catch (_) {}
                    }
                });

                // did-navigate couvre les cas ou la navigation a deja eu lieu (OAuth, TikTok) avant will-navigate
                childWc.on('did-navigate', function(_event, url) {
                    if (!isDiscordUrl(url)) {
                        shell.openExternal(url).catch(function() {});
                        console.log('[Nightcord][CHILD-DID-NAV] Redirection externe apres navigation:', url);
                        try { childWin.close(); } catch (_) {}
                    }
                });

                // Aussi bloquer les nouvelles navigations via setWindowOpenHandler dans l'enfant
                childWc.setWindowOpenHandler(({ url }) => {
                    if (!url || url === "about:blank" || url.startsWith("devtools://")) return { action: "allow" };
                    shell.openExternal(url).catch(() => {});
                    console.log("[Nightcord][CHILD-LINK] Ouverture externe:", url);
                    return { action: "deny" };
                });

                // Bloquer aussi did-finish-load si la fenêtre a chargé une URL externe
                childWc.on("did-finish-load", () => {
                    const url = childWc.getURL();
                    if (url && url !== "about:blank" && !isDiscordUrl(url)) {
                        shell.openExternal(url).catch(() => {});
                        console.log("[Nightcord][CHILD-LOAD] Fermeture et redirection:", url);
                        try { childWin.close(); } catch (_) {}
                    }
                });
            });

            // Bloquer les navigations de la fenêtre mère vers des URLs externes
            wc.on("will-navigate", (event, url) => {
                const currentUrl = wc.getURL();
                if (url !== currentUrl && !isDiscordUrl(url)) {
                    event.preventDefault();
                    shell.openExternal(url).catch(() => {});
                    console.log("[Nightcord][NAV] Redirection externe:", url);
                }
            });
        }

        // Patcher tous les webContents créés (fenêtres ET popups)
        app.on("browser-window-created", (_, win) => {
            patchWebContents(win.webContents);
        });

        // Patcher aussi les webContents créés sans BrowserWindow (popups détachés, etc.)
        app.on("web-contents-created", (_, wc) => {
            patchWebContents(wc);
        });

        // Patcher les webContents déjà existants au moment du ready
        for (const wc of webContentsModule.getAllWebContents()) {
            patchWebContents(wc);
        }

        console.log("[Nightcord] Patch liens externes activé sur TOUS les webContents (avec did-create-window) ✓");

        app.once("browser-window-created", (_, win) => {

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

// Utilise un Set pour les ajouts O(1) (au lieu de .includes() O(n) en boucle)
const _globalPathsSet = new Set(Module.globalPaths);

function addGlobalPath(p) {
    try {
        if (!_globalPathsSet.has(p) && fs.existsSync(p)) {
            _globalPathsSet.add(p);
            Module.globalPaths.push(p);
        }
    } catch (_) { }
}

// Priorité aux modules bundlés (portables, dans nightcord-dist/modules/)
addGlobalPath(bundledModulesPath);

// Ajout des modules natifs Discord (discord_voice, discord_krisp, etc.)
if (discordNativeModulesPath) {
    addGlobalPath(discordNativeModulesPath);
    try {
        for (const mod of fs.readdirSync(discordNativeModulesPath)) {
            const modDir = path.join(discordNativeModulesPath, mod);
            try { if (!fs.statSync(modDir).isDirectory()) continue; } catch { continue; }
            addGlobalPath(modDir);
            // Entrer dans le sous-dossier du module (ex: discord_voice-1/discord_voice/)
            try {
                for (const sub of fs.readdirSync(modDir)) {
                    const subDir = path.join(modDir, sub);
                    try { if (fs.statSync(subDir).isDirectory()) addGlobalPath(subDir); } catch { }
                }
            } catch { }
        }
    } catch (e) { console.warn("[Nightcord] Erreur lors du scan des modules natifs:", e.message); }
}
try {
    for (const mod of fs.readdirSync(bundledModulesPath)) {
        const modDir = path.join(bundledModulesPath, mod);
        try { if (!fs.statSync(modDir).isDirectory()) continue; } catch { continue; }
        addGlobalPath(modDir);
        try {
            for (const ver of fs.readdirSync(modDir)) {
                const verDir = path.join(modDir, ver);
                try { if (fs.statSync(verDir).isDirectory()) addGlobalPath(verDir); } catch { }
            }
        } catch { }
    }
} catch (e) { }

// Fallback : module_data utilisateur
addGlobalPath(moduleDataPath);
try {
    for (const mod of fs.readdirSync(moduleDataPath)) {
        const modDir = path.join(moduleDataPath, mod);
        try { if (!fs.statSync(modDir).isDirectory()) continue; } catch { continue; }
        addGlobalPath(modDir);
        try {
            for (const ver of fs.readdirSync(modDir)) {
                const verDir = path.join(modDir, ver);
                try { if (fs.statSync(verDir).isDirectory()) addGlobalPath(verDir); } catch { }
            }
        } catch { }
    }
} catch (e) { }

// Ce patch garantit que les modules chargés depuis l'asar Discord (qui ont
// parent.paths = []) trouvent quand même les modules natifs Nightcord.
// Node.js injecte déjà Module.globalPaths nativement dans tous les autres cas.
const _globalPathsArr = Module.globalPaths.slice();
const _origResolve = Module._resolveLookupPaths;
Module._resolveLookupPaths = function (request, parent) {
    // Uniquement pour les contextes asar isolés (paths vide) —
    // dans tous les autres cas, Node gère globalPaths lui-même, on ne touche à rien.
    if (parent && (!parent.paths || parent.paths.length === 0)) {
        parent.paths = _globalPathsArr.slice();
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
// On ne patche qu'une fois (vérification rapide avant toute lecture disque)
try {
    const buildInfoPath = path.join(
        path.dirname(process.execPath), "resources", "build_info.json"
    );
    const nativeModulesDir = path.join(path.dirname(process.execPath), "modules");
    // Lire le fichier seulement si le dossier modules existe
    if (fs.existsSync(nativeModulesDir)) {
        const buildInfoRaw = fs.readFileSync(buildInfoPath, "utf-8");
        const buildInfo = JSON.parse(buildInfoRaw);
        if (!buildInfo.localModulesRoot) {
            buildInfo.localModulesRoot = nativeModulesDir;
            fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
            console.log("[Nightcord] build_info.json patché → localModulesRoot:", nativeModulesDir);
        }
    }
} catch (e) {
    console.warn("[Nightcord] Impossible de patcher build_info.json:", e.message);
}

require(path.join(__dirname, "dist", "desktop", "patcher.js"));
