/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Menu, RestAPI, UserStore } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Activer le plugin MessageCleaner",
        default: true
    },
    targetChannelId: {
        type: OptionType.STRING,
        description: "Channel ID to clean (leave empty to use the context menu)",
        default: ""
    },
    delayBetweenDeletes: {
        type: OptionType.SLIDER,
        description: "Delay between each deletion (ms) — to avoid rate limiting",
        default: 1000,
        markers: [100, 500, 1000, 2000, 5000],
        minValue: 100,
        maxValue: 10000,
        stickToMarkers: false
    },
    batchSize: {
        type: OptionType.SLIDER,
        description: "Number of messages to process per batch",
        default: 50,
        markers: [10, 25, 50, 100],
        minValue: 1,
        maxValue: 100,
        stickToMarkers: false
    },
    showProgress: {
        type: OptionType.BOOLEAN,
        description: "Show progress in real time",
        default: true
    },
    debugMode: {
        type: OptionType.BOOLEAN,
        description: "Debug mode (detailed logs)",
        default: false
    },
    skipSystemMessages: {
        type: OptionType.BOOLEAN,
        description: "Ignore system messages (join/leave, etc.)",
        default: true
    },
    skipReplies: {
        type: OptionType.BOOLEAN,
        description: "Ignore message replies",
        default: false
    },
    maxAge: {
        type: OptionType.SLIDER,
        description: "Maximum message age to delete (days, 0 = no limit)",
        default: 0,
        markers: [0, 1, 7, 30, 90],
        minValue: 0,
        maxValue: 365,
        stickToMarkers: false
    }
});

let isCleaningInProgress = false;
let shouldStopCleaning = false;
let cleaningStats = { total: 0, deleted: 0, failed: 0, skipped: 0, startTime: 0 };

function log(message: string, level: "info" | "warn" | "error" = "info") {
    const prefix = `[MessageCleaner ${new Date().toLocaleTimeString()}]`;
    switch (level) {
        case "warn": console.warn(prefix, message); break;
        case "error": console.error(prefix, message); break;
        default: console.log(prefix, message);
    }
}

function debugLog(message: string) {
    if (settings.store.debugMode) log(`🔍 ${message}`, "info");
}

function canDeleteMessage(message: Message, currentUserId: string): boolean {
    try {
        if (message.author?.id !== currentUserId) return false;
        if (settings.store.skipSystemMessages && message.type !== 0 && message.type !== 19) return false;

        const isReply = message.type === 19 || !!message.messageReference || !!(message as any).message_reference;
        if (isReply && settings.store.skipReplies) return false;

        if (settings.store.maxAge > 0) {
            let messageTime: number;
            if (typeof message.timestamp === "string") messageTime = new Date(message.timestamp).getTime();
            else if (typeof message.timestamp === "number") messageTime = message.timestamp;
            else return false;

            if (isNaN(messageTime) || messageTime <= 0) return false;
            const messageAge = Date.now() - messageTime;
            const maxAgeMs = settings.store.maxAge * 24 * 60 * 60 * 1000;
            if (messageAge > maxAgeMs) return false;
        }

        return true;
    } catch {
        return false;
    }
}

async function deleteMessage(channelId: string, messageId: string): Promise<boolean> {
    try {
        await RestAPI.del({ url: `/channels/${channelId}/messages/${messageId}` });
        return true;
    } catch (error: any) {
        const statusCode = error?.status || error?.statusCode || "N/A";
        debugLog(`❌ Error suppression ${messageId}: status ${statusCode}`);
        return false;
    }
}

async function getChannelMessages(channelId: string, before?: string): Promise<Message[]> {
    try {
        const url = before
            ? `/channels/${channelId}/messages?limit=${settings.store.batchSize}&before=${before}`
            : `/channels/${channelId}/messages?limit=${settings.store.batchSize}`;
        const response = await RestAPI.get({ url });
        if (!response || !response.body) return [];
        return Array.isArray(response.body) ? response.body : [];
    } catch (error: any) {
        const statusCode = error?.status || error?.statusCode || "N/A";
        log(`❌ Error récupération messages: status ${statusCode}`, "error");
        return [];
    }
}

async function cleanChannel(channelId: string) {
    if (!settings.store.enabled || isCleaningInProgress) return;

    try {
        const channel = ChannelStore.getChannel(channelId);
        const currentUserId = UserStore.getCurrentUser()?.id;
        if (!channel || !currentUserId) return;

        const channelName = channel.name || "Canal privé";
        log(`🧹 Début du nettoyage de "${channelName}"`);

        isCleaningInProgress = true;
        shouldStopCleaning = false;
        cleaningStats = { total: 0, deleted: 0, failed: 0, skipped: 0, startTime: Date.now() };

        let lastMessageId: string | undefined;
        let totalProcessed = 0;

        while (!shouldStopCleaning) {
            try {
                const messages = await getChannelMessages(channelId, lastMessageId);
                if (messages.length === 0) { log("Plus de messages à traiter"); break; }

                const validMessages = messages.filter(msg => canDeleteMessage(msg, currentUserId));
                cleaningStats.total += validMessages.length;

                if (validMessages.length === 0) {
                    lastMessageId = messages[messages.length - 1].id;
                    cleaningStats.skipped += messages.length;
                    if (messages.length < settings.store.batchSize) break;
                    continue;
                }

                for (const message of validMessages) {
                    if (shouldStopCleaning) { log("Arrêt demandé par l'utilisateur"); break; }

                    const success = await deleteMessage(channelId, message.id);
                    if (success) cleaningStats.deleted++;
                    else cleaningStats.failed++;

                    totalProcessed++;
                    if (settings.store.delayBetweenDeletes > 0) {
                        await new Promise(resolve => setTimeout(resolve, settings.store.delayBetweenDeletes));
                    }
                }

                cleaningStats.skipped += messages.filter(msg => !canDeleteMessage(msg, currentUserId)).length;
                lastMessageId = messages[messages.length - 1].id;
                if (messages.length < settings.store.batchSize) break;

            } catch (error: any) {
                const statusCode = error?.status || error?.statusCode || "N/A";
                log(`❌ Error dans la boucle: status ${statusCode}`, "error");
                cleaningStats.failed++;

                if (statusCode === 429) {
                    log("Rate limit atteint, pause 30s...", "warn");
                    await new Promise(resolve => setTimeout(resolve, 30000));
                } else {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

                if (cleaningStats.failed > 15) { log("Trop d'errors, arrêt", "error"); break; }
            }
        }

        isCleaningInProgress = false;
        const { deleted, failed, skipped } = cleaningStats;
        const totalTime = Date.now() - cleaningStats.startTime;
        const timeStr = totalTime < 60000 ? `${Math.round(totalTime / 1000)}s` : `${Math.round(totalTime / 60000)}min`;
        log(`✅ Nettoyage terminé: ${deleted} supprimés, ${failed} échecs, ${skipped} ignorés — ${timeStr}`);

    } catch (error) {
        isCleaningInProgress = false;
        log(`❌ Error globale: ${error}`, "error");
    }
}

function stopCleaning() {
    if (isCleaningInProgress) {
        shouldStopCleaning = true;
        log("⏹️ Arrêt du nettoyage demandé");
    }
}

const ChannelContextMenuPatch: NavContextMenuPatchCallback = (children, ctx: { channel?: Channel; } = {}) => {
    const { channel } = ctx;
    if (!channel) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    if (!group) return;

    const menuItems: any[] = [<Menu.MenuSeparator key="separator" />];

    if (isCleaningInProgress) {
        const { total, deleted, failed, skipped } = cleaningStats;
        const processed = deleted + failed + skipped;
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

        menuItems.push(
            <Menu.MenuItem key="cleaning-status" id="vc-cleaning-status"
                label={`Nettoyage en cours: ${percentage}% (${processed}/${total})`}
                color="brand" disabled={true} />,
            <Menu.MenuItem key="stop-cleaning" id="vc-stop-cleaning"
                label="Stop le nettoyage" color="danger" action={stopCleaning} />
        );
    } else {
        menuItems.push(
            <Menu.MenuItem key="clean-messages" id="vc-clean-messages"
                label="Nettoyer les messages" color="danger"
                action={() => cleanChannel(channel.id)} />
        );
    }

    group.push(...menuItems);
};

export default definePlugin({
    name: "MessageCleaner",
    enabledByDefault: true,
    description: "Cleans all messages in a channel with smart rate limiting and statistics",
    authors: [{ name: "Bash", id: 1327483363518582784n }],
    dependencies: ["ContextMenuAPI"],
    settings,

    contextMenus: {
        "channel-context": ChannelContextMenuPatch,
        "gdm-context": ChannelContextMenuPatch,
        "user-context": ChannelContextMenuPatch
    },

    start() {
        log("🚀 Plugin MessageCleaner démarré");
    },

    stop() {
        log("🛑 Plugin MessageCleaner arrêté");
        if (isCleaningInProgress) shouldStopCleaning = true;
    }
});
