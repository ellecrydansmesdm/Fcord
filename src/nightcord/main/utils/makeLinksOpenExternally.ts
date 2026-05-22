/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow, shell } from "electron";
import { DISCORD_HOSTNAMES } from "main/constants";

import { Settings } from "../settings";
import { createOrFocusPopup, setupPopout } from "./popout";
import { execSteamURL, isDeckGameMode, steamOpenURL } from "./steamOS";

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
        try {
            var { protocol, hostname, pathname, searchParams } = new URL(url);
        } catch {
            return { action: "deny" };
        }

        const isDiscordPopout = pathname === "/popout" && DISCORD_HOSTNAMES.includes(hostname);
        if (isDiscordPopout || (frameName.startsWith("DISCORD_") && pathname === "/popout" && DISCORD_HOSTNAMES.includes(hostname))) {
            const key = frameName.startsWith("DISCORD_") ? frameName : `DISCORD_${frameName || "POPOUT_" + Math.random().toString(36).substring(2, 9)}`;
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

        return handleExternalUrl(url, protocol);
    });

    win.webContents.on("did-create-window", (childWin, { frameName, options, url }: any) => {
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
            const key = frameName.startsWith("DISCORD_") ? frameName : `DISCORD_${frameName || "POPOUT_" + Math.random().toString(36).substring(2, 9)}`;
            setupPopout(childWin, key);
        }
    });
}
