/*
 * Equicord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, useState, useRef } from "@webpack/common";
import { ModalRoot, ModalHeader, ModalContent, ModalFooter, ModalCloseButton } from "@utils/modal";
import { Button, Forms, Select } from "@webpack/common";

const DEFAULT_MESSAGES = [
    "Hello!",
    "Bonjour !",
    "Test message",
    "Flood message",
];

const DELAY_OPTIONS = [
    { label: "0ms", value: 0 },
    { label: "50ms", value: 50 },
    { label: "100ms", value: 100 },
    { label: "250ms", value: 250 },
    { label: "500ms", value: 500 },
    { label: "1s", value: 1000 },
    { label: "2s", value: 2000 },
    { label: "5s", value: 5000 },
];

export function FloodModal({ rootProps }: { rootProps: any; }) {
    const [messages, setMessages] = useState<string[]>(DEFAULT_MESSAGES);
    const [customText, setCustomText] = useState("");
    const [delay, setDelay] = useState(0);
    const [running, setRunning] = useState(false);
    const [sentCount, setSentCount] = useState(0);
    const intervalRef = useRef<any>(null);
    const indexRef = useRef(0);

    function sendMessage(text: string) {
        try {
            const { MessageActions, SelectedChannelStore } = (window as any).Vencord?.Webpack?.Common ?? {};
            const channelId = SelectedChannelStore?.getChannelId();
            if (channelId && MessageActions) {
                MessageActions.sendMessage(channelId, { content: text });
            }
        } catch (e) {
            console.error("[FloodPanel] sendMessage error:", e);
        }
    }

    function startFlood() {
        if (running) return;
        const list = messages.length > 0 ? messages : DEFAULT_MESSAGES;
        indexRef.current = 0;
        setSentCount(0);
        setRunning(true);

        function next() {
            const idx = indexRef.current % list.length;
            sendMessage(list[idx]);
            indexRef.current++;
            setSentCount(c => c + 1);
            intervalRef.current = setTimeout(next, delay);
        }
        intervalRef.current = setTimeout(next, delay);
    }

    function stopFlood() {
        clearTimeout(intervalRef.current);
        setRunning(false);
    }

    function loadFile() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const text = await file.text();
            const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
            if (lines.length > 0) setMessages(lines);
        };
        input.click();
    }

    function resetMessages() {
        setMessages(DEFAULT_MESSAGES);
        setCustomText("");
    }

    return (
        <ModalRoot {...rootProps} size="small">
            <ModalHeader separator={false}>
                <Forms.FormTitle tag="h4" style={{ margin: 0 }}>Flood Panel</Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className="vc-flood-content">
                {/* Message input */}
                <Forms.FormSection>
                    <Forms.FormTitle>Message personnalisé</Forms.FormTitle>
                    <textarea
                        className="vc-flood-textarea"
                        placeholder="Un message par ligne, ou laisse vide pour le défaut"
                        value={customText}
                        onChange={e => {
                            setCustomText(e.target.value);
                            const lines = e.target.value.split("\n").map(l => l.trim()).filter(Boolean);
                            if (lines.length > 0) setMessages(lines);
                            else setMessages(DEFAULT_MESSAGES);
                        }}
                        rows={3}
                    />
                </Forms.FormSection>

                {/* Boutons charger/reset */}
                <div className="vc-flood-row">
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.SECONDARY} onClick={loadFile}>
                        Charger .txt
                    </Button>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.SECONDARY} onClick={resetMessages}>
                        Défaut
                    </Button>
                </div>

                {/* Délai */}
                <Forms.FormSection>
                    <Forms.FormTitle>Délai entre les messages</Forms.FormTitle>
                    <select
                        style={{
                            width: "100%",
                            padding: "10px",
                            background: "var(--background-secondary)",
                            color: "var(--text-normal)",
                            border: "1px solid var(--background-modifier-accent)",
                            borderRadius: "8px",
                            outline: "none",
                            cursor: "pointer"
                        }}
                        value={delay}
                        onChange={e => setDelay(Number(e.target.value))}
                    >
                        {DELAY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} style={{ background: "var(--background-floating)" }}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </Forms.FormSection>

                {/* Compteur — visible seulement si active */}
                {(running || sentCount > 0) && (
                    <Forms.FormText className="vc-flood-counter--active">
                        {running ? `En cours — ${sentCount} sent` : `Finished — ${sentCount} sent`}
                    </Forms.FormText>
                )}
            </ModalContent>

            <ModalFooter>
                <Button color={Button.Colors.TRANSPARENT} onClick={rootProps.onClose}>
                    Close
                </Button>
                {running
                    ? <Button color={Button.Colors.RED} onClick={stopFlood}>Stopper le flood</Button>
                    : <Button color={Button.Colors.GREEN} onClick={startFlood}>Lancer le flood</Button>
                }
            </ModalFooter>
        </ModalRoot>
    );
}
