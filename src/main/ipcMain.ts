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

import { registerCspIpcHandlers } from "./csp/manager";
import { ALLOWED_PROTOCOLS, DATA_DIR, QUICK_CSS_PATH, SETTINGS_DIR, THEMES_DIR } from "./utils/constants";
import { makeLinksOpenExternally } from "./utils/externalLinks";

const RENDERER_CSS_PATH = join(__dirname, "renderer.css");
const USERPLUGINS_DIR = join(DATA_DIR, "userplugins");

mkdirSync(THEMES_DIR, { recursive: true });
mkdirSync(USERPLUGINS_DIR, { recursive: true });

registerCspIpcHandlers();

// ── Early start of ghost-server on Nightcord launch ──────────────
// The server runs in the background from startup to avoid delay on first click
import * as ghostNative from "../plugins/ghostClient/native";
(async () => {
    try {
        await (ghostNative as any).init(null);
    } catch (e) {
        console.warn("[Nightcord] Ghost-server pre-start failed:", e);
    }
})();

export function ensureSafePath(basePath: string, path: string) {
    const normalizedBasePath = normalize(basePath + "/");
    const newPath = join(basePath, path);
    const normalizedPath = normalize(newPath);
    return normalizedPath.startsWith(normalizedBasePath) ? normalizedPath : null;
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

// ── Native Keyboard & Mouse Simulation (Style Python / PyAutoGUI) ──
// On regroupe tout dans une seule commande PS pour la performance et la fiabilité
ipcMain.handle(IpcEvents.WORLD_BOMB_TYPE, async (event, text: string, delay: number = 50) => {
    const { exec } = require("child_process");

    // Echapper les caractères pour PowerShell
    let psScript = `Add-Type -AssemblyName System.Windows.Forms; `;
    for (const char of text) {
        let safeChar = char;
        if ("+^%~()[]{}".includes(char)) safeChar = `{${char}}`;
        psScript += `[System.Windows.Forms.SendKeys]::SendWait('${safeChar}'); `;
        if (delay > 0) psScript += `Start-Sleep -m ${delay}; `;
    }

    exec(`powershell -Command "${psScript}"`);
});

ipcMain.handle(IpcEvents.WORLD_BOMB_PRESS_ENTER, (event) => {
    const { exec } = require("child_process");
    const psCmd = `
        $sig = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
        Add-Type -MemberDefinition $sig -Name WinAPI -Namespace NC -ErrorAction SilentlyContinue
        [NC.WinAPI]::keybd_event(0x0D, 0x1C, 0, [UIntPtr]::Zero)
        Start-Sleep -Milliseconds 20
        [NC.WinAPI]::keybd_event(0x0D, 0x1C, 2, [UIntPtr]::Zero)
    `.replace(/\s+/g, " ");
    exec(`powershell -Command "${psCmd}"`);
});

ipcMain.handle(IpcEvents.WORLD_BOMB_PRESS_BACKSPACE, (event) => {
    const { exec } = require("child_process");
    const psCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}')`;
    exec(`powershell -Command "${psCmd}"`);
});

