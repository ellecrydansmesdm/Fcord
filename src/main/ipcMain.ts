/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./updater";
import "./ipcPlugins";
import "./settings";

import { debounce } from "@shared/debounce";
import { IpcEvents } from "@shared/IpcEvents";
import { app, BrowserWindow, desktopCapturer, dialog, ipcMain, nativeTheme, screen, shell, systemPreferences } from "electron";
import monacoHtml from "file://monacoWin.html?minify&base64";
import { FSWatcher, mkdirSync, readFileSync, watch, writeFileSync } from "fs";
import { open, readdir, readFile, unlink } from "fs/promises";
import { join, normalize } from "path";
import {domain} from "../../DOMAIN.json";

import { registerCspIpcHandlers } from "./csp/manager";
import { ALLOWED_PROTOCOLS, DATA_DIR, QUICK_CSS_PATH, SETTINGS_DIR, THEMES_DIR } from "./utils/constants";
import { makeLinksOpenExternally } from "./utils/externalLinks";

const RENDERER_CSS_PATH = join(__dirname, "renderer.css");
const USERPLUGINS_DIR = join(DATA_DIR, "userplugins");

mkdirSync(THEMES_DIR, { recursive: true });
mkdirSync(USERPLUGINS_DIR, { recursive: true });

registerCspIpcHandlers();

export function ensureSafePath(basePath: string, path: string) {
    const normalizedBasePath = normalize(basePath + "/");
    const newPath = join(basePath, path);
    const normalizedPath = normalize(newPath);
    const base = normalizedBasePath.toLowerCase();
    const target = normalizedPath.toLowerCase();
    return target.startsWith(base) ? normalizedPath : null;
}

export function validateSender(event: any): boolean {
    if (!event || !event.sender) return false;
    const frame = event.senderFrame;
    if (!frame) return false;
    const url = frame.url;
    if (!url) return false;

    if (url.startsWith("file://")) {
        const normalizedPath = normalize(url.replace("file://", ""));
        const appPath = normalize(app.getAppPath());
        return normalizedPath.startsWith(appPath);
    }

    if (url.startsWith("data:")) return false;

    try {
        const parsed = new URL(url);
        if (parsed.protocol === "https:") {
            const host = parsed.hostname.toLowerCase();
            return host === "discord.com" || host.endsWith(".discord.com") || host === "discordapp.com" || host.endsWith(".discordapp.com");
        }
    } catch {}
    return false;
}

function verifySignature(filePath: string): Promise<boolean> {
    if (process.platform !== "win32") return Promise.resolve(true);
    const { execFile } = require("child_process");
    return new Promise<boolean>((resolve) => {
        execFile("powershell.exe", [
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            `(Get-AuthenticodeSignature -FilePath '${filePath.replace(/'/g, "''")}').Status`
        ], (error: any, stdout: string) => {
            if (error) {
                resolve(false);
                return;
            }
            resolve(stdout.trim() === "Valid");
        });
    });
}

function readCss() {
    return readFile(QUICK_CSS_PATH, "utf-8").catch(() => "");
}

async function listThemes(): Promise<{ fileName: string; content: string; }[]> {
    try {
        const files = await readdir(THEMES_DIR);
        return await Promise.all(files.map(async fileName => ({ fileName, content: await getThemeData(fileName) })));
    } catch {
        return [];
    }
}

function getThemeData(fileName: string) {
    fileName = fileName.replace(/\?v=\d+$/, "");
    const safePath = ensureSafePath(THEMES_DIR, fileName);
    if (!safePath) return Promise.reject(`Unsafe path ${fileName}`);
    return readFile(safePath, "utf-8");
}

ipcMain.handle(IpcEvents.WORLD_BOMB_TYPE, async (event, text: string, delay: number = 50) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    if (process.platform !== "win32") return;
    const { spawn } = require("child_process");
    const { writeFileSync, unlinkSync, mkdtempSync, rmSync } = require("fs");
    const { join } = require("path");
    const { tmpdir } = require("os");

    if (!/^[\x20-\x7E]*$/.test(text)) {
        throw new Error("WorldBombType: disallowed characters");
    }
    const safeDelay = Math.max(0, Math.min(10000, delay));

    const psLines = [
        "Add-Type -AssemblyName System.WindowsForms;",
        "$text = $args[0];",
        "$delay = [int]$args[1];",
        "foreach ($char in $text.ToCharArray()) {",
        "  [System.Windows.Forms.SendKeys]::SendWait($char);",
        "  if ($delay -gt 0) { Start-Sleep -m $delay; }",
        "}",
    ];
    const psScript = psLines.join("\r\n");
    const tempDir = mkdtempSync(join(tmpdir(), "nightcord-wb-"));
    const tempFile = join(tempDir, "sendkeys.ps1");
    try {
        writeFileSync(tempFile, "\uFEFF" + psScript, "utf8");
        const child = spawn("powershell", [
            "-NoProfile", "-ExecutionPolicy", "Bypass",
            "-File", tempFile, text, String(safeDelay)
        ]);
        await new Promise<void>((resolve, reject) => {
            child.on("error", reject);
            child.on("exit", code => {
                if (code === 0) resolve();
                else reject(new Error(`PowerShell exit code ${code}`));
            });
        });
    } finally {
        try { unlinkSync(tempFile); } catch {}
        try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
});

