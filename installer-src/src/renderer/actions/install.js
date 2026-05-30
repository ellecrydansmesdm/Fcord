import {progress, status} from "../stores/installation";
import {remote} from "electron";
import {promises as fs, createWriteStream} from "fs";
import path from "path";
import phin from "phin";
import https from "https";
import {execSync} from "child_process";

import {log, lognewline} from "./utils/log";
import succeed from "./utils/succeed";
import fail from "./utils/fail";
import exists from "./utils/exists";
import reset from "./utils/reset";
import kill from "./utils/kill";
import {showRestartNotice} from "./utils/notices";
import doSanityCheck from "./utils/sanity";

const MAKE_DIR_PROGRESS = 10;
const FETCH_RELEASE_PROGRESS = 15;
const DOWNLOAD_PACKAGE_PROGRESS = 75;
const EXTRACTION_PROGRESS = 90;
const INJECT_SHIM_PROGRESS = 98;
const RESTART_DISCORD_PROGRESS = 100;

const RELEASE_API = "https://git.nightcord.su/api/v1/repos/nightcord/nightcord/releases/latest";
const DIST_ZIP = "nightcord-dist.zip";

const distDir = path.join(process.env.LOCALAPPDATA, "Nightcord", "dist");

function getResourcesPath(discordCorePath) {
    let current = discordCorePath;
    for (let i = 0; i < 5; i++) {
        const resources = path.join(current, "resources");
        if (fs.exists ? fs.existsSync(resources) : true) {
            // Check if resources exists or if we can see app.asar in current
            if (path.basename(current) === "resources" || (fs.existsSync && fs.existsSync(path.join(current, "app.asar")))) {
                return current;
            }
            if (fs.existsSync && fs.existsSync(resources)) {
                return resources;
            }
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return path.join(discordCorePath, "..", "..", "..", "resources");
}

async function copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function cleanModulePatches(resourcesPath) {
    try {
        const appBase = path.dirname(resourcesPath);
        const modulesSearchPaths = [
            path.join(appBase, "modules"),
            path.join(resourcesPath, "modules")
        ];

        for (const modulesDir of modulesSearchPaths) {
            if (!(await exists(modulesDir))) continue;

            const dirs = await fs.readdir(modulesDir);
            for (const d of dirs) {
                if (!d.startsWith("discord_desktop_core")) continue;
                const corePath = path.join(modulesDir, d, "discord_desktop_core");
                if (!(await exists(corePath))) continue;

                const patchedFiles = [
                    path.join(corePath, "index.js"),
                    path.join(corePath, "app", "app_bootstrap", "splashScreen.js"),
                    path.join(corePath, "app", "app_bootstrap", "index.js"),
                ];

                for (const pf of patchedFiles) {
                    if (!(await exists(pf))) continue;
                    const content = await fs.readFile(pf, "utf-8");
                    const isPatched = content.toLowerCase().includes("vencord") ||
                                      content.toLowerCase().includes("equicord") ||
                                      content.includes('require("vencord') ||
                                      content.includes("require('vencord") ||
                                      content.includes("VencordNative") ||
                                      content.includes("equilotl");

                    if (!isPatched) continue;

                    const backupExts = [".orig", ".bak", ".vanilla"];
                    let restored = false;
                    for (const ext of backupExts) {
                        const bk = pf + ext;
                        if (await exists(bk)) {
                            await fs.copyFile(bk, pf);
                            await fs.unlink(bk);
                            restored = true;
                            break;
                        }
                    }
                    if (!restored) {
                        await fs.unlink(pf).catch(() => {});
                    }
                }

                const innerAppDir = path.join(corePath, "app");
                if (await exists(innerAppDir)) {
                    const innerPkg = path.join(innerAppDir, "package.json");
                    if (await exists(innerPkg)) {
                        const pkgContent = await fs.readFile(innerPkg, "utf-8");
                        const isMod = pkgContent.toLowerCase().includes("vencord") ||
                                      pkgContent.toLowerCase().includes("equicord") ||
                                      pkgContent.toLowerCase().includes("openasar");
                        if (isMod) {
                            await fs.rmdir(innerAppDir, { recursive: true }).catch(() => {});
                        }
                    }
                }
            }
        }
    } catch (err) {
        log(`⚠️ Clean module warning: ${err.message}`);
    }
}

function downloadFileAsync(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(destPath);
        https.get(url, { headers: { "User-Agent": "Nightcord-Installer/3.0" } }, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                file.close();
                downloadFileAsync(response.headers.location, destPath, onProgress).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                file.close();
                reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                return;
            }
            const totalBytes = parseInt(response.headers["content-length"], 10) || 0;
            let downloadedBytes = 0;

            response.on("data", (chunk) => {
                downloadedBytes += chunk.length;
                if (totalBytes > 0) {
                    const percent = (downloadedBytes / totalBytes) * 100;
                    onProgress(percent, downloadedBytes, totalBytes);
                }
            });

            response.pipe(file);

            file.on("finish", () => {
                file.close();
                resolve();
            });
        }).on("error", (err) => {
            file.close();
            fs.unlink(destPath).catch(() => {});
            reject(err);
        });
    });
}

