/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow, shell } from "electron";
import { DISCORD_HOSTNAMES } from "main/constants";

import { Settings } from "../settings";
import { createOrFocusPopup, setupPopout } from "./popout";
import { execSteamURL, isDeckGameMode, steamOpenURL } from "./steamOS";

// ── Overlay popout flood protection ──────────────────────────────────────────
// When Discord's OOP overlay crashes (always in Nightcord — we're not discord.exe),
// it enters a retry loop that rapidly fires window.open("/popout") dozens of times,
// opening https://discord.com/popout in the user's browser.
// We block overlay-specific popouts entirely and rate-limit the rest.
const OVERLAY_FRAME_NAMES = new Set([
    "DISCORD_OutOfProcessOverlay",
    "DISCORD_Overlay",
    "DISCORD_GAME_OVERLAY",
]);

const POPOUT_RATE_LIMIT_WINDOW_MS = 5000;
const POPOUT_RATE_LIMIT_MAX = 3;
const popoutTimestamps: number[] = [];
let popoutCounter = 0;

function isPopoutRateLimited(): boolean {
    const now = Date.now();
    // Purge timestamps outside the window
    while (popoutTimestamps.length > 0 && now - popoutTimestamps[0] > POPOUT_RATE_LIMIT_WINDOW_MS) {
        popoutTimestamps.shift();
    }
    if (popoutTimestamps.length >= POPOUT_RATE_LIMIT_MAX) {
        console.warn("[Nightcord] Popout rate-limited — too many popout requests (overlay crash loop?)");
        return true;
    }
    popoutTimestamps.push(now);
    return false;
}

function stablePopoutKey(frameName: string): string {
    if (frameName.startsWith("DISCORD_")) return frameName;
    if (frameName) return `DISCORD_${frameName}`;
    // Use a stable counter instead of Math.random() so duplicate unnamed popouts
    // get deduplicated by createOrFocusPopup instead of creating N separate windows.
    return `DISCORD_POPOUT_${++popoutCounter}`;
}

export function handleExternalUrl(url: string, protocol?: string): { action: "deny" | "allow" } {
    if (protocol == null) {
        try {
            protocol = new URL(url).protocol;
        } catch {
            return { action: "deny" };
        }
    }

    switch (protocol) {
        case "http:":
        case "https:":
            if (Settings.store.openLinksWithElectron) {
                return { action: "allow" };
            }
        // eslint-disable-next-line no-fallthrough
        case "mailto:":
        case "spotify:":
            if (isDeckGameMode) {
                steamOpenURL(url);
            } else {
                shell.openExternal(url);
            }
            break;
        case "steam:":
            if (isDeckGameMode) {
                execSteamURL(url);
            } else {
                shell.openExternal(url);
            }
            break;
    }

    return { action: "deny" };
}

