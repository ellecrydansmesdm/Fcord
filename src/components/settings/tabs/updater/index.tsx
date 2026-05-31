/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings";
import { Span } from "@components/Span";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { changes, checkForUpdates, rebuild, update, UpdateLogger } from "@utils/updater";
import { React, useState } from "@webpack/common";
import { Toasts } from "@webpack/common";

// Version locale depuis package.json (injectée au build)
declare const VERSION: string;

const REPO_URL = "https://git.nightcord.su/nightcord/nightcord";

function UpdaterTab() {
    const [checking, setChecking] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [launching, setLaunching] = useState(false);
    const [checked, setChecked] = useState(false);
    const [outdated, setOutdated] = useState(false);
    const [updateList, setUpdateList] = useState(changes ?? []);
    const [error, setError] = useState<string | null>(null);

    async function handleCheck() {
        setChecking(true);
        setError(null);
        try {
            const hasUpdate = await checkForUpdates();
            setOutdated(hasUpdate);
            setUpdateList(changes ?? []);
            setChecked(true);

            if (!hasUpdate) {
                Toasts.show({
                    message: "Tu es déjà sur la dernière version !",
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS,
                    options: { position: Toasts.Position.BOTTOM }
                });
            }
        } catch (e: any) {
            UpdateLogger.error(e);
            let detail: string | null = e?.message || e?.error?.message || (typeof e === "string" ? e : null);
            // Strip any residual HTML and truncate to keep the UI clean
            if (detail) {
                detail = detail.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                if (detail.length > 300) detail = detail.substring(0, 300) + "…";
            }
            setError(`Impossible de vérifier les mises à jour.${detail ? ` (${detail})` : " Vérifie ta connexion."}`);
        } finally {
            setChecking(false);
        }
    }

    async function handleUpdate() {
        setDownloading(true);
        setError(null);
        try {
            // Update & build triggers our new ASAR overwrite
            await update();
            await rebuild();

            Toasts.show({
                message: "Update successful! Restarting...",
                id: Toasts.genId(),
                type: Toasts.Type.SUCCESS,
                options: { position: Toasts.Position.BOTTOM }
            });

            setTimeout(() => {
                relaunch();
            }, 1500);
        } catch (e: any) {
            UpdateLogger.error(e);
            setError("Update failed: " + e.message);
            setDownloading(false);
        }
    }

    return (
        <SettingsTab>
            <Heading className={Margins.top16}>Nightcord Updater</Heading>
            <Paragraph className={Margins.bottom20}>
                Check for new versions of Nightcord. Updates can be installed automatically.
            </Paragraph>

            {/* Version actuelle */}
            <Card style={{ padding: "12px 16px", marginBottom: 12 }}>
                <Flex style={{ alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <Span size="sm" color="text-subtle">Current Version</Span>
                        <div>
                            <Span size="md" weight="medium" color="text-strong">
                                v{VERSION}
                            </Span>
                        </div>
                    </div>
                    <div>
                        <Span size="sm" color="text-subtle">Website</Span>
                        <div>
                            <Link href="https://nightcord.su" style={{ fontSize: 13 }}>
                                nightcord.su
                            </Link>
                        </div>
                    </div>
                </Flex>
            </Card>

            {/* Error */}
            {error && (
                <Card style={{ padding: "10px 16px", marginBottom: 12, borderLeft: "3px solid var(--status-danger)" }}>
                    <Span size="sm" color="text-danger">{error}</Span>
                </Card>
            )}

            {/* Résultat vérification */}
            {checked && !error && (
                outdated ? (
                    <Card style={{ padding: "10px 16px", marginBottom: 12, borderLeft: "3px solid var(--status-warning)" }}>
                        <Span size="sm" style={{ color: "var(--text-warning)" }}>
                            {updateList[0]?.message ?? "A new update is available!"}
                        </Span>
                    </Card>
                ) : (
                    <Card style={{ padding: "10px 16px", marginBottom: 12, borderLeft: "3px solid var(--status-positive)" }}>
                        <Span size="sm" style={{ color: "var(--text-positive)" }}>You are running the latest version ✔</Span>
                    </Card>
                )
            )}

            {/* Boutons */}
            <Flex gap="8px" className={Margins.top8}>
                <Button
                    size="small"
                    disabled={checking}
                    onClick={handleCheck}
                >
                    {checking ? "Checking..." : "Check for Updates"}
                </Button>

                {outdated && (
                    <Button
                        size="small"
                        variant="primary"
                        onClick={handleUpdate}
                        disabled={downloading}
                    >
                        {downloading ? "Installing..." : "🚀 Update Now (Automatic)"}
                    </Button>
                )}
            </Flex>

            <Divider className={Margins.top20} />

            <Paragraph className={Margins.top16} style={{ fontSize: 12, opacity: 0.6 }}>
                Clicking "Update Now" will automatically download the latest version and restart your client.
            </Paragraph>
        </SettingsTab>
    );
}

export default wrapTab(UpdaterTab, "Updater");