function runPowershellScript(psScript: string): Promise<void> {
    if (process.platform !== "win32") return Promise.resolve();
    const { spawn } = require("child_process");
    const { writeFileSync, unlinkSync, mkdtempSync, rmSync } = require("fs");
    const { join } = require("path");
    const { tmpdir } = require("os");
    const tempDir = mkdtempSync(join(tmpdir(), "nightcord-ps-"));
    const tempFile = join(tempDir, "script.ps1");
    return new Promise<void>((resolve, reject) => {
        try {
            writeFileSync(tempFile, "\uFEFF" + psScript, "utf8");
            const child = spawn("powershell", [
                "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-File", tempFile
            ]);
            child.on("error", reject);
            child.on("exit", code => {
                try { unlinkSync(tempFile); } catch {}
try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
                if (code === 0) resolve();
                else reject(new Error(`PowerShell exit code ${code}`));
            });
        } catch (e) {
            try { unlinkSync(tempFile); } catch {}
            try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
            reject(e);
        }
    });
}

ipcMain.handle(IpcEvents.WORLD_BOMB_PRESS_ENTER, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return runPowershellScript(`
        $sig = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
        Add-Type -MemberDefinition $sig -Name WinAPI -Namespace NC -ErrorAction SilentlyContinue
        [NC.WinAPI]::keybd_event(0x0D, 0x1C, 0, [UIntPtr]::Zero)
        Start-Sleep -Milliseconds 20
        [NC.WinAPI]::keybd_event(0x0D, 0x1C, 2, [UIntPtr]::Zero)
    `);
});

ipcMain.handle(IpcEvents.WORLD_BOMB_PRESS_BACKSPACE, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return runPowershellScript("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}')");
});

ipcMain.handle(IpcEvents.WORLD_BOMB_CLICK, (event, x: number, y: number) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    const safeX = Math.max(0, Math.min(99999, Math.round(x)));
    const safeY = Math.max(0, Math.min(99999, Math.round(y)));
    return runPowershellScript(`
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name "Win32" -Namespace Win32 -PassThru | Out-Null;
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${safeX}, ${safeY});
        [Win32.Win32]::mouse_event(0x0002, 0, 0, 0, 0);
        [Win32.Win32]::mouse_event(0x0004, 0, 0, 0, 0);
    `);
});

