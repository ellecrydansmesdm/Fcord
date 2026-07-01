/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { Clickable, Tooltip, useEffect, useState, Popout, useRef } from "@webpack/common";
import type { ComponentType, JSX, MouseEventHandler, ReactNode } from "react";
import { openFcordModal } from "@fcordplugins/compactMode/FcordModal";

const logger = new Logger("HeaderBarAPI");

const HeaderBarClasses = findCssClassesLazy("clickable", "withHighlight");
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '"aria-haspopup":') as ComponentType<ChannelToolbarButtonProps>;

export interface HeaderBarButtonProps {
    icon: ComponentType<any>;
    tooltip: ReactNode;
    onClick?: MouseEventHandler<HTMLDivElement>;
    onContextMenu?: MouseEventHandler<HTMLDivElement>;
    className?: string;
    iconSize?: number;
    position?: "top" | "bottom" | "left" | "right";
    selected?: boolean;
    "aria-label"?: string;
}

export interface ChannelToolbarButtonProps extends HeaderBarButtonProps {
    iconClassName?: string;
    position?: "top" | "bottom" | "left" | "right";
    selected?: boolean;
    disabled?: boolean;
    showBadge?: boolean;
    badgePosition?: "top" | "bottom";
}

export type HeaderBarButtonFactory = () => JSX.Element | null;

export interface HeaderBarButtonData {
    render: HeaderBarButtonFactory;
    icon: ComponentType<any>;
    priority?: number;
    location?: "headerbar" | "channeltoolbar";
}

interface ButtonEntry {
    render: HeaderBarButtonFactory;
    priority: number;
}

export function HeaderBarButton(props: HeaderBarButtonProps & { ref?: React.RefObject<any>; }) {
    const {
        icon: Icon,
        tooltip,
        onClick,
        onContextMenu,
        className,
        iconSize = 18,
        position = "bottom",
        selected,
        ref,
        "aria-label": ariaLabel,
    } = props;

    const label = ariaLabel ?? (typeof tooltip === "string" ? tooltip : undefined);

    return (
        <Tooltip text={tooltip ?? ""} position={position} shouldShow={tooltip != null}>
            {({ onMouseEnter, onMouseLeave }) => (
                <Clickable
                    {...{ innerRef: ref } as any}
                    className={classes(HeaderBarClasses.clickable, HeaderBarClasses.withHighlight, className)}
                    style={{ width: iconSize, boxSizing: "content-box", justifyContent: "center", color: "oklab(0.745437 0.00131872 -0.00849736)", margin: "0 4px", cursor: "pointer" }}
                    onClick={onClick}
                    onContextMenu={onContextMenu}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-expanded={selected}
                >
                    <Icon size="custom" width={iconSize} height={iconSize} color="currentColor" />
                </Clickable>
            )}
        </Tooltip>
    );
}

export function ChannelToolbarButton(props: ChannelToolbarButtonProps) {
    return <HeaderBarIcon {...props} />;
}

const headerBarButtons = new Map<string, ButtonEntry>();
const channelToolbarButtons = new Map<string, ButtonEntry>();

const headerBarListeners = new Set<() => void>();
const channelToolbarListeners = new Set<() => void>();

export function addHeaderBarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    headerBarButtons.set(id, { render, priority });
    headerBarListeners.forEach(listener => listener());
}

export function removeHeaderBarButton(id: string) {
    headerBarButtons.delete(id);
    headerBarListeners.forEach(listener => listener());
}

export function addChannelToolbarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    channelToolbarButtons.set(id, { render, priority });
    channelToolbarListeners.forEach(listener => listener());
}

export function removeChannelToolbarButton(id: string) {
    channelToolbarButtons.delete(id);
    channelToolbarListeners.forEach(listener => listener());
}

// ══════════════════════════════════════════════════════════════════
// STEALTH MODE
// ══════════════════════════════════════════════════════════════════

