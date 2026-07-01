import {app, BrowserWindow, shell} from "electron";
import path from "path";
import URL from "url";
import updateInstaller from "./update_installer";

const isDevelopment = process.env.NODE_ENV !== "production";
app.name = "Fcord";

let mainWindow;

function createMainWindow() {
    const window = new BrowserWindow({
        title: "Fcord Installer",
        frame: false,
        width: 550,
        height: 350,
        resizable: false,
        fullscreenable: false,
        maximizable: false,
        backgroundColor: "#0c0d10",
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    if (isDevelopment) {
        window.webContents.openDevTools({mode: "detach"});
    }

    if (isDevelopment) {
        window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
    }
    else {
        window.loadURL(URL.format({
            pathname: path.join(__dirname, "index.html"),
            protocol: "file",
            slashes: true
        }));
    }

    window.once("ready-to-show", () => {
        window.show();
        window.focus();
    });

    window.on("closed", () => {
        mainWindow = null;
    });

    window.webContents.on("devtools-opened", () => {
        window.focus();
        setImmediate(() => {
            window.focus();
        });
    });

    window.webContents.on("new-window", (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
    });

    return window;
}

app.on("window-all-closed", () => {
    if (process.platform === "darwin") return;
    app.quit();
});

app.on("activate", () => {
    if (mainWindow !== null) return;
    mainWindow = createMainWindow();
});

app.on("ready", async () => {
    mainWindow = createMainWindow();
    if (!process.env.BD_SKIP_UPDATECHECK) updateInstaller();
});