ipcMain.handle(IpcEvents.WORLD_BOMB_SEQUENCE, async (
    event,
    word: string,
    lps: number,
    humanChance: number,
    targetX: number = -1,
    targetY: number = -1
) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    if (process.platform !== "win32") return;
    const { spawn } = require("child_process");
    const { writeFileSync, unlinkSync, mkdtempSync, rmSync } = require("fs");
    const { join } = require("path");
    const { tmpdir } = require("os");

    if (!/^[\x20-\x7E]+$/.test(word)) {
        throw new Error("WorldBombSequence: disallowed characters");
    }
    const safeLps = Math.max(1, Math.min(100, lps));
    const safeHumanChance = Math.max(0, Math.min(100, humanChance));

    const win = BrowserWindow.fromWebContents(event.sender);
    const bounds = win?.getBounds() ?? { x: 0, y: 0, width: 1280, height: 720 };
    const centerX = targetX >= 0 ? Math.round(targetX) : Math.round(bounds.x + bounds.width / 2);
    const centerY = targetY >= 0 ? Math.round(targetY) : Math.round(bounds.y + bounds.height / 2);

    const minMs = Math.max(10, Math.round(1000 / (safeLps * 1.5)));
    const maxMs = Math.max(minMs + 1, Math.round(1000 / safeLps));
    const baseMs = Math.round((minMs + maxMs) / 2);

    const lines: string[] = [
        "$ErrorActionPreference = \"Stop\"",
        "try {",
        "  Add-Type -AssemblyName System.Windows.Forms",
        "  Add-Type -AssemblyName System.Drawing",
        "  $sig = '[DllImport(\"user32.dll\")] public static extern void mouse_event(uint a, uint b, uint c, uint d, uint e); [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport(\"user32.dll\")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'",
        "  Add-Type -MemberDefinition $sig -Name WinAPI -Namespace NC -ErrorAction SilentlyContinue",
        "  $handle = [IntPtr]::Zero",
        `  $proc = Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue`,
        "  if ($proc) { $handle = $proc.MainWindowHandle }",
        "  if ($handle -ne [IntPtr]::Zero) {",
        "    [NC.WinAPI]::SetForegroundWindow($handle) | Out-Null",
        "    Start-Sleep -Milliseconds 10",
        "  }",
        `  [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${centerX}, ${centerY})`,
        "  [NC.WinAPI]::mouse_event(2, 0, 0, 0, 0)",
        "  [NC.WinAPI]::mouse_event(4, 0, 0, 0, 0)",
        "  Start-Sleep -Milliseconds 10",
    ];

    for (const char of word) {
        if (safeHumanChance > 0) {
            lines.push(`  if ((Get-Random -Minimum 1 -Maximum 101) -le ${safeHumanChance}) {`);
            lines.push("    [System.Windows.Forms.SendKeys]::SendWait('x')");
            lines.push(`    Start-Sleep -Milliseconds ${baseMs}`);
            lines.push("    [System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}')");
            lines.push(`    Start-Sleep -Milliseconds ${baseMs}`);
            lines.push("  }");
        }
        lines.push(`  [System.Windows.Forms.SendKeys]::SendWait('${char.replace(/'/g, "''")}')`);
        lines.push(`  Start-Sleep -Milliseconds (Get-Random -Minimum ${minMs} -Maximum ${maxMs})`);
    }

    lines.push("  [NC.WinAPI]::keybd_event(0x0D, 0x1C, 0, [UIntPtr]::Zero)");
    lines.push("  Start-Sleep -Milliseconds 20");
    lines.push("  [NC.WinAPI]::keybd_event(0x0D, 0x1C, 2, [UIntPtr]::Zero)");
    lines.push("} catch { exit 1 }");

    const psScript = lines.join("\r\n");
    const tempDir = mkdtempSync(join(tmpdir(), "nightcord-wbs-"));
    const tempFile = join(tempDir, "sequence.ps1");
    try {
        writeFileSync(tempFile, "\uFEFF" + psScript, "utf8");
        await new Promise<void>((resolve, reject) => {
            const child = spawn("powershell.exe", [
                "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-File", tempFile
            ]);
            child.on("error", reject);
            child.on("exit", code => {
                if (code === 0) resolve();
                else reject(new Error(`PowerShell exit code ${code}`));
            });
        });
    } finally {
        try { unlinkSync(tempFile); } catch {}
        try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
});
ipcMain.handle(IpcEvents.WORLD_BOMB_GET_CURSOR_POS, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return screen.getCursorScreenPoint();
});