let _stealthActive = false;
try { _stealthActive = localStorage.getItem("Fcord_stealthMode") === "1"; } catch { }

export function isStealthModeEnabled(): boolean {
    return _stealthActive;
}

function persistStealth(v: boolean) {
    try { v ? localStorage.setItem("Fcord_stealthMode", "1") : localStorage.removeItem("Fcord_stealthMode"); } catch { }
}

const NON_REACT_SELECTORS = [
    "#fcord-titlebar-btn",
    "#fcord-titlebar-link-style",
    ".nai-nav-item",
];

function hideNonReactElements(hide: boolean) {
    let count = 0;
    for (const sel of NON_REACT_SELECTORS) {
        try {
            document.querySelectorAll(sel).forEach(el => {
                (el as HTMLElement).style.display = hide ? "none" : "";
                count++;
            });
        } catch { }
    }
    console.log("[StealthMode] hideNonReact hide=" + hide + " count=" + count);
}

export function syncStealthBodyClass() {
    try { if (_stealthActive) document.body?.classList.add("fcord-stealth"); else document.body?.classList.remove("fcord-stealth"); } catch { }
    hideNonReactElements(_stealthActive);
}

export function toggleStealthMode() {
    _stealthActive = !_stealthActive;
    persistStealth(_stealthActive);
    hideNonReactElements(_stealthActive);
    _notifyStealthChange();
    try { if (_stealthActive) document.body?.classList.add("fcord-stealth"); else document.body?.classList.remove("fcord-stealth"); } catch { }
    console.log("[StealthMode] toggled →", _stealthActive);
    return _stealthActive;
}

if (_stealthActive) {
    try { hideNonReactElements(true); } catch { }
    try { document.body?.classList.add("fcord-stealth"); } catch { }
}

try {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === "KeyH") {
            e.preventDefault();
            e.stopPropagation();
            toggleStealthMode();
        }
    }, true);
} catch { }

try {
    let stealthObserver: MutationObserver | null = null;
    const startObserver = () => {
        if (stealthObserver) return;
        stealthObserver = new MutationObserver(() => {
            if (_stealthActive) hideNonReactElements(true);
        });
        const target = document.body || document.documentElement;
        if (target) {
            stealthObserver.observe(target, { childList: true, subtree: true });
        }
    };
    const stopObserver = () => {
        if (stealthObserver) { stealthObserver.disconnect(); stealthObserver = null; }
    };
    if (_stealthActive) {
        if (document.body) startObserver();
        else document.addEventListener("DOMContentLoaded", startObserver);
    }
    window.addEventListener("fcord-stealth-change", () => {
        if (_stealthActive) startObserver();
        else stopObserver();
    });
} catch { }

const stealthListeners = new Set<() => void>();
export function _notifyStealthChange() {
    stealthListeners.forEach(fn => fn());
    window.dispatchEvent(new Event("fcord-stealth-change"));
}
export function addStealthListener(fn: () => void) { stealthListeners.add(fn); }
export function removeStealthListener(fn: () => void) { stealthListeners.delete(fn); }


// ══════════════════════════════════════════════════════════════════
// COMPACT MODE
// ══════════════════════════════════════════════════════════════════

let _compactActive = false;
try { _compactActive = localStorage.getItem("Fcord_compactMode") === "1"; } catch { }

export function isCompactModeEnabled(): boolean {
    return _compactActive;
}

function persistCompact(v: boolean) {
    try { v ? localStorage.setItem("Fcord_compactMode", "1") : localStorage.removeItem("Fcord_compactMode"); } catch { }
}

export function syncCompactBodyClass() {
    try {
        const stored = localStorage.getItem("Fcord_compactMode");
        if (stored === "1" && !_compactActive) {
            _compactActive = true;
        } else if (stored !== "1" && _compactActive) {
            _compactActive = false;
        }
    } catch { }

    try {
        if (_compactActive) {
            document.body?.classList.add("fcord-compact");
        } else {
            document.body?.classList.remove("fcord-compact");
        }
    } catch { }

    _notifyCompactChange();
}

