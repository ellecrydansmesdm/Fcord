/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { IpcEvents } from "@shared/IpcEvents";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { exec } from "child_process";
import { app,ipcMain } from "electron";
import { rmSync,writeFileSync } from "original-fs";
import { join } from "path";

import { serializeErrors } from "./common";

const RELEASES_REPO = "nightcordoff/nightcord";
const API_BASE = `https://api.github.com/repos/${RELEASES_REPO}`;
const REPO_URL = `https://github.com/${RELEASES_REPO}`;
declare const VERSION: string;
const CURRENT_VERSION = `v${VERSION}`;
const ZIP_FILE = "nightcord-dist.zip";

let pendingDownloadUrl: string | null = null;
let pendingVersion: string | null = null;
let isApplying = false;

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
    pendingVersion = latestTag;
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

        // Save zip to temp
        const zipPath = join(app.getPath("temp"), `nightcord-update-${Date.now()}.zip`);
        writeFileSync(zipPath, data, { flush: true });

        // The zip was created from dist/desktop/ with includeBaseDirectory=false,
        // so its contents are exactly what belongs in dist/desktop/ = __dirname.
        // Using __dirname directly avoids the off-by-one-level bug.
        const destPath = __dirname;

        // Extract using PowerShell Expand-Archive (reliable ZIP support on all Windows 10/11)
        // We extract to a temp folder first, then move files over to avoid half-extracted state
        const tmpExtract = join(app.getPath("temp"), `nightcord-extract-${Date.now()}`);

        return await new Promise<boolean>((resolve, reject) => {
            // Step 1 — extract zip to temp folder
            const psExtract = `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmpExtract}' -Force`;
            exec(`powershell -NoProfile -NonInteractive -Command "${psExtract}"`, err => {
                if (err) {
                    try { rmSync(zipPath, { force: true }); } catch {}
                    return reject(new Error("ZIP extraction failed: " + err.message));
                }

                // Step 2 — copy extracted files into dist/desktop/ (= __dirname), overwriting existing ones
                const psMove = `Copy-Item -Path '${tmpExtract}\\*' -Destination '${destPath}' -Recurse -Force`;
                exec(`powershell -NoProfile -NonInteractive -Command "${psMove}"`, err2 => {
                    // Cleanup temp files regardless of outcome
                    try { rmSync(zipPath, { force: true }); } catch {}
                    try { rmSync(tmpExtract, { recursive: true, force: true }); } catch {}

                    if (err2) {
                        return reject(new Error("File copy failed: " + err2.message));
                    }

                    pendingDownloadUrl = null;
                    pendingVersion = null;
                    resolve(true);
                });
            });
        });
    } finally {
        isApplying = false;
    }
}

// ─── Auto-update on quit ─────────────────────────────────────────────────────
// If an update is pending when Discord closes, install it
// silently before quitting (safety timeout 45s).
app.on("before-quit", event => {
    // Only attempt update if an URL is pending AND not already in progress
    if (!pendingDownloadUrl || isApplying) return;

    event.preventDefault();
    console.log("[Nightcord] Applying pending update before quit...");

    const safetyTimeout = setTimeout(() => {
        console.error("[Nightcord] Update on quit timed out — forcing exit.");
        // Clean up to avoid infinite loop on next startup
        pendingDownloadUrl = null;
        pendingVersion = null;
        app.exit(0);
    }, 45_000);

    applyUpdates()
        .then(ok => {
            if (ok) console.log("[Nightcord] Update applied successfully on quit.");
            else console.warn("[Nightcord] Update on quit returned false.");
        })
        .catch(err => {
            console.error("[Nightcord] Update on quit failed:", err);
            // On failure, clean up to avoid infinite loop
            pendingDownloadUrl = null;
            pendingVersion = null;
        })
        .finally(() => {
            clearTimeout(safetyTimeout);
            app.exit(0);
        });
});

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => REPO_URL));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(getUpdates));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));
