<script>
    import {remote} from "electron";
    import quit from "../actions/quit";
    import {onMount} from "svelte";
    import {promises as fs} from "fs";
    import path from "path";

    export let macButtons;

    const pkgVersion = remote.app.getVersion();
    let displayVersion = pkgVersion;

    // Settings modal state
    let showSettings = false;
    let prefDefaultPlugins = true;
    let prefAutoUpdate = true;
    let prefAutoRestart = true;
    let savedVisible = false;

    const prefsPath = path.join(process.env.APPDATA, "Nightcord", "settings", "installer-prefs.json");

    async function loadPrefs() {
        // Toujours forcer les 3 options à true à l'ouverture des settings.
        // L'utilisateur peut les changer dans la session, mais au prochain démarrage
        // de l'installeur elles reviennent à ON.
        prefDefaultPlugins = true;
        prefAutoUpdate = true;
        prefAutoRestart = true;
    }

    async function savePrefs() {
        try {
            await fs.mkdir(path.dirname(prefsPath), { recursive: true });
            await fs.writeFile(prefsPath, JSON.stringify({ defaultPlugins: prefDefaultPlugins, autoUpdate: prefAutoUpdate, autoRestart: prefAutoRestart }, null, 2), "utf-8");
        } catch {}
        savedVisible = true;
        setTimeout(() => { savedVisible = false; }, 2200);
    }

    function openSettings() {
        loadPrefs();
        showSettings = true;
    }

    onMount(async () => {
        // Forcer les 3 options à true sur disque au démarrage de l'installeur,
        // pour que le main process (readInstallerPrefs) lise bien true même sans
        // que l'utilisateur ouvre la modal settings.
        try {
            await fs.mkdir(path.dirname(prefsPath), { recursive: true });
            await fs.writeFile(prefsPath, JSON.stringify({ defaultPlugins: true, autoUpdate: true, autoRestart: true }, null, 2), "utf-8");
        } catch {}

        // Récupérer la dernière version depuis Gitea pour l'afficher dans la titlebar
        const https = require("https");
        const options = {
            hostname: "git.nightcord.st",
            path: "/api/v1/repos/nightcord/nightcord/releases/latest",
            method: "GET",
            rejectUnauthorized: false,
            headers: {"User-Agent": "nightcord-installer"}
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", chunk => { data += chunk; });
            res.on("end", () => {
                try {
                    const release = JSON.parse(data);
                    if (release && release.tag_name) {
                        displayVersion = release.tag_name.replace(/^v/, "");
                    }
                } catch (_) {}
            });
        });
        req.on("error", () => {});
        req.end();
    });

    function minimize() {
        remote.BrowserWindow.getFocusedWindow().minimize();
    }
</script>

