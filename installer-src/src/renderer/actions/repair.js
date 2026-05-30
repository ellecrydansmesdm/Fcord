import {progress} from "../stores/installation";
import {remote} from "electron";
import {promises as fs} from "fs";
import path from "path";
import install from "./install.js";
import {log, lognewline} from "./utils/log";
import succeed from "./utils/succeed";
import fail from "./utils/fail";
import exists from "./utils/exists";
import kill from "./utils/kill";
import reset from "./utils/reset";
import {showKillNotice} from "./utils/notices";
import doSanityCheck from "./utils/sanity";

const KILL_DISCORD_PROGRESS = 20;
const DELETE_SHIM_PROGRESS = 80;
const COMPLETION_PROGRESS = 100;

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
        log(`Removing Nightcord loader from: ${discordPath}`);
        try {
            const resourcesPath = getResourcesPath(discordPath);
            const appDir = path.join(resourcesPath, "app");
            const backup = path.join(resourcesPath, "_app.asar");
            const appAsar = path.join(resourcesPath, "app.asar");
            const appBase = path.dirname(resourcesPath);

            if (await exists(appDir)) {
                const pkgPath = path.join(appDir, "package.json");
                if (await exists(pkgPath)) {
                    const pkgContent = await fs.readFile(pkgPath, "utf-8");
                    if (pkgContent.includes('"nightcord"')) {
                        await fs.rmdir(appDir, { recursive: true });
                    }
                }
            }

            if (await exists(appAsar)) {
                const stats = await fs.stat(appAsar);
                if (stats.size < 1000000) {
                    await fs.unlink(appAsar);
                }
            }

            if (await exists(backup)) {
                if (!(await exists(appAsar))) {
                    await fs.rename(backup, appAsar);
                } else {
                    await fs.unlink(backup);
                }
            }

            const buildInfoPath = path.join(resourcesPath, "build_info.json");
            if (await exists(buildInfoPath)) {
                try {
                    let content = await fs.readFile(buildInfoPath, "utf-8");
                    if (content.includes('"localModulesRoot"')) {
                        content = content.replace(/,\s*"localModulesRoot"\s*:\s*"modules"\s*/g, "");
                        await fs.writeFile(buildInfoPath, content);
                    }
                } catch {}
            }

            const filesToClean = ["node.exe", "yt-dlp.exe", "ffmpeg.exe", "ffmpeg.dll"];
            for (const f of filesToClean) {
                const p = path.join(appBase, f);
                if (await exists(p)) await fs.unlink(p);
            }

            const dirsToClean = ["mac", "multi-instance-icons", "ghost-server", "modules"];
            for (const d of dirsToClean) {
                const p = path.join(appBase, d);
                if (await exists(p)) await fs.rmdir(p, { recursive: true });
            }

            log("✅ Cleaned files successfully");
            progress.set(progress.value + progressPerLoop);
        }
        catch (err) {
            log(`❌ Could not clear files in ${discordPath}`);
            log(`❌ ${err.message}`);
            return err;
        }
    }
}

async function showInstallNotice(config) {
    const confirmation = await remote.dialog.showMessageBox(remote.BrowserWindow.getFocusedWindow(), {
        type: "question",
        title: "Reinstall Nightcord?",
        message: "After repairing, you need to reinstall Nightcord. Would you like to do that now?",
        noLink: true,
        cancelId: 1,
        buttons: ["Yes", "No"]
    });

    if (confirmation.response !== 0) return succeed();

    await reset();
    await install(config);
    remote.dialog.showMessageBox(remote.BrowserWindow.getFocusedWindow(), {
        type: "info",
        title: "Reinstall Complete",
        message: "Please relaunch Discord manually to finish the repair."
    });
}

export default async function(config) {
    await reset();
    const sane = doSanityCheck(config);
    if (!sane) return fail();

    const channels = Object.keys(config);
    const paths = Object.values(config);

    lognewline("Killing Discord processes...");
    const killErr = await kill(channels, (KILL_DISCORD_PROGRESS - progress.value) / channels.length, false);
    if (killErr) {
        showKillNotice();
        return fail();
    }
    log("✅ Discord Killed");
    progress.set(KILL_DISCORD_PROGRESS);

    await new Promise(r => setTimeout(r, 200));
    lognewline("Clearing loader and corrupted files...");
    const deleteShimErr = await deleteShims(paths);
    if (deleteShimErr) return fail();
    log("✅ Cleanup completed");
    progress.set(DELETE_SHIM_PROGRESS);
    
    await new Promise(r => setTimeout(r, 200));
    progress.set(COMPLETION_PROGRESS);

    showInstallNotice(config);
}