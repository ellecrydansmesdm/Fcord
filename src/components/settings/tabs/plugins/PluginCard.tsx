/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { hasAnyVisibleSettings, isPluginEnabled, pluginRequiresRestart, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { CogWheel, InfoIcon } from "@components/Icons";
import { AddonCard } from "@components/settings/AddonCard";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { OptionType, Plugin } from "@utils/types";
import { openModal, ModalRoot, ModalHeader, ModalCloseButton, ModalContent, ModalSize } from "@utils/modal";
import { React, showToast, Text, Toasts } from "@webpack/common";
import { Settings } from "Vencord";

import { openPluginModal } from "./PluginModal";
import { TUTORIAL_CACHE } from "./components/Common";

const logger = new Logger("PluginCard");
const cl = classNameFactory("vc-plugins-");

interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled?: boolean;
    onRestartNeeded(name: string, key: string): void;
    isNew?: boolean;
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

function useTutorialExists(pluginName: string) {
    const [exists, setExists] = React.useState<boolean | null>(
        TUTORIAL_CACHE.has(pluginName) ? TUTORIAL_CACHE.get(pluginName)! : null
    );

    React.useEffect(() => {
        if (TUTORIAL_CACHE.has(pluginName)) {
            setExists(TUTORIAL_CACHE.get(pluginName)!);
            return;
        }

        let cancelled = false;
        fetch(
            `https://raw.githubusercontent.com/nightcordoff/nightcord-tutorials/main/videos/${pluginName}.mp4`,
            { method: "HEAD" }
        )
            .then(res => {
                if (!cancelled) {
                    const found = res.ok;
                    TUTORIAL_CACHE.set(pluginName, found);
                    setExists(found);
                    // Force le rafraîchissement global pour le filtre
                    window.dispatchEvent(new CustomEvent("nightcord-tutorial-detected", { detail: { pluginName, found } }));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    TUTORIAL_CACHE.set(pluginName, false);
                    setExists(false);
                }
            });

        return () => { cancelled = true; };
    }, [pluginName]);

    return exists;
}

export function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave, isNew }: PluginCardProps) {
    const settings = Settings.plugins[plugin.name];
    const isEnabled = () => isPluginEnabled(plugin.name);
    const hasTutorial = useTutorialExists(plugin.name);

    function toggleEnabled() {
        const wasEnabled = isEnabled();

        if (!wasEnabled) {
            const { restartNeeded, failures } = startDependenciesRecursive(plugin);

            if (failures.length) {
                logger.error(`Failed to start dependencies for ${plugin.name}: ${failures.join(", ")}`);
                showNotice("Failed to start dependencies: " + failures.join(", "), "Close", () => null);
                return;
            }

            if (restartNeeded) {
                settings.enabled = true;
                onRestartNeeded(plugin.name, "enabled");
                return;
            }
        }

        if (pluginRequiresRestart(plugin)) {
            settings.enabled = !wasEnabled;
            onRestartNeeded(plugin.name, "enabled");
            return;
        }

        if (wasEnabled && !plugin.started) {
            settings.enabled = !wasEnabled;
            return;
        }

        const result = wasEnabled ? stopPlugin(plugin) : startPlugin(plugin);

        if (!result) {
            settings.enabled = false;

            const msg = `Error while ${wasEnabled ? "stopping" : "starting"} plugin ${plugin.name}`;
            showToast(msg, Toasts.Type.FAILURE, {
                position: Toasts.Position.BOTTOM,
            });

            return;
        }

        settings.enabled = !wasEnabled;
    }

    const openTutorialVideo = (e: React.MouseEvent) => {
        e.stopPropagation();
        const videoUrl = `https://raw.githubusercontent.com/nightcordoff/nightcord-tutorials/main/videos/${plugin.name}.mp4`;
        openModal(props => (
            <ModalRoot {...props} size={ModalSize.DYNAMIC} className="nc-tutorial-modal">
                <ModalHeader separator={false}>
                    <Text variant="heading-xl/bold" style={{ flex: 1, color: "#fff" }}>
                        {plugin.name} — Tutorial
                    </Text>
                    <ModalCloseButton onClick={props.onClose} />
                </ModalHeader>
                <ModalContent>
                    <div style={{ padding: "0 16px 16px" }}>
                        <video
                            src={videoUrl}
                            controls
                            autoPlay
                            style={{
                                width: "100%",
                                borderRadius: "8px",
                                background: "#000",
                            }}
                            onError={e => {
                                const el = e.currentTarget;
                                el.style.display = "none";
                                const msg = el.parentElement?.querySelector(".nc-video-error") as HTMLElement;
                                if (msg) msg.style.display = "flex";
                            }}
                        />
                        <div
                            className="nc-video-error"
                            style={{
                                display: "none",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "48px 24px",
                                color: "var(--text-muted)",
                                gap: "8px",
                            }}
                        >
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="var(--text-muted)" />
                            </svg>
                            <Text variant="text-md/medium">No video tutorial available for this plugin.</Text>
                        </div>
                    </div>
                </ModalContent>
            </ModalRoot>
        ));
    };

    const sourceBadge = (
        <button
            onClick={openTutorialVideo}
            style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                color: "var(--interactive-normal)",
                transition: "color 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--interactive-hover)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--interactive-normal)"; }}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>
        </button>
    );

    const tooltip = "Show Tutorial";

    return (
        <AddonCard
            name={plugin.name}
            sourceBadge={hasTutorial ? sourceBadge : undefined}
            tooltip={tooltip}
            description={plugin.description}
            isNew={isNew}
            enabled={isEnabled()}
            setEnabled={plugin.required ? () => { } : toggleEnabled}
            disabled={disabled}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            infoButton={
                <button
                    role="switch"
                    onClick={() => openPluginModal(plugin, onRestartNeeded)}
                    className={cl("info-button")}
                >
                    {plugin.settings?.def && Object.values(plugin.settings.def).some(s => s.type !== OptionType.CUSTOM && !s.hidden)
                        ? <CogWheel className={cl("info-icon")} />
                        : <InfoIcon className={cl("info-icon")} />
                    }
                </button>
            } />
    );
}
