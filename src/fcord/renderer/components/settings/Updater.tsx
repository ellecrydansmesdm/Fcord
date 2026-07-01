/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, HeadingTertiary, Paragraph } from "@Fcord/types/components";
import { useAwaiter } from "@Fcord/types/utils";

import { cl } from "./Settings";

export function Updater() {
    const [isOutdated] = useAwaiter(VesktopNative.app.isOutdated);

    if (!isOutdated) return null;

    return (
        <div className={cl("updater-card")}>
            <HeadingTertiary>Your Fcord is outdated!</HeadingTertiary>
            <Paragraph>Staying up to date is important for security and stability.</Paragraph>

            <Button onClick={() => VesktopNative.app.openUpdater()} variant="secondary">
                Open Updater
            </Button>
        </div>
    );
}
