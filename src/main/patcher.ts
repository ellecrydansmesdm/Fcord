/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { onceDefined } from "@shared/onceDefined";
import electron, { app, BrowserWindowConstructorOptions, Menu, session } from "electron";
import { existsSync as fsExistsSync, statSync as fsStatSync } from "original-fs";
import { dirname, join } from "path";

import { registerMediaPermissionsForSession } from "../nightcord/main/mediaPermissions";
import { RendererSettings } from "./settings";
import { patchTrayMenu } from "./trayMenu";
import { IS_VANILLA } from "./utils/constants";

console.log("[Nightcord] Starting up...");

// FIX PERF CRITIQUE : le patch de Module._resolveLookupPaths par défaut 
// crée un `new Set(parent.paths)` à chaque appel require() (des milliers 
// lors du boot) ce qui gèle le processus sur le splash screen ("Starting...").
const Module = require("module");
if (Module._resolveLookupPaths) {
    const fastResolve = function (request: string, parent: any) {
        if (!parent || !parent.paths) return Module.globalPaths;
        for (let i = 0; i < Module.globalPaths.length; i++) {
            if (!parent.paths.includes(Module.globalPaths[i])) {
                parent.paths.push(Module.globalPaths[i]);
            }
        }
        return parent.paths;
    };

    // Protéger notre patch ultra-rapide pour éviter que Discord ne l'écrase
    // avec sa version lente plus tard dans le chargement
    Object.defineProperty(Module, "_resolveLookupPaths", {
        get: () => fastResolve,
        set: () => { /* Silencieusement ignorer les tentatives d'écrasement */ },
        configurable: true
    });
}


// Our injector file at app/index.js
const injectorPath = require.main!.filename;

// The original app.asar
const _asarFromInjector = join(dirname(injectorPath), "..", "_app.asar");
const _asarFromResources = join(process.resourcesPath, "_app.asar");
const asarPath = (fsExistsSync(_asarFromInjector) && !fsStatSync(_asarFromInjector).isDirectory())
    ? _asarFromInjector
    : _asarFromResources;

const discordPkg = require(join(asarPath, "package.json"));
require.main!.filename = join(asarPath, discordPkg.main);
if (IS_VESKTOP || IS_EQUIBOP) require.main!.filename = join(dirname(injectorPath), "..", "..", "package.json");

// @ts-expect-error Untyped method? Dies from cringe
app.setAppPath(asarPath);