let streamProofWindow: BrowserWindow | null = null;
ipcMain.handle(IpcEvents.WORLD_BOMB_OPEN_WINDOW, (event, lps: number = 50, humanChance: number = 10, safeMode: boolean = false, theme: string = "", playMode: string = "Normal", noSpace: boolean = false, groqKey: string = "") => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    if (streamProofWindow) {
        streamProofWindow.focus();
        return;
    }

    streamProofWindow = new BrowserWindow({
        width: 332,
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, "worldbomb-preload.js"),
            sandbox: false
        }
    });

    try {
        streamProofWindow.setContentProtection(true);
    } catch (e) {
        console.error("setContentProtection error:", e);
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { margin: 0; padding: 16px; background: transparent; overflow: hidden; font-family: sans-serif; }
.nc-wb-overlay { background: #1f2937; color: white; border-radius: 16px; padding: 16px; width: 300px; box-sizing: border-box; box-shadow: 0 10px 25px rgba(0,0,0,0.5); user-select: none; border: 1px solid #374151; }
.nc-wb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; -webkit-app-region: drag; }
.nc-wb-close { cursor: pointer; opacity: 0.7; -webkit-app-region: no-drag; padding: 4px; }
.nc-wb-close:hover { color: #ef4444; opacity: 1; }
.nc-wb-alphabet { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; margin-bottom: 15px; }
.nc-wb-letter { font-size: 10px; text-align: center; opacity: 0.8; }
.nc-wb-input { width: 100%; padding: 8px; border-radius: 8px; border: none; background: #374151; color: white; box-sizing: border-box; outline: none; }
.nc-wb-input:focus { box-shadow: 0 0 0 2px #7c3aed; }
.nc-wb-button { padding: 10px; background: #7c3aed; border: none; border-radius: 8px; color: white; cursor: pointer; width: 100%; font-weight: bold; }
.nc-wb-button:hover { background: #6d28d9; }
</style>
</head>
<body>
<div class="nc-wb-overlay">
    <div class="nc-wb-header" id="drag-header">
        <h3 style="margin: 0; font-size: 16px;">🎯 WorldBomb Helper</h3>
        <div class="nc-wb-close" id="btn-close">✕</div>
    </div>
    <div class="nc-wb-content">
        <div id="alphabet"></div>
        <div style="display: flex; gap: 8px;">
            <input type="text" id="syllable" placeholder="Syllabe..." autofocus autocomplete="off" spellcheck="false" />
            <button id="btn-find">FIND</button>
        </div>
        <div id="status">Loading...</div>
        <div id="definition-container" style="display: none; margin-top: 10px; font-size: 11px; color: #d1d5db; font-style: italic; background: #374151; padding: 8px; border-radius: 8px; max-height: 80px; overflow-y: auto;">
            <strong style="color: #60a5fa">Definition:</strong> <span id="definition-text"></span>
        </div>
    </div>
</div>
<script>
    let dictionary = [];
    let history = [];
    let badWords = new Set();
    let themeWords = new Set();
    const lps = ${lps};
    const humanChance = ${humanChance};
    const safeMode = ${safeMode};
    const theme = "${theme}";
    const playMode = "${playMode}";
    const noSpace = ${noSpace};
    const groqKey = "${groqKey}";
    
    const dictUrls = [
        "https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json",
        "https://raw.githubusercontent.com/kkrypt0nn/wordlists/refs/heads/main/wordlists/languages/french.txt",
        "https://raw.githubusercontent.com/Taknok/French-Wordlist/refs/heads/master/francais.txt",
        "https://raw.githubusercontent.com/hbenbel/French-Dictionary/refs/heads/master/dictionary/dictionary.csv"
    ];
    

    Promise.all(dictUrls.map(url => fetch(url).then(async res => {
        if (!res.ok) return [];
        if (url.endsWith('.json')) return await res.json();
        const text = await res.text();
        return text.split(/[\r\n]+/).filter(w => w.length > 0);
    }).catch(() => [])))
        .then(results => {
            const allWords = results.flat();
            dictionary = Array.from(new Set(allWords.map(w => w.toLowerCase())))
                .filter(w => /^[a-zœæéèêëàâäîïôöùûüç]+$/i.test(w));
            document.getElementById('status').innerText = "Ready (" + dictionary.length + " words)";
        }).catch(err => {
            document.getElementById('status').innerText = "Network error";
            document.getElementById('status').style.color = "#ef4444";
        });

    if (theme.trim().length > 0) {
        fetch("https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(theme) + "&utf8=&format=json&srlimit=1")
            .then(r => r.json())
            .then(d => {
                if (d.query && d.query.search && d.query.search[0] && d.query.search[0].pageid) {
                    const pageId = d.query.search[0].pageid;
                    return fetch("https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&pageids=" + pageId + "&format=json");
                }
                throw new Error("No page");
            })
            .then(r => r.json())
            .then(d => {
                const pages = d.query && d.query.pages;
                if (pages) {
                    const textObj = Object.values(pages)[0];
                    if (textObj && textObj.extract) {
                        const words = textObj.extract.toLowerCase().match(/[a-zàâçéèêëîïôûùüÿñæœ]+/g) || [];
                        words.forEach(w => {
                            if (w.length > 3) themeWords.add(w);
                        });
                        if (themeWords.size > 0) {
                            const st = document.getElementById('status');
                            st.innerText = st.innerText + " (+ Theme)";
                        }
                    }
                }
            }).catch(e => console.error("Theme fetch error:", e));
    }

    const alphabetEl = document.getElementById('alphabet');
    const letters = "abcdefghijklmnopqrstuvwxyz-".split("");
    function renderAlphabet() {
        alphabetEl.innerHTML = "";
        const missing = getMissingAlphabet();
        letters.forEach(l => {
            const span = document.createElement('span');
            span.className = 'nc-wb-letter';
            span.innerText = l.toUpperCase();
            if (missing.includes(l)) {
                span.style.color = '#ef4444';
                span.style.fontWeight = 'bold';
                span.style.opacity = '1';
            }
            alphabetEl.appendChild(span);
        });
    }

    function getMissingAlphabet() {
        if (history.length === 0) return letters;
        return history[history.length - 1].alphabet;
    }

    renderAlphabet();

    function computeScore(word, currentMissing) {
        let score = 0;
        let found = new Set();
        for (let char of word) {
            if (currentMissing.includes(char) && !found.has(char)) {
                score++;
                found.add(char);
            }
        }
        if (themeWords.has(word)) {
            score += 100;
        }
        if (playMode === "Pro") {
            score += word.length;
        } else if (playMode === "Noob") {
            score -= word.length;
        }
        return score;
    }

    function processSearch() {
        const syl = document.getElementById('syllable').value.toLowerCase().trim();
        if (!syl || dictionary.length === 0) return;
        
        let validWords = dictionary.filter(w => {
            const low = w.toLowerCase();
            if (!low.includes(syl)) return false;
            if (badWords.has(low)) return false;
            if (noSpace && (low.includes(' ') || low.includes('-'))) return false;
            if (playMode === "Pro" && low.length < 13) return false;
            if (playMode === "Noob" && low.length > 7) return false;
            return true;
        });
        if (validWords.length === 0) {
            document.getElementById('status').innerText = "No word found!";
            document.getElementById('status').style.color = "#ef4444";
            return;
        }

        const currentMissing = getMissingAlphabet();
        validWords.sort((a, b) => computeScore(b, currentMissing) - computeScore(a, currentMissing));
        
        const bestWord = validWords[0];
        document.getElementById('status').innerText = "Typing: " + bestWord + "...";
        document.getElementById('status').style.color = "#10b981";
        
        let newMissing = currentMissing.filter(c => !bestWord.includes(c));
        if (newMissing.length === 0) newMissing = letters;
        history.push({ alphabet: newMissing, word: bestWord });
        badWords.add(bestWord);
        renderAlphabet();
        
        document.getElementById('syllable').value = "";
        document.body.style.pointerEvents = "none";
        
        if (safeMode) {
            const defContainer = document.getElementById('definition-container');
            const defText = document.getElementById('definition-text');
            defContainer.style.display = 'block';
            defText.innerText = 'Generating AI definition...';
            
            if (!groqKey) {
                defText.innerText = "Error: Groq API key not found.";
            } else {
                fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + groqKey,
                    },
                    body: JSON.stringify({
                        model: "llama-3.1-8b-instant",
                        temperature: 0.7,
                        max_tokens: 150,
                        messages: [{
                            role: "user",
                            content: 'Give a very short definition (1 simple sentence) for the following word, explaining what it is concretely, without stating its part of speech. Word: "' + bestWord + '"'
                        }]
                    }),
                })
                .then(r => r.json())
                .then(data => {
                    const ans = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                    if (ans) {
                        defText.innerText = ans.trim();
                    } else {
                        defText.innerText = "AI could not define this word.";
                    }
                })
                .catch(() => defText.innerText = "Network error.");
            }
        }
        

        window.worldBombAPI.sequence(bestWord, lps, humanChance)
            .then(() => {
                document.getElementById('status').innerText = "Ready!";
            })
            .catch(err => {
                document.getElementById('status').innerText = "Input error";
                document.getElementById('status').style.color = "#ef4444";
            })
            .finally(() => {
                document.body.style.pointerEvents = "auto";
                setTimeout(() => document.getElementById('syllable').focus(), 50);
            });
    }

    document.getElementById('btn-find').onclick = processSearch;
    document.getElementById('syllable').onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            processSearch();
        }
    };
</script>
</body>
</html>
    `;

    try {
        const { writeFileSync } = require("fs");
        const { join } = require("path");
        const { DATA_DIR } = require("./utils/constants");
        const htmlPath = join(DATA_DIR, "worldbomb.html");
        writeFileSync(htmlPath, htmlContent, "utf-8");
        streamProofWindow.loadFile(htmlPath);
    } catch (e) {

        streamProofWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));
    }

    streamProofWindow.on("closed", () => {
        streamProofWindow = null;
    });
});
ipcMain.handle(IpcEvents.OPEN_QUICKCSS, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return shell.openPath(QUICK_CSS_PATH);
});

ipcMain.handle(IpcEvents.OPEN_EXTERNAL, (event, url) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    try {
        var { protocol } = new URL(url);
    } catch {
        throw "Malformed URL";
    }
    if (!ALLOWED_PROTOCOLS.includes(protocol))
        throw "Disallowed protocol.";

    shell.openExternal(url);
});

ipcMain.handle(IpcEvents.GET_QUICK_CSS, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return readCss();
});
ipcMain.handle(IpcEvents.SET_QUICK_CSS, (event, css) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return writeFileSync(QUICK_CSS_PATH, css);
});

ipcMain.handle(IpcEvents.GET_THEMES_DIR, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return THEMES_DIR;
});
ipcMain.handle(IpcEvents.GET_THEMES_LIST, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return listThemes();
});
ipcMain.handle(IpcEvents.GET_THEME_DATA, (event, fileName) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return getThemeData(fileName);
});
ipcMain.handle(IpcEvents.DELETE_THEME, (event, fileName) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    const safePath = ensureSafePath(THEMES_DIR, fileName);
    if (!safePath) return Promise.reject(`Unsafe path ${fileName}`);
    return unlink(safePath);
});
ipcMain.handle(IpcEvents.GET_THEME_SYSTEM_VALUES, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    let accentColor = systemPreferences.getAccentColor?.() ?? "";

    if (accentColor.length && accentColor[0] !== "#") {
        accentColor = `#${accentColor}`;
    }

    return {
        "os-accent-color": accentColor
    };
});

