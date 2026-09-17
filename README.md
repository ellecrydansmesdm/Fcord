<p align="center">
  <a href="https://fhubdev.vercel.app/" target="_blank">
    <img src="./assets/logo.png" alt="FCord" width="180">
  </a>
</p>

<h1 align="center">FCord</h1>

<p align="center">
  <strong>The modular, lightning-fast Discord desktop client mod with native multi-OS support.</strong><br>
  Built-in plugin catalog • Custom themes & profiles • SoundCloud streaming engine • Hardware-backed vault security<br>
  Developed and maintained by <strong>Fahd (<a href="https://github.com/ellecrydansmesdm">@ellecrydansmesdm</a>)</strong>
</p>

<p align="center">
  <a href="https://github.com/ellecrydansmesdm/Fcord/releases/latest">
    <img src="https://img.shields.io/badge/Release-v1.0.9-10b981?style=for-the-badge&logo=github&logoColor=white" alt="Latest Release v1.0.9">
  </a>
  <a href="https://fhubdev.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Website-fhubdev.vercel.app-0ea5e9?style=for-the-badge&logo=vercel&logoColor=white" alt="Official Website">
  </a>
  <a href="https://discord.gg/W2YgEStqJ4" target="_blank">
    <img src="https://img.shields.io/badge/Discord-Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord Community">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge" alt="License GPL-3.0">
  </a>
  <a href="https://github.com/ellecrydansmesdm/Fcord/releases/latest">
    <img src="https://img.shields.io/badge/Platforms-Windows_%7C_macOS_%7C_Linux-7c3aed?style=for-the-badge&logo=electron&logoColor=white" alt="Supported Platforms">
  </a>
</p>

<p align="center">
  <a href="https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer.exe">
    <img src="https://img.shields.io/badge/Windows-Installer.exe-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Download Windows Installer">
  </a>
  <a href="https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-arm64.dmg">
    <img src="https://img.shields.io/badge/macOS-Apple_Silicon-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download macOS Apple Silicon">
  </a>
  <a href="https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-x64.dmg">
    <img src="https://img.shields.io/badge/macOS-Intel_x64-1f2937?style=for-the-badge&logo=apple&logoColor=white" alt="Download macOS Intel">
  </a>
  <a href="https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-Linux-x64.AppImage">
    <img src="https://img.shields.io/badge/Linux-AppImage_x64-E95420?style=for-the-badge&logo=linux&logoColor=white" alt="Download Linux AppImage">
  </a>
  <a href="https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-Linux-x64.tar.gz">
    <img src="https://img.shields.io/badge/Linux-tar.gz_x64-334155?style=for-the-badge&logo=linux&logoColor=white" alt="Download Linux tar.gz">
  </a>
</p>

<p align="center">
  <a href="#-downloads--artifacts"><b>📦 Downloads & Artifacts</b></a> &nbsp;•&nbsp;
  <a href="#-installation"><b>🚀 Installation Guide</b></a> &nbsp;•&nbsp;
  <a href="#features"><b>✨ Features</b></a> &nbsp;•&nbsp;
  <a href="#-security-advisory-unsigned-open-source-binaries"><b>🛡️ SmartScreen & Gatekeeper</b></a> &nbsp;•&nbsp;
  <a href="#-updating-and-uninstalling"><b>🔄 Updates</b></a> &nbsp;•&nbsp;
  <a href="#-support"><b>💬 Support</b></a>
</p>

