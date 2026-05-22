/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { Clickable, Tooltip, useEffect, useState, ReactDOM } from "@webpack/common";
import type { ComponentType, JSX, MouseEventHandler, ReactNode } from "react";

const logger = new Logger("HeaderBarAPI");

const HeaderBarClasses = findCssClassesLazy("clickable", "withHighlight");
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '"aria-haspopup":') as ComponentType<ChannelToolbarButtonProps>;

export interface HeaderBarButtonProps {
    /** The icon component to render inside the button */
    icon: ComponentType<any>;
    /** Tooltip text shown on hover. Pass null to disable tooltip */
    tooltip: ReactNode;
    /** Called when the button is clicked */
    onClick?: MouseEventHandler<HTMLDivElement>;
    /** Called when the button is right-clicked */
    onContextMenu?: MouseEventHandler<HTMLDivElement>;
    /** Additional CSS class names */
    className?: string;
    /** Size of the icon in pixels */
    iconSize?: number;
    /** Tooltip position relative to the button */
    position?: "top" | "bottom" | "left" | "right";
    /** Whether the button appears in a selected/active state */
    selected?: boolean;
    /** Aria label for accessibility */
    "aria-label"?: string;
}

export interface ChannelToolbarButtonProps extends HeaderBarButtonProps {
    /** CSS class name for the icon element */
    iconClassName?: string;
    /** Tooltip position relative to the button */
    position?: "top" | "bottom" | "left" | "right";
    /** Whether the button appears in a selected/active state */
    selected?: boolean;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Whether to show a notification badge */
    showBadge?: boolean;
    /** Position of the notification badge */
    badgePosition?: "top" | "bottom";
}

export type HeaderBarButtonFactory = () => JSX.Element | null;

export interface HeaderBarButtonData {
    /** Function that renders the button component */
    render: HeaderBarButtonFactory;
    /** Icon component used for settings UI display */
    icon: ComponentType<any>;
    /** Higher priority buttons appear further right. Default: 0 */
    priority?: number;
    /** Where to render the button. Default: "headerbar" */
    location?: "headerbar" | "channeltoolbar";
}

interface ButtonEntry {
    render: HeaderBarButtonFactory;
    priority: number;
}

/**
 * Button component for the top header bar (title bar area).
 *
 * @example
 * <HeaderBarButton
 *     icon={MyIcon}
 *     tooltip="My Button"
 *     onClick={() => console.log("clicked")}
 * />
 */
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

/**
 * Button component for the channel toolbar (below the search bar).
 * Automatically handles selected state styling.
 *
 * @example
 * <ChannelToolbarButton
 *     icon={MyIcon}
 *     tooltip={isOpen ? null : "My Button"}
 *     onClick={() => setOpen(v => !v)}
 *     selected={isOpen}
 * />
 */
export function ChannelToolbarButton(props: ChannelToolbarButtonProps) {
    return <HeaderBarIcon {...props} />;
}

const headerBarButtons = new Map<string, ButtonEntry>();
const channelToolbarButtons = new Map<string, ButtonEntry>();

const headerBarListeners = new Set<() => void>();
const channelToolbarListeners = new Set<() => void>();

/**
 * Adds a button to the header bar (title bar area).
 *
 * @param id - Unique identifier for the button (e.g., "my-plugin-button")
 * @param render - Function that returns the button JSX
 * @param priority - Higher values appear further right. Default: 0
 *
 * @example
 * addHeaderBarButton("my-button", () => (
 *     <HeaderBarButton
 *         icon={MyIcon}
 *         tooltip="My Button"
 *         onClick={handleClick}
 *     />
 * ));
 */
export function addHeaderBarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    headerBarButtons.set(id, { render, priority });
    headerBarListeners.forEach(listener => listener());
}

/**
 * Removes a button from the header bar.
 *
 * @param id - The identifier used when adding the button
 */
export function removeHeaderBarButton(id: string) {
    headerBarButtons.delete(id);
    headerBarListeners.forEach(listener => listener());
}

