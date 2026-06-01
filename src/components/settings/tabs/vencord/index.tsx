/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./VencordTab.css";

import { isStealthModeEnabled, toggleStealthMode } from "@api/HeaderBar";
import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { plugins } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import { beginDiscordOAuth, checkOAuthToken, clearToken, getStoredToken, storeToken } from "../../../../api/OAuth2";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { HeartIcon,LogIcon, OwnerCrownIcon, PaintbrushIcon, PlanetIcon, RestartIcon } from "@components/Icons";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { openPluginModal, SettingsTab, wrapTab } from "@components/settings";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { IS_MAC, IS_WINDOWS } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { openModal } from "@utils/modal";
import { relaunch } from "@utils/native";
import { Avatar, React, Select, UserStore } from "@webpack/common";

import { ContributeModal } from "../../../../nightcord/renderer/components/ContributeModal";
import { openNotificationSettingsModal } from "./NotificationSettings";

const cl = classNameFactory("vc-vencord-tab-");

const DEV_TEAM_IDS = [
    { id: "1086802921984893038", role: "Owner" },
    { id: "171356978310938624", role: "Co-Owner" }
];

function useDiscordUser(userId: string) {
    const [user, setUser] = React.useState<{ name: string; pfp: string; } | null>(null);
    React.useEffect(() => {
        const cached = UserStore?.getUser(userId);
        if (cached) {
            setUser({
                name: cached.globalName ?? cached.username,
                pfp: cached.avatar
                    ? `https://cdn.discordapp.com/avatars/${userId}/${cached.avatar}.webp?size=128`
                    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> 22n) % 6}.png`
            });
            return;
        }
        fetch(`https://discord.com/api/v9/users/${userId}`, {
            headers: { Authorization: (window as any).token ?? "" }
        })
            .then(r => r.json())
            .then(u => setUser({
                name: u.global_name ?? u.username ?? userId,
                pfp: u.avatar
                    ? `https://cdn.discordapp.com/avatars/${userId}/${u.avatar}.webp?size=128`
                    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> 22n) % 6}.png`
            }))
            .catch(() => setUser({ name: userId, pfp: `https://cdn.discordapp.com/embed/avatars/0.png` }));
    }, [userId]);
    return user;
}

function DevCard({ id, role }: { id: string; role: string; }) {
    const user = useDiscordUser(id);
    return (
        <Card variant="primary" outline style={{ padding: "10px" }}>
            <Flex align={Flex.Align.CENTER} gap="10px">
                <Avatar
                    src={user?.pfp ?? `https://cdn.discordapp.com/embed/avatars/0.png`}
                    size="SIZE_48"
                />
                <Flex direction={Flex.Direction.VERTICAL} style={{ flex: 1, gap: "0px" }}>
                    <Heading tag="h3" style={{ marginBottom: "-2px" }}>{user?.name ?? "..."}</Heading>
                    <Heading tag="h4" style={{ opacity: 0.6 }}>{role}</Heading>
                </Flex>
            </Flex>
        </Card>
    );
}