if (!IS_VANILLA) {
    const settings = RendererSettings.store;

    patchTrayMenu();

    // Repatch after host updates on Windows
    if (process.platform === "win32") {
        require("./patchWin32Updater");

        if (settings.winCtrlQ) {
            const originalBuild = Menu.buildFromTemplate;
            Menu.buildFromTemplate = function (template) {
                if (template[0]?.label === "&File") {
                    const { submenu } = template[0];
                    if (Array.isArray(submenu)) {
                        submenu.push({
                            label: "Quit (Hidden)",
                            visible: false,
                            acceleratorWorksWhenHidden: true,
                            accelerator: "Control+Q",
                            click: () => app.quit()
                        });
                    }
                }
                return originalBuild.call(this, template);
            };
        }
    }

    class BrowserWindow extends electron.BrowserWindow {
        constructor(options: BrowserWindowConstructorOptions) {
            if (options?.webPreferences?.preload && options.title) {
                const original = options.webPreferences.preload;
                const isMainWindow = options.title === "Discord";
                options.webPreferences.preload = join(__dirname, "preload.js");
                options.webPreferences.sandbox = false;
                options.webPreferences.backgroundThrottling = false;

                let ses = options.webPreferences.session;
                if (!ses && options.webPreferences.partition) {
                    ses = electron.session.fromPartition(options.webPreferences.partition);
                }
                ses ??= electron.session.defaultSession;
                registerMediaPermissionsForSession(ses);

                if (settings.frameless) {
                    options.frame = false;
                } else if (settings.mainWindowFrameless && isMainWindow) {
                    options.frame = false;
                } else if (process.platform === "win32" && settings.winNativeTitleBar) {
                    delete options.frame;
                }

                if (settings.transparent) {
                    options.transparent = true;
                    options.backgroundColor = "#00000000";
                }

                // Windows 11 acrylic/mica effect
                const winMaterial = settings.windowMaterial as string | undefined;
                if (process.platform === "win32" && winMaterial && winMaterial !== "none") {
                    options.transparent = true;
                    options.backgroundColor = "#00000000";
                }

                if (settings.disableMinSize) {
                    options.minWidth = 0;
                    options.minHeight = 0;
                }

                const needsVibrancy = process.platform === "darwin" && settings.macosVibrancyStyle;

                if (needsVibrancy) {
                    options.backgroundColor = "#00000000";
                    if (settings.macosVibrancyStyle) {
                        options.vibrancy = settings.macosVibrancyStyle;
                    }
                }

                options.fullscreenable = true;

                process.env.DISCORD_PRELOAD = original;

                super(options);

                const isTransparent = !!options.transparent;
                let isFakeFullScreen = false;
                let originalBounds: electron.Rectangle | null = null;
                let isMaximizedBefore = false;
                let transitioning = false;

                const superSetFullScreen = this.setFullScreen.bind(this);
                const superIsFullScreen = this.isFullScreen.bind(this);

                this.setFullScreen = (flag: boolean) => {
                    if (transitioning) return;
                    transitioning = true;
                    try {
                        if (isTransparent) {
                            if (flag) {
                                if (isFakeFullScreen) return;
                                isFakeFullScreen = true;
                                originalBounds = this.getBounds();
                                isMaximizedBefore = this.isMaximized();
                                const display = electron.screen.getDisplayMatching(originalBounds).bounds;
                                this.setResizable(false);
                                this.setBounds(display);
                                this.setAlwaysOnTop(true, "screen-saver");
                                this.emit("enter-full-screen");
                            } else {
                                if (!isFakeFullScreen) return;
                                isFakeFullScreen = false;
                                this.setAlwaysOnTop(false);
                                this.setResizable(true);
                                if (isMaximizedBefore) {
                                    this.maximize();
                                } else if (originalBounds) {
                                    this.setBounds(originalBounds);
                                }
                                this.emit("leave-full-screen");
                            }
                        } else {
                            superSetFullScreen(flag);
                        }
                    } finally {
                        transitioning = false;
                    }
                };

                this.isFullScreen = () => {
                    if (isTransparent) return isFakeFullScreen;
                    return superIsFullScreen();
                };

                // ── Fullscreen via HTML5 (vidéo plein écran, etc.) ──
                // On branche enter/leave-html-full-screen dans les deux modes pour que
                // les vrais plein écrans HTML5 fonctionnent correctement.
                // DISCORD_WINDOW_TOGGLE_FULLSCREEN est neutralisé plus bas — il ne
                // passera JAMAIS par setFullScreen natif.
                if (isTransparent) {
                    this.on("enter-html-full-screen", () => {
                        if (!isFakeFullScreen) this.setFullScreen(true);
                    });
                    this.on("leave-html-full-screen", () => {
                        if (isFakeFullScreen) this.setFullScreen(false);
                    });
                } else {
                    this.on("enter-html-full-screen", () => {
                        if (!superIsFullScreen()) superSetFullScreen(true);
                    });
                    this.on("leave-html-full-screen", () => {
                        if (superIsFullScreen()) superSetFullScreen(false);
                    });
                }

                // ── F11 géré ici, côté main process ──
                // On intercepte F11 via before-input-event pour basculer le fullscreen
                // utilisateur. C'est la SEULE source légitime de toggle fullscreen manuel.
                this.webContents.on("before-input-event", (event, input) => {
                    if (input.type === "keyDown" && input.key === "F11" && !input.control && !input.shift && !input.alt && !input.meta) {
                        event.preventDefault();
                        this.setFullScreen(!this.isFullScreen());
                    }
                });

                // Apply Windows background material after window creation.
                if (process.platform === "win32" && winMaterial && winMaterial !== "none") {
                    try {
                        let applied = false;
                        // @ts-ignore
                        if (typeof this.setBackgroundMaterial === "function") {
                            this.setBackgroundMaterial(winMaterial);
                            applied = true;
                        }
                        // @ts-ignore
                        if (!applied && typeof this.setVibrancy === "function") {
                            this.setVibrancy(winMaterial === "acrylic" ? "acrylic" : "under-window");
                            applied = true;
                        }
                        if (!applied) {
                            console.warn("[Nightcord] No background material API available on this system");
                        }
                    } catch (e) {
                        console.error("[Nightcord] setBackgroundMaterial failed:", e);
                    }
                }

                if (settings.disableMinSize) {
                    this.setMinimumSize = (_width: number, _height: number) => { };
                }
            } else super(options);
        }
    }
    Object.assign(BrowserWindow, electron.BrowserWindow);
    Object.defineProperty(BrowserWindow, "name", { value: "BrowserWindow", configurable: true });

    // Replace electrons exports with our custom BrowserWindow
    const electronPath = require.resolve("electron");
    delete require.cache[electronPath]!.exports;
    require.cache[electronPath]!.exports = {
        ...electron,
        BrowserWindow
    };

    // Enable DevTools only in development mode
    if (IS_DEV) {
        onceDefined(global, "appSettings", s => {
            s.set("DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING", true);
        });
    }

    process.env.DATA_DIR = join(app.getPath("userData"), "..", "Nightcord");

    app.whenReady().then(() => {
        registerMediaPermissionsForSession(session.defaultSession);
    });

    // ── Neutralisation de DISCORD_WINDOW_TOGGLE_FULLSCREEN ──
    //
    // PROBLÈME RACINE : Discord émet cet IPC automatiquement à chaque démarrage
    // ET à chaque rechargement de thème pour "synchroniser" son état interne.
    // L'ancien handler faisait `win.setFullScreen(!win.isFullScreen())` — un toggle
    // aveugle. Résultat : fenêtre maximisée + isFullScreen()=false → setFullScreen(true)
    // → overlay OS fullscreen → tous les inputs bloqués, app figée. F11 sortait du
    // fullscreen et débloquait. Le fix du délai de 2s ne suffisait pas car les thèmes
    // rechargent Discord après ce délai.
    //
    // SOLUTION : on intercepte le handler Discord et on le remplace par un no-op
    // complet. Le fullscreen utilisateur est désormais géré exclusivement via F11
    // intercepté dans before-input-event ci-dessus — ce qui est à la fois plus propre
    // et impossible à déclencher accidentellement par Discord.
    {
        const _originalHandle = electron.ipcMain.handle.bind(electron.ipcMain);
        const FULLSCREEN_CHANNEL = "DISCORD_WINDOW_TOGGLE_FULLSCREEN";
        let _fullscreenPatched = false;

        (electron.ipcMain as any).handle = function(channel: string, listener: any) {
            if (channel === FULLSCREEN_CHANNEL) {
                if (_fullscreenPatched) return;
                _fullscreenPatched = true;
                // No-op : on enregistre un handler vide pour que Discord ne crash pas
                // ("no handler registered"), mais on ne fait RIEN — le fullscreen est
                // géré par before-input-event (F11) côté main process.
                _originalHandle(FULLSCREEN_CHANNEL, (_event: electron.IpcMainInvokeEvent) => {
                    // Intentionnellement vide.
                });
                return;
            }
            try {
                return _originalHandle(channel, listener);
            } catch (e: any) {
                if (e?.message?.includes?.("Attempted to register a second handler")) {
                    console.warn(`[Nightcord] Ignored duplicate IPC handler for '${channel}'`);
                    return;
                }
                throw e;
            }
        };
    }

    const originalAppend = app.commandLine.appendSwitch;
    const _ncDisabledFeatures = new Set(["WidgetLayering", "UseEcoQoSForBackgroundProcess", "CalculateNativeWinOcclusion"]);
    app.commandLine.appendSwitch = function (...args) {
        if (args[0] === "process-per-site") return;
        if (args[0] === "disable-features") {
            (args[1] ?? "").split(",").filter(Boolean).forEach((f: string) => _ncDisabledFeatures.add(f));
            args[1] = [..._ncDisabledFeatures].join(",");
        }
        return originalAppend.apply(this, args);
    };

    app.commandLine.appendSwitch("disable-renderer-backgrounding");
    app.commandLine.appendSwitch("disable-background-timer-throttling");
    app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
} else {
    console.log("[Nightcord] Running in vanilla mode. Not loading Nightcord");
}

console.log("[Nightcord] Loading original Discord app.asar");
require(require.main!.filename);
