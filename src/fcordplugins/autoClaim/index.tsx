/*
 * Fcord, a Discord client mod
 * Copyright (c) 2026 contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, RestAPI, UserStore, VoiceStateStore } from "@webpack/common";

const logger = new Logger("AutoClaim");

const VoiceActions = findByPropsLazy("setChannel", "toggleSelfMute");
const AuthenticationStore = findByPropsLazy("getSessionId", "getToken");

// ── Settings ────────────────────────────────────────────────────────────────

const settings = definePluginSettings({
    // ── Claim Ticket ──────────────────────────────────────────────────────
    enableClaimTicket: {
        type: OptionType.BOOLEAN,
        description: "Automatically click a button on bot messages inside a ticket category.",
        default: false,
        restartNeeded: false,
    },
    claimCategoryId: {
        type: OptionType.STRING,
        description: "Category ID where tickets are located (parent_id of the channels).",
        default: "",
    },
    claimBotId: {
        type: OptionType.STRING,
        description: "User ID of the bot that sends messages in tickets.",
        default: "",
    },
    claimButtonIndex: {
        type: OptionType.SELECT,
        description: "Which button to automatically click.",
        options: [
            { label: "1st button", value: 0, default: true },
            { label: "2nd button", value: 1 },
            { label: "3rd button", value: 2 },
            { label: "4th button", value: 3 },
            { label: "5th button", value: 4 },
        ],
    },
    claimCooldown: {
        type: OptionType.NUMBER,
        description: "Cooldown between claims in seconds (0 = no cooldown).",
        default: 0,
    },

    // ── Auto Move SV ──────────────────────────────────────────────────────
    enableAutoMove: {
        type: OptionType.BOOLEAN,
        description: "Automatically move people from a source voice channel into your current channel.",
        default: false,
        restartNeeded: false,
    },
    sourceSVChannelId: {
        type: OptionType.STRING,
        description: "Source voice channel ID to pull users from.",
        default: "",
    },
});

// ── Claim Ticket ─────────────────────────────────────────────────────────────

let lastClaimTimestamp = 0;

async function handleClaimTicket(message: any) {
    const s = settings.store;
    if (!s.enableClaimTicket) return;
    if (!s.claimCategoryId || !s.claimBotId) return;

    // Check bot ID
    if (message.author?.id !== s.claimBotId) return;

    // Check category
    const channel = ChannelStore.getChannel(message.channel_id);
    if (!channel) return;
    if (channel.parent_id !== s.claimCategoryId) return;

    // Check cooldown
    const now = Date.now();
    const cooldownMs = (s.claimCooldown ?? 0) * 1000;
    if (cooldownMs > 0 && now - lastClaimTimestamp < cooldownMs) {
        logger.info(`[ClaimTicket] Cooldown active, skipping.`);
        return;
    }

    // Find buttons in message components
    const components: any[] = message.components ?? [];
    const flatButtons: any[] = [];
    for (const row of components) {
        for (const comp of row.components ?? []) {
            if (comp.type === 2) flatButtons.push(comp); // type 2 = Button
        }
    }

    const buttonIndex = s.claimButtonIndex ?? 0;
    const button = flatButtons[buttonIndex];
    if (!button) {
        logger.warn(`[ClaimTicket] No button found at index ${buttonIndex}. Message has ${flatButtons.length} button(s).`);
        return;
    }

    // Click the button
    try {
        const sessionId = AuthenticationStore.getSessionId?.() ?? "";
        await RestAPI.post({
            url: "/interactions",
            body: {
                type: 3,
                application_id: message.application_id ?? message.author?.id,
                channel_id: message.channel_id,
                message_id: message.id,
                message_flags: message.flags ?? 0,
                session_id: sessionId,
                data: {
                    component_type: 2,
                    custom_id: button.custom_id,
                },
                nonce: String(Date.now()),
            }
        });

        lastClaimTimestamp = Date.now();
        logger.info(`[ClaimTicket] Clicked button "${button.label}" (custom_id: ${button.custom_id}) in channel ${message.channel_id}`);
    } catch (e) {
        logger.error("[ClaimTicket] Failed to send interaction", e);
    }
}

// ── Auto Move SV ─────────────────────────────────────────────────────────────

function getMyVoiceState() {
    const me = UserStore.getCurrentUser();
    if (!me) return null;
    return VoiceStateStore.getVoiceStateForUser(me.id) ?? null;
}

function getUsersInChannel(channelId: string): string[] {
    try {
        const states = VoiceStateStore.getVoiceStatesForChannel(channelId) as Record<string, any>;
        return Object.keys(states ?? {});
    } catch {
        return [];
    }
}

function pickRandom<T>(arr: T[]): T | null {
    if (!arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

async function tryMoveRandomFromSource() {
    const s = settings.store;
    if (!s.enableAutoMove || !s.sourceSVChannelId) return;

    const myState = getMyVoiceState();
    if (!myState?.channelId) return;

    const myChannelId = myState.channelId;
    const myGuildId = myState.guildId;

    // Only move if I'm alone in my channel
    const myChannelUsers = getUsersInChannel(myChannelId);
    const me = UserStore.getCurrentUser();
    if (!me) return;

    const othersInMyChannel = myChannelUsers.filter(uid => uid !== me.id);
    if (othersInMyChannel.length > 0) return; // Not alone → don't move

    // Pick a random person from source channel
    const sourceUsers = getUsersInChannel(s.sourceSVChannelId).filter(uid => uid !== me.id);
    const targetUserId = pickRandom(sourceUsers);
    if (!targetUserId) return;

    try {
        await VoiceActions.setChannel(myGuildId, targetUserId, myChannelId);
        logger.info(`[AutoMove] Moved user ${targetUserId} from ${s.sourceSVChannelId} to ${myChannelId}`);
    } catch (e) {
        logger.error("[AutoMove] Failed to move user", e);
    }
}

function handleVoiceStateUpdate({ voiceStates }: { voiceStates: any[]; }) {
    const s = settings.store;
    if (!s.enableAutoMove || !s.sourceSVChannelId) return;

    const me = UserStore.getCurrentUser();
    if (!me) return;

    const myState = getMyVoiceState();
    if (!myState?.channelId) return;

    const myChannelId = myState.channelId;

    for (const state of voiceStates) {
        // Case 1: Someone joined the source channel → try to move them if I'm alone
        if (state.channelId === s.sourceSVChannelId && state.userId !== me.id) {
            tryMoveRandomFromSource();
        }

        // Case 2: Someone left MY channel → immediately try to move someone from source
        if (state.userId !== me.id && !state.channelId) {
            // Check if they were previously in my channel
            tryMoveRandomFromSource();
        }
    }
}

// ── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "AutoClaim",
    description: "Automatically claim tickets by clicking bot message buttons, and auto-move users from a source voice channel into yours.",
    authors: [{ name: "Fcord", id: 0n }],
    enabledByDefault: false,
    settings,

    flux: {
        async MESSAGE_CREATE({ message }: { message: any; }) {
            if (!message || message.optimistic) return;
            await handleClaimTicket(message);
        },

        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: any[]; }) {
            if (!voiceStates?.length) return;
            handleVoiceStateUpdate({ voiceStates });
        },
    },
});
