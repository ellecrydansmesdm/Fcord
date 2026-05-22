import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const MediaEngineStore = findByPropsLazy("getMediaEngine", "isKrispAvailable");
const NativeModuleStore = findByPropsLazy("requireModule");

export default definePlugin({
    name: "FixKrisp",
    description: "Forces Krisp (Noise Suppression) to be available by patching MediaEngine and eligibility checks.",
    authors: [{ name: "Nightcord", id: 0n }],
    enabledByDefault: true,
    required: true,

    start() {
        console.log("[FixKrisp] Forcing Krisp eligibility...");

        // Deep hook into Native modules to trick the UI before it even renders
        const script = document.createElement("script");
        script.textContent = `
            (function() {
                const patchNative = () => {
                    if (!window.DiscordNative?.nativeModules?.requireModule) return;
                    
                    const originalRequire = window.DiscordNative.nativeModules.requireModule;
                    window.DiscordNative.nativeModules.requireModule = function(name) {
                        const module = originalRequire.apply(this, arguments);
                        if (name === "discord_voice" && module) {
                            // Intercept Krisp availability at the native level
                            const originalGetSupportsKrisp = module.getSupportsKrisp;
                            module.getSupportsKrisp = () => true;
                            
                            // Force krisp to be considered as 'installed' and 'ready'
                            if (module.getKrispModelPath) {
                                const originalPath = module.getKrispModelPath;
                                module.getKrispModelPath = (cb) => {
                                    if (typeof cb === 'function') cb("found");
                                    return "found";
                                };
                            }
                        }
                        return module;
                    };
                    console.log("[FixKrisp] Native Voice Module Hooked");
                };

                const forceKrisp = () => {
                    try {
                        // Force MediaEngineStore properties
                        const stores = window.Vencord?.Webpack?.findByProps("getMediaEngine", "isKrispAvailable");
                        if (stores) {
                            if (stores.isKrispAvailable() !== true) {
                                Object.defineProperty(stores, 'isKrispAvailable', { get: () => true, configurable: true });
                                Object.defineProperty(stores, 'isKrispSupported', { get: () => true, configurable: true });
                            }
                        }

                        // Force Experiment eligibility
                        const experiments = window.Vencord?.Webpack?.findByProps("getKrispExperiment");
                        if (experiments && experiments.getKrispExperiment) {
                            const res = experiments.getKrispExperiment();
                            if (res) res.eligible = true;
                        }
                    } catch (e) {}
                };
                
                patchNative();
                setInterval(forceKrisp, 3000);
                forceKrisp();
            })();
        `;
        document.head.appendChild(script);

        // Ensure UI displays it
        const style = document.createElement("style");
        style.textContent = `
            [aria-label*="Krisp"], [aria-label*="Noise"], [aria-label*="Bruit"], [aria-label*="Réduction"],
            button[class*="noiseCancellation"], div[class*="noiseCancellation"] {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: auto !important;
                height: auto !important;
            }
        `;
        document.head.appendChild(style);
    },

    patches: [
        {
            // Force MediaEngine to report Krisp as available and supported
            find: "MediaEngineStore",
            replacement: [
                {
                    // Force isKrispAvailable() to return true
                    match: /isKrispAvailable\(\){return !?1}/,
                    replace: "isKrispAvailable(){return true}"
                },
                {
                    // Force isKrispSupported() to return true
                    match: /isKrispSupported\(\){return !?1}/,
                    replace: "isKrispSupported(){return true}"
                },
                {
                    // Bypass the "is eligible" check for the Krisp experiment
                    match: /getIsEligible\(\){return !?1}/,
                    replace: "getIsEligible(){return true}"
                },
                {
                    // Force setKrispEnabled to always succeed
                    match: /setKrispEnabled\(\i\){/,
                    replace: "$&return Promise.resolve({ok:true});"
                }
            ]
        },
        {
            // Force Experiment eligibility
            find: "getKrispExperiment",
            replacement: {
                match: /eligible:!?1/g,
                replace: "eligible:true"
            }
        },
        {
            // Patch the UI component for Noise Suppression to include Krisp
            find: "NoiseCancellationLocations",
            replacement: [
                {
                    match: /isEligible:!?1/g,
                    replace: "isEligible:true"
                },
                {
                    match: /isKrispAvailable:!?1/g,
                    replace: "isKrispAvailable:true"
                }
            ]
        }
    ]
});
