/*
 * Fcord – CursorMacOS plugin
 * Replaces Windows SYSTEM cursors with authentic macOS .cur/.ani files.
 * Default Windows cursors are restored when the plugin is disabled.
 */

import { definePluginSettings, SettingsStore } from "@api/Settings";
import definePlugin, { OptionType, PluginNative } from "@utils/types";

const settings = definePluginSettings({
    style: {
        type: OptionType.SELECT,
        description: "macOS cursor style",
        options: [
            { label: "Modern with shadow (Sierra+)", value: "modern_shadow", default: true },
            { label: "Modern without shadow (Sierra+)", value: "modern_no_shadow" },
            { label: "Classic with shadow (El Capitan)", value: "classic_shadow" },
            { label: "Classic without shadow (El Capitan)", value: "classic_no_shadow" },
        ]
    },
    size: {
        type: OptionType.SELECT,
        description: "Cursor size",
        options: [
            { label: "Normal", value: "normal", default: true },
            { label: "Large", value: "large" },
            { label: "Extra Large", value: "xl" }
        ]
    }
});

const Native = VencordNative.pluginHelpers.CursorMacOS as PluginNative<typeof import("./native")>;

async function apply() {
    const { style, size } = settings.store;
    console.log(`[CursorMacOS] Applying: ${style}/${size}`);
    const result = await Native.applyCursors(style, size);
    if (!result.ok) {
        console.error("[CursorMacOS] Failed to apply:", result.error);
    }
}

const changeListener = () => {
    apply();
};

export default definePlugin({
    name: "CursorMacOS",
    enabledByDefault: false,
    description: "Replaces Windows SYSTEM cursors with authentic macOS cursors (.cur/.ani). Restores default cursors when disabled.",
    authors: [{ name: "Fcord", id: 0n }],

    settings,

    async start() {
        await apply();
        SettingsStore.addPrefixChangeListener("plugins.CursorMacOS", changeListener);
    },

    async stop() {
        SettingsStore.removePrefixChangeListener("plugins.CursorMacOS", changeListener);
        console.log("[CursorMacOS] Restoring default Windows cursors...");
        const result = await Native.restoreCursors();
        if (!result.ok) {
            console.error("[CursorMacOS] Failed to restore:", result.error);
        }
    },
});
