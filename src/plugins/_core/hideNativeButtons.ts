/*
 * Nightcord — Injection CSS globale pour masquer les boutons natifs Discord
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const STYLE_ID = "nightcord-hide-native-buttons";

const CSS = `
/* ── Nightcord : suppression boutons natifs Discord non désirés ── */
[aria-label="Open Logs"],
[aria-label="Help"],
[aria-label="Aide"],
[aria-label="DevTools"],
[aria-label="Boîte de réception"],
[aria-label="Boite de réception"],
[aria-label="Inbox"],
[aria-label="Last Meadow Online"] {
    display: none !important;
    width: 0 !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    flex: none !important;
}
`;

export default definePlugin({
    name: "HideNativeButtons",
    description: "Hides unwanted native Discord buttons (Logs, Help, DevTools, Inbox)",
    authors: [Devs.Ven],
    required: true,
    patches: [],

    start() {
        const existing = document.getElementById(STYLE_ID);
        if (existing) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
    },

    stop() {
        document.getElementById(STYLE_ID)?.remove();
    },
});
