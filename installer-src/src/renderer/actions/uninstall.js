import {promises as fs} from "fs";
import path from "path";

import {progress} from "../stores/installation";

import {log, lognewline} from "./utils/log";
import succeed from "./utils/succeed";
import fail from "./utils/fail";
import exists from "./utils/exists";
import reset from "./utils/reset";
import kill from "./utils/kill";
import {showRestartNotice} from "./utils/notices";
import doSanityCheck from "./utils/sanity";

const DELETE_SHIM_PROGRESS = 85;
const RESTART_DISCORD_PROGRESS = 100;

function getResourcesPath(discordCorePath) {
    let current = discordCorePath;
    for (let i = 0; i < 5; i++) {
        const resources = path.join(current, "resources");
        if (fs.exists ? fs.existsSync(resources) : true) {
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

async function deleteShims(paths) {
    const progressPerLoop = (DELETE_SHIM_PROGRESS - progress.value) / paths.length;
    for (const discordPath of paths) {
        log(`Removing Nightcord from: ${discordPath}`);
        try {
            const resourcesPath = getResourcesPath(discordPath);
            const appDir = path.join(resourcesPath, "app");
            const backup = path.join(resourcesPath, "_app.asar");
            const appAsar = path.join(resourcesPath, "app.asar");
            const appBase = path.dirname(resourcesPath);

            log("1. Removing loader directory...");
            if (await exists(appDir)) {
                const pkgPath = path.join(appDir, "package.json");
                if (await exists(pkgPath)) {
                    const pkgContent = await fs.readFile(pkgPath, "utf-8");
                    if (pkgContent.includes('"nightcord"')) {
                        await fs.rmdir(appDir, { recursive: true });
                        log("✅ App loader directory deleted");
                    }
                }
            }

            log("2. Restoring original app.asar...");
            if (await exists(appAsar)) {
                const stats = await fs.stat(appAsar);
                if (stats.size < 1000000) {
                    await fs.unlink(appAsar);
                }
            }

            if (await exists(backup)) {
                if (!(await exists(appAsar))) {
                    await fs.rename(backup, appAsar);
                    log("✅ Original app.asar restored from backup");
                } else {
                    await fs.unlink(backup);
                    log("✅ Backup _app.asar removed (original already active)");
                }
            }

            log("3. Restoring build_info.json...");
            const buildInfoPath = path.join(resourcesPath, "build_info.json");
            if (await exists(buildInfoPath)) {
                try {
                    let content = await fs.readFile(buildInfoPath, "utf-8");
                    if (content.includes('"localModulesRoot"')) {
                        content = content.replace(/,\s*"localModulesRoot"\s*:\s*"modules"\s*/g, "");
                        await fs.writeFile(buildInfoPath, content);
                        log("✅ Removed localModulesRoot from build_info.json");
                    }
                }
                catch (err) {
                    log(`⚠️ build_info patch removal error: ${err.message}`);
                }
            }

            log("4. Cleaning copied binaries...");
            const filesToClean = ["node.exe", "yt-dlp.exe", "ffmpeg.exe", "ffmpeg.dll"];
            for (const f of filesToClean) {
                const p = path.join(appBase, f);
                if (await exists(p)) {
                    await fs.unlink(p);
                }
            }

            log("5. Cleaning asset directories...");
            const dirsToClean = ["mac", "multi-instance-icons", "ghost-server", "modules"];
            for (const d of dirsToClean) {
                const p = path.join(appBase, d);
                if (await exists(p)) {
                    await fs.rmdir(p, { recursive: true });
                }
            }

            log("✅ Uninjection complete!");
            progress.set(progress.value + progressPerLoop);
        }
        catch (err) {
            log(`❌ Could not remove Nightcord from ${discordPath}`);
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

    lognewline("Deleting Nightcord loader and restoring files...");
    const deleteErr = await deleteShims(paths);
    if (deleteErr) return fail();
    progress.set(DELETE_SHIM_PROGRESS);

    lognewline("Killing Discord...");
    const killErr = await kill(channels, (RESTART_DISCORD_PROGRESS - progress.value) / channels.length);
    if (killErr) showRestartNotice(); 
    else log("✅ Discord restarted");
    progress.set(RESTART_DISCORD_PROGRESS);

    succeed();
}