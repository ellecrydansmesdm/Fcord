#!/usr/bin/env bash
# ─── Nightcord — Publier une nouvelle release sur Gitea ──────────────────────
# Usage : ./publish-release.sh 1.18.1 "Description des changements"
# Necessite : pnpm, node, dotnet SDK, curl, zip, git
#
# Auth : token Gitea dans ~/.gitea_token  (une seule ligne, aucun espace)
#        Creer le fichier : echo "votre_token" > ~/.gitea_token

set -euo pipefail

VERSION="${1:-}"
NOTES="${2:-}"

if [[ -z "$VERSION" ]]; then
    echo "[ERREUR] Usage: ./publish-release.sh VERSION \"Notes de version\""
    echo "Exemple : ./publish-release.sh 1.18.1 \"Correction bug audio\""
    exit 1
fi

[[ -z "$NOTES" ]] && NOTES="Nightcord $VERSION"

# ── Config Gitea ──────────────────────────────────────────────────────────────
GITEA_URL="https://git.nightcord.ru"
GITEA_REPO="nightcord/nightcord"
GITEA_API="$GITEA_URL/api/v1"

# ── Lecture du token depuis le fichier local (non versionne) ──────────────────
TOKEN_FILE="$HOME/.gitea_token"
if [[ ! -f "$TOKEN_FILE" ]]; then
    echo "[ERREUR] Fichier de token introuvable : $TOKEN_FILE"
    echo "Creez-le avec : echo \"votre_token_gitea\" > \"$TOKEN_FILE\""
    echo "Generez un token sur : $GITEA_URL/user/settings/applications"
    exit 1
fi

GITEA_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"

if [[ -z "$GITEA_TOKEN" ]]; then
    echo "[ERREUR] Le fichier $TOKEN_FILE est vide."
    exit 1
fi

# ── Chemins de sortie ─────────────────────────────────────────────────────────
DIST_DIR="dist/desktop"
OUT_DIR="release/installer"
DIST_ZIP="$OUT_DIR/nightcord-dist.zip"
INSTALLER_EXE="$OUT_DIR/Nightcord-Installer.exe"
VERSION_JSON="$OUT_DIR/version.json"
DESKTOP_ASAR="dist/desktop.asar"

echo ""
echo " ╔═══════════════════════════════════════════════════╗"
echo " ║    NIGHTCORD — Publication release v$VERSION"
echo " ╚═══════════════════════════════════════════════════╝"
echo ""

# ── 1. Mise à jour des versions dans les fichiers ─────────────────────────────
echo " [1/8] Mise a jour de la version vers $VERSION..."

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4) + '\n', 'utf8');
"

echo " [1/8] Version mise a jour."

# ── 2. Envoi du code source sur Gitea ─────────────────────────────────────────
echo ""
echo " [2/8] Committer et pusher le code source..."

git add .

if ! git diff --quiet --cached; then
    git commit -m "build: release v$VERSION - $NOTES"
else
    echo " Aucun changement a committer."
fi

if ! git push --set-upstream origin master; then
    echo " [ERREUR] Impossible de push sur Gitea. Verifiez vos identifiants/droits d'acces."
    exit 1
fi

echo " [2/8] Code source synchronise avec Gitea."

# ── 3. Build JS (avec obfuscation automatique) ────────────────────────────────
echo ""
echo " [3/8] Build + obfuscation en cours..."

pkill -f "Discord" 2>/dev/null || true
sleep 2

if ! pnpm build; then
    echo " [ERREUR] pnpm build a echoue."
    exit 1
fi

echo " [3/8] Build + obfuscation termines !"

# ── 4. Preparer les assets supplementaires ────────────────────────────────────
echo ""
echo " [4/8] Copie des assets (ffmpeg, node, modules...) vers $DIST_DIR..."

node scripts/build/collect-assets.mjs

echo " [4/8] Assets copies."

# ── 5. Compiler Nightcord-Installer.exe ──────────────────────────────────────
echo ""
echo " [5/8] Compilation de Nightcord-Installer.exe..."

mkdir -p "$OUT_DIR"

if command -v pwsh >/dev/null 2>&1; then
    pwsh -NoProfile -ExecutionPolicy Bypass -File "build-installer.ps1"
elif command -v powershell >/dev/null 2>&1; then
    powershell -NoProfile -ExecutionPolicy Bypass -File "build-installer.ps1"
elif [[ -x "./build-installer.sh" ]]; then
    ./build-installer.sh
else
    echo " [ERREUR] Aucun build-installer compatible trouve (pwsh, powershell ou build-installer.sh)."
    exit 1
fi

if [[ ! -f "$INSTALLER_EXE" ]]; then
    echo " [ERREUR] Nightcord-Installer.exe introuvable apres compilation."
    exit 1
fi

INSTALLER_SIZE=$(stat -c%s "$INSTALLER_EXE" 2>/dev/null || stat -f%z "$INSTALLER_EXE")
echo " [5/8] Nightcord-Installer.exe cree ($INSTALLER_SIZE octets)"

