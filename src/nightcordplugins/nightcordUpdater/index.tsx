/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, useEffect, useState } from "@webpack/common";

// ── Config ────────────────────────────────────────────────────────────────────
const REMOTE_VERSION_URL = "https://git.nightcord.su/api/v1/repos/nightcord/nightcord/releases/latest";

// ── Version locale (injectée au build via define) ─────────────────────────────
declare const VERSION: string;

function getLocalVersion(): string {
    try { return VERSION; } catch { return "0.0.0"; }
}

// ── Comparaison semver : true seulement si remote > local ─────────────────────
function isStrictlyNewer(remote: string, local: string): boolean {
    const parse = (v: string) => v.replace(/^v/, "").split(".").map(n => parseInt(n, 10) || 0);
    const r = parse(remote);
    const l = parse(local);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
        const rv = r[i] ?? 0;
        const lv = l[i] ?? 0;
        if (rv > lv) return true;
        if (rv < lv) return false;
    }
    return false;
}

// ── État global ───────────────────────────────────────────────────────────────
interface UpdateInfo {
    remoteVersion: string;
    localVersion: string;
}

let pendingUpdate: UpdateInfo | null = null;
let listeners: Array<() => void> = [];

function notify() { listeners.forEach(f => f()); }

// ── Vérification au lancement ─────────────────────────────────────────────────
async function checkForUpdates() {
    try {
        const localVersion = getLocalVersion();
        const res = await fetch(REMOTE_VERSION_URL);
        if (!res.ok) return;

        const data = await res.json();
        if (!data?.tag_name) return;

        const remoteVersion: string = data.tag_name;
        console.log(`[NightcordUpdater] local=${localVersion} remote=${remoteVersion}`);

        if (isStrictlyNewer(remoteVersion, localVersion)) {
            pendingUpdate = { remoteVersion, localVersion };
            notify();
        }
    } catch (e) {
        console.error("[NightcordUpdater] Error:", e);
    }
}

// ── Banner React ──────────────────────────────────────────────────────────────
function UpdateBanner() {
    const [info, setInfo]       = useState<UpdateInfo | null>(pendingUpdate);
    const [dismissed, setDismissed] = useState(false);
    const [status, setStatus]   = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fn = () => setInfo(pendingUpdate);
        listeners.push(fn);
        return () => { listeners = listeners.filter(f => f !== fn); };
    }, []);

    if (!info || dismissed) return null;

    async function doUpdate() {
        if (loading || !info) return;
        setLoading(true);
        setStatus("Downloading...");

        try {
            const { VencordNative } = (window as any);
            const ipc = VencordNative?.updater;
            if (!ipc) throw new Error("VencordNative.updater not available");

            // Étape 1 : fetch Gitea metadata → stocke l'URL du zip dans le main process
            const updateRes: { ok: boolean; value?: boolean; error?: any; } = await ipc.update();
            if (!updateRes?.ok) {
                throw new Error(updateRes?.error?.message ?? "Update check failed");
            }

            // Étape 2 : télécharge le zip + extrait dans dist/
            setStatus("✓ Downloaded! Extracting...");
            const buildRes: { ok: boolean; value?: boolean; error?: any; } = await ipc.rebuild();
            if (!buildRes?.ok) {
                const errMsg = buildRes?.error?.message ?? JSON.stringify(buildRes?.error) ?? "Installation failed";
                throw new Error(errMsg);
            }

            setStatus("✓ Update applied — restarting in 2s...");

            setTimeout(() => {
                try {
                    VencordNative.nightcord?.relaunch?.();
                } catch {
                    (window as any).DiscordNative?.app?.relaunch?.();
                    window.location.reload();
                }
            }, 2000);
        } catch (e: any) {
            console.error("[NightcordUpdater] Update error:", e);
            const msg = e?.message ? e.message.substring(0, 120) : "Unknown error";
            setStatus(`❌ ${msg}. Check your connection or restart manually.`);
            setLoading(false);
        }
    }

    return React.createElement("div", {
        style: {
            position: "fixed",
            top: 0, left: 0, right: 0,
            zIndex: 999999,
            background: "linear-gradient(90deg, #1e5c2a 0%, #3ba55c 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 16px",
            fontSize: 13,
            fontFamily: "var(--font-primary, sans-serif)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
            gap: 12,
        }
    },
        React.createElement("div", {
            style: { display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }
        },
            React.createElement("span", { style: { fontWeight: 700, flexShrink: 0 } },
                `🔔 Nightcord ${info.remoteVersion} available!`
            ),
            React.createElement("span", {
                style: { opacity: 0.85, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
            },
                status ?? `Current version: ${info.localVersion}`
            )
        ),
        React.createElement("div", { style: { display: "flex", gap: 8, flexShrink: 0 } },
            React.createElement("button", {
                onClick: doUpdate,
                disabled: loading,
                style: {
                    background: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    borderRadius: 6,
                    color: "#fff",
                    padding: "4px 14px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "inherit",
                }
            }, loading ? "..." : "⬇ Update"),
            React.createElement("button", {
                onClick: () => setDismissed(true),
                style: {
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    fontSize: 18,
                    padding: "0 4px",
                    fontFamily: "inherit",
                    lineHeight: 1,
                },
                title: "Dismiss"
            }, "✕")
        )
    );
}

// ── Monte la bannière dans le DOM ─────────────────────────────────────────────
let bannerRoot: any = null;
let bannerContainer: HTMLDivElement | null = null;

function mountBanner() {
    if (bannerContainer || document.getElementById("nightcord-updater-root")) return;
    bannerContainer = document.createElement("div");
    bannerContainer.id = "nightcord-updater-root";
    document.body.appendChild(bannerContainer);

    const ReactDOM = findByPropsLazy("createRoot", "render");
    try {
        if (ReactDOM?.createRoot) {
            bannerRoot = ReactDOM.createRoot(bannerContainer);
            bannerRoot.render(React.createElement(UpdateBanner));
        } else if (ReactDOM?.render) {
            ReactDOM.render(React.createElement(UpdateBanner), bannerContainer);
        }
    } catch (e) {
        console.error("[NightcordUpdater] Error mounting banner:", e);
    }
}

function unmountBanner() {
    try { bannerRoot?.unmount(); } catch { }
    bannerContainer?.remove();
    bannerContainer = null;
    bannerRoot = null;
}

// ── Plugin ────────────────────────────────────────────────────────────────────
export default definePlugin({
    name: "NightcordUpdater",
    enabledByDefault: true,
    description: "Shows a banner when a new Nightcord version is available. Click Update to install.",
    authors: [{ name: "Nightcord", id: 0n }],

    start() {
        const mountWhenReady = () => setTimeout(mountBanner, 1500);
        if (document.readyState === "complete") mountWhenReady();
        else window.addEventListener("load", mountWhenReady, { once: true });

        setTimeout(() => checkForUpdates(), 5000);
    },

    stop() {
        unmountBanner();
        pendingUpdate = null;
        listeners = [];
    },
});