ipcMain.handle(IpcEvents.WORLD_BOMB_CLICK, (event, x: number, y: number) => {
    const { exec } = require("child_process");
    // Simulation d'un clic système réel (Win32) aux coordonnées écran
    const psCmd = `
        Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name "Win32" -Namespace Win32 -PassThru | Out-Null;
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});
        [Win32.Win32]::mouse_event(0x0002, 0, 0, 0, 0);
        [Win32.Win32]::mouse_event(0x0004, 0, 0, 0, 0);
    `.replace(/\s+/g, " ");
    exec(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; ${psCmd}"`);
});

// ── Séquence complète WorldBomb — clic auto centre fenêtre + frappe + ENTER ──
// Utilise -EncodedCommand (base64 UTF-16LE) pour bypasser ExecutionPolicy Restricted
// sur les PC des utilisateurs sans avoir besoin de créer des fichiers temporaires.
ipcMain.handle(IpcEvents.WORLD_BOMB_SEQUENCE, async (
    event,
    word: string,
    lps: number,
    humanChance: number,
    targetX: number = -1,
    targetY: number = -1
) => {
    return new Promise<void>((resolve, reject) => {
        const { spawn } = require("child_process");

        // Centre de la fenêtre Discord — dynamique
        const win = BrowserWindow.fromWebContents(event.sender);
        const bounds = win?.getBounds() ?? { x: 0, y: 0, width: 1280, height: 720 };
        const centerX = targetX >= 0 ? targetX : Math.round(bounds.x + bounds.width / 2);
        const centerY = targetY >= 0 ? targetY : Math.round(bounds.y + bounds.height / 2);

        // Récupérer le handle natif (HWND)
        const hWnd = win?.getNativeWindowHandle();
        let hWndStr = "0";
        try {
            if (hWnd && hWnd.length >= 4) {
                // Sur x64, HWND est un Buffer de 8 bytes en little-endian
                // On lit comme uint32 les 4 bytes bas (les HWND Windows restent dans 32 bits en pratique)
                // readUInt32LE est safe pour tous les HWND réels Windows
                const lo = hWnd.readUInt32LE(0);
                const hi = hWnd.length >= 8 ? hWnd.readUInt32LE(4) : 0;
                if (hi !== 0) {
                    // HWND > 32 bits — on construit le nombre via BigInt pour éviter la perte de précision
                    hWndStr = (BigInt(hi) * 0x100000000n + BigInt(lo)).toString();
                } else {
                    hWndStr = lo.toString();
                }
            }
        } catch (e) {
            console.error("[WorldBomb] Erreur lecture HWND:", e);
        }

        const currentPid = process.pid;

        const lines: string[] = [];
        lines.push(`$ErrorActionPreference = "Stop"`);
        lines.push(`try {`);
        lines.push(`  Add-Type -AssemblyName System.Windows.Forms`);
        lines.push(`  Add-Type -AssemblyName System.Drawing`);
        lines.push(`  $sig = '[DllImport("user32.dll")] public static extern void mouse_event(uint a, uint b, uint c, uint d, uint e); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'`);
        lines.push(`  Add-Type -MemberDefinition $sig -Name WinAPI -Namespace NC -ErrorAction SilentlyContinue`);

        // Focus Window
        lines.push(`  $handle = [IntPtr]::Zero`);
        lines.push(`  if (${hWndStr} -ne 0) { $handle = [IntPtr]${hWndStr} }`);
        lines.push(`  else {`);
        lines.push(`    $proc = Get-Process -Id ${currentPid} -ErrorAction SilentlyContinue`);
        lines.push(`    if ($proc) { $handle = $proc.MainWindowHandle }`);
        lines.push(`  }`);
        lines.push(`  if ($handle -ne [IntPtr]::Zero) {`);
        lines.push(`    [NC.WinAPI]::SetForegroundWindow($handle) | Out-Null`);
        lines.push(`    Start-Sleep -Milliseconds 10`);
        lines.push(`  }`);

        // Click
        lines.push(`  [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${centerX}, ${centerY})`);
        lines.push(`  [NC.WinAPI]::mouse_event(2, 0, 0, 0, 0)`);
        lines.push(`  [NC.WinAPI]::mouse_event(4, 0, 0, 0, 0)`);
        lines.push(`  Start-Sleep -Milliseconds 10`);

        // Type each character
        for (const char of word) {
            const minMs = Math.max(10, Math.round(1000 / (lps * 1.5)));
            const maxMs = Math.max(minMs + 1, Math.round(1000 / lps));
            const baseMs = Math.round((minMs + maxMs) / 2);

            if (humanChance > 0) {
                lines.push(`  if ((Get-Random -Minimum 1 -Maximum 101) -le ${humanChance}) {`);
                const typoChar = "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
                let safeTypo = typoChar;
                if ("+^%~()[]{}".includes(typoChar)) safeTypo = `{${typoChar}}`;
                lines.push(`    [System.Windows.Forms.SendKeys]::SendWait('${safeTypo.replace(/'/g, "''")}')`);
                lines.push(`    Start-Sleep -Milliseconds ${baseMs}`);
                lines.push(`    [System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}')`);
                lines.push(`    Start-Sleep -Milliseconds ${baseMs}`);
                lines.push(`  }`);
            }

            let safeChar = char;
            if ("+^%~()[]{}".includes(char)) safeChar = `{${char}}`;
            const psSafeChar = safeChar.replace(/'/g, "''");
            lines.push(`  [System.Windows.Forms.SendKeys]::SendWait('${psSafeChar}')`);
            lines.push(`  Start-Sleep -Milliseconds (Get-Random -Minimum ${minMs} -Maximum ${maxMs})`);
        }

        lines.push(`  [NC.WinAPI]::keybd_event(0x0D, 0x1C, 0, [UIntPtr]::Zero)`);
        lines.push(`  Start-Sleep -Milliseconds 20`);
        lines.push(`  [NC.WinAPI]::keybd_event(0x0D, 0x1C, 2, [UIntPtr]::Zero)`);
        lines.push(`} catch { exit 1 }`);

        const psScript = lines.join("\r\n");

        // Encode en UTF-16LE base64 — bypasse ExecutionPolicy sans fichier temporaire
        const utf16buf = Buffer.from(psScript, "utf16le");
        const encoded = utf16buf.toString("base64");

        try {
            const child = spawn("powershell.exe", [
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle", "Hidden",
                "-EncodedCommand", encoded
            ]);

            child.on("error", (err) => {
                console.error("[WorldBomb] Erreur spawn powershell.exe:", err);
                reject(err);
            });

            child.on("exit", (code) => {
                if (code === 0) resolve();
                else reject(new Error(`PowerShell exited with code ${code}`));
            });
        } catch (e) {
            reject(e);
        }
    });
});

// ── Global Keyboard Hook (KeyboardSounds) ──
let globalHookProcess: any = null;
ipcMain.handle(IpcEvents.KEYBOARD_SOUNDS_START_GLOBAL, (event) => {
    if (globalHookProcess) return;

    const { spawn } = require("child_process");
    const { writeFileSync, unlinkSync } = require("fs");
    const { join } = require("path");
    const { tmpdir } = require("os");

    const code = `
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class KeyHook
{
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;
    private static LowLevelKeyboardProc _proc = HookCallback;
    private static IntPtr _hookID = IntPtr.Zero;

    public static void Main()
    {
        _hookID = SetHook(_proc);
        Application.Run();
        UnhookWindowsHookEx(_hookID);
    }

    private static IntPtr SetHook(LowLevelKeyboardProc proc)
    {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule)
        {
            return SetWindowsHookEx(WH_KEYBOARD_LL, proc,
                GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN))
        {
            int vkCode = Marshal.ReadInt32(lParam);
            Console.WriteLine(vkCode);
            Console.Out.Flush();
        }
        return CallNextHookEx(_hookID, nCode, wParam, lParam);
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
}
`;

    const psScript = `
Add-Type -TypeDefinition @"
${code}
"@ -ReferencedAssemblies "System.Windows.Forms"
[KeyHook]::Main()
`;

    const tempFile = join(tmpdir(), `global_hook_${Date.now()}.ps1`);
    try {
        writeFileSync(tempFile, "\uFEFF" + psScript, "utf8");
        globalHookProcess = spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", tempFile]);
        
        globalHookProcess.stdout.on("data", (data: Buffer) => {
            const lines = data.toString().trim().split(/\r?\n/);
            for (const line of lines) {
                const vkCode = parseInt(line.trim(), 10);
                if (!isNaN(vkCode)) {
                    event.sender.send(IpcEvents.GLOBAL_KEY_DOWN, vkCode);
                }
            }
        });

        globalHookProcess.on("exit", () => {
            try { unlinkSync(tempFile); } catch { }
            globalHookProcess = null;
        });
    } catch (e) {
        console.error("[KeyboardSounds] Failed to start global hook:", e);
    }
});

ipcMain.handle(IpcEvents.KEYBOARD_SOUNDS_STOP_GLOBAL, () => {
    if (globalHookProcess) {
        try { globalHookProcess.kill(); } catch { }
        globalHookProcess = null;
    }
});

// Retourne la position actuelle du curseur souris (pour calibration du clic du jeu)
ipcMain.handle(IpcEvents.WORLD_BOMB_GET_CURSOR_POS, () => {
    return screen.getCursorScreenPoint();
});

// Ouvre la fenêtre externe Stream Proof
let streamProofWindow: BrowserWindow | null = null;
ipcMain.handle(IpcEvents.WORLD_BOMB_OPEN_WINDOW, (event, lps: number = 50, humanChance: number = 10, safeMode: boolean = false, theme: string = "", playMode: string = "Normal", noSpace: boolean = false, groqKey: string = "") => {
    if (streamProofWindow) {
        streamProofWindow.focus();
        return;
    }

    streamProofWindow = new BrowserWindow({
        width: 332, // 300 + padding
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    try {
        streamProofWindow.setContentProtection(true);
    } catch (e) {
        console.error("Erreur setContentProtection:", e);
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
            <button id="btn-find">TROUVER</button>
        </div>
        <div id="status">Chargement...</div>
        <div id="definition-container" style="display: none; margin-top: 10px; font-size: 11px; color: #d1d5db; font-style: italic; background: #374151; padding: 8px; border-radius: 8px; max-height: 80px; overflow-y: auto;">
            <strong style="color: #60a5fa">Définition:</strong> <span id="definition-text"></span>
        </div>
    </div>
</div>
<script>
    const { ipcRenderer } = require('electron');
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
    
    // Charger le dictionnaire
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
            document.getElementById('status').innerText = "Prêt (" + dictionary.length + " mots)";
        }).catch(err => {
            document.getElementById('status').innerText = "Erreur réseau";
            document.getElementById('status').style.color = "#ef4444";
        });

    // Charger les mots du thème
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
                            st.innerText = st.innerText + " (+ Thème)";
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
            document.getElementById('status').innerText = "Aucun mot trouvé !";
            document.getElementById('status').style.color = "#ef4444";
            return;
        }

        const currentMissing = getMissingAlphabet();
        validWords.sort((a, b) => computeScore(b, currentMissing) - computeScore(a, currentMissing));
        
        const bestWord = validWords[0];
        document.getElementById('status').innerText = "Saisie: " + bestWord + "...";
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
            defText.innerText = 'Génération de la définition par IA...';
            
            if (!groqKey) {
                defText.innerText = "Erreur: Clé API Groq introuvable.";
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
                            content: 'Donne une définition très courte (1 seule phrase simple) pour le mot suivant, en expliquant ce que c\\'est concrètement, sans donner sa nature grammaticale. Mot : "' + bestWord + '"'
                        }]
                    }),
                })
                .then(r => r.json())
                .then(data => {
                    const ans = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                    if (ans) {
                        defText.innerText = ans.trim();
                    } else {
                        defText.innerText = "L'IA n'a pas pu définir ce mot.";
                    }
                })
                .catch(() => defText.innerText = "Erreur réseau.");
            }
        }
        
        // Appelle la séquence (WorldBombSequence) native du main process
        ipcRenderer.invoke("WorldBombSequence", bestWord, lps, humanChance)
            .then(() => {
                document.getElementById('status').innerText = "Prêt !";
            })
            .catch(err => {
                document.getElementById('status').innerText = "Erreur de saisie";
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
        // Fallback to data URL if file writing fails
        streamProofWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));
    }

    streamProofWindow.on('closed', () => {
        streamProofWindow = null;
    });
});
ipcMain.handle(IpcEvents.OPEN_QUICKCSS, () => shell.openPath(QUICK_CSS_PATH));

