<div align="center">
  <img src="https://raw.githubusercontent.com/nightcordoff/nightcord/main/nightcord.ico" width="96" height="96" alt="Nightcord Logo">

  # Nightcord

  **The ultimate custom Discord client—optimized, secure, and feature-rich.**

  [![Discord](https://img.shields.io/discord/1297590739911573585?color=5865F2&label=Discord&logo=discord&logoColor=white)](https://discord.gg/nightcord)
  [![License](https://img.shields.io/github/license/nightcordoff/nightcordclient?color=a855f7)](./LICENSE)
  [![Platform](https://img.shields.io/badge/platform-Windows-3b82f6.svg?logo=windows&logoColor=white)](https://github.com/nightcordoff/nightcordclient)

  ---
</div>

Nightcord is a highly optimized, fully featured fork of [Equicord](https://github.com/Equicord/Equicord), meticulously engineered to deliver an ultra-fluid, zero-obfuscation Discord desktop experience. With powerful built-in utilities, custom styling, and exclusive capabilities, Nightcord brings you the absolute best Discord experience without compromise.

---

## ✨ Features

- **⚡ Ultimate Performance:** Completely free of heavy obfuscation and redundant bloat, resulting in significantly faster startup times and lower CPU/memory usage.
- **🔄 Silent Auto-Updates:** Seamless background update system that checks and applies updates on startup, keeping you up-to-date without interrupting your flow.
- **🔌 Advanced Plugin Engine:** Fully compatible with a vast library of plugins. Seamlessly install and load community modules directly via standard Git links.
- **🎙️ Enhanced Voice DSP:** Native integration of hardware-optimized voice modules, designed to deliver crisp, clear, and physically louder audio signals.
- **🎨 Elite Aesthetics:** Pre-configured premium styling rules, smooth hover states, glassmorphism UI touches, and custom icons.

---

## 🚀 Quick Installation (Windows)

Get up and running in seconds. Download and run our official automated installation script:

1. Download the [**`nightcord-install.ps1`**](./nightcord-install.ps1) script to your computer.
2. Right-click the file and select **Run with PowerShell**.
3. Follow the quick on-screen instructions, restart Discord, and enjoy!

---

## 🛠️ Developer Setup & Compilation

If you want to build Nightcord from source, customize modules, or contribute to development:

### Prerequisites

Ensure you have the following tools installed globally on your machine:
* [**Git**](https://git-scm.com/download)
* [**Node.JS (LTS Version)**](https://nodejs.dev/en/)
* [**pnpm Package Manager**](https://pnpm.io/installation) — Install via terminal using:
  ```bash
  npm install -g pnpm
  ```

### Build from Source

Open your terminal or command prompt and execute the following commands sequentially:

```bash
# Clone the repository
git clone https://github.com/nightcordoff/nightcordclient.git

# Navigate into the project folder
cd nightcordclient

# Install dependencies
pnpm install

# Build the client core
pnpm build
```

### Inject into Discord

Once the build is complete, inject the client into your official Discord application:

```bash
pnpm inject
```

To revert back to the original Discord client, run:
```bash
pnpm uninject
```

---

## 📜 Credits & Acknowledgements

We owe a special thank you to the brilliant developers behind [Equicord](https://github.com/Equicord/Equicord) and [Vencord](https://github.com/Vendicated/Vencord) for providing the outstanding architectural foundation that makes this project possible.

---

## ⚖️ Legal Disclaimer

*Nightcord is not affiliated with, authorized, maintained, or endorsed by Discord Inc.* 
Use of third-party clients or client modifications is technically against Discord's Terms of Service. By using Nightcord, you acknowledge that you do so at your own risk.
