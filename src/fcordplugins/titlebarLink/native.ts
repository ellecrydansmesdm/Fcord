/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { shell } from "electron";

export async function openUrl(_: any, url: string): Promise<void> {
    if (typeof url === "string" && url.startsWith("https://")) {
        shell.openExternal(url);
    }
}