# ── 6. Créer nightcord-dist.zip ──────────────────────────────────────────────
echo ""
echo " [6/8] Creation de nightcord-dist.zip..."

if [[ ! -f "$DIST_DIR/patcher.js" ]]; then
    echo " [ERREUR] dist/desktop/patcher.js introuvable."
    exit 1
fi

[[ -f "$DIST_ZIP" ]] && rm -f "$DIST_ZIP"

find "$DIST_DIR" -name "*.map"       -delete
find "$DIST_DIR" -name "*.LEGAL.txt" -delete

if ! node scripts/build/verify-dist.mjs; then
    echo " [ERREUR] Verification du dist echouee - @babel manquant ou incomplet."
    exit 1
fi

(cd "$DIST_DIR" && zip -r -9 "../../$DIST_ZIP" .)

if [[ ! -f "$DIST_ZIP" ]]; then
    echo " [ERREUR] Impossible de creer nightcord-dist.zip"
    exit 1
fi

DIST_ZIP_SIZE=$(stat -c%s "$DIST_ZIP" 2>/dev/null || stat -f%z "$DIST_ZIP")
echo " [6/8] nightcord-dist.zip cree ($DIST_ZIP_SIZE octets)"

# ── 7. Mettre à jour version.json ─────────────────────────────────────────────
echo ""
echo " [7/8] Mise a jour de version.json..."

ISO_DATE=$(date +%Y-%m-%d)

cat > "$VERSION_JSON" <<EOF
{
  "version": "$VERSION",
  "releaseDate": "$ISO_DATE",
  "installerUrl": "$GITEA_URL/$GITEA_REPO/releases/download/v$VERSION/Nightcord-Installer.exe",
  "distUrl": "$GITEA_URL/$GITEA_REPO/releases/download/v$VERSION/nightcord-dist.zip",
  "downloadUrl": "$GITEA_URL/$GITEA_REPO/releases/download/v$VERSION/desktop.asar",
  "changelog": "$NOTES"
}
EOF

echo " [7/8] version.json mis a jour."

# ── 8. Publier sur Gitea Releases ─────────────────────────────────────────────
echo ""
echo " [8/8] Creation de la release v$VERSION sur Gitea..."

# 8a. Créer la release via API Gitea
RELEASE_RESPONSE=$(curl -s -X POST "$GITEA_API/repos/$GITEA_REPO/releases" \
    -H "Authorization: token $GITEA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
  \"tag_name\": \"v$VERSION\",
  \"name\": \"Nightcord v$VERSION\",
  \"body\": \"$NOTES\",
  \"draft\": false,
  \"prerelease\": false
}")

# 8b. Extraire l'ID de la release
RELEASE_ID=$(printf '%s' "$RELEASE_RESPONSE" | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { try { const parsed = JSON.parse(d); if (parsed && parsed.id != null) console.log(parsed.id); } catch (e) { process.exit(1); } });")

if [[ -z "$RELEASE_ID" ]]; then
    echo " [ERREUR] Impossible de recuperer l'ID de la release Gitea."
    echo "$RELEASE_RESPONSE"
    exit 1
fi

echo " Release Gitea creee (ID: $RELEASE_ID)"

# Helper upload
upload_asset() {
    local FILE="$1"
    local NAME="$2"
    local MIME="$3"
    echo " Upload de $NAME..."
    curl -s -X POST "$GITEA_API/repos/$GITEA_REPO/releases/$RELEASE_ID/assets?name=$NAME" \
        -H "Authorization: token $GITEA_TOKEN" \
        -H "Content-Type: $MIME" \
        --data-binary "@$FILE" > /dev/null \
    || { echo " [ERREUR] Upload $NAME echoue."; exit 1; }
}

# 8c. Upload des assets
upload_asset "$INSTALLER_EXE" "Nightcord-Installer.exe" "application/octet-stream"
upload_asset "$DIST_ZIP"      "nightcord-dist.zip"      "application/zip"
upload_asset "$DESKTOP_ASAR"  "desktop.asar"            "application/octet-stream"
upload_asset "$VERSION_JSON"  "version.json"            "application/json"

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo " ╔═══════════════════════════════════════════════════════════════════════╗"
echo " ║  Nightcord v$VERSION publie avec succes sur Gitea !"
echo " ║"
echo " ║  URL : $GITEA_URL/$GITEA_REPO/releases/tag/v$VERSION"
echo " ║"
echo " ║  Fichiers publies :"
echo " ║    Nightcord-Installer.exe    — installeur .exe avec GUI"
echo " ║    nightcord-dist.zip         — JS obfusques (pour l'injec.)"
echo " ║    desktop.asar               — asar Discord patcher"
echo " ║    version.json               — metadonnees de version"
echo " ╚═══════════════════════════════════════════════════════════════════════╝"
echo ""