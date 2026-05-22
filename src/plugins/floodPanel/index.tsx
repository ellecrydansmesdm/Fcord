/*
 * Equicord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { openModal } from "@utils/modal";
import { React } from "@webpack/common";
import { FloodModal } from "./components/FloodModal";
import "./styles.css";

const FloodChatBarButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Flood Panel"
            onClick={() => openModal(props => <FloodModal rootProps={props} />)}
        >
            <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 6h16v2H8zM6 10h20v2H6zM4 14h24v2H4zM4 18h24v2H4zM6 22h20v2H6zM8 26h16v2H8z"/>
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "FloodPanel",
    enabledByDefault: true,
    description: "Sends mass messages in a Discord channel.",
    authors: [{ name: "Nightcord", id: 0n }],
    renderChatBarButton: FloodChatBarButton,
});
