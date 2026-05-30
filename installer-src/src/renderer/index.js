import App from "./App.svelte";

const appElement = document.getElementById("app");
const app = new App({
    target: appElement
});

// Violet dot-grid background
const bgSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><circle cx='30' cy='30' r='1.5' fill='%238b5cf6' fill-opacity='0.7'/></svg>`;
appElement.style.setProperty("--background", `url("data:image/svg+xml,${bgSvg}")`);


window.refresh = () => window.location.href = `http://${window.location.host}/`;


// Disable user zooming

window.addEventListener("keydown", (e) => {
    if ((e.code === "Minus" || e.code === "Equal") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
    }
});

export default app;