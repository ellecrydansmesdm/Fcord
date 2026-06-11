/*
 * Nightcord, a Discord client mod
 * Copyright (c) 2026 contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import definePlugin from "@utils/types";
import { React, ChannelStore, FluxDispatcher, UserStore, ReactDOM, createRoot } from "@webpack/common";
import { findByPropsLazy } from "@webpack";
import ErrorBoundary from "@components/ErrorBoundary";

// ── Stores ─────────────────────────────────────────────────────────────────

const ReadStateStore = findByPropsLazy("getUnreadCount", "getMentionCount");
const MessageStore = findByPropsLazy("getMessages");

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(ts: string | number | Date): string {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" })
        + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getPreview(msg: any): { text: string; attach: boolean; } {
    if (msg.content?.trim()) return { text: msg.content.trim(), attach: false };
    if (msg.attachments?.length)
        return { text: `📎 ${msg.attachments.length > 1 ? msg.attachments.length + " pièces jointes" : "Pièce jointe"}`, attach: true };
    if (msg.stickers?.length) return { text: "🎭 Sticker", attach: true };
    if (msg.embeds?.length) return { text: "🔗 Embed", attach: true };
    return { text: "📷 Média", attach: true };
}

function avatarUrl(userId: string, hash: string | null): string {
    if (!hash) return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(userId) >> 22n) % 6n)}.png`;
    return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${hash.startsWith("a_") ? "gif" : "webp"}?size=64`;
}

// ── Tooltip Component ──────────────────────────────────────────────────────

const MAX_DISPLAY = 4;

function Tooltip({ channelId, rect }: { channelId: string; rect: DOMRect; }) {
    const [messages, setMessages] = React.useState<any[]>([]);
    
    const unread: number = React.useMemo(() => {
        try { return ReadStateStore.getUnreadCount(channelId) ?? 0; } catch { return 0; }
    }, [channelId]);

    React.useEffect(() => {
        let isMounted = true;
        // Try getting messages from Discord's local store first
        let localMsgs = [];
        try {
            const msgs = MessageStore?.getMessages(channelId);
            if (msgs && msgs._array && msgs._array.length > 0) {
                localMsgs = [...msgs._array].reverse();
            }
        } catch {}
        
        if (isMounted) {
            setMessages(localMsgs);
        }
        return () => { isMounted = false; };
    }, [channelId]);

    const author = messages[0]?.author ?? null;
    const name = author?.global_name ?? author?.globalName ?? author?.username ?? null;
    const avatar = author ? avatarUrl(author.id, author.avatar) : null;

    // Hide tooltip if opened or replied
    if (unread === 0) return null;

    // Position: right of the DM row, stay in viewport
    const W = 320, OFFSET = 14;
    let left = rect.right + OFFSET;
    let top = rect.top + rect.height / 2 - 40;
    if (left + W > window.innerWidth - 8) left = rect.left - W - OFFSET;
    if (top + 260 > window.innerHeight - 8) top = window.innerHeight - 268;
    if (top < 8) top = 8;

    return (
        <div className="pm-tooltip" style={{ top, left }}>
            <div className="pm-card">
                {/* Header */}
                {name && (
                    <div className="pm-header">
                        {avatar && <img className="pm-avatar" src={avatar} alt="" />}
                        <span className="pm-username">{name}</span>
                        {unread > 0 && (
                            <span className="pm-badge">{unread > 99 ? "99+" : unread}</span>
                        )}
                    </div>
                )}

                {/* Messages */}
                {messages.length === 0 ? (
                    <div className="pm-empty">
                        {unread > 0
                            ? `${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`
                            : "Aucun message à afficher"}
                    </div>
                ) : (
                    <div className="pm-messages">
                        {messages.slice(0, MAX_DISPLAY).map((m: any, i: number) => {
                            const { text, attach } = getPreview(m);
                            return (
                                <div className="pm-message" key={m.id ?? i}>
                                    <span className="pm-message-time">{formatTime(m.timestamp)}</span>
                                    <span className={`pm-message-content${attach ? " pm-attachment" : ""}`}>{text}</span>
                                </div>
                            );
                        })}
                        {unread > MAX_DISPLAY && (
                            <div className="pm-more">+{unread - MAX_DISPLAY} autres non lus</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const SafeTooltip = ErrorBoundary.wrap(Tooltip, { noop: true });

// ── Tooltip portal ─────────────────────────────────────────────────────────

let container: HTMLDivElement | null = null;
let hideTimer: any = null;
let renderFn: ((node: React.ReactNode) => void) | null = null;

function ensurePortal() {
    if (container) return;
    container = document.createElement("div");
    container.id = "nc-pm-root";
    document.body.appendChild(container);

    if (createRoot) {
        const root = createRoot(container);
        renderFn = node => root.render(node as any);
    } else if (ReactDOM?.render) {
        renderFn = node => ReactDOM.render(node, container);
    }
}

function show(channelId: string, rect: DOMRect) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    ensurePortal();
    renderFn?.(<SafeTooltip channelId={channelId} rect={rect} />);
}

function hide(delay = 80) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    hideTimer = setTimeout(() => renderFn?.(null), delay);
}

// ── DOM Scanning ───────────────────────────────────────────────────────────

function getChannelId(el: Element): string | null {
    // DM items link to /channels/@me/<channelId>
    const anchor = el.matches("a[href]") ? el : el.querySelector("a[href]");
    if (!anchor) return null;
    const m = anchor.getAttribute("href")?.match(/\/channels\/@me\/(\d{10,21})/);
    return m?.[1] ?? null;
}

function shouldShow(channelId: string): boolean {
    // Don't show if no unread messages
    try {
        const unread = ReadStateStore.getUnreadCount(channelId) ?? 0;
        if (unread === 0) return false;
    } catch { return false; }

    // Show if we have cached messages OR at least unread count
    return true;
}

function attachHandlers(el: HTMLElement) {
    if (el.dataset.pmHooked) return;
    el.dataset.pmHooked = "1";

    el.addEventListener("mouseenter", () => {
        const channelId = getChannelId(el);
        if (!channelId) return;
        if (!shouldShow(channelId)) return;
        show(channelId, el.getBoundingClientRect());
    });

    el.addEventListener("mouseleave", () => hide());
}

function scan(root: Document | Element = document) {
    root.querySelectorAll<HTMLElement>("li").forEach(li => {
        if (getChannelId(li)) attachHandlers(li);
    });
}

// ── MutationObserver ───────────────────────────────────────────────────────

let observer: MutationObserver | null = null;

function startObserver() {
    observer = new MutationObserver(muts => {
        if (document.visibilityState === "hidden") return;
        for (const m of muts)
            for (const node of m.addedNodes)
                if (node instanceof HTMLElement) scan(node);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    scan(document);
}

// ── Plugin ─────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "PreviewMessage",
    description: "Hover over a DM in your inbox to preview unread messages without opening the conversation. Only shows when there are unread messages.",
    authors: [{ name: "nightcord", id: 0n }],
    tags: ["Chat", "Utility"],
    enabledByDefault: true,

    start() {
        startObserver();

        // Stay open when hovering the tooltip itself
        document.addEventListener("mouseenter", e => {
            if ((e.target as HTMLElement)?.closest?.("#nc-pm-root")) {
                if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
            }
        }, true);
        document.addEventListener("mouseleave", e => {
            if ((e.target as HTMLElement)?.closest?.("#nc-pm-root")) hide();
        }, true);
    },

    stop() {
        observer?.disconnect(); observer = null;
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        renderFn?.(null);
        container?.remove(); container = null; renderFn = null;

        document.querySelectorAll<HTMLElement>("[data-pm-hooked]").forEach(el => {
            delete el.dataset.pmHooked;
        });
    },
});