/**
 * Adds a button to the channel toolbar (below the search bar, next to pins/members).
 *
 * @param id - Unique identifier for the button (e.g., "my-plugin-toolbar")
 * @param render - Function that returns the button JSX
 * @param priority - Higher values appear further right. Default: 0
 *
 * @example
 * addChannelToolbarButton("my-toolbar", () => (
 *     <ChannelToolbarButton
 *         icon={MyIcon}
 *         tooltip="My Button"
 *         onClick={handleClick}
 *     />
 * ));
 */
export function addChannelToolbarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    channelToolbarButtons.set(id, { render, priority });
    channelToolbarListeners.forEach(listener => listener());
}

/**
 * Removes a button from the channel toolbar.
 *
 * @param id - The identifier used when adding the button
 */
export function removeChannelToolbarButton(id: string) {
    channelToolbarButtons.delete(id);
    channelToolbarListeners.forEach(listener => listener());
}

// ══════════════════════════════════════════════════════════════════
// STEALTH MODE — variable mémoire comme source de vérité
// ══════════════════════════════════════════════════════════════════

// Variable mémoire — PAS localStorage comme source de vérité
let _stealthActive = false;
try { _stealthActive = localStorage.getItem("Nightcord_stealthMode") === "1"; } catch { }

export function isStealthModeEnabled(): boolean {
    return _stealthActive;
}

function persistStealth(v: boolean) {
    try { v ? localStorage.setItem("Nightcord_stealthMode", "1") : localStorage.removeItem("Nightcord_stealthMode"); } catch { }
}

// Éléments NON-React uniquement (titlebar, NightcordAI nav)
// NE PAS cacher les entrées settings sidebar — l'utilisateur doit pouvoir accéder aux paramètres
const NON_REACT_SELECTORS = [
    "#nightcord-titlebar-btn",
    "#nightcord-titlebar-link-style",
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
    try { if (_stealthActive) document.body?.classList.add("nightcord-stealth"); else document.body?.classList.remove("nightcord-stealth"); } catch { }
    hideNonReactElements(_stealthActive);
}

export function toggleStealthMode() {
    _stealthActive = !_stealthActive;
    persistStealth(_stealthActive);
    hideNonReactElements(_stealthActive);
    // Notify React to re-render components (returns null when stealth is on)
    _notifyStealthChange();
    try { if (_stealthActive) document.body?.classList.add("nightcord-stealth"); else document.body?.classList.remove("nightcord-stealth"); } catch { }
    console.log("[StealthMode] toggled →", _stealthActive);
    return _stealthActive;
}

// ── Auto-init at module load ──
if (_stealthActive) {
    try { hideNonReactElements(true); } catch { }
    try { document.body?.classList.add("nightcord-stealth"); } catch { }
}

// Register Ctrl+Shift+H globally at module load
try {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === "KeyH") {
            e.preventDefault();
            e.stopPropagation();
            toggleStealthMode();
        }
    }, true);
} catch { }

// MutationObserver: re-hide non-React elements when Discord re-renders the DOM
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
    window.addEventListener("nightcord-stealth-change", () => {
        if (_stealthActive) startObserver();
        else stopObserver();
    });
} catch { }

// ── Listeners for React re-render ──
const stealthListeners = new Set<() => void>();
export function _notifyStealthChange() {
    // NO hideNonReactElements here — already handled in toggleStealthMode
    stealthListeners.forEach(fn => fn());
    window.dispatchEvent(new Event("nightcord-stealth-change"));
}
export function addStealthListener(fn: () => void) { stealthListeners.add(fn); }
export function removeStealthListener(fn: () => void) { stealthListeners.delete(fn); }

function HeaderBarButtons() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        headerBarListeners.add(listener);
        stealthListeners.add(listener);
        window.addEventListener("nightcord-stealth-change", listener);
        return () => {
            headerBarListeners.delete(listener);
            stealthListeners.delete(listener);
            window.removeEventListener("nightcord-stealth-change", listener);
        };
    }, []);

    if (isStealthModeEnabled()) return null;

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
        window.addEventListener("nightcord-stealth-change", listener);
        return () => {
            channelToolbarListeners.delete(listener);
            stealthListeners.delete(listener);
            window.removeEventListener("nightcord-stealth-change", listener);
        };
    }, []);

    if (isStealthModeEnabled()) return null;

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
