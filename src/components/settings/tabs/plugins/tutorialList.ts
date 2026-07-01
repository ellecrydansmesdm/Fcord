/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * AUTO-GENERATED — do not edit by hand.
 * Update by running: node scripts/generateTutorialList.mjs
 */

/**
 * Set of plugin names that have a tutorial video available in fcord-tutorials.
 * Using a static list avoids CORS issues when fetching from gitea.fcord.st at runtime.
 */
export const TUTORIAL_PLUGIN_NAMES: ReadonlySet<string> = new Set([
    "Abbreviation",
    "AnonymiseFileNames",
    "AntiGroup",
    "AntiMoveDeco",
    "AudioLimiter",
    "AutoCorrect",
    "AutoReply",
    "AutoResponder",
    "AutoUnmute",
    "BulkFriendRemove",
    "CallTimer",
    "ChannelWallpaper",
    "CrashHandler",
    "CreateTheme",
    "CursorMacOS",
    "CustomProfile",
    "DMBomb",
    "DoubleCall",
    "DoubleEmoji",
    "EncryptedMessage",
    "EventLogs",
    "ExportDM",
    "Fake Voice Option",
    "FakeDM",
    "FakeFriends",
    "FakePerm",
    "FakeSwitcher",
    "FloodPanel",
    "FollowUser",
    "GhostClient",
    "HideMedia",
    "ImageZoom",
    "LiveWallpaper",
    "LockGroup",
    "MassDM",
    "MessageCleaner",
    "MessageLoggerEnhanced",
    "MultiInstance",
    "MuteAllServers",
    "PlatformIndicators",
    "SelfDestruct",
    "ServerCloner",
    "SharePerms",
    "ShowHiddenChannels",
    "ShowHiddenThings",
    "SilentDelete",
    "SilentEdit",
    "SoundCordPlayer",
    "StreamProof",
    "TokenImporter",
    "Translate",
    "ValidUser",
    "VideoRecorder",
    "ViewIcons",
    "VoiceChannelSearch",
    "VoiceMessages",
    "VolumeBooster",
]);

/**
 * Synchronously populates the cache from the static list and calls onProgress.
 * No network requests — instant, no CORS issues.
 */
export function loadTutorials(_pluginNames: string[], onProgress: (found: Set<string>) => void) {
    onProgress(new Set(TUTORIAL_PLUGIN_NAMES));
}