> [!TIP]
> **Native Multi-OS Support (v1.0.9)** : FCord natively supports **Windows (x64)**, **macOS (Apple Silicon & Intel)**, and **Linux (x64 AppImage / tar.gz)** with autonomous installers, automated Discord channel detection, and zero external dependencies.  
> Unsigned community binaries may trigger **Windows SmartScreen / SAC** or **macOS Gatekeeper**. Check the [Quick Installation Guide](#-installation) below for 1-click bypass steps.

---

## About

FCord extends the official Discord desktop app with a large plugin catalog, custom themes, rich profile personalization, multi-account management, integrated media controls, and cloud synchronization. Every feature can be independently toggled and configured from the FCord settings page.

FCord is developed and maintained by Fahd ([@ellecrydansmesdm](https://github.com/ellecrydansmesdm)).

## Features

- **Hundreds of included plugins.** Customize chat, appearance, notifications, servers, voice, media, privacy, and shortcuts.
- **Themes and profiles.** Use QuickCSS, local themes, the theme library, and FCord profile options for banners, badges, decorations, effects, and bios.
- **Account and privacy tools.** Manage additional account sessions and protect account data saved on your computer with FCord's encrypted storage.
- **Voice and media tools.** Access voice utilities, integrated players, recording tools, SoundPad, and desktop media features from Discord.
- **Backup and synchronization.** Export settings locally or use the optional cloud service to synchronize settings, QuickCSS, and FCord profiles.
- **Built-in updates.** Install published FCord updates from the client and restart Discord to load the new desktop bundle.

Some plugins use external services, additional Discord accounts, or audio devices and require their own setup. Plugin availability and compatibility can change when Discord updates its desktop client.

---

## 📦 Downloads & Artifacts

All binaries are compiled, hashed, and published on the [GitHub Releases](https://github.com/ellecrydansmesdm/Fcord/releases/latest) page. Choose the package tailored to your platform:

| Platform / OS | Architecture | Format | Download Link | Description / Notes |
| :--- | :--- | :---: | :--- | :--- |
| **Windows** | x64 (64-bit) | `.exe` | [**FCord-Installer.exe**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer.exe) | NSIS standalone installer with atomic repair & clean uninstall |
| **macOS** | Apple Silicon (M1/M2/M3/M4) | `.dmg` | [**FCord-Installer-macOS-arm64.dmg**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-arm64.dmg) | Drag-and-drop installer for Apple Silicon ([.zip](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-arm64.zip)) |
| **macOS** | Intel | `.dmg` | [**FCord-Installer-macOS-x64.dmg**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-x64.dmg) | Drag-and-drop installer for Intel Macs ([.zip](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-x64.zip)) |
| **Linux** | x64 (64-bit) | `.AppImage` | [**FCord-Installer-Linux-x64.AppImage**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-Linux-x64.AppImage) | Portable, runs out-of-the-box on Ubuntu, Debian, Fedora, Arch |
| **Linux** | x64 (64-bit) | `.tar.gz` | [**FCord-Installer-Linux-x64.tar.gz**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-Linux-x64.tar.gz) | Standalone tarball for manual extraction & custom scripts |
| **Core Payload** | Universal | `.zip` | [**fcord-dist.zip**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/fcord-dist.zip) | Offline payload & in-client auto-updater engine |

> [!NOTE]
> Every release artifact can be cryptographically verified against the official [**checksums.txt**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/checksums.txt) SHA-256 hash digest.

---

## 🚀 Installation

FCord supports Discord **Stable**, **PTB**, and **Canary** across Windows, macOS, and Linux.

### 🪟 Windows (x64)

1. Launch your preferred Discord desktop channel (**Stable**, **PTB**, or **Canary**) at least once.
2. Download [**FCord-Installer.exe**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer.exe).
3. Close Discord completely (check your system tray to ensure no background Discord process is running).
4. Run `FCord-Installer.exe`.
   - *If SmartScreen appears: click **More info** → **Run anyway**.*
   - *If Smart App Control (SAC on Windows 11) blocks execution: right-click `FCord-Installer.exe` → **Properties** → check **Unblock** → **Apply**.*
5. Select the Discord channel(s) you want to patch, then click **Install**.
6. Launch Discord — FCord settings and plugins will appear under **User Settings → FCord**.

### 🍎 macOS (Apple Silicon & Intel)

1. Ensure Discord has been opened at least once on your Mac.
2. Download the package for your Mac processor:
   - **Apple Silicon (M1 / M2 / M3 / M4)**: [**FCord-Installer-macOS-arm64.dmg**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-arm64.dmg) *(or [`.zip`](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-arm64.zip))*
   - **Intel (x64)**: [**FCord-Installer-macOS-x64.dmg**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-x64.dmg) *(or [`.zip`](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-macOS-x64.zip))*
3. Open the `.dmg` file and drag `FCord-Installer.app` to your Applications folder (or run it directly).
4. **Gatekeeper Bypass (Unsigned App)**:
   - **GUI Method**: **Right-click** `FCord-Installer.app` → select **Open** → confirm by clicking **Open**.
   - **Terminal Command**: Clear the Gatekeeper quarantine attribute by running:
     ```bash
     xattr -d com.apple.quarantine /Applications/FCord-Installer.app
     ```
     *(Or recursively clear all quarantine flags: `xattr -cr /Applications/FCord-Installer.app`)*.
5. Select your target Discord version (Stable, PTB, or Canary) and click **Install**.
6. Restart Discord to load FCord.

### 🐧 Linux (x64 AppImage & tar.gz)

The Linux installer automatically detects Discord across 7 standard system installations:
- Native system packages (`/usr/share/discord`, `/opt/discord`)
- Flatpak packages (System: `/var/lib/flatpak` & User: `~/.local/share/flatpak`)
- Canonical Snap packages (`/snap/discord`)
- Discord PTB (`/opt/discord-ptb`, `/usr/share/discord-ptb`)
- Discord Canary (`/opt/discord-canary`, `/usr/share/discord-canary`)

#### Option A: Standalone AppImage (Recommended)
1. Download [**FCord-Installer-Linux-x64.AppImage**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-Linux-x64.AppImage).
2. Open your terminal in your download folder and make the AppImage executable:
   ```bash
   chmod +x FCord-Installer-Linux-x64.AppImage
   ```
3. Run the installer:
   ```bash
   ./FCord-Installer-Linux-x64.AppImage
   ```
4. Select your Discord installation and click **Install**.
5. Start Discord from your application menu or terminal.

#### Option B: Standalone Tarball (.tar.gz)
1. Download [**FCord-Installer-Linux-x64.tar.gz**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/FCord-Installer-Linux-x64.tar.gz).
2. Extract the archive and execute the installer:
   ```bash
   tar -xzf FCord-Installer-Linux-x64.tar.gz
   cd FCord-Installer-Linux-x64
   chmod +x FCord-Installer
   ./FCord-Installer
   ```

---

> [!IMPORTANT]
> ### 🛡️ Security Advisory: Unsigned Open-Source Binaries
>
> **Français :**  
> Les installateurs FCord sont distribués **sans certificat commercial payant** (les certificats d'entreprise EV Authenticode et Apple Developer coûtent plusieurs centaines d'euros par an). Les systèmes d'exploitation peuvent donc afficher un avertissement de sécurité standard au premier lancement :
> 
> - **Windows SmartScreen** (*« Windows a protégé votre ordinateur »*) :  
>   Cliquez simplement sur **Informations complémentaires** puis sur **Exécuter quand même**.
> - **Windows Smart App Control (SAC - Windows 11)** :  
>   1. Faites un clic droit sur `FCord-Installer.exe` → **Propriétés** → cochez la case **Débloquer** en bas → **Appliquer**.  
>   2. Si Windows 11 continue de bloquer les exécutables non signés commercialement, ouvrez **Paramètres Windows** → **Confidentialité et sécurité** → **Sécurité Windows** → **Contrôle des applications et du navigateur** → **Paramètres du Contrôle intelligent des applications (Smart App Control)** et réglez-le sur **Désactivé**.
> - **macOS Gatekeeper** (*« Impossible d'ouvrir l'application car le développeur ne peut pas être vérifié »*) :  
>   Faites un **clic droit** sur l'application → sélectionnez **Ouvrir** → confirmez en cliquant sur **Ouvrir**.  
>   *Ou exécutez la commande suivante dans le Terminal :*
>   ```bash
>   xattr -cr /Applications/FCord-Installer.app
>   ```
> - Toutes les versions sont auditables et vérifiables avec le fichier de hachage officiel [**checksums.txt**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/checksums.txt).
>
> ---
>
> **English:**  
> FCord installers are distributed **without expensive corporate signing certificates** (commercial EV Authenticode and Apple Developer credentials cost hundreds of dollars annually). Operating systems will display a standard unverified developer prompt on initial execution:
> 
> - **Windows SmartScreen** (*"Windows protected your PC"*):  
>   Click **More info** → **Run anyway**.
> - **Windows 11 Smart App Control (SAC)**:  
>   Right-click `FCord-Installer.exe` → **Properties** → check **Unblock** at the bottom → **Apply**. If SAC blocks execution, toggle it to **Off** in **Windows Settings** → **Privacy & security** → **Windows Security** → **App & browser control** → **Smart App Control settings**.
> - **macOS Gatekeeper** (*"App cannot be opened because it is from an unidentified developer"*):  
>   **Right-click** the application → select **Open** → confirm by clicking **Open**.  
>   *Or run the following command in Terminal:*
>   ```bash
>   xattr -cr /Applications/FCord-Installer.app
>   ```
> - Every binary is verifiable against published cryptographic SHA-256 signatures in [**checksums.txt**](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/checksums.txt).

---

## 🔄 Updating and Uninstalling

### Seamless In-Client Updates
FCord includes an integrated atomic updater (`http.ts`). When an update is published:
1. Discord displays a top notification banner alerting you that a new version is available.
2. Click **Update Now** — FCord downloads the verified offline payload (`fcord-dist.zip`), validates its cryptographic SHA-256 hash against `checksums.txt`, and swaps the application directory atomically (`atomicSwapDirectories`).
3. Restart Discord to load the updated release. All settings, custom plugins, themes, and tokens are preserved.
> **Note**: Existing users do **not** need to re-download the installer for routine updates!

### Re-patching after Discord Client Updates
When Discord releases a core client update, it may overwrite its application directory. Simply run the latest `FCord-Installer` again and click **Install** to re-inject FCord.

### Clean Uninstall
To completely remove FCord:
1. Run `FCord-Installer` on your OS.
2. Select your Discord channel and click **Uninstall**.
3. The installer removes the FCord loader shim and cleanly restores Discord's original application archive.

---

## 🔒 Security and Privacy

FCord is built with strong security boundaries and privacy-first engineering:

- **Hardware-Backed Encryption**: Tokens, credentials, and sensitive configurations are secured locally using Windows DPAPI and Electron `safeStorage`. Plaintext credentials never touch disk storage unencrypted.
- **Process & Storage Isolation**: Multi-account sessions run with separated local cache boundaries, avoiding token cross-contamination between accounts or client channels (Stable, PTB, Canary).
- **Anti-Log & Telemetry Control**: Built-in options to block tracking endpoints, mute unwanted typing indicators, and silently remove sent messages with zero trace in remote loggers.
- **Offline Reliability**: The installer and updater payloads run self-contained without downloading uncontrolled third-party scripts at runtime.

---

## 💬 Support

- Visit the official website: [**fhubdev.vercel.app**](https://fhubdev.vercel.app/)
- Join the [FCord Discord community](https://discord.gg/W2YgEStqJ4) for help, announcements, and discussion.
- Report reproducible issues via [GitHub Issues](https://github.com/ellecrydansmesdm/Fcord/issues).
- When reporting bugs, please include your OS, Discord channel (Stable/PTB/Canary), and relevant console logs. Never share account tokens or personal credentials.

---

## 📜 Credits and License

FCord is created and maintained by **Fahd** ([@ellecrydansmesdm](https://github.com/ellecrydansmesdm)).

The main repository is licensed under the [GNU General Public License v3.0 or later](./LICENSE). Individual components and upstream references retain their original copyright notices and licenses.

---

## ⚠️ Disclaimer

FCord is an independent project and is not affiliated with, endorsed by, or associated with Discord Inc. Using third-party client modifications may technically violate Discord's Terms of Service. Use at your own discretion. Discord and all related trademarks belong to Discord Inc.