export function makeLinksOpenExternally(win: BrowserWindow) {
    win.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
        console.log("[Nightcord][LINK] setWindowOpenHandler url=", url, "frameName=", frameName);
        try {
            var { protocol, hostname, pathname, searchParams } = new URL(url);
        } catch {
            return { action: "deny" };
        }

        const isDiscordPopout = pathname === "/popout" && DISCORD_HOSTNAMES.includes(hostname);
        if (isDiscordPopout || (frameName.startsWith("DISCORD_") && pathname === "/popout" && DISCORD_HOSTNAMES.includes(hostname))) {
            // ── Block overlay popouts entirely ─────────────────────────────
            // The game overlay can never work in Nightcord (wrong process name),
            // so silently deny these instead of letting them flood.
            if (OVERLAY_FRAME_NAMES.has(frameName)) {
                console.log("[Nightcord] Blocked overlay popout (overlay unsupported):", frameName);
                return { action: "deny" };
            }

            // Rate-limit other popouts to catch unnamed overlay flood patterns
            if (isPopoutRateLimited()) {
                return { action: "deny" };
            }

            const key = stablePopoutKey(frameName);
            const result = createOrFocusPopup(key, features);
            if (result.action === "allow") {
                return {
                    action: "allow",
                    overrideBrowserWindowOptions: {
                        ...result.overrideBrowserWindowOptions,
                        isDiscordPopout: true
                    } as any
                };
            }
            return result;
        }

        if (url === "about:blank") return { action: "allow" };

        // Drop the static temp page Discord web loads for the connections popout
        if (frameName === "authorize" && searchParams.get("loading") === "true") return { action: "deny" };

        // Allow captcha popups to open inside Electron (hCaptcha / reCaptcha)
        // Discord opens them via window.open() — they must stay in-process or the
        // captcha iframe can never communicate back to Discord.
        if (
            hostname.includes("hcaptcha.com") ||
            hostname.includes("recaptcha.net") ||
            hostname.includes("google.com") && pathname.startsWith("/recaptcha") ||
            hostname.includes("discord.com") && pathname.startsWith("/cdn-cgi/") ||
            // Discord sometimes opens its own captcha flow on discord.com
            (DISCORD_HOSTNAMES.includes(hostname) && (pathname.includes("captcha") || searchParams.has("captcha")))
        ) {
            return {
                action: "allow",
                overrideBrowserWindowOptions: {
                    width: 500,
                    height: 600,
                    frame: true,
                    autoHideMenuBar: true,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        sandbox: true,
                    }
                }
            };
        }

        return handleExternalUrl(url, protocol);
    });

    win.webContents.on("did-create-window", (childWin, { frameName, options, url }: any) => {
        console.log("[Nightcord][LINK] did-create-window url=", url, "frameName=", frameName);
        // Detect captcha windows and handle them gracefully
        let isCaptcha = false;
        if (url) {
            try {
                const { hostname, pathname } = new URL(url);
                isCaptcha =
                    hostname.includes("hcaptcha.com") ||
                    hostname.includes("recaptcha.net") ||
                    (hostname.includes("google.com") && pathname.startsWith("/recaptcha")) ||
                    (hostname.includes("discord.com") && pathname.startsWith("/cdn-cgi/")) ||
                    (DISCORD_HOSTNAMES.includes(hostname) && (pathname.includes("captcha")));
            } catch {}
        }

        if (isCaptcha) {
            childWin.setMenuBarVisibility(false);
            // Allow the captcha window to open links externally if needed
            childWin.webContents.setWindowOpenHandler(({ url }) => handleExternalUrl(url));
            childWin.once("closed", () => childWin.removeAllListeners());
            return;
        }

        let isPopout = frameName.startsWith("DISCORD_");

        if (!isPopout) {
            if (options && (options as any).isDiscordPopout) {
                isPopout = true;
            } else if (url) {
                try {
                    const { pathname, hostname } = new URL(url);
                    if (pathname === "/popout" && DISCORD_HOSTNAMES.includes(hostname)) {
                        isPopout = true;
                    }
                } catch {}
            }
        }

        if (isPopout) {
            // Block overlay windows from being set up — they'll crash anyway
            if (OVERLAY_FRAME_NAMES.has(frameName)) {
                childWin.close();
                return;
            }

            const key = stablePopoutKey(frameName);
            setupPopout(childWin, key);
        } else {
            // Fenêtre non-popout / non-captcha : c'est une redirection externe (about:blank → lien).
            // On cache la fenêtre immédiatement pour éviter le flash blanc, puis on ferme
            // dès que la navigation vers le vrai lien se déclenche.
            childWin.hide();
            childWin.webContents.on("will-navigate", (e, navUrl) => {
                e.preventDefault();
                setImmediate(() => {
                    if (!childWin.isDestroyed()) childWin.close();
                });
                if (navUrl && navUrl !== "about:blank") {
                    handleExternalUrl(navUrl);
                }
            });
            // Filet de sécurité : si rien ne navigue dans les 2s, fermer quand même
            setTimeout(() => {
                if (!childWin.isDestroyed()) childWin.close();
            }, 2000);
        }
    });
}