ipcMain.handle(IpcEvents.OPEN_EXTERNAL, (_, url) => {
    try {
        var { protocol } = new URL(url);
    } catch {
        throw "Malformed URL";
    }
    if (!ALLOWED_PROTOCOLS.includes(protocol))
        throw "Disallowed protocol.";

    shell.openExternal(url);
});

ipcMain.handle(IpcEvents.GET_QUICK_CSS, () => readCss());
ipcMain.handle(IpcEvents.SET_QUICK_CSS, (_, css) =>
    writeFileSync(QUICK_CSS_PATH, css)
);

ipcMain.handle(IpcEvents.GET_THEMES_DIR, () => THEMES_DIR);
ipcMain.handle(IpcEvents.GET_THEMES_LIST, () => listThemes());
ipcMain.handle(IpcEvents.GET_THEME_DATA, (_, fileName) => getThemeData(fileName));
ipcMain.handle(IpcEvents.DELETE_THEME, (_, fileName) => {
    const safePath = ensureSafePath(THEMES_DIR, fileName);
    if (!safePath) return Promise.reject(`Unsafe path ${fileName}`);
    return unlink(safePath);
});
ipcMain.handle(IpcEvents.GET_THEME_SYSTEM_VALUES, () => {
    let accentColor = systemPreferences.getAccentColor?.() ?? "";

    if (accentColor.length && accentColor[0] !== "#") {
        accentColor = `#${accentColor}`;
    }

    return {
        "os-accent-color": accentColor
    };
});

