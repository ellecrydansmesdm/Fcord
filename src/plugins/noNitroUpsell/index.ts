/*
 * Nightcord — NoNitroUpsell
 * Blocks Nitro upsell popups by intercepting Flux actions before they render.
 * Does NOT use MutationObserver or direct DOM removal to avoid React crashes.
 */

import definePlugin from "@utils/types";

// Known Flux action types Discord uses for these Nitro gift/upsell popups
const NITRO_UPSELL_ACTIONS = [
    "PREMIUM_GUILD_SUBSCRIPTION_MODAL_SHOW",
    "GUILD_SUBSCRIPTION_POPOUT_SHOW",
    "NITRO_GIFT_CODE_RESOLVED",
    "PREMIUM_GIFT_CODE_MODAL_SHOW",
    "SHOW_PREMIUM_UPSELL_MODAL",
    "PREMIUM_UPSELL_MODAL_SHOW",
    "GUILD_ROLE_SUBSCRIPTION_PURCHASE_MODAL_SHOW",
    "PREMIUM_TRIAL_OFFER_MODAL_SHOW",
];

export default definePlugin({
    name: "NoNitroUpsell",
    description: "Automatically blocks Nitro upsell/gift popups that Discord keeps showing.",
    authors: [{ name: "Nightcord", id: 0n }],
    enabledByDefault: true,

    // Intercept Flux actions that trigger the popups before they even render.
    // Returning false from a flux handler prevents the action from dispatching.
    flux: Object.fromEntries(
        NITRO_UPSELL_ACTIONS.map(action => [
            action,
            () => false
        ])
    ),
});
