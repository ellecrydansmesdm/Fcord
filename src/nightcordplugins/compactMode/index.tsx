/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isCompactModeEnabled, syncCompactBodyClass, toggleCompactMode } from "@api/HeaderBar";
import definePlugin from "@utils/types";

import style from "./style.css?managed";

export { toggleCompactMode as doToggle };

export function isCompactEnabled(): boolean {
    return isCompactModeEnabled();
}

export default definePlugin({
    name: "CompactMode",
    enabledByDefault: true,
    description: "Hides all Nightcord plugin buttons and replaces them with a single compact toggle icon. Click the icon to restore all buttons.",
    authors: [{ name: "Nightcord", id: 0n }],
    required: true,
    managedStyle: style,

    start() {
        syncCompactBodyClass();
    },

    stop() {
        document.body.classList.remove("nightcord-compact");
    },
});
