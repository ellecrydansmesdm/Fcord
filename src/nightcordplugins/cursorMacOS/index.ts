/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

/*
 * CursorMacOS — replaces Windows system cursors with authentic macOS cursors.
 * Requires the Nightcord native helper (VencordNative.pluginHelpers.CursorMacOS)
 * which handles registry/system-level cursor replacement via the Electron main process.
 *
 * Without the native helper (e.g. in browser/web context), the plugin does nothing harmful —
 * it simply logs that native support is required.
 */

const pluginSettings = {
    style: {
        type: OptionType.SELECT,
        description: "macOS cursor style",
        options: [
            { label: "Modern with shadow (Sierra+)", value: "modern_shadow", default: true },
            { label: "Modern without shadow (Sierra+)", value: "modern_no_shadow" },
            { label: "Classic with shadow (El Capitan)", value: "classic_shadow" },
            { label: "Classic without shadow (El Capitan)", value: "classic_no_shadow" },
        ],
    },
    size: {
        type: OptionType.SELECT,
        description: "Cursor size",
        options: [
            { label: "Normal", value: "normal", default: true },
            { label: "Large", value: "large" },
            { label: "Extra Large", value: "xl" },
        ],
    },
};

async function applyCursors() {
    const native = (window as any).VencordNative?.pluginHelpers?.CursorMacOS;
    if (!native) {
        console.warn("[CursorMacOS] Native helper not available — cursor replacement requires Electron main process support.");
        return;
    }

    const pluginStore = Settings.plugins.CursorMacOS as any;
    const style = pluginStore?.style ?? "modern_shadow";
    const size = pluginStore?.size ?? "normal";

    console.log(`[CursorMacOS] Applying: ${style}/${size}`);
    const result = await native.applyCursors(style, size);
    if (!result.ok) {
        console.error("[CursorMacOS] Failed to apply:", result.error);
    }
}

async function restoreCursors() {
    const native = (window as any).VencordNative?.pluginHelpers?.CursorMacOS;
    if (!native) return;

    console.log("[CursorMacOS] Restoring default Windows cursors...");
    const result = await native.restoreCursors();
    if (!result.ok) {
        console.error("[CursorMacOS] Failed to restore:", result.error);
    }
}

// Settings change listener
function onSettingsChange() {
    applyCursors();
}

export default definePlugin({
    name: "CursorMacOS",
    description: "Replaces Windows SYSTEM cursors with authentic macOS cursors (.cur/.ani). Restores default cursors when disabled.",
    authors: [{ name: "Nightcord", id: 0n }],
    enabledByDefault: false,
    settings: pluginSettings,
    patches: [],

    async start() {
        await applyCursors();
        // Listen for settings changes (style/size changes)
        Settings.addChangeListener("plugins.CursorMacOS", onSettingsChange);
    },

    async stop() {
        Settings.removeChangeListener("plugins.CursorMacOS", onSettingsChange);
        await restoreCursors();
    },
} as any);