ipcMain.handle(IpcEvents.OPEN_THEMES_FOLDER, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return shell.openPath(THEMES_DIR);
});
ipcMain.handle(IpcEvents.OPEN_SETTINGS_FOLDER, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return shell.openPath(SETTINGS_DIR);
});

ipcMain.handle(IpcEvents.INIT_FILE_WATCHERS, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    const { sender } = event;
    let quickCssWatcher: FSWatcher | undefined;
    let rendererCssWatcher: FSWatcher | undefined;

    open(QUICK_CSS_PATH, "a+").then(fd => {
        fd.close();
        quickCssWatcher = watch(QUICK_CSS_PATH, { persistent: false }, debounce(async () => {
            sender.postMessage(IpcEvents.QUICK_CSS_UPDATE, await readCss());
        }, 50));
    }).catch(() => { });

    const themesWatcher = watch(THEMES_DIR, { persistent: false }, debounce(() => {
        sender.postMessage(IpcEvents.THEME_UPDATE, void 0);
    }));

    if (IS_DEV) {
        rendererCssWatcher = watch(RENDERER_CSS_PATH, { persistent: false }, async () => {
            sender.postMessage(IpcEvents.RENDERER_CSS_UPDATE, await readFile(RENDERER_CSS_PATH, "utf-8"));
        });
    }

    sender.once("destroyed", () => {
        quickCssWatcher?.close();
        themesWatcher.close();
        rendererCssWatcher?.close();
    });
});

