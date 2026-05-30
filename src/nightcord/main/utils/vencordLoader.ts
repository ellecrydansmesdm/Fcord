/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { existsSync } from "fs";
import { join } from "path";

import { USER_AGENT } from "../constants";
import { VENCORD_DIR } from "../vencordDir";
import { downloadFile, fetchie } from "./http";

const API_BASE = "https://git.nightcord.su/api/v1";

export interface ReleaseData {
    name: string;
    tag_name: string;
    html_url: string;
    assets: Array<{
        name: string;
        browser_download_url: string;
    }>;
}

export async function githubGet(endpoint: string) {
    const opts: RequestInit = {
        headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT
        }
    };

    return fetchie(API_BASE + endpoint, opts, { retryOnNetworkError: true });
}

export async function downloadVencordAsar() {
    await downloadFile(
        "https://git.nightcord.su/nightcord/nightcord/releases/download/latest/Nightcord.asar",
        VENCORD_DIR,
        {},
        { retryOnNetworkError: true }
    );
}

export function isValidVencordInstall(dir: string) {
    return existsSync(join(dir, "Nightcord/main.js"));
}

export async function ensureVencordFiles() {
    if (!existsSync(VENCORD_DIR)) {
        console.error("Bundled nightcord.asar not found at", VENCORD_DIR);
    }
}