export function toggleCompactMode() {
    _compactActive = !_compactActive;
    persistCompact(_compactActive);
    _notifyCompactChange();
    try { if (_compactActive) document.body?.classList.add("fcord-compact"); else document.body?.classList.remove("fcord-compact"); } catch { }
    console.log("[CompactMode] toggled →", _compactActive);
    return _compactActive;
}

if (_compactActive) {
    try { document.body?.classList.add("fcord-compact"); } catch { }
}

export const compactListeners = new Set<() => void>();
export function _notifyCompactChange() {
    compactListeners.forEach(fn => fn());
    window.dispatchEvent(new Event("fcord-compact-change"));
}
export function addCompactListener(fn: () => void) { compactListeners.add(fn); }
export function removeCompactListener(fn: () => void) { compactListeners.delete(fn); }

// ══════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════

const GridVerticalIcon = (props: any) => (
    <svg width={props.width || 24} height={props.height || 24} viewBox="0 0 24 24" fill={props.color || "currentColor"} {...props}>
        <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
    </svg>
);

const GearIcon = (props: any) => (
    <svg width={props.width || 24} height={props.height || 24} viewBox="0 0 24 24" fill={props.color || "currentColor"} {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M10.56 1.1c-.46.05-.7.53-.64.98.18 1.16-.19 2.2-.98 2.53-.8.33-1.79-.15-2.49-1.1-.27-.36-.78-.52-1.14-.24-.77.59-1.45 1.27-2.04 2.04-.28.36-.12.87.24 1.14.96.7 1.43 1.7 1.1 2.49-.33.8-1.37 1.16-2.53.98-.45-.07-.93.18-.99.64a11.1 11.1 0 0 0 0 2.88c.06.46.54.7.99.64 1.16-.18 2.2.19 2.53.98.33.8-.14 1.79-1.1 2.49-.36.27-.52.78-.24 1.14.59.77 1.27 1.45 2.04 2.04.36.28.87.12 1.14-.24.7-.95 1.7-1.43 2.49-1.1.8.33 1.16 1.37.98 2.53-.07.45.18.93.64.99a11.1 11.1 0 0 0 2.88 0c.46-.06.7-.54.64-.99-.18-1.16.19-2.2.98-2.53.8-.33 1.79.14 2.49 1.1.27.36.78.52 1.14.24.77-.59 1.45-1.27 2.04-2.04.28-.36.12-.87-.24-1.14-.96-.7-1.43-1.7-1.1-2.49.33-.8 1.37-1.16 2.53-.98.45.07.93-.18.99-.64a11.1 11.1 0 0 0 0-2.88c-.06-.46-.54-.7-.99-.64-1.16.18-2.2-.19-2.53-.98-.33-.8.14-1.79 1.1-2.49.36-.27.52-.78.24-1.14a11.07 11.07 0 0 0-2.04-2.04c-.36-.28-.87-.12-1.14.24-.7.96-1.7 1.43-2.49 1.1-.8-.33-1.16-1.37-.98-2.53.07-.45-.18-.93-.64-.99a11.1 11.1 0 0 0-2.88 0ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
    </svg>
);

// ══════════════════════════════════════════════════════════════════
// COMPACT POPOUTS
// ══════════════════════════════════════════════════════════════════

function CompactHeaderPopout({ type, closePopout }: { type: "header" | "channel", closePopout: () => void; }) {
    const map = type === "header" ? headerBarButtons : channelToolbarButtons;
    return (
        <div className="compact-popout-container">
            <div className="compact-popout-grid">
                {Array.from(map)
                    .sort(([, a], [, b]) => a.priority - b.priority)
                    .map(([id, { render: Button }]) => (
                        <div key={id} style={{ display: "contents" }} onClick={closePopout}>
                            <ErrorBoundary noop>
                                <Button />
                            </ErrorBoundary>
                        </div>
                    ))}
            </div>
            <div className="compact-popout-divider" />
            <div className="compact-popout-disable" onClick={() => { toggleCompactMode(); closePopout(); }}>
                Disable Compact Mode
            </div>
        </div>
    );
}

function CompactSettingsPopout({ closePopout }: { closePopout: () => void; }) {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        compactListeners.add(listener);
        stealthListeners.add(listener);
        window.addEventListener("fcord-compact-change", listener);
        window.addEventListener("fcord-stealth-change", listener);
        return () => {
            compactListeners.delete(listener);
            stealthListeners.delete(listener);
            window.removeEventListener("fcord-compact-change", listener);
            window.removeEventListener("fcord-stealth-change", listener);
        };
    }, []);

    const compact = isCompactModeEnabled();
    const stealth = isStealthModeEnabled();

    return (
        <div className="nc-settings-popout">
            <div className="nc-settings-popout-title">Quick Settings</div>

            <div className="nc-settings-popout-section-label">Appearance</div>

            <div className="nc-settings-popout-row" onClick={() => toggleCompactMode()}>
                <div className="nc-settings-popout-row-info">
                    <div className="nc-settings-popout-row-name">Compact Mode</div>
                    <div className="nc-settings-popout-row-desc">Hide plugin buttons behind a single icon</div>
                </div>
                <div className={`nc-settings-popout-toggle ${compact ? "nc-on" : ""}`} onClick={e => { e.stopPropagation(); toggleCompactMode(); }}>
                    <div className="nc-settings-popout-toggle-knob" />
                </div>
            </div>

            <div className="nc-settings-popout-row" onClick={() => toggleStealthMode()}>
                <div className="nc-settings-popout-row-info">
                    <div className="nc-settings-popout-row-name">Stealth Mode</div>
                    <div className="nc-settings-popout-row-desc">Hide all Fcord UI elements</div>
                </div>
                <div className={`nc-settings-popout-toggle ${stealth ? "nc-on" : ""}`} onClick={e => { e.stopPropagation(); toggleStealthMode(); }}>
                    <div className="nc-settings-popout-toggle-knob" />
                </div>
            </div>

            <div className="nc-settings-popout-divider" />

            <div className="nc-settings-popout-section-label">Plugin Buttons</div>
            <div className="nc-settings-popout-grid">
                {Array.from(headerBarButtons)
                    .sort(([, a], [, b]) => a.priority - b.priority)
                    .map(([id, { render: Button }]) => (
                        <div key={id} style={{ display: "contents" }}>
                            <ErrorBoundary noop>
                                <Button />
                            </ErrorBoundary>
                        </div>
                    ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// TOGGLE COMPONENTS
// ══════════════════════════════════════════════════════════════════

function CompactHeaderBarToggle() {
    const [, forceUpdate] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const popoutRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        compactListeners.add(listener);
        window.addEventListener("fcord-compact-change", listener);
        return () => {
            compactListeners.delete(listener);
            window.removeEventListener("fcord-compact-change", listener);
        };
    }, []);

    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <Popout
                targetElementRef={popoutRef}
                renderPopout={() => <CompactHeaderPopout type="header" closePopout={() => setIsOpen(false)} />}
                shouldShow={isOpen}
                onRequestClose={() => setIsOpen(false)}
                position="bottom"
                align="right"
                spacing={8}
            >
                {() => (
                    <div ref={popoutRef as any} style={{ display: "flex" }}>
                        <HeaderBarButton
                            icon={GridVerticalIcon}
                            tooltip="Compact Mode"
                            onClick={() => setIsOpen(v => !v)}
                            selected={isOpen}
                        />
                    </div>
                )}
            </Popout>
            <HeaderBarButton
                icon={GearIcon}
                tooltip="Fcord Settings"
                onClick={() => openFcordModal()}
            />
        </div>
    );
}

function CompactChannelToolbarToggle() {
    const [, forceUpdate] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const popoutRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        compactListeners.add(listener);
        window.addEventListener("fcord-compact-change", listener);
        return () => {
            compactListeners.delete(listener);
            window.removeEventListener("fcord-compact-change", listener);
        };
    }, []);

    return (
        <Popout
            targetElementRef={popoutRef}
            renderPopout={() => <CompactHeaderPopout type="channel" closePopout={() => setIsOpen(false)} />}
            shouldShow={isOpen}
            onRequestClose={() => setIsOpen(false)}
            position="bottom"
            align="right"
            spacing={8}
        >
            {() => (
                <div ref={popoutRef as any} style={{ display: "flex" }}>
                    <ChannelToolbarButton
                        icon={GridVerticalIcon}
                        tooltip="Compact Mode"
                        onClick={() => setIsOpen(v => !v)}
                        selected={isOpen}
                    />
                </div>
            )}
        </Popout>
    );
}