<header class="titlebar {macButtons === true ? "type-mac" : "type-standard"}">
    <span class="title">Nightcord Installer v{displayVersion}</span>
    <div class="window-controls">
        <!-- Settings button -->
        <button tabindex="-1" class="btn-settings" on:click={openSettings} title="Nightcord Options">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M10.56 1.1c-.46.05-.7.53-.64.98.18 1.16-.19 2.2-.98 2.53-.8.33-1.79-.15-2.49-1.1-.27-.36-.78-.52-1.14-.24-.77.59-1.45 1.27-2.04 2.04-.28.36-.12.87.24 1.14.96.7 1.43 1.7 1.1 2.49-.33.8-1.37 1.16-2.53.98-.45-.07-.93.18-.99.64a11.1 11.1 0 0 0 0 2.88c.06.46.54.7.99.64 1.16-.18 2.2.19 2.53.98.33.8-.14 1.79-1.1 2.49-.36.27-.52.78-.24 1.14.59.77 1.27 1.45 2.04 2.04.36.28.87.12 1.14-.24.7-.95 1.7-1.43 2.49-1.1.8.33 1.16 1.37.98 2.53-.07.45.18.93.64.99a11.1 11.1 0 0 0 2.88 0c.46-.06.7-.54.64-.99-.18-1.16.19-2.2.98-2.53.8-.33 1.79.14 2.49 1.1.27.36.78.52 1.14.24.77-.59 1.45-1.27 2.04-2.04.28-.36.12-.87-.24-1.14-.96-.7-1.43-1.7-1.1-2.49.33-.8 1.37-1.16 2.53-.98.45.07.93-.18.99-.64a11.1 11.1 0 0 0 0-2.88c-.06-.46-.54-.7-.99-.64-1.16.18-2.2-.19-2.53-.98-.33-.8.14-1.79 1.1-2.49.36-.27.52-.78.24-1.14a11.07 11.07 0 0 0-2.04-2.04c-.36-.28-.87-.12-1.14.24-.7.96-1.7 1.43-2.49 1.1-.8-.33-1.16-1.37-.98-2.53.07-.45-.18-.93-.64-.99a11.1 11.1 0 0 0-2.88 0ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd"/>
            </svg>
        </button>

        {#if macButtons === true}
            <button tabindex="-1" on:click={quit} id="close">
                <svg width="12" height="12" viewBox="0 0 12 12">
                    <path stroke="#4c0000" fill="none" d="M8.5,3.5 L6,6 L3.5,3.5 L6,6 L3.5,8.5 L6,6 L8.5,8.5 L6,6 L8.5,3.5 Z"></path>
                </svg>
            </button>
            <button tabindex="-1" on:click={minimize} id="minimize">
                <svg width="12" height="12" viewBox="0 0 12 12">
                    <rect fill="#975500" width="6" height="1" x="3" y="5.5" fill-rule="evenodd"></rect>
                </svg>
            </button>
            <button id="maximize" disabled></button>
        {:else}
            <button tabindex="-1" on:click={minimize} id="minimize">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M2 9.75C2 9.33579 2.33579 9 2.75 9H17.25C17.6642 9 18 9.33579 18 9.75C18 10.1642 17.6642 10.5 17.25 10.5H2.75C2.33579 10.5 2 10.1642 2 9.75Z"/>
                </svg>
            </button>
            <button tabindex="-1" on:click={quit} id="close">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M3.52499 3.71761L3.61612 3.61612C4.07173 3.1605 4.79155 3.13013 5.28239 3.52499L5.38388 3.61612L14 12.233L22.6161 3.61612C23.1043 3.12796 23.8957 3.12796 24.3839 3.61612C24.872 4.10427 24.872 4.89573 24.3839 5.38388L15.767 14L24.3839 22.6161C24.8395 23.0717 24.8699 23.7915 24.475 24.2824L24.3839 24.3839C23.9283 24.8395 23.2085 24.8699 22.7176 24.475L22.6161 24.3839L14 15.767L5.38388 24.3839C4.89573 24.872 4.10427 24.872 3.61612 24.3839C3.12796 23.8957 3.12796 23.1043 3.61612 22.6161L12.233 14L3.61612 5.38388C3.1605 4.92827 3.13013 4.20845 3.52499 3.71761L3.61612 3.61612L3.52499 3.71761Z"/>
                </svg>
            </button>
        {/if}
    </div>
</header>

<!-- Settings modal -->
{#if showSettings}
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-overlay" on:click={() => showSettings = false}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="modal-box" on:click|stopPropagation>
        <div class="modal-header">
            <span class="modal-title">Nightcord Options</span>
            <button class="modal-close" on:click={() => showSettings = false}>&#x2715;</button>
        </div>

        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-label">Default config</div>
                <div class="toggle-desc">Enable default plugins after installation.</div>
            </div>
            <label class="switch">
                <input type="checkbox" bind:checked={prefDefaultPlugins}>
                <span class="track"></span>
            </label>
        </div>

        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-label">Auto update</div>
                <div class="toggle-desc">Automatically install updates when available.</div>
            </div>
            <label class="switch">
                <input type="checkbox" bind:checked={prefAutoUpdate}>
                <span class="track"></span>
            </label>
        </div>

        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-label">Discord auto restart</div>
                <div class="toggle-desc">Restart Discord after install / uninstall.</div>
            </div>
            <label class="switch">
                <input type="checkbox" bind:checked={prefAutoRestart}>
                <span class="track"></span>
            </label>
        </div>

        <div class="modal-footer">
            <button class="save-btn" on:click={savePrefs}>
                {#if savedVisible}&#x2713; Saved{:else}Save{/if}
            </button>
        </div>
    </div>
</div>
{/if}

<style>
    .titlebar {
        background-color: var(--bg2);
        color: white;
        height: 28px;
        display: flex;
        align-items: center;
        -webkit-app-region: drag;
    }

    .wordmark {
        width: 15px;
        height: auto;
        margin: 0 8px;
        fill: var(--text-muted);
        opacity: .5;
    }

    .title {
        position: absolute;
        left: 50%;
        transform: translate(-50%, 0);
        color: var(--text-muted);
        font-size: 14px;
    }

    .window-controls {
        display: flex;
        align-items: center;
        margin-left: auto;
        -webkit-app-region: no-drag;
    }

    .window-controls button {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
    }

    /* Settings button */
    .btn-settings {
        height: 28px;
        width: 36px;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        transition: color 0.15s, transform 0.2s;
        -webkit-app-region: no-drag;
    }
    .btn-settings:hover {
        color: var(--accent);
        transform: rotate(45deg);
        background: transparent !important;
    }
    .btn-settings svg { fill: currentColor; }

    /* Standard Titlebar */
    .type-standard button {
        height: 28px;
        width: 40px;
        transition: 50ms ease;
        background-color: transparent;
        color: var(--text-muted);
    }

    .type-standard button svg {
        width: 12px;
        height: 12px;
        fill: currentColor;
    }

    .type-standard button:hover {
        background-color: var(--bg3);
    }

    .type-standard button:active {
        background-color: var(--bg3-alt);
    }

    .type-standard button#close:hover {
        background-color: #d13d3d;
        color: #fff;
    }

    .type-standard button#close:active {
        background-color: #b12a2a;
        color: #fff;
    }

    /* Mac Titlebar */
    .type-mac {
        justify-content: space-between;
    }

    .type-mac .window-controls {
        order: -1;
        margin: 0 3px;
    }

    .type-mac .window-controls button {
        margin: 0 4px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-size: auto 12px;
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);
    }

    .type-mac .window-controls svg {
        visibility: hidden;
        width: 12px;
        height: 12px;
    }

    .type-mac .window-controls:hover svg {
        visibility: visible;
    }

    .type-mac .window-controls button:not([disabled]):active {
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12), inset 0 0 0 12px rgba(0,0,0,0.25);
    }

    .type-mac .window-controls #close {
        margin-left: 6px;
        background-color: #ff5e57;
    }

    .type-mac .window-controls #minimize {
        background-color: #ffbb2e;
    }

    .type-mac .window-controls button[disabled] {
        background-color: var(--bg3-alt);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.012);
    }

    /* Modal */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 4, 5, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
    }

    .modal-box {
        background: var(--bg2);
        border: 1px solid var(--bg4);
        border-radius: 6px;
        padding: 14px 16px 12px;
        width: 260px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        animation: popIn 0.15s ease-out;
    }

    @keyframes popIn {
        from { transform: scale(0.95); opacity: 0; }
        to   { transform: scale(1);    opacity: 1; }
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .modal-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .modal-close {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 11px;
        width: auto !important;
        height: auto !important;
        padding: 1px 4px !important;
        transition: color 0.15s;
        line-height: 1;
    }
    .modal-close:hover { color: var(--text-light); background: transparent !important; }

    .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 7px 0;
        border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .toggle-row:last-of-type { border-bottom: none; }

    .toggle-info { flex: 1; }

    .toggle-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-normal);
    }

    .toggle-desc {
        font-size: 10px;
        color: var(--text-muted);
        margin-top: 1px;
    }

    /* Toggle switch */
    .switch {
        position: relative;
        width: 30px;
        height: 17px;
        flex-shrink: 0;
        cursor: pointer;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .track {
        position: absolute;
        inset: 0;
        background: var(--bg4);
        border-radius: 17px;
        border: 1px solid rgba(255,255,255,0.06);
        transition: background 0.2s;
        cursor: pointer;
    }
    .track::before {
        content: '';
        position: absolute;
        width: 11px; height: 11px;
        left: 2px; top: 2px;
        background: var(--text-muted);
        border-radius: 50%;
        transition: transform 0.2s, background 0.2s;
    }
    .switch input:checked + .track { background: var(--accent); border-color: var(--accent); }
    .switch input:checked + .track::before {
        transform: translateX(13px);
        background: #fff;
    }

    .modal-footer { margin-top: 10px; }

    .save-btn {
        width: 100% !important;
        padding: 6px;
        background: var(--accent);
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
        height: auto !important;
    }
    .save-btn:hover { background: var(--accent-hover); }
</style>
