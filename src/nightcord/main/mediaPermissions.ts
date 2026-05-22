/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { session, systemPreferences, Session } from "electron";

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
