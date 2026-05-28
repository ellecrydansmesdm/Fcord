<div align="center">
  <img src="https://raw.githubusercontent.com/nightcordfr/nightcord/main/nightcord.ico" width="96" height="96" alt="Nightcord Logo">

  # Nightcord

  **A custom Discord client built for people who actually care about how Discord runs.**

  [![Discord](https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/nightcord)
  [![License](https://img.shields.io/github/license/nightcordfr/nightcord?color=a855f7)](./LICENSE)
  [![Platform](https://img.shields.io/badge/platform-Windows-3b82f6.svg?logo=windows&logoColor=white)](https://github.com/nightcordfr/nightcord)
  [![Website](https://img.shields.io/badge/website-nightcord.online-5865F2?logo=googlechrome&logoColor=white)](https://nightcord.online)

  ---
</div>

Nightcord is a fork of [Equicord](https://github.com/Equicord/Equicord), which itself builds on top of [Vencord](https://github.com/Vendicated/Vencord). We stripped out the obfuscation, cleaned things up, added our own stuff, and kept what works. No bloat, no nonsense.

---

## What's in it

- **Faster startup** — no obfuscation means the client loads noticeably quicker and sits lighter on your CPU and RAM.
- **Auto-updates** — checks for updates in the background on launch and applies them silently. You don't have to think about it.
- **Plugin support** — compatible with the existing plugin ecosystem. Install community plugins straight from Git links.
- **Better audio** — hardware-optimized voice modules for cleaner, louder audio out of the box.
- **Custom styling** — our own visual tweaks on top of the base: smoother UI, custom icons, a few quality-of-life details here and there.

---

## Installation (Windows)

1. Download [**`nightcord-install.ps1`**](./nightcord-install.ps1)
2. Right-click → **Run with PowerShell**
3. Follow the steps, restart Discord, done.

---

## Building from source

If you want to dig into the code or build it yourself:

**You'll need:**
- [Git](https://git-scm.com/download)
- [Node.js (LTS)](https://nodejs.dev/en/)
- [pnpm](https://pnpm.io/installation) — `npm install -g pnpm`

```bash
git clone https://github.com/nightcordfr/nightcord.git
cd nightcord
pnpm install
pnpm build
```

Then inject into Discord:

```bash
pnpm inject
```

To go back to stock Discord:

```bash
pnpm uninject
```

---

## Credits

Nightcord wouldn't exist without [Equicord](https://github.com/Equicord/Equicord) and [Vencord](https://github.com/Vendicated/Vencord). A huge chunk of what makes this work comes directly from their projects. We're fully aware of that and genuinely appreciate everything they've built — we're just taking it in a different direction. Big thanks to everyone who's contributed to both.

---

## Disclaimer

*Nightcord is not affiliated with Discord Inc. in any way.*
Using third-party clients is technically against Discord's Terms of Service. You're doing this at your own risk.
