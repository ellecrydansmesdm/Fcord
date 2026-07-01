/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Session,session, systemPreferences } from "electron";

export function registerMediaPermissionsForSession(ses: Session) {
    ses.setPermissionCheckHandler((_webContents, permission, _requestingOrigin, details) => {
        if (permission === "media") {
            return true;
        }
        return true;
    });

    ses.setPermissionRequestHandler(async (_webContents, permission, callback, details) => {
        if (permission === "media") {
            let granted = true;

            if (process.platform === "darwin" && "mediaTypes" in details) {
                if (details.mediaTypes?.includes("audio")) {
                    granted &&= await systemPreferences.askForMediaAccess("microphone");
                }
                if (details.mediaTypes?.includes("video")) {
                    granted &&= await systemPreferences.askForMediaAccess("camera");
                }
            }

            return callback(granted);
        }

        callback(true);
    });
}

export function registerMediaPermissionsHandler() {
    registerMediaPermissionsForSession(session.defaultSession);
}
