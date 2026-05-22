/*
 * Nightcord — FakeDM plugin
 *
 * Fix position: uses getBoundingClientRect() on the real DOM button
 * Fix IDs: unique snowflake guaranteed by counter
 */

import "./styles.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, React, SelectedChannelStore, UserStore, ReactDOM } from "@webpack/common";

// ─── Unique IDs ─────────────────────────────────────────────────────────────
let _idCounter = 0;
function uniqueSnowflake(date: Date): string {
    const offset = _idCounter++ % 4096;
    const ms = Math.max(0, date.getTime() - 1420070400000);
    return ((BigInt(ms) << 22n) | BigInt(offset)).toString();
}

// ─── Fake message ID storage ───────────────────────────────────────────────
const fakeIds = new Map<string, Set<string>>();

function registerFake(channelId: string, id: string) {
    if (!fakeIds.has(channelId)) fakeIds.set(channelId, new Set());
    fakeIds.get(channelId)!.add(id);
}

function clearFakes(channelId: string): number {
    const ids = fakeIds.get(channelId);
    if (!ids?.size) return 0;
    let n = 0;
    for (const id of ids) {
        FluxDispatcher.dispatch({ type: "MESSAGE_DELETE", channelId, id, mlDeleted: true });
        n++;
    }
    ids.clear();
    return n;
}