function DevTeamSection() {
    const [showDevs, setShowDevs] = React.useState(false);

    return (
        <>
            <QuickActionCard>
                <QuickAction
                    Icon={LogIcon}
                    text="Notification Log"
                    action={openNotificationLogModal}
                />
                <QuickAction
                    Icon={PaintbrushIcon}
                    text="Edit QuickCSS"
                    action={() => VencordNative.quickCss.openEditor()}
                />
                {!IS_WEB && (
                    <QuickAction
                        Icon={RestartIcon}
                        text="Relaunch Discord"
                        action={relaunch}
                    />
                )}
                <QuickAction
                    Icon={HeartIcon}
                    text="Contribute"
                    action={() => openModal(props => <ContributeModal {...props} />)}
                />
                <QuickAction
                    Icon={OwnerCrownIcon}
                    text="DEV Team"
                    action={() => setShowDevs(!showDevs)}
                />
                <QuickAction
                    Icon={PlanetIcon}
                    text="NightCord Server"
                    action={() => window.open("https://discord.gg/nightcord", "_blank")}
                />
            </QuickActionCard>

            {showDevs && (
                <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", animation: "slideIn 0.3s ease-out" }}>
                    <style>{`
                        @keyframes slideIn {
                            from { opacity: 0; transform: translateY(-10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                    {DEV_TEAM_IDS.map(dev => (
                        <DevCard key={dev.id} id={dev.id} role={dev.role} />
                    ))}
                </div>
            )}
        </>
    );
}

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function useStealthActive() {
    const [active, setActive] = React.useState(isStealthModeEnabled);
    React.useEffect(() => {
        const handler = () => setActive(isStealthModeEnabled());
        window.addEventListener("nightcord-stealth-change", handler);
        return () => window.removeEventListener("nightcord-stealth-change", handler);
    }, []);
    return active;
}

function StealthModeSection() {
    const enabled = useStealthActive();

    return (
        <>
            <Heading className={Margins.top20}>Stealth Mode</Heading>
            <Paragraph className={Margins.bottom16}>
                {enabled
                    ? "Stealth mode is enabled â€” all Nightcord visual elements are hidden. Shortcut: Ctrl+Shift+H"
                    : "Hides all Nightcord visual elements (icons, buttons, context menus) without disabling plugins. Shortcut: Ctrl+Shift+H"}
            </Paragraph>
            <Button
                onClick={toggleStealthMode}
                variant={enabled ? "secondary" : "primary"}
            >
                {enabled ? "Disable Stealth Mode" : "Enable Stealth Mode"}
            </Button>
        </>
    );
}

function StealthModeButton() {
    const enabled = useStealthActive();

    return (
        <Button
            onClick={toggleStealthMode}
            variant={enabled ? "dangerPrimary" : "primary"}
        >
            {enabled ? "âœ“ Stealth Mode Enabled â€” Click to disable" : "Enable Stealth Mode"}
        </Button>
    );
}

function CustomProfileSyncToggle() {
    const settings = useSettings();
    const [token, setToken] = React.useState<string | null>(null);
    const [checking, setChecking] = React.useState(true);
    const [busy, setBusy] = React.useState(false);
    const [tokenInput, setTokenInput] = React.useState("");
    const [waitingToken, setWaitingToken] = React.useState(false);

    // Check stored token on mount
    React.useEffect(() => {
        getStoredToken().then(async t => {
            if (t) {
                const check = await checkOAuthToken(t);
                if (check?.valid) {
                    setToken(t);
                    settings.syncOwnCustomProfile = true;
                    settings.seeAllCustomProfile = true;
                } else {
                    await clearToken();
                    settings.syncOwnCustomProfile = false;
                    settings.seeAllCustomProfile = false;
                }
            } else {
                settings.syncOwnCustomProfile = false;
                settings.seeAllCustomProfile = false;
            }
            setChecking(false);
        });
    }, []);

    const isEnabled = !!token;

    async function handleToggle(on: boolean) {
        if (busy) return;
        if (on) {
            // Activate: launch OAuth flow
            setBusy(true);
            try {
                const data = await beginDiscordOAuth();
                try { await VencordNative.native.openExternal(data.url); } catch { window.open(data.url, "_blank"); }
                setWaitingToken(true);
            } catch (e) {
                console.error("[CustomProfileSync] OAuth error:", e);
            }
            setBusy(false);
        } else {
            // Deactivate: clear everything
            setBusy(true);
            await clearToken();
            setToken(null);
            setWaitingToken(false);
            setTokenInput("");
            settings.syncOwnCustomProfile = false;
            settings.seeAllCustomProfile = false;
            setBusy(false);
        }
    }

    async function handleTokenSubmit() {
        const t = tokenInput.trim();
        if (!t) return;
        setBusy(true);
        const check = await checkOAuthToken(t);
        if (check?.valid) {
            await storeToken(t);
            setToken(t);
            setWaitingToken(false);
            setTokenInput("");
            settings.syncOwnCustomProfile = true;
            settings.seeAllCustomProfile = true;
        } else {
            alert("Invalid token. Please try again.");
        }
        setBusy(false);
    }

    if (checking) return null;

    return (
        <div style={{ marginBottom: 16 }}>
            <FormSwitch
                value={isEnabled}
                onChange={handleToggle}
                title="Custom Profile Sync"
                description={isEnabled
                    ? "Your custom profile is synced. Other Nightcord users can see your profile, and you can see theirs."
                    : "Enable to share your custom profile with other Nightcord users and see their profiles."}
                disabled={busy}
            />
            {waitingToken && (
                <div style={{ marginTop: 8, padding: "12px 16px", background: "var(--background-secondary)", borderRadius: 8 }}>
                    <div style={{ marginBottom: 8, color: "var(--text-normal)", fontSize: 14 }}>
                        ✅ Browser opened — sign in with Discord, then paste the token you received below:
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input
                            type="password"
                            placeholder="Paste your session token here..."
                            value={tokenInput}
                            onChange={e => setTokenInput(e.currentTarget.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleTokenSubmit(); }}
                            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, background: "var(--background-tertiary)", color: "var(--text-normal)", border: "1px solid var(--background-modifier-accent)", outline: "none" }}
                        />
                        <Button onClick={handleTokenSubmit} disabled={busy || !tokenInput.trim()}>
                            Confirm
                        </Button>
                    </div>
                </div>
            )}
            {isEnabled && (
                <div style={{ marginTop: 4 }}>
                    <a role="button" onClick={async () => {
                        await clearToken();
                        setToken(null);
                        settings.syncOwnCustomProfile = false;
                        settings.seeAllCustomProfile = false;
                    }} style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
                        Disconnect account
                    </a>
                </div>
            )}
        </div>
    );
}

function EquicordSettings() {
    const settings = useSettings();
    const stealthActive = useStealthActive();

    const needsVibrancySettings = IS_DISCORD_DESKTOP && IS_MAC;

    const user = UserStore?.getCurrentUser();

    const Switches: Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        description?: string;
        restartRequired?: boolean;
        warning: { enabled: boolean; message?: string; };
    }>
        = [

            {
                key: "useQuickCss",
                title: "Enable Custom CSS",
                description: "Load custom CSS from the QuickCSS editor. This allows you to customize Discord's appearance with your own styles.",
                restartRequired: true,
                warning: { enabled: false },
            },
            !IS_WEB && {
                key: "enableReactDevtools",
                title: "Enable React Developer Tools",
                description: "Enable the React Developer Tools extension for debugging Discord's React components. Useful for plugin development.",
                restartRequired: true,
                warning: { enabled: false },
            },
            (!IS_WEB && !IS_DISCORD_DESKTOP || !IS_WINDOWS) && {
                key: "mainWindowFrameless",
                title: "Disable the Main Window Frame",
                description: "Remove the native window frame for a cleaner look. You can still move the window by dragging the title bar area.",
                restartRequired: true,
                warning: { enabled: false },
            },
            !IS_WEB &&
            (!IS_DISCORD_DESKTOP || !IS_WINDOWS
                ? {
                    key: "frameless",
                    title: "Disable All Window Frames",
                    description: "Remove the native window frame for a cleaner look. You can still move the window by dragging the title bar area.",
                    restartRequired: true,
                    warning: { enabled: false },
                }
                : {
                    key: "winNativeTitleBar",
                    title: "Use Windows' native title bar instead of Discord's custom one",
                    description: "Replace Discord's custom title bar with the standard Windows title bar. This may improve compatibility with some window management tools.",
                    restartRequired: true,
                    warning: { enabled: false },
                }
            ),

            !IS_WEB && {
                key: "transparent",
                title: "Enable Window Transparency",
                description: "Make the Discord window transparent. A theme that supports transparency is required or this will do nothing.",
                restartRequired: true,
                warning: {
                    enabled: true,
                    message: IS_WINDOWS
                        ? "This will stop the window from being resizable and prevents you from snapping the window to screen edges."
                        : "This will stop the window from being resizable.",
                },
            },
            IS_DISCORD_DESKTOP && {
                key: "disableMinSize",
                title: "Disable Minimum Window Size",
                description: "Allow the Discord window to be resized smaller than its default minimum size. Useful for tiling window managers or small screens.",
                restartRequired: true,
                warning: { enabled: false },
            },
            !IS_WEB &&
            IS_WINDOWS && {
                key: "winCtrlQ",
                title: "Register Ctrl+Q as shortcut to close Discord",
                description: "Add Ctrl+Q as a keyboard shortcut to close Discord. This provides an alternative to Alt+F4 for quickly closing the application.",
                restartRequired: true,
                warning: { enabled: false },
            },
        ];

    return (
        <SettingsTab>

            {!stealthActive && (<>

                <Divider className={Margins.top20} />

                <Heading className={Margins.top16}>Quick Actions</Heading>
                <Paragraph className={Margins.bottom16}>
                    Common actions you might want to perform. These shortcuts give you quick access to frequently used features without navigating through menus.
                </Paragraph>

                <DevTeamSection />

                <Divider className={Margins.top20} />

                <Heading className={Margins.top20}>Client Settings</Heading>
                <Paragraph className={Margins.bottom16}>
                    Configure how Nightcord behaves and integrates with Discord. These settings affect the Discord client's appearance and behavior.
                </Paragraph>
                <Notice.Info className={Margins.bottom20} style={{ width: "100%" }}>
                    You can customize where this settings section appears in Discord's settings menu by configuring the{" "}
                    <a
                        role="button"
                        onClick={() => openPluginModal(plugins.Settings)}
                        style={{ cursor: "pointer", color: "var(--text-link)" }}
                    >
                        Settings Plugin
                    </a>.
                </Notice.Info>

                <CustomProfileSyncToggle />

                {Switches.filter((s): s is Exclude<typeof s, false> => !!s).map(
                    s => (
                        <FormSwitch
                            key={s.key}
                            value={settings[s.key]}
                            onChange={v => (settings[s.key] = v)}
                            title={s.title}
                            description={
                                s.warning.enabled ? (
                                    <>
                                        {s.description}
                                        <Notice.Warning className={Margins.top8} style={{ width: "100%" }}>
                                            {s.warning.message}
                                        </Notice.Warning>
                                    </>
                                ) : (
                                    s.description
                                )
                            }
                            hideBorder
                        />
                    ),
                )}

                {needsVibrancySettings && (
                    <>
                        <Divider className={Margins.top20} />

                        <Heading className={Margins.top20}>Window Vibrancy</Heading>
                        <Paragraph className={Margins.bottom16}>
                            Customize the macOS window vibrancy effect. This controls the blur and transparency style of the Discord window. Changes require a restart to take effect.
                        </Paragraph>
                        <Select
                            className={Margins.bottom20}
                            placeholder="Window vibrancy style"
                            options={[
                                // Sorted from most opaque to most transparent
                                {
                                    label: "No vibrancy",
                                    value: undefined,
                                },
                                {
                                    label: "Under Page (window tinting)",
                                    value: "under-page",
                                },
                                {
                                    label: "Content",
                                    value: "content",
                                },
                                {
                                    label: "Window",
                                    value: "window",
                                },
                                {
                                    label: "Selection",
                                    value: "selection",
                                },
                                {
                                    label: "Titlebar",
                                    value: "titlebar",
                                },
                                {
                                    label: "Header",
                                    value: "header",
                                },
                                {
                                    label: "Sidebar",
                                    value: "sidebar",
                                },
                                {
                                    label: "Tooltip",
                                    value: "tooltip",
                                },
                                {
                                    label: "Menu",
                                    value: "menu",
                                },
                                {
                                    label: "Popover",
                                    value: "popover",
                                },
                                {
                                    label: "Fullscreen UI (transparent but slightly muted)",
                                    value: "fullscreen-ui",
                                },
                                {
                                    label: "HUD (Most transparent)",
                                    value: "hud",
                                },
                            ]}
                            select={v => (settings.macosVibrancyStyle = v)}
                            isSelected={v => settings.macosVibrancyStyle === v}
                            serialize={identity}
                        />
                    </>
                )}

                <Divider className={Margins.top20} />

                <Heading className={Margins.top20}>Notifications</Heading>
                <Paragraph className={Margins.bottom16}>
                    Configure how Nightcord handles notifications. You can customize when and how you receive alerts, or view a history of past notifications.
                </Paragraph>

                <Flex gap="16px">
                    <Button onClick={openNotificationSettingsModal}>
                        Notification Settings
                    </Button>
                    <Button variant="secondary" onClick={openNotificationLogModal}>
                        View Notification Log
                    </Button>
                </Flex>

            </>)}

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Stealth Mode</Heading>
            <Paragraph className={Margins.bottom16}>
                Hides all Nightcord visual elements without disabling plugins. Shortcut: Ctrl+Shift+H
            </Paragraph>
            <StealthModeButton />

        </SettingsTab>
    );
}

export default wrapTab(EquicordSettings, "Nightcord Settings");