ipcMain.handle(IpcEvents.OPEN_THEMES_FOLDER, () => shell.openPath(THEMES_DIR));
ipcMain.handle(IpcEvents.OPEN_SETTINGS_FOLDER, () => shell.openPath(SETTINGS_DIR));

ipcMain.handle(IpcEvents.INIT_FILE_WATCHERS, ({ sender }) => {
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

// ── Screen capture — returns available sources from main process ──
ipcMain.handle(IpcEvents.GET_DESKTOP_SOURCES, async () => {
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

ipcMain.handle(IpcEvents.OPEN_MONACO_EDITOR, async () => {
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

    // Allow loading Monaco from CDN by bypasssing CSP for this window
    monacoWin.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"]
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

ipcMain.handle(IpcEvents.GET_RENDERER_CSS, () => readFile(RENDERER_CSS_PATH, "utf-8"));

// ── Acrylic / background material (Windows 10/11) ──
ipcMain.handle(IpcEvents.SET_WINDOW_BACKGROUND_MATERIAL, (event, material: "none" | "acrylic" | "mica" | "tabbed") => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    try {
        // @ts-ignore
        const canSetMaterial = typeof win.setBackgroundMaterial === "function";
        // @ts-ignore
        const canSetVibrancy = typeof win.setVibrancy === "function";

        if (material === "none") {
            win.setBackgroundColor("#36393f");
            if (canSetMaterial) {
                // @ts-ignore
                win.setBackgroundMaterial("none");
            }
            if (canSetVibrancy) {
                // @ts-ignore
                win.setVibrancy(null);
            }
        } else {
            win.setBackgroundColor("#00000000");
            if (canSetMaterial) {
                // @ts-ignore
                win.setBackgroundMaterial(material);
            } else if (canSetVibrancy) {
                // @ts-ignore
                win.setVibrancy(material === "acrylic" ? "acrylic" : "under-window");
            }
        }
    } catch (e) {
        console.error("[CreateTheme] setBackgroundMaterial failed:", e);
    }
});

// ── SoundCord Player — Thumbnail Toolbar Windows ──
const THUMBAR_ICONS = {
    prev: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAY0lEQVR4nGNgGLngPxIgRy+MzUKpI9DFmKhpGAMDGS4kFCQkuZCY8CXKhaREFEEXkhrrOF1ITvJhYMDjQkYooJqByAZT1UCYocQaTFKyIcZQknMKIdeSnfXIiTCiAblJbGAAADXRMBdqfKdTAAAAAElFTkSuQmCC",
    next: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAZklEQVR4nOXUMQrAMAxDUbXk/ld2lwoMwbGcein5YxMeylLg7MzMqvcZv93Rpd1RE+jhVpBoFV6CHm4FiSqwDHp4dT6qYIaWFwLA9dYCRhCTn5xBTFqoYkCysAKxcOEONvXlp/CfHp4sPAHr7DkEAAAAAElFTkSuQmCC",
    play: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAXElEQVR4nO3UsQoAIAhFUY3+/5dtCiTS9NnQ0N0cOohDRD8Rkcr7ZqEovAUrsAsicAjU8FVwoh6cBk8wDFpwr4LMzHqGwRWCQQuapW54woiCG0agEJiBzKq/zfsN8Hg8AZZiLwgAAAAASUVORK5CYII=",
    pause: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAKklEQVR4nGNgGHGAEV3g/////1EUMDIykiLPRE3XjRo4auCogcPHwBEIAFPvCBxAwtPtAAAAAElFTkSuQmCC",
};

ipcMain.handle(IpcEvents.SET_THUMBAR_BUTTONS, (event, state: "playing" | "paused" | "stopped") => {
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

// ── Nightcord Relaunch — redémarre l'app Electron complètement ──
// VencordNative.nightcord.relaunch() envoie RELAUNCH_APP = "NightcordRelaunchApp"
// VesktopNative.app.relaunch() envoie aussi RELAUNCH_APP
// Les boutons "Restart" dans les plugins settings (index.tsx) passent par VencordNative.nightcord.relaunch()
ipcMain.handle(IpcEvents.RELAUNCH_APP, async () => {
    // Dans l'architecture Nightcord, app.asar est un dossier (pas un vrai .asar),
    // donc app.isPackaged retourne false même en .exe packagé.
    // On utilise TOUJOURS spawn(process.execPath) sur Windows pour garantir le redémarrage.
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



// ── Nightcord Updater — downloads a Setup.exe from a URL and runs it ──
ipcMain.handle(IpcEvents.NIGHTCORD_DOWNLOAD_AND_RUN, async (_, url: string) => {
    const https = require("https");
    const http = require("http");
    const os = require("os");
    const path = require("path");
    const fs = require("original-fs");
    const { exec } = require("child_process");

    const tmpPath = path.join(os.tmpdir(), "NightcordUpdate-Setup.exe");

    await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(tmpPath);
        const protocol = url.startsWith("https") ? https : http;

        const request = (redirectUrl: string) => {
            protocol.get(redirectUrl, (res: any) => {
                // Suit les redirections (GitHub envoie un 302)
                if (res.statusCode === 301 || res.statusCode === 302) {
                    file.close();
                    return request(res.headers.location);
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                res.pipe(file);
                file.on("finish", () => file.close(() => resolve()));
            }).on("error", (err: any) => {
                fs.unlink(tmpPath, () => { });
                reject(err);
            });
        };

        request(url);
    });

    // Lance l'installeur en mode détaché pour qu'il survive à la fermeture de Discord
    const { spawn } = require("child_process");
    const child = spawn(tmpPath, ["/SILENT"], {
        detached: true,
        stdio: "ignore"
    });
    child.unref();

    return true;
});

// ── VB-Audio Virtual Cable — Automatic Detection and Installation ──────────────
ipcMain.handle(IpcEvents.CHECK_VB_CABLE, async () => {
    if (process.platform !== "win32") return { installed: false };
    const { existsSync } = require("fs");
    // Chemins standards après installation
    const p1 = "C:\\Program Files\\VB\\Cable\\VBCABLE_ControlPanel.exe";
    const p2 = "C:\\Program Files (x86)\\VB\\Cable\\VBCABLE_ControlPanel.exe";
    return { installed: existsSync(p1) || existsSync(p2) };
});

ipcMain.handle(IpcEvents.INSTALL_VB_CABLE, async () => {
    if (process.platform !== "win32") return { success: false, error: "Windows only" };

    const { exec } = require("child_process");
    const os = require("os");
    const path = require("path");
    const fs = require("fs");

    const zipUrl = "https://download.vb-audio.com/Download_Html/VBCABLE_Setup.zip";
    const tmpDir = path.join(os.tmpdir(), "Nightcord-VBCable");
    const tmpZip = path.join(os.tmpdir(), "VBCable_Setup.zip");

    // Nettoyage préalable
    try { if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    fs.mkdirSync(tmpDir, { recursive: true });

    return new Promise((resolve) => {
        // Commande PowerShell : Téléchargement -> Extraction -> Execution de l'installeur (x64 car Nightcord est x64)
        const psCmd = `
            Invoke-WebRequest -Uri "${zipUrl}" -OutFile "${tmpZip}";
            Expand-Archive -Path "${tmpZip}" -DestinationPath "${tmpDir}" -Force;
            Start-Process -FilePath "${path.join(tmpDir, "VBCABLE_Setup_x64.exe")}" -ArgumentList "/SILENT" -Verb RunAs -Wait;
        `.replace(/\s+/g, " ");

        exec(`powershell -Command "${psCmd}"`, (err: any) => {
            if (err) {
                console.error("[Nightcord] VBCable install failed:", err);
                resolve({ success: false, error: "Installation failed (Elevation probably required)" });
            } else {
                resolve({ success: true });
            }
            // Nettoyage asynchrone
            try { fs.unlinkSync(tmpZip); } catch { }
        });
    });
});