const getJSON = phin.defaults({
    method: "GET",
    parse: "json",
    followRedirects: true,
    headers: { "User-Agent": "Nightcord-Installer/3.0", "Accept": "application/json" }
});

async function downloadDist() {
    log("Fetching latest release information from Gitea...");
    let assetUrl;
    let nightcordVersion;
    try {
        const response = await getJSON(RELEASE_API);
        const release = response.body;
        const asset = release && release.assets && release.assets.find(a => a.name.toLowerCase() === DIST_ZIP);
        assetUrl = asset && asset.browser_download_url;
        nightcordVersion = release && release.tag_name;
        if (!assetUrl) {
            throw new Error(`Asset '${DIST_ZIP}' not found in the latest release`);
        }
        progress.set(FETCH_RELEASE_PROGRESS);
    }
    catch (error) {
        log(`❌ Failed to query release API at ${RELEASE_API}`);
        log(`❌ ${error.message}`);
        throw error;
    }

    const tmpZip = path.join(remote.app.getPath("temp"), "nightcord-dist.zip");
    log(`Downloading Nightcord ${nightcordVersion} package...`);
    try {
        await downloadFileAsync(assetUrl, tmpZip, (percent, downloaded, total) => {
            const dlMB = (downloaded / (1024 * 1024)).toFixed(1);
            const totalMB = (total / (1024 * 1024)).toFixed(1);
            const overall = FETCH_RELEASE_PROGRESS + (percent * (DOWNLOAD_PACKAGE_PROGRESS - FETCH_RELEASE_PROGRESS) / 100);
            progress.set(overall);
            status.set(`Downloading Nightcord... (${dlMB}/${totalMB} MB)`);
        });
        log("✅ Package downloaded successfully");
        progress.set(DOWNLOAD_PACKAGE_PROGRESS);
    }
    catch (error) {
        log(`❌ Failed to download package from ${assetUrl}`);
        log(`❌ ${error.message}`);
        throw error;
    }

    lognewline("Extracting package...");
    try {
        try {
            await fs.rmdir(distDir, { recursive: true });
        } catch {
            try {
                await fs.rm ? await fs.rm(distDir, { recursive: true, force: true }) : null;
            } catch {}
        }
        await fs.mkdir(distDir, { recursive: true });
        
        // Native Windows Powershell Extraction
        execSync(`powershell.exe -NoProfile -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${distDir}' -Force"`);
        log("✅ Package extracted successfully");
        progress.set(EXTRACTION_PROGRESS);
        
        try { await fs.unlink(tmpZip); } catch {}
    }
    catch (error) {
        log("❌ Failed to extract package");
        log(`❌ ${error.message}`);
        throw error;
    }
}

