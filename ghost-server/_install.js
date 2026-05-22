// Script temporaire pour installer discord-video-stream et voir ses fichiers
// Lance: node _install.js
const { execSync } = require("child_process");
try {
    execSync("npm install @dank074/discord-video-stream@latest --no-save", { stdio: "inherit", cwd: __dirname });
} catch(e) {}