ipcMain.on(IpcEvents.GET_MONACO_THEME, e => {
    e.returnValue = nativeTheme.shouldUseDarkColors ? "vs-dark" : "vs-light";
});

ipcMain.handle(IpcEvents.GET_DESKTOP_SOURCES, async (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    try {
        const sources = await desktopCapturer.getSources({
            types: ["screen"],
            thumbnailSize: { width: 1, height: 1 }
        });
        return sources.map(s => ({ id: s.id, name: s.name }));
    } catch {
        return [];
    }
});

let monacoWin: BrowserWindow | null = null;

ipcMain.handle(IpcEvents.OPEN_MONACO_EDITOR, async (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    if (monacoWin && !monacoWin.isDestroyed()) {
        monacoWin.show();
        monacoWin.focus();
        return;
    }

    monacoWin = new BrowserWindow({
        title: "Nightcord QuickCSS Editor",
        autoHideMenuBar: true,
        darkTheme: true,
        webPreferences: {
            preload: join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    monacoWin.once("closed", () => { monacoWin = null; });

    monacoWin.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": ["default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval';"]
            }
        });
    });

    makeLinksOpenExternally(monacoWin);

    await monacoWin.loadURL(`data:text/html;base64,${monacoHtml}`);
});

app.on("before-quit", async event => {
    if (monacoWin && !monacoWin.isDestroyed() && !monacoWin.isVisible()) {
        const result = await dialog.showMessageBox({
            type: "question",
            buttons: ["Cancel", "Close Anyway"],
            defaultId: 0,
            title: "QuickCSS Editor Open",
            message: "QuickCSS editor is still open in the background.",
            detail: "Do you want to close Discord anyway? This will also close the QuickCSS editor."
        });

        if (result.response === 1) {
            app.exit();
        }
    }
});

ipcMain.handle(IpcEvents.GET_RENDERER_CSS, (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    return readFile(RENDERER_CSS_PATH, "utf-8");
});