// ─── Avatar URL ───────────────────────────────────────────────────────────────
function avatarUrl(user: any): string {
    if (!user) return "";
    if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=32`;
    const idx = user.discriminator && user.discriminator !== "0"
        ? parseInt(user.discriminator) % 5
        : Number(BigInt(user.id) >> 22n) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

// ─── Other user in DM ─────────────────────────────────────────────────────────
const ChannelStore = findStoreLazy("ChannelStore");

function getOtherUser(): any | null {
    try {
        const chId = SelectedChannelStore.getChannelId();
        if (!chId) return null;
        const ch = ChannelStore.getChannel(chId);
        if (!ch || ch.type !== 1) return null;
        const me = UserStore.getCurrentUser();
        const otherId = ch.recipients?.find((id: string) => id !== me?.id);
        return otherId ? (UserStore.getUser(otherId) ?? null) : null;
    } catch { return null; }
}

// ─── Message injection ────────────────────────────────────────────────────────
function inject(channelId: string, author: any, content: string, date: Date) {
    const id = uniqueSnowflake(date);
    FluxDispatcher.dispatch({
        type: "MESSAGE_CREATE",
        channelId,
        message: {
            attachments: [], components: [], embeds: [], mention_roles: [], mentions: [],
            author: {
                id: author.id,
                username: author.username,
                discriminator: author.discriminator ?? "0",
                avatar: author.avatar ?? null,
                public_flags: author.publicFlags ?? 0,
                flags: author.flags ?? 0,
                banner: author.banner ?? null,
                accent_color: null,
                global_name: author.globalName ?? author.username,
                avatar_decoration_data: author.avatarDecorationData
                    ? { asset: author.avatarDecorationData.asset, sku_id: author.avatarDecorationData.skuId }
                    : null,
                banner_color: null,
            },
            channel_id: channelId,
            content,
            edited_timestamp: null,
            flags: 0,
            id,
            mention_everyone: false,
            nonce: id,
            pinned: false,
            timestamp: date.toISOString(),
            tts: false,
            type: 0,
        },
        optimistic: false,
        isPushNotification: false,
    });
    registerFake(channelId, id);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toLocal(d: Date): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ─── Avatar component ─────────────────────────────────────────────────────────
function UserAvatar({ user }: { user: any; }) {
    const [err, setErr] = React.useState(false);
    if (!user) return null;
    const url = avatarUrl(user);
    if (err || !url) return <div className="fdm-sender-avatar fdm-sender-avatar--ph">{user.username?.[0]?.toUpperCase() ?? "?"}</div>;
    return <img src={url} className="fdm-sender-avatar" alt="" onError={() => setErr(true)} />;
}

// ─── FakeDM Panel ───────────────────────────────────────────────────────────
function FakeDMPanel({ onClose, btnRect }: { onClose(): void; btnRect: DOMRect; }) {
    const me = UserStore.getCurrentUser();
    const other = getOtherUser();
    const channelId = SelectedChannelStore.getChannelId();
    const isInDM = !!other;

    const [sender, setSender] = React.useState<"me" | "other">("me");
    const [text, setText] = React.useState("");
    const [dateStr, setDateStr] = React.useState(() => toLocal(new Date()));
    const [status, setStatus] = React.useState<{ msg: string; ok: boolean; } | null>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const panelRef = React.useRef<HTMLDivElement>(null);

    // ── Calculated position from button coordinates ─────────────────────────
    const [pos, setPos] = React.useState<React.CSSProperties>({
        opacity: 0,
        position: "fixed",
        zIndex: 1000000,
        width: "430px"
    });

    React.useLayoutEffect(() => {
        // Force reset des dimensions au cas où le CSS n'est pas chargé
        const PW = 430;
        const PH = 280;
        const margin = 12;

        // Calcul de position absolue par rapport à la fenêtre (viewport)
        let left = btnRect.left + btnRect.width / 2 - PW / 2;
        let top = btnRect.top - PH - margin;

        // Sécurité pour rester dans l'écran
        left = Math.max(margin, Math.min(left, window.innerWidth - PW - margin));
        if (top < margin) top = btnRect.bottom + margin;

        setPos({
            left: `${left}px`,
            top: `${top}px`,
            opacity: 1,
            position: "fixed",
            zIndex: 1000000,
            width: `${PW}px`,
            height: "auto",
            visibility: "visible",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "auto"
        });
    }, [btnRect]);

    React.useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 80); }, []);

    React.useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", h, true);
        return () => document.removeEventListener("keydown", h, true);
    }, [onClose]);

    function setMsg(msg: string, ok: boolean) {
        setStatus({ msg, ok });
        setTimeout(() => setStatus(null), 2500);
    }

    function send() {
        if (!text.trim() || !channelId) return;
        const author = sender === "me" ? me : other;
        if (!author) return;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) { setMsg("Invalid Date!", false); return; }
        inject(channelId, author, text.trim(), date);
        setText("");
        setMsg("Message injected ✓", true);
        setDateStr(toLocal(new Date(date.getTime() + 60_000)));
        setTimeout(() => textareaRef.current?.focus(), 10);
    }

    const meName = (me as any)?.globalName || me?.username || "Me";
    const otherName = other?.globalName || other?.username || "Other";

    return (
        <>
            {/* Transparent backdrop — click to close */}
            <div
                className="fdm-backdrop"
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 999999,
                    backgroundColor: "rgba(0,0,0,0.4)"
                }}
            />

            {/* Panel — position calculated in JS */}
            <div
                ref={panelRef}
                className="fdm-panel"
                style={{
                    ...pos,
                    backgroundColor: "#2b2d31",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)",
                    overflow: "hidden"
                }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onMouseUp={e => e.stopPropagation()}
            >
                <div className="fdm-header">
                    <span className="fdm-title">✏ Fake DM</span>
                    <button className="fdm-close" onClick={onClose}>✕</button>
                </div>

                {!isInDM ? (
                    <div style={{ padding: "16px 14px", color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center" }}>
                        Open a private DM (1:1) to use FakeDM.
                    </div>
                ) : <>
                    {/* Sender */}
                    <div className="fdm-sender-row">
                        <button className={`fdm-sender-btn${sender === "me" ? " fdm-sender-btn--active" : ""}`} onClick={() => setSender("me")}>
                            <UserAvatar user={me} />
                            <span className="fdm-sender-name">{meName}</span>
                        </button>
                        <button className={`fdm-sender-btn${sender === "other" ? " fdm-sender-btn--active" : ""}`} onClick={() => setSender("other")}>
                            <UserAvatar user={other} />
                            <span className="fdm-sender-name">{otherName}</span>
                        </button>
                    </div>

                    {/* Date */}
                    <div className="fdm-date-row">
                        <span className="fdm-date-label">Date :</span>
                        <input type="datetime-local" className="fdm-date-input" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                        <button className="fdm-date-now" onClick={() => setDateStr(toLocal(new Date()))}>Now</button>
                    </div>

                    {/* Message */}
                    <div className="fdm-input-row">
                        <textarea
                            ref={textareaRef}
                            className="fdm-textarea"
                            rows={2}
                            placeholder={`Message from ${sender === "me" ? meName : otherName}… (↵ send)`}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        />
                        <div className="fdm-actions">
                            <button className="fdm-send-btn" disabled={!text.trim()} onClick={send}>Send</button>
                            <button className="fdm-clear-btn" onClick={() => {
                                if (!channelId) return;
                                const n = clearFakes(channelId);
                                setMsg(`${n} msg deleted${n !== 1 ? "s" : ""} ✓`, true);
                            }}>🗑 Clear</button>
                        </div>
                    </div>

                    <div className={`fdm-status${status ? (status.ok ? " fdm-status--ok" : " fdm-status--err") : ""}`}>
                        {status?.msg ?? "\u00a0"}
                    </div>
                </>}
            </div>
        </>
    );
}

// ─── Icon ────────────────────────────────────────────────────────────────────
function FakeDMIcon({ height = 20, width = 20, className }: any) {
    return (
        <svg className={className} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width={width} height={height} fill="none" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.35 7.24C15.9 6.67 16 5.8 16 5a3 3 0 1 1 3 3c-.8 0-1.67.09-2.24.65a1.5 1.5 0 0 0 0 2.11l.4.4.46.43c.25.25.12.66-.18.84A3 3 0 0 0 16 15v.5a.5.5 0 0 1-.5.5H15c-.43 0-.84.1-1.21.26a.56.56 0 0 1-.63-.1L6.91 9.91 4.3 12.54a1 1 0 0 0 0 1.42l2.17 2.17.83-.84a1 1 0 0 1 1.42 1.42l-.84.83.59.59 1.83-1.84a1 1 0 0 1 1.42 1.42l-1.84 1.83.17.17a1 1 0 0 0 1.42 0c.2-.2.6-.07.69.22a3 3 0 0 0 .56 1c.09.11.09.27-.02.36a3 3 0 0 1-4.06-.16l-5.76-5.76a3 3 0 0 1 0-4.24L6.9 7.09h.01l.97-.97a3 3 0 0 1 4.24 0l1.12 1.12a1.5 1.5 0 0 0 2.1 0Z" />
            <path fill="currentColor" d="M19 14a1 1 0 0 1 1 1v3h3a1 1 0 0 1 0 2h-3v3a1 1 0 0 1-2 0v-3h-3a1 1 0 1 1 0-2h3v-3a1 1 0 0 1 1-1Z" />
        </svg>
    );
}

// ─── Chat Bar Button ──────────────────────────────────────────────────────────
const FakeDMButton: ChatBarButtonFactory = (props: any) => {
    const { isMainChat } = props;
    const [btnRect, setBtnRect] = React.useState<DOMRect | null>(null);

    if (!isMainChat) return null;

    function handleClick(e: React.MouseEvent) {
        if (btnRect) {
            setBtnRect(null);
        } else {
            const el = (e.currentTarget as HTMLElement).closest("button") ?? e.currentTarget as HTMLElement;
            setBtnRect(el.getBoundingClientRect());
        }
    }

    const panel = btnRect ? (
        <FakeDMPanel
            onClose={() => setBtnRect(null)}
            btnRect={btnRect}
        />
    ) : null;

    return (
        <div
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            style={{ display: "contents" }}
        >
            <ChatBarButton
                tooltip="Fake DM — inject a fake message"
                onClick={handleClick}
            >
                <FakeDMIcon />
            </ChatBarButton>

            {btnRect && ReactDOM.createPortal(panel, document.body)}
        </div>
    );
};

// ─── Plugin ───────────────────────────────────────────────────────────────────
export default definePlugin({
    name: "FakeDM",
    enabledByDefault: true,
    description: "Injects fake local messages into a DM. Button in the text bar.",
    authors: [{ name: "Nightcord", id: 0n }],
    dependencies: ["ChatInputButtonAPI"],

    chatBarButton: {
        icon: FakeDMIcon,
        render: FakeDMButton,
    },

    stop() {
        fakeIds.clear();
        _idCounter = 0;
    },
});
