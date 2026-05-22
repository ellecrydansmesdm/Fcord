/*
 * Nightcord — Auto-updater (HTTP / GitHub Releases via ASAR)
 * Vérifie les releases sur GitHub, télécharge le desktop.asar et remplace l'ancien.
 */

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { IpcEvents } from "@shared/IpcEvents";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { ipcMain, app } from "electron";
import { writeFileSync, rmSync } from "original-fs";
import { join } from "path";
import { exec } from "child_process";

import { serializeErrors } from "./common";

const RELEASES_REPO = "nightcordoff/nightcord";
const API_BASE      = `https://api.github.com/repos/${RELEASES_REPO}`;
const REPO_URL      = `https://github.com/${RELEASES_REPO}`;
const CURRENT_VERSION = `v${require("../../../package.json").version}`;
const ZIP_FILE = "nightcord-dist.zip";

let pendingDownloadUrl: string | null  = null;
let pendingVersion:     string | null  = null;
let isApplying                         = false;

async function githubGet<T = any>(endpoint: string): Promise<T> {
    return fetchJson<T>(API_BASE + endpoint, {
        headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": VENCORD_USER_AGENT
        }
    });
}

function isNewer(a: string, b: string): boolean {
    const parse = (v: string) => v.replace(/^v/, "").split(".").map(n => parseInt(n, 10) || 0);
    const av = parse(a), bv = parse(b);
    for (let i = 0; i < Math.max(av.length, bv.length); i++) {
        if ((bv[i] ?? 0) > (av[i] ?? 0)) return true;
        if ((bv[i] ?? 0) < (av[i] ?? 0)) return false;
    }
    return false;
}

async function fetchUpdates(): Promise<boolean> {
    const data = await githubGet("/releases/latest");
    const latestTag: string = data.tag_name ?? "";

    if (!latestTag || !isNewer(CURRENT_VERSION, latestTag)) return false;

    const asset = (data.assets as any[])?.find(
        (a: any) => a.name === ZIP_FILE
    );
    if (!asset) return false;

    pendingDownloadUrl = asset.browser_download_url;
    pendingVersion     = latestTag;
    return true;
}

async function getUpdates() {
    const outdated = await fetchUpdates();
    if (!outdated) return [];
    return [{
        hash:    pendingVersion ?? "new",
        author:  "Nightcord",
        message: `Nouvelle version disponible : ${pendingVersion}`
    }];
}

async function applyUpdates(): Promise<boolean> {
    if (!pendingDownloadUrl) return false;
    if (isApplying) return false;
    isApplying = true;

    try {
        const data = await fetchBuffer(pendingDownloadUrl);

        // Save to temp
        const zipPath = join(app.getPath("temp"), `nightcord-update-${Date.now()}.zip`);
        writeFileSync(zipPath, data, { flush: true });

        // Determine the dist root path from __dirname
        const distIndex = __dirname.lastIndexOf("dist");
        if (distIndex === -1) {
            throw new Error("Cannot find 'dist' in path: " + __dirname);
        }
        const distPath = __dirname.substring(0, distIndex + 4);

        return await new Promise<boolean>((resolve, reject) => {
            // Windows 10/11 inclut nativement 'tar' qui extrait les ZIP beaucoup plus rapidement que PowerShell
            exec(`tar -xf "${zipPath}" -C "${distPath}"`, (error) => {
                if (error) {
                    reject(error);
                } else {
                    try { rmSync(zipPath, { force: true }); } catch (e) {}
                    pendingDownloadUrl = null;
                    pendingVersion = null;
                    resolve(true);
                }
            });
        });
    } finally {
        isApplying = false;
    }
}

// ─── Auto-update on quit ─────────────────────────────────────────────────────
// Si une mise à jour est en attente quand Discord se ferme, on l'installe
// silencieusement avant de quitter (timeout de sécurité 45s).
app.on("before-quit", (event) => {
    if (!pendingDownloadUrl || isApplying) return;

    event.preventDefault();
    console.log("[Nightcord] Applying pending update before quit...");

    const safetyTimeout = setTimeout(() => {
        console.error("[Nightcord] Update on quit timed out — forcing exit.");
        app.exit(0);
    }, 45_000);

    applyUpdates()
        .then(ok => {
            if (ok) console.log("[Nightcord] Update applied successfully on quit.");
            else    console.warn("[Nightcord] Update on quit returned false.");
        })
        .catch(err => {
            console.error("[Nightcord] Update on quit failed:", err);
        })
        .finally(() => {
            clearTimeout(safetyTimeout);
            app.exit(0);
        });
});

ipcMain.handle(IpcEvents.GET_REPO,    serializeErrors(() => REPO_URL));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(getUpdates));
ipcMain.handle(IpcEvents.UPDATE,      serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD,       serializeErrors(applyUpdates));