ipcMain.handle(IpcEvents.SET_WINDOW_BACKGROUND_MATERIAL, (event, material: "none" | "acrylic" | "mica" | "tabbed") => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    try {

        const canSetMaterial = typeof win.setBackgroundMaterial === "function";

        const canSetVibrancy = typeof win.setVibrancy === "function";

        if (material === "none") {
            win.setBackgroundColor("#36393f");
            if (canSetMaterial) {

                win.setBackgroundMaterial("none");
            }
            if (canSetVibrancy) {

                win.setVibrancy(null);
            }
        } else {
            win.setBackgroundColor("#00000000");
            if (canSetMaterial) {

                win.setBackgroundMaterial(material);
            } else if (canSetVibrancy) {

                win.setVibrancy((material === "acrylic" ? "acrylic" : "under-window") as any);
            }
        }
    } catch (e) {
        console.error("[CreateTheme] setBackgroundMaterial failed:", e);
    }
});

const THUMBAR_ICONS = {
    prev: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAY0lEQVR4nGNgGLngPxIgRy+MzUKpI9DFmKhpGAMDGS4kFCQkuZCY8CXKhaREFEEXkhrrOF1ITvJhYMDjQkYooJqByAZT1UCYocQaTFKyIcZQknMKIdeSnfXIiTCiAblJbGAAADXRMBdqfKdTAAAAAElFTkSuQmCC",
    next: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAZklEQVR4nOXUMQrAMAxDUbXk/ld2lwoMwbGcein5YxMeylLg7MzMqvcZv93Rpd1RE+jhVpBoFV6CHm4FiSqwDHp4dT6qYIaWFwLA9dYCRhCTn5xBTFqoYkCysAKxcOEONvXlp/CfHp4sPAHr7DkEAAAAAElFTkSuQmCC",
    play: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAXElEQVR4nO3UsQoAIAhFUY3+/5dtCiTS9NnQ0N0cOohDRD8Rkcr7ZqEovAUrsAsicAjU8FVwoh6cBk8wDFpwr4LMzHqGwRWCQQuapW54woiCG0agEJiBzKq/zfsN8Hg8AZZiLwgAAAAASUVORK5CYII=",
    pause: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAKklEQVR4nGNgGHGAEV3g/////1EUMDIykiLPRE3XjRo4auCogcPHwBEIAFPvCBxAwtPtAAAAAElFTkSuQmCC",
};

ipcMain.handle(IpcEvents.SET_THUMBAR_BUTTONS, (event, state: "playing" | "paused" | "stopped") => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || process.platform !== "win32") return;

    const { nativeImage } = require("electron");

    if (state === "stopped") {
        win.setThumbarButtons([]);
        return;
    }

    const prevIcon = nativeImage.createFromDataURL(`data:image/png;base64,${THUMBAR_ICONS.prev}`);
    const nextIcon = nativeImage.createFromDataURL(`data:image/png;base64,${THUMBAR_ICONS.next}`);
    const midIcon = nativeImage.createFromDataURL(`data:image/png;base64,${state === "playing" ? THUMBAR_ICONS.pause : THUMBAR_ICONS.play}`);
    const midTip = state === "playing" ? "Pause" : "Play";
    const midAction = state === "playing" ? "pause" : "play";

    win.setThumbarButtons([
        {
            tooltip: "Previous",
            icon: prevIcon,
            click() { event.sender.send(IpcEvents.THUMBAR_BUTTON_CLICK, "prev"); }
        },
        {
            tooltip: midTip,
            icon: midIcon,
            click() { event.sender.send(IpcEvents.THUMBAR_BUTTON_CLICK, midAction); }
        },
        {
            tooltip: "Next",
            icon: nextIcon,
            click() { event.sender.send(IpcEvents.THUMBAR_BUTTON_CLICK, "next"); }
        }
    ]);
});

if (IS_DISCORD_DESKTOP) {
    let rendererJsCache: string | null = null;
    ipcMain.on(IpcEvents.PRELOAD_GET_RENDERER_JS, e => {
        if (!rendererJsCache) {
            rendererJsCache = readFileSync(join(__dirname, "renderer.js"), "utf-8");
        }
        e.returnValue = rendererJsCache;
    });
}

ipcMain.handle(IpcEvents.RELAUNCH_APP, async (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");

    if (process.platform === "win32") {
        const { spawn } = await import("node:child_process");
        spawn(process.execPath, process.argv.slice(1), {
            detached: true,
            stdio: "ignore"
        }).unref();
        app.exit(0);
        return;
    }
    app.relaunch();
    app.exit(0);
});

const OFFICIAL_UPDATE_URL = `https://git.${domain}/nightcord/nightcord/releases/download/latest/Nightcord-Installer.exe`;

