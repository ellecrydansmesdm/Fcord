/*
 * Nightcord — Local injector for Discord Desktop
 * Injecte Nightcord dans une installation Discord existante en :
 * 1. Trouvant le répertoire resources de Discord
 * 2. Renommant app.asar → _app.asar (backup)
 * 3. Créant un dossier app/ avec un loader qui require le patcher.js de Nightcord
 *
 * Usage: pnpm inject   (ou: node scripts/inject.mjs)
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./checkNodeVersion.js";

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const BASE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = join(BASE_DIR, "dist", "desktop");

// ── Locate Discord installations ─────────────────────────────────────────────
/**
 * Retourne tous les répertoires resources Discord trouvés sur la machine.
 * @returns {string[]}
 */
function findAllDiscordResources() {
    const platform = process.platform;
    const candidates = [];

    if (platform === "win32") {
        const localAppData = process.env.LOCALAPPDATA || "";

        for (const channel of ["Discord", "DiscordPTB", "DiscordCanary", "DiscordDevelopment"]) {
            const base = join(localAppData, channel);
            if (!existsSync(base)) continue;
            try {
                const versions = readdirSync(base)
                    .filter(d => /^app-\d+\.\d+\.\d+$/.test(d))
                    .sort()
                    .reverse();
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

    // Filtrer les paths qui existent et contiennent app.asar ou app/
    return candidates.filter(p => {
        if (!existsSync(p)) return false;
        return existsSync(join(p, "app.asar")) || existsSync(join(p, "app")) || existsSync(join(p, "_app.asar"));
    });
}

// ── Check dist/ exists ───────────────────────────────────────────────────────
function checkBuild() {
    const patcherPath = join(DIST_DIR, "patcher.js");
    if (!existsSync(patcherPath)) {
        console.error("\x1b[31m[Nightcord] dist/desktop/patcher.js introuvable !\x1b[0m");
        console.error("\x1b[33m           Lancez 'pnpm build' d'abord, puis réessayez.\x1b[0m");
        process.exit(1);
    }
}

// ── Inject ───────────────────────────────────────────────────────────────────
function inject(resourcesDir) {
    const appAsarPath = join(resourcesDir, "app.asar");
    const backupPath = join(resourcesDir, "_app.asar");
    const appDirPath = join(resourcesDir, "app");

    // Vérifier si déjà injecté
    if (existsSync(appDirPath) && existsSync(join(appDirPath, "package.json"))) {
        try {
            const pkg = JSON.parse(readFileSync(join(appDirPath, "package.json"), "utf-8"));
            if (pkg.name === "nightcord") {
                console.log("\x1b[33m[Nightcord] Déjà injecté ! Utilisez 'pnpm uninject' d'abord pour réinjecter.\x1b[0m");
                return false;
            }
        } catch { }
    }

    // Étape 1 : Backup app.asar → _app.asar
    if (existsSync(appAsarPath) && !existsSync(backupPath)) {
        let isDir = false;
        try { isDir = statSync(appAsarPath).isDirectory(); } catch { }
        if (isDir) {
            console.warn("\x1b[33m[Nightcord] app.asar est un dossier — un autre mod est peut-être installé.\x1b[0m");
            console.warn("\x1b[33m            Abandon. Utilisez 'pnpm uninject' pour nettoyer d'abord.\x1b[0m");
            return false;
        }
        console.log("[Nightcord] Sauvegarde app.asar → _app.asar...");
        renameSync(appAsarPath, backupPath);
    } else if (!existsSync(backupPath)) {
        console.error("\x1b[31m[Nightcord] Aucun app.asar ou _app.asar trouvé dans resources !\x1b[0m");
        return false;
    }

    // Étape 2 : Supprimer l'ancien app.asar s'il existe (pourrait être un dossier d'une injection précédente)
    if (existsSync(appAsarPath)) {
        try {
            rmSync(appAsarPath, { recursive: true, force: true });
        } catch (e) {
            console.error(`\x1b[31m[Nightcord] Impossible de supprimer l'ancien app.asar : ${e.message}\x1b[0m`);
            return false;
        }
    }

    // Étape 3 : Créer le dossier app/ avec le loader
    mkdirSync(appDirPath, { recursive: true });

    writeFileSync(join(appDirPath, "package.json"), JSON.stringify({
        name: "nightcord",
        main: "index.js"
    }, null, 2));

    // Le loader require simplement le patcher Nightcord depuis dist/
    const patcherPath = join(DIST_DIR, "patcher.js").replace(/\\/g, "\\\\");
    writeFileSync(join(appDirPath, "index.js"),
        `// Nightcord Injector — auto-generated, do not edit\n"use strict";\nrequire("${patcherPath}");\n`
    );

    console.log(`\x1b[32m[Nightcord] Injecté avec succès dans : ${resourcesDir}\x1b[0m`);
    console.log(`\x1b[32m[Nightcord] Répertoire Nightcord dist : ${DIST_DIR}\x1b[0m`);
    console.log("\x1b[36m[Nightcord] Redémarrez Discord pour appliquer les changements.\x1b[0m");
    return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────
checkBuild();

const allResources = findAllDiscordResources();
if (allResources.length === 0) {
    console.error("\x1b[31m[Nightcord] Aucune installation Discord trouvée !\x1b[0m");
    console.error("\x1b[33m           Assurez-vous que Discord (Stable, PTB ou Canary) est installé.\x1b[0m");
    process.exit(1);
}

if (allResources.length === 1) {
    // Un seul Discord trouvé : injection directe
    console.log(`[Nightcord] Discord trouvé : ${allResources[0]}`);
    inject(allResources[0]);
} else {
    // Plusieurs Discord trouvés : injecter dans tous
    console.log(`[Nightcord] ${allResources.length} installations Discord trouvées :`);
    let injectedCount = 0;
    for (const res of allResources) {
        console.log(`\n  → ${res}`);
        if (inject(res)) injectedCount++;
    }
    console.log(`\n\x1b[32m[Nightcord] ${injectedCount}/${allResources.length} injection(s) réussie(s).\x1b[0m`);
}
