/*
 * Nightcord — Installer via EquilotlCli
 * Télécharge EquilotlCli.exe depuis les releases Equicord et le lance
 * avec les variables d'environnement pointant vers les fichiers Nightcord.
 *
 * L'exe affiche une interface graphique permettant de choisir le Discord cible.
 *
 * Usage:
 *   pnpm inject    → installe Nightcord dans le Discord choisi
 *   pnpm uninject  → désinstalle Nightcord du Discord choisi
 *   pnpm repair    → répare l'installation
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./checkNodeVersion.js";

import { execFileSync, execSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync, rmSync, statSync } from "fs";
import { chmodSync } from "fs";
import { dirname, join } from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { fileURLToPath } from "url";

// EquilotlCli est l'installeur graphique d'Equicord — on le réutilise pour Nightcord
const BASE_URL = "https://github.com/Equicord/Equilotl/releases/latest/download/";
const INSTALLER_PATH_DARWIN = "Equilotl.app/Contents/MacOS/Equilotl";
const INSTALLER_APP_DARWIN = "Equilotl.app";

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_DIR = join(BASE_DIR, "dist", "Installer");
const ETAG_FILE = join(FILE_DIR, "etag.txt");

function getFilename() {
    switch (process.platform) {
        case "win32":
            return "EquilotlCli.exe";
        case "darwin":
            return "Equilotl.MacOS.zip";
        case "linux":
            return "EquilotlCli-linux";
        default:
            throw new Error("Plateforme non supportée : " + process.platform);
    }
}

async function ensureBinary() {
    const filename = getFilename();

    mkdirSync(FILE_DIR, { recursive: true });

    const downloadName = join(FILE_DIR, filename);
    const outputFile = process.platform === "darwin"
        ? join(FILE_DIR, INSTALLER_PATH_DARWIN)
        : downloadName;
    const outputApp = process.platform === "darwin"
        ? join(FILE_DIR, INSTALLER_APP_DARWIN)
        : null;

    // Si le binaire existe déjà, on l'utilise directement sans vérifier les mises à jour
    if (existsSync(outputFile)) {
        console.log("[Nightcord] Installeur déjà présent, utilisation locale.");
        return outputFile;
    }

    console.log("[Nightcord] Téléchargement de l'installeur (" + filename + ")...");

    const res = await fetch(BASE_URL + filename, {
        headers: {
            "User-Agent": "Nightcord (https://github.com/nightcordfr/nightcord)"
        }
    });

    if (!res.ok)
        throw new Error(`Échec du téléchargement de l'installeur : ${res.status} ${res.statusText}`);

    writeFileSync(ETAG_FILE, res.headers.get("etag") ?? "");

    if (process.platform === "darwin") {
        console.log("[Nightcord] Sauvegarde du zip...");
        const zip = new Uint8Array(await res.arrayBuffer());
        writeFileSync(downloadName, zip);

        console.log("[Nightcord] Extraction du bundle...");
        execSync(`ditto -x -k '${downloadName}' '${FILE_DIR}'`);

        console.log("[Nightcord] Suppression de la quarantaine macOS...");
        const logAndRun = cmd => {
            console.log("  Exécution :", cmd);
            try { execSync(cmd); } catch { }
        };
        logAndRun(`sudo xattr -dr com.apple.quarantine '${outputApp}'`);
    } else {
        const body = Readable.fromWeb(res.body);
        await finished(body.pipe(createWriteStream(outputFile, {
            mode: 0o755,
            autoClose: true
        })));
    }

    // S'assurer que le binaire est exécutable (Linux/macOS)
    if (process.platform !== "win32") {
        try { chmodSync(outputFile, 0o755); } catch { }
    }

    console.log("[Nightcord] Installeur téléchargé avec succès !");
    return outputFile;
}

// ── Vérifier que le build existe ─────────────────────────────────────────────
function checkBuild() {
    const patcherPath = join(BASE_DIR, "dist", "desktop", "patcher.js");
    if (!existsSync(patcherPath)) {
        console.error("\x1b[31m[Nightcord] dist/desktop/patcher.js introuvable !\x1b[0m");
        console.error("\x1b[33m           Lancez 'pnpm build' d'abord, puis réessayez.\x1b[0m");
        process.exit(1);
    }
}

// ── Nettoyage automatique des anciennes installations ──────────────────────
function cleanOldNightcord() {
    console.log("[Nightcord] Recherche et nettoyage automatique des anciennes installations...");
    const platform = process.platform;
    const candidates = [];

    if (platform === "win32") {
        const localAppData = process.env.LOCALAPPDATA || "";
        for (const channel of ["Discord", "DiscordPTB", "DiscordCanary", "DiscordDevelopment"]) {
            const base = join(localAppData, channel);
            if (!existsSync(base)) continue;
            try {
                const versions = readdirSync(base)
                    .filter(d => /^app-\d+\.\d+\.\d+$/.test(d));
                for (const ver of versions) {
                    candidates.push(join(base, ver, "resources"));
                }
            } catch { }
        }
    } else if (platform === "darwin") {
        candidates.push(
            "/Applications/Discord.app/Contents/Resources",
            "/Applications/Discord PTB.app/Contents/Resources",
            "/Applications/Discord Canary.app/Contents/Resources"
        );
    } else if (platform === "linux") {
        candidates.push(
            "/usr/share/discord/resources",
            "/usr/lib/discord/resources",
            "/opt/discord/resources",
            "/opt/Discord/resources",
            join(process.env.HOME || "", ".local/share/flatpak/app/com.discordapp.Discord/current/active/files/discord/resources"),
            "/snap/discord/current/usr/share/discord/resources"
        );
    }

    let cleanedAny = false;

    for (const resourcesDir of candidates) {
        if (!existsSync(resourcesDir)) continue;

        const appDirPath = join(resourcesDir, "app");
        const backupPath = join(resourcesDir, "_app.asar");
        const appAsarPath = join(resourcesDir, "app.asar");

        try {
            let isAppDirCleaned = false;
            let isBackupRestored = false;

            // 1. Supprimer le dossier app/ s'il a été créé par l'ancien Nightcord
            if (existsSync(appDirPath)) {
                let shouldDelete = false;
                try {
                    const pkgFile = join(appDirPath, "package.json");
                    if (existsSync(pkgFile)) {
                        const pkg = JSON.parse(readFileSync(pkgFile, "utf-8"));
                        if (pkg.name === "nightcord") {
                            shouldDelete = true;
                        }
                    } else {
                        // Dossier app sans package.json mais _app.asar existe, probablement un résidu de l'ancien injecteur
                        if (existsSync(backupPath)) shouldDelete = true;
                    }
                } catch {
                    shouldDelete = true;
                }

                if (shouldDelete) {
                    console.log(`[Nightcord] Suppression de l'ancien dossier app/ dans : ${resourcesDir}`);
                    rmSync(appDirPath, { recursive: true, force: true });
                    isAppDirCleaned = true;
                    cleanedAny = true;
                }
            }

            // 2. Si _app.asar existe, restaurer le backup original vers app.asar
            if (existsSync(backupPath)) {
                let isAsarDir = false;
                if (existsSync(appAsarPath)) {
                    try {
                        isAsarDir = statSync(appAsarPath).isDirectory();
                    } catch {}
                }

                if (isAsarDir) {
                    console.log(`[Nightcord] Suppression du dossier app.asar temporaire dans : ${resourcesDir}`);
                    rmSync(appAsarPath, { recursive: true, force: true });
                }

                if (!existsSync(appAsarPath) || isAsarDir) {
                    console.log(`[Nightcord] Restauration _app.asar -> app.asar dans : ${resourcesDir}`);
                    renameSync(backupPath, appAsarPath);
                    isBackupRestored = true;
                    cleanedAny = true;
                } else {
                    // Si app.asar original est déjà présent en tant que fichier, nettoyer le backup obsolète
                    console.log(`[Nightcord] Nettoyage du backup _app.asar obsolète dans : ${resourcesDir}`);
                    rmSync(backupPath, { force: true });
                    cleanedAny = true;
                }
            }
        } catch (e) {
            console.error(`[Nightcord] Erreur lors du nettoyage de ${resourcesDir} :`, e.message);
        }
    }

    if (cleanedAny) {
        console.log("[Nightcord] Nettoyage des anciennes installations terminé avec succès !");
    } else {
        console.log("[Nightcord] Aucune ancienne installation à nettoyer.");
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────
// On nettoie d'abord les anciennes traces de Nightcord pour éviter tout conflit ou blocage
cleanOldNightcord();

// On vérifie le build uniquement pour install/repair (pas pour uninject)
const argStart = process.argv.indexOf("--");
const args = argStart === -1 ? [] : process.argv.slice(argStart + 1);

const isUninstall = args.includes("--uninstall");
if (!isUninstall) {
    checkBuild();
}

const installerBin = await ensureBinary();

const isInstall = args.includes("--install");

if (isInstall) {
    console.log("[Nightcord] Nettoyage des installations précédentes (Vencord/Equicord/Nightcord)...");
    try {
        const uninstallArgs = ["--uninstall"];
        const branchIdx = args.findIndex(a => a === "-branch" || a === "--branch");
        if (branchIdx !== -1 && branchIdx + 1 < args.length) {
            uninstallArgs.push("-branch", args[branchIdx + 1]);
        }
        const locationIdx = args.findIndex(a => a === "-location" || a === "--location");
        if (locationIdx !== -1 && locationIdx + 1 < args.length) {
            uninstallArgs.push("-location", args[locationIdx + 1]);
        }

        // Tente de désinstaller silencieusement
        // Note: EquilotlCli peut demander une sélection si plusieurs Discords sont trouvés, 
        // mais cela reste la méthode la plus sûre pour "clean" le index.js original.
        execFileSync(installerBin, uninstallArgs, {
            stdio: "inherit",
            env: {
                ...process.env,
                EQUICORD_USER_DATA_DIR: BASE_DIR,
                EQUICORD_DIRECTORY: join(BASE_DIR, "dist", "desktop"),
                EQUICORD_DEV_INSTALL: "1"
            }
        });
        console.log("[Nightcord] Nettoyage terminé.");
    } catch {
        console.log("[Nightcord] Aucun mod précédent à nettoyer ou échec du nettoyage.");
    }
}

console.log("[Nightcord] Lancement de l'injection...");

try {
    execFileSync(installerBin, args, {
        stdio: "inherit",
        env: {
            ...process.env,
            EQUICORD_USER_DATA_DIR: BASE_DIR,
            EQUICORD_DIRECTORY: join(BASE_DIR, "dist", "desktop"),
            EQUICORD_DEV_INSTALL: "1",
            NIGHTCORD_DIRECTORY: join(BASE_DIR, "dist", "desktop")
        }
    });
} catch {
    console.error("[Nightcord] Erreur lors de l'injection.");
    process.exit(1);
}