async function injectShims(paths) {
    const progressPerLoop = (INJECT_SHIM_PROGRESS - progress.value) / paths.length;
    for (const discordPath of paths) {
        log(`Injecting into Discord at: ${discordPath}`);
        try {
            const resourcesPath = getResourcesPath(discordPath);
            const appDir = path.join(resourcesPath, "app");
            const backup = path.join(resourcesPath, "_app.asar");
            const appAsar = path.join(resourcesPath, "app.asar");
            const appBase = path.dirname(resourcesPath);

            log("1. Removing existing mod injection...");
            if (await exists(appDir)) {
                await fs.rmdir(appDir, { recursive: true });
            }

            if (await exists(appAsar)) {
                const stats = await fs.stat(appAsar);
                if (stats.size < 2000000) {
                    await fs.unlink(appAsar);
                }
            }

            const thirdPartyBackups = ["_app.asar", "original_app.asar", "app.asar.bak"];
            for (const bkName of thirdPartyBackups) {
                const bkPath = path.join(resourcesPath, bkName);
                if (await exists(bkPath)) {
                    const stats = await fs.stat(bkPath);
                    if (stats.size > 2000000) {
                        if (!(await exists(appAsar))) {
                            await fs.copyFile(bkPath, appAsar);
                            log(`Restored original app.asar from backup: ${bkName}`);
                        }
                        break;
                    }
                }
            }

            log("2. Cleaning up other client mod traces...");
            await cleanModulePatches(resourcesPath);

            log("3. Configuring Nightcord loader...");
            if (!(await exists(appAsar)) && !(await exists(backup))) {
                throw new Error("Critical error: no valid app.asar found. Please reinstall Discord.");
            }

            if (await exists(appAsar)) {
                if (await exists(backup)) await fs.unlink(backup);
                await fs.rename(appAsar, backup);
            }

            log("4. Creating app loader directory...");
            await fs.mkdir(appDir, { recursive: true });
            await fs.writeFile(path.join(appDir, "package.json"), JSON.stringify({ name: "nightcord", main: "index.js" }));

            const patcher = path.join(distDir, "patcher.js").replace(/\\/g, "/");
            const loaderCode = `// Nightcord Injector
"use strict";
const fs = require('fs');
const path = require('path');
const primary = ${JSON.stringify(patcher)};
const exeDir = path.dirname(process.execPath);
const fallback = path.join(exeDir, 'resources', 'dist', 'patcher.js');
const fallback2 = path.join(exeDir, 'dist', 'patcher.js');
const patcherPath = fs.existsSync(primary) ? primary : fs.existsSync(fallback) ? fallback : fallback2;
if (!fs.existsSync(patcherPath)) throw new Error('[Nightcord] patcher.js not found. Expected at: ' + primary);
require(patcherPath);
`;
            await fs.writeFile(path.join(appDir, "index.js"), loaderCode);

            log("5. Copying extra binaries (ffmpeg, node)...");
            const filesToCopy = ["ffmpeg.exe", "ffmpeg.dll", "node.exe", "yt-dlp.exe"];
            for (const f of filesToCopy) {
                const src = path.join(distDir, f);
                if (await exists(src)) {
                    await fs.copyFile(src, path.join(appBase, f));
                }
            }

            log("6. Copying assets directories...");
            const dirsToCopy = ["mac", "multi-instance-icons", "modules", "ghost-server"];
            for (const d of dirsToCopy) {
                const src = path.join(distDir, d);
                if (await exists(src)) {
                    await copyDirectory(src, path.join(appBase, d));
                }
            }

            log("7. Patching build_info.json...");
            const buildInfoPath = path.join(resourcesPath, "build_info.json");
            if (await exists(buildInfoPath)) {
                try {
                    const content = await fs.readFile(buildInfoPath, "utf-8");
                    if (!content.includes('"localModulesRoot"')) {
                        const idx = content.lastIndexOf('}');
                        if (idx !== -1) {
                            const patched = content.substring(0, idx) + ',\n  "localModulesRoot": "modules"\n' + content.substring(idx);
                            await fs.writeFile(buildInfoPath, patched);
                        }
                    }
                }
                catch (err) {
                    log(`⚠️ build_info patch error: ${err.message}`);
                }
            }

            log("✅ Injection successful!");
            progress.set(progress.value + progressPerLoop);
        }
        catch (err) {
            log(`❌ Could not inject into ${discordPath}`);
            log(`❌ ${err.message}`);
            return err;
        }
    }
}

export default async function(config) {
    await reset();
    const sane = doSanityCheck(config);
    if (!sane) return fail();

    const channels = Object.keys(config);
    const paths = Object.values(config);

    lognewline("Creating required directories...");
    try {
        await fs.mkdir(path.dirname(distDir), { recursive: true });
        progress.set(MAKE_DIR_PROGRESS);
        log("✅ Local AppData directory prepared");
    }
    catch (err) {
        log(`❌ Failed to create local directory: ${distDir}`);
        log(`❌ ${err.message}`);
        return fail();
    }

    lognewline("Downloading Nightcord package...");
    try {
        await downloadDist();
    }
    catch (err) {
        return fail();
    }

    lognewline("Injecting Nightcord shims...");
    const injectErr = await injectShims(paths);
    if (injectErr) return fail();
    progress.set(INJECT_SHIM_PROGRESS);

    lognewline("Restarting Discord...");
    const killErr = await kill(channels, (RESTART_DISCORD_PROGRESS - progress.value) / channels.length);
    if (killErr) showRestartNotice(); 
    else log("✅ Discord restarted");
    progress.set(RESTART_DISCORD_PROGRESS);

    succeed();
}