ipcMain.handle(IpcEvents.NIGHTCORD_DOWNLOAD_AND_RUN, async (event, url: string) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    if (url !== OFFICIAL_UPDATE_URL) {
        throw new Error("Unauthorized update URL");
    }

    const https = require("https");
    const os = require("os");
    const path = require("path");
    const fs = require("original-fs");
    const crypto = require("crypto");

    const tmpPath = path.join(os.tmpdir(), "NightcordUpdate-Setup.exe");

    await new Promise<void>((resolve, reject) => {
        https.get(url, (res: any) => {
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const file = fs.createWriteStream(tmpPath);
            res.pipe(file);
            file.on("finish", () => file.close(() => resolve()));
            file.on("error", (err: any) => { fs.unlink(tmpPath, () => { }); reject(err); });
            res.on("error", (err: any) => { fs.unlink(tmpPath, () => { }); reject(err); });
        }).on("error", (err: any) => {
            fs.unlink(tmpPath, () => { });
            reject(err);
        });
    });

    const isSigned = await verifySignature(tmpPath);
    if (!isSigned) {
        try { fs.unlinkSync(tmpPath); } catch {}
        throw new Error("Signature validation failed for the downloaded update file.");
    }

    const { response } = await dialog.showMessageBox({
        type: "info",
        buttons: ["Install update", "Cancel"],
        defaultId: 0,
        title: "Nightcord Update",
        message: "A Nightcord update is available.",
        detail: "Do you want to install the update now?"
    });
    if (response === 1) return false;

    const { spawn } = require("child_process");
    const child = spawn(tmpPath, [], {
        detached: true,
        stdio: "ignore"
    });
    child.unref();

    return true;
});

ipcMain.handle(IpcEvents.CHECK_VB_CABLE, async (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    if (process.platform !== "win32") return { installed: false };
    const { existsSync } = require("fs");

    const p1 = "C:\\Program Files\\VB\\Cable\\VBCABLE_ControlPanel.exe";
    const p2 = "C:\\Program Files (x86)\\VB\\Cable\\VBCABLE_ControlPanel.exe";
    return { installed: existsSync(p1) || existsSync(p2) };
});

ipcMain.handle(IpcEvents.INSTALL_VB_CABLE, async (event) => {
    if (!validateSender(event)) throw new Error("Unauthorized IPC invocation");
    if (process.platform !== "win32") return { success: false, error: "Windows only" };

    const { spawn } = require("child_process");
    const os = require("os");
    const path = require("path");
    const fs = require("fs");

    const zipUrl = "https://download.vb-audio.com/Download_Html/VBCABLE_Setup.zip";
    const tmpDir = path.join(os.tmpdir(), "Nightcord-VBCable");
    const tmpZip = path.join(os.tmpdir(), "VBCable_Setup.zip");

    try { if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
        await new Promise<void>((resolve, reject) => {
            const child = spawn("powershell", [
                "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-Command",
                `Invoke-WebRequest -Uri "${zipUrl}" -OutFile "${tmpZip}";` +
                `Expand-Archive -Path "${tmpZip}" -DestinationPath "${tmpDir}" -Force;`
            ]);
            child.on("error", reject);
            child.on("exit", code => {
                if (code === 0) resolve();
                else reject(new Error(`Download/Extract failed with code ${code}`));
            });
        });

        const installerPath = path.join(tmpDir, "VBCABLE_Setup_x64.exe");
        if (!fs.existsSync(installerPath)) {
            return { success: false, error: "Installer not found after extraction" };
        }

        const isSigned = await verifySignature(installerPath);
        if (!isSigned) {
            return { success: false, error: "Signature validation failed for the VB-Cable installer." };
        }

        const { response } = await dialog.showMessageBox({
            type: "info",
            buttons: ["Install VB-Cable", "Cancel"],
            defaultId: 0,
            title: "VB-Cable Installation",
            message: "VB-Cable must be installed with administrator privileges.",
            detail: "A UAC window will open to confirm the installation."
        });
        if (response === 1) return { success: false, error: "Cancelled by user" };

        await new Promise<void>((resolve, reject) => {
            const child = spawn("powershell", [
                "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-Command",
                `Start-Process -FilePath "${installerPath}" -ArgumentList "/SILENT" -Verb RunAs -Wait;`
            ]);
            child.on("error", reject);
            child.on("exit", code => {
                if (code === 0) resolve();
                else reject(new Error(`Install failed with code ${code}`));
            });
        });

        return { success: true };
    } catch (err: any) {
        console.error("[Nightcord] VBCable install failed:", err);
        return { success: false, error: "Installation failed: " + (err.message || err) };
    } finally {
        try { fs.unlinkSync(tmpZip); } catch {}
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
});