// ══════════════════════════════════════════════════════════════════
// MAIN RENDER COMPONENTS
// ══════════════════════════════════════════════════════════════════

function HeaderBarButtons() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        headerBarListeners.add(listener);
        stealthListeners.add(listener);
        compactListeners.add(listener);
        window.addEventListener("fcord-stealth-change", listener);
        window.addEventListener("fcord-compact-change", listener);
        return () => {
            headerBarListeners.delete(listener);
            stealthListeners.delete(listener);
            compactListeners.delete(listener);
            window.removeEventListener("fcord-stealth-change", listener);
            window.removeEventListener("fcord-compact-change", listener);
        };
    }, []);

    if (isStealthModeEnabled()) return null;

    if (isCompactModeEnabled()) {
        return (
            <div className="vc-header-bar-btns" style={{ display: "contents" }}>
                <CompactHeaderBarToggle />
            </div>
        );
    }

    return (
        <div className="vc-header-bar-btns" style={{ display: "contents" }}>
            {Array.from(headerBarButtons)
                .sort(([, a], [, b]) => a.priority - b.priority)
                .map(([id, { render: Button }]) => (
                    <ErrorBoundary noop key={id} onError={e => logger.error(`Failed to render header bar button: ${id}`, e.error)}>
                        <Button />
                    </ErrorBoundary>
                ))}
        </div>
    );
}

