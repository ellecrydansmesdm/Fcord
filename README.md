<p align="center"><img src="./assets/logo.png" alt="FCord" width="140"></p>

# FCord

FCord adds a configurable plugin catalog, themes, profile customization and optional media tools to the official Discord client. Developed by [Fahd](https://github.com/ellecrydansmesdm).

[Download FCord 1.7.0 for Windows x64](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/FCord-Setup-1.7.0.exe) · [Release notes](https://github.com/ellecrydansmesdm/Fcord/releases/tag/v1.7.0) · [Website](https://fhubcore.dev/fcord) · [Community support](https://discord.gg/W2YgEStqJ4)

## Current release

FCord **1.7.0** (November 28, 2026) brings a new Themes tab built on a catalog of themes tested in a real Discord (with their compatibility with Discord's Light, Ash, Dark and Onyx appearances), a wallpaper gallery, much lower CPU use with many plugins enabled, an installer that no longer starts PowerShell, and many fixes from community reports. Windows x64 is the Stable release; Linux x64, macOS (Apple Silicon and Intel, not notarized), Chromium and a Mozilla-signed Firefox extension are Beta builds.

| Available asset | Channel | Purpose |
| --- | --- | --- |
| [FCord-Setup-1.7.0.exe](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/FCord-Setup-1.7.0.exe) | Stable | Windows 10 / 11 x64 installer with Install, Repair and Uninstall |
| [fcord-dist.zip](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/fcord-dist.zip) | Stable | Windows x64 payload used by the installer and the in-client updater |
| [FCord-Setup-1.7.0-linux-x64.deb](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/FCord-Setup-1.7.0-linux-x64.deb) | Beta | Debian / Ubuntu x64 installer package |
| [FCord-Setup-1.7.0-linux-x64.AppImage](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/FCord-Setup-1.7.0-linux-x64.AppImage) | Beta | Linux x64 portable AppImage installer |
| [FCord-Setup-1.7.0-macos-arm64.dmg](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/FCord-Setup-1.7.0-macos-arm64.dmg) | Beta | macOS Apple Silicon disk image (not notarized) |
| [FCord-Setup-1.7.0-macos-x64.dmg](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/FCord-Setup-1.7.0-macos-x64.dmg) | Beta | macOS Intel disk image (not notarized) |
| [FCord-1.7.0-chromium.zip](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/FCord-1.7.0-chromium.zip) | Beta | Unpacked Chromium MV3 browser extension archive |
| [FCord-1.7.0-firefox.xpi](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/FCord-1.7.0-firefox.xpi) | Beta | Firefox extension signed by Mozilla (Firefox 140 or newer): open the file in Firefox to install it |
| [checksums.txt](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/checksums.txt) | — | SHA-256 hashes of all release files |
| [release-manifest.json](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/release-manifest.json) | — | Ed25519-signed update metadata |
| [download-manifest.json](https://github.com/ellecrydansmesdm/Fcord/releases/download/v1.7.0/download-manifest.json) | — | Machine-readable download selection and channels |

SHA-256 of `FCord-Setup-1.7.0.exe`: `9b59e0807cb4f88f32d6774203435717cb678517420feecef83f0a916160bd48`

Windows 10 / 11 (x64) is physically validated (Stable). Linux x64, macOS (Apple Silicon and Intel, not notarized) and Chromium MV3 are validated automatically in CI against the official Discord client and published as Beta. The Firefox extension is signed by Mozilla and checked in Firefox (permanent install, load on Discord, settings kept), also published as Beta.

## Install or repair

1. Install the official Discord channel you use, and open it once. Stable, Canary and PTB are supported.
2. Close that Discord channel. Other Discord channels can stay open.
3. Download the installer above and compare its SHA-256 with `checksums.txt`.
4. Run Setup, select the Discord channel, then choose **Install**. Use **Repair** for an existing FCord installation, including after an official Discord update.
5. Open Discord and find FCord in User Settings.

On Windows, the installer requires Microsoft Edge WebView2. The release manifests are Ed25519-signed; the Windows executable has no Authenticode signature and the macOS disk images are not notarized, so Windows SmartScreen or macOS Gatekeeper shows an unknown-publisher prompt the first time. Do not disable antivirus or delete Discord modules to work around an installation failure: keep the diagnostic and use Repair or support.

## Updates and removal

From 1.4.0, FCord shows a notice when a new version is published and installs it from inside the client. A corrupt, incomplete, wrongly signed or older update is refused without changing anything.

**Upgrading from 1.6.7, 1.6.6, 1.6.5, 1.6.1, 1.6.0, 1.5.1, 1.5.0, 1.4.8, 1.4.7, 1.4.6, 1.4.5 or 1.4.0:** select **Install** in the update notice, then **Restart**. Settings, plugins, themes and saved accounts are kept. On a very busy PC the 1.4.0 updater can stop on "runtime lock timed out"; nothing is changed in that case: select Retry, or close Discord and run `FCord-Setup-1.7.0.exe`, which installs over it and keeps everything. After going back from 1.4.6 to 1.4.5, sign in to FCord Cloud again. If you used AutoDeleter's automatic deletion, turn it on again once after updating to 1.7.0 (its option was renamed).

**Upgrading from 1.3.x:** close Discord and run `FCord-Setup-1.7.0.exe`. Settings, plugins and QuickCSS are kept; the 1.3.x in-client updater does not work with the current Discord.

**Uninstall** restores Discord's original `app.asar` for the selected channel. Personal Discord data and FCord settings are kept. Do not manually remove `app.asar`, `_app.asar`, `build_info.json` or module folders.

Public release assets are immutable. A later correction receives a new public version; an existing binary is not silently replaced under the same tag.

## Known limits

- Plugins rely on Discord's internal code and can stop working after a Discord update until FCord is updated. Some optional plugins are less tested than the default set.
- Client modifications are not endorsed by Discord. Plugins that automate actions can put an account at risk; use them knowingly.
- Settings exports made with FCord 1.4.5 or older could contain account tokens. If you shared one, change the password of each Discord account it covered (this signs out every session) and sign in to FCord Cloud again. The [1.4.6 release notes](https://github.com/ellecrydansmesdm/Fcord/releases/tag/v1.4.6) give the details.
- See the [release notes](https://github.com/ellecrydansmesdm/Fcord/releases/tag/v1.7.0) for the exact scope of this version.

## License and source code

- **Why the development repository is private**: this is the developer's choice. It protects the project's identity, discourages opportunistic copies, rebranded builds and distributions that pass themselves off as FCord, and lets development continue calmly. The repository may be opened to the public in the future; no date has been announced.
- **License**: FCord's desktop runtime contains code from Vencord and other projects licensed under GPL-3.0-or-later, and is distributed under that license ([LICENSE](LICENSE), [NOTICE](NOTICE.txt)).
- **Source code of releases**: the private development repository (history, branches, work in progress) is not published. What the GPL requires is the source code of each release, which is provided on request for at least three years: open an issue titled "Source code request" with the version number.
- **Name and logo**: the FCord name, logo and mascot are not covered by the GPL (section 7(e)). Modified or unofficial builds must not use them or present themselves as FCord.

## Support

Report the FCord version, Discord channel and version, the operation attempted and the displayed error through [community support](https://discord.gg/W2YgEStqJ4). A sanitized installation diagnostic is useful. Never send a Discord token, password, cookie, session folder or two-factor code.

[Website](https://fhubcore.dev/) · [Plugin catalog](https://fhubcore.dev/plugins) · [Documentation](https://fhubcore.dev/documentation) · [All releases](https://github.com/ellecrydansmesdm/Fcord/releases)