function ChannelToolbarButtons() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        channelToolbarListeners.add(listener);
        stealthListeners.add(listener);
        compactListeners.add(listener);
        window.addEventListener("fcord-stealth-change", listener);
        window.addEventListener("fcord-compact-change", listener);
        return () => {
            channelToolbarListeners.delete(listener);
            stealthListeners.delete(listener);
            compactListeners.delete(listener);
            window.removeEventListener("fcord-stealth-change", listener);
            window.removeEventListener("fcord-compact-change", listener);
        };
    }, []);

    if (isStealthModeEnabled()) return null;

    if (isCompactModeEnabled()) {
        return (
            <div className="vc-channel-toolbar-btns" style={{ display: "contents" }}>
                <CompactChannelToolbarToggle />
            </div>
        );
    }

    return (
        <div className="vc-channel-toolbar-btns" style={{ display: "contents" }}>
            {Array.from(channelToolbarButtons)
                .sort(([, a], [, b]) => a.priority - b.priority)
                .map(([id, { render: Button }]) => (
                    <ErrorBoundary noop key={id} onError={e => logger.error(`Failed to render channel toolbar button: ${id}`, e.error)}>
                        <Button />
                    </ErrorBoundary>
                ))}
        </div>
    );
}

/** @internal Injected by HeaderBarAPI patch (do NOT call directly) */
export function _addHeaderBarButtons() {
    return [<HeaderBarButtons key="vc-header-bar-buttons" />];
}

/** @internal Injected by HeaderBarAPI patch (do NOT call directly) */
export function _addChannelToolbarButtons(children: any[]) {
    children.push(<ChannelToolbarButtons key="vc-channel-toolbar-buttons" />);
}
