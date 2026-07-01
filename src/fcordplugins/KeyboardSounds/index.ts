/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AudioPlayerInterface, createAudioPlayer } from "@api/AudioPlayer";
import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

// @ts-ignore
import { ignoredKeys, mechvibesPacks,packs } from "./packs";

const allSounds = {
    backspaces: [] as { playing: boolean; player: AudioPlayerInterface; }[],
    caps: [] as { playing: boolean; player: AudioPlayerInterface; }[],
    enters: [] as { playing: boolean; player: AudioPlayerInterface; }[],
    arrows: [] as { playing: boolean; player: AudioPlayerInterface; }[],
    others: [] as { playing: boolean; player: AudioPlayerInterface; }[]
};

let chosenPack: typeof packs[keyof typeof packs] | null = null;
let chosenMechvibesPack: typeof mechvibesPacks[keyof typeof mechvibesPacks] | null = null;
const keysCurrentlyPressed = new Set<string>();

// Web Audio API for Mechvibes
let audioCtx: AudioContext | null = null;
let spriteBuffer: AudioBuffer | null = null;
let multiBuffers: Record<string, AudioBuffer[]> = {};

function initAudioCtx() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        initAudioCtx();
        return await audioCtx!.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error("[KeyboardSounds] Failed to load buffer:", url, e);
        return null;
    }
}

function playBuffer(buffer: AudioBuffer | null, volume: number, startOffset: number = 0, duration?: number) {
    if (!buffer || !audioCtx) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume / 100;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (duration) {
        source.start(0, startOffset, duration);
    } else {
        source.start(0, startOffset);
    }
}

const keyup = (e: KeyboardEvent | number) => {
    if (typeof e === "number") {
        keysCurrentlyPressed.delete(e.toString());
    } else {
        keysCurrentlyPressed.delete((e as KeyboardEvent).keyCode.toString());
    }
};

const playMechvibesSound = (keyCodeStr: string, volume: number) => {
    if (!chosenMechvibesPack) return;
    initAudioCtx();

    if (chosenMechvibesPack.type === "single") {
        if (!spriteBuffer || !chosenMechvibesPack.sprite) return;
        const spriteDef = chosenMechvibesPack.sprite[keyCodeStr] || chosenMechvibesPack.sprite["28"] || Object.values(chosenMechvibesPack.sprite)[0];
        if (spriteDef) {
            const start = spriteDef[0] / 1000;
            const duration = spriteDef[1] / 1000;
            playBuffer(spriteBuffer, volume, start, duration);
        }
    } else if (chosenMechvibesPack.type === "multi") {
        if (!chosenMechvibesPack.multi) return;
        let buffers = multiBuffers[keyCodeStr];
        if (!buffers || buffers.length === 0) {
            buffers = multiBuffers.default;
        }
        if (buffers && buffers.length > 0) {
            const buf = buffers[Math.floor(Math.random() * buffers.length)];
            playBuffer(buf, volume);
        }
    }
};

// Map VKey codes to Mechvibes-compatible Scan Codes (Set 1)
const vkToScan: Record<number, number> = {
    8: 14, 9: 15, 13: 28, 16: 42, 17: 29, 18: 56, 20: 58, 27: 1, 32: 57,
    33: 73, 34: 81, 35: 79, 36: 71, 37: 75, 38: 72, 39: 77, 40: 80, 46: 83,
    48: 11, 49: 2, 50: 3, 51: 4, 52: 5, 53: 6, 54: 7, 55: 8, 56: 9, 57: 10,
    65: 30, 66: 48, 67: 46, 68: 32, 69: 18, 70: 33, 71: 34, 72: 35, 73: 23,
    74: 36, 75: 37, 76: 38, 77: 50, 78: 49, 79: 24, 80: 25, 81: 16, 82: 19,
    83: 31, 84: 20, 85: 22, 86: 47, 87: 17, 88: 45, 89: 21, 90: 44
};

// Map VKey codes to KeyboardEvent.code equivalents roughly for old packs
const vkeyToCode: Record<number, string> = {
    8: "Backspace",
    13: "Enter",
    20: "CapsLock",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown"
};

const keydown = (e: KeyboardEvent | number) => {
    const isGlobal = typeof e === "number";
    const vkCode = isGlobal ? e : (e as KeyboardEvent).keyCode;
    const codeStr = vkCode.toString();
    const scanCodeStr = (vkToScan[vkCode] || vkCode).toString();
    const keyStr = isGlobal ? "" : (e as KeyboardEvent).key;
    const abstractCode = isGlobal ? (vkeyToCode[vkCode] || "Other") : (e as KeyboardEvent).code;

    if (!chosenPack && !chosenMechvibesPack) return;

    if (chosenPack) {
        if (ignoredKeys.includes(abstractCode) && !chosenPack.allowedIgnored?.includes(keyStr)) return;
    }

    if (keysCurrentlyPressed.has(codeStr)) return;
    keysCurrentlyPressed.add(codeStr);

    if (chosenMechvibesPack) {
        playMechvibesSound(scanCodeStr, settings.store.volume);
        return;
    }

    // Original Discord AudioPlayer logic for old packs
    function getRandomSound(soundsArray: { playing: boolean; player: AudioPlayerInterface; }[]) {
        const nonplayingSounds = soundsArray.filter(sound => !sound?.playing);
        let randomIndex;
        let chosenSound;

        if (nonplayingSounds.length) {
            randomIndex = Math.floor(Math.random() * nonplayingSounds.length);
            chosenSound = nonplayingSounds[randomIndex];
        } else {
            randomIndex = Math.floor(Math.random() * soundsArray.length);
            chosenSound = soundsArray[randomIndex];
        }

        if (chosenSound) {
            chosenSound.playing = true;
            chosenSound.player.restart();
        }
    }

    if (abstractCode === "Backspace" && allSounds.backspaces.length) {
        getRandomSound(allSounds.backspaces);
    } else if (abstractCode === "CapsLock" && allSounds.caps.length) {
        getRandomSound(allSounds.caps);
    } else if (abstractCode === "Enter" && allSounds.enters.length) {
        getRandomSound(allSounds.enters);
    } else if (["ArrowUp", "ArrowRight", "ArrowLeft", "ArrowDown"].includes(abstractCode) && allSounds.arrows.length) {
        getRandomSound(allSounds.arrows);
    } else if (allSounds.others.length) {
        getRandomSound(allSounds.others);
    }
};

function clearSounds() {
    Array.from(Object.values(allSounds)).forEach(soundsArray => { soundsArray.forEach(sound => sound.player.delete()); });
    Object.keys(allSounds).forEach(key => { allSounds[key as keyof typeof allSounds] = []; });
    spriteBuffer = null;
    multiBuffers = {};
}

async function assignSounds(volume: number, packId: string) {
    clearSounds();
    chosenPack = packs[packId as keyof typeof packs] || null;
    chosenMechvibesPack = mechvibesPacks[packId as keyof typeof mechvibesPacks] || null;

    if (chosenMechvibesPack) {
        if (chosenMechvibesPack.type === "single" && chosenMechvibesPack.src) {
            spriteBuffer = await loadBuffer(chosenMechvibesPack.src);
        } else if (chosenMechvibesPack.type === "multi" && chosenMechvibesPack.multi) {
            const { multi } = chosenMechvibesPack;
            // Load default random sounds (e.g. GENERIC_R{0-4}.mp3)
            const defaultMatch = multi.sound.match(/\{(\d+)-(\d+)\}/);
            const defaultUrls: string[] = [];
            if (defaultMatch) {
                const start = parseInt(defaultMatch[1]);
                const end = parseInt(defaultMatch[2]);
                for (let i = start; i <= end; i++) {
                    defaultUrls.push(multi.sound.replace(defaultMatch[0], i.toString()));
                }
            } else {
                defaultUrls.push(multi.sound);
            }

            const defBufs = (await Promise.all(defaultUrls.map(u => loadBuffer(u)))).filter(b => b !== null) as AudioBuffer[];
            multiBuffers.default = defBufs;

            // Load specifics
            for (const [key, url] of Object.entries(multi.defines)) {
                if (!key.endsWith("-up")) {
                    const b = await loadBuffer(url);
                    if (b) multiBuffers[key] = [b];
                }
            }
        }
        return;
    }

    if (!chosenPack) return;

    function addSounds(key: keyof typeof allSounds) {
        if (!chosenPack![key]) return;
        let soundIndex = -1;

        for (let i = 0; i < 3; i++) {
            for (const url of chosenPack![key]) {
                soundIndex++;
                const idx = soundIndex;

                allSounds[key].push({
                    playing: false,
                    player: createAudioPlayer(url, {
                        volume,
                        preload: true,
                        persistent: true,
                        onEnded: () => { allSounds[key][idx].playing = false; }
                    })
                });
            }
        }
    }

    chosenPack.backspaces && addSounds("backspaces");
    chosenPack.caps && addSounds("caps");
    chosenPack.enters && addSounds("enters");
    chosenPack.arrows && addSounds("arrows");
    chosenPack.others && addSounds("others");
}

const packOptions = [
    { label: "OperaGX", value: "operagx", default: true },
    { label: "osu!", value: "osu" }
];
Object.keys(mechvibesPacks).forEach(k => {
    packOptions.push({ label: `[MV] ${mechvibesPacks[k].name}`, value: k });
});

const settings = definePluginSettings({
    volume: {
        description: "Volume of the keyboard sounds.",
        type: OptionType.SLIDER,
        markers: [0, 50, 100, 150, 200],
        stickToMarkers: false,
        default: 120,
        max: 200,
        onChange: value => { assignSounds(value, settings.store.soundPack); }
    },
    soundPack: {
        description: "Sound pack to use.",
        type: OptionType.SELECT,
        options: packOptions,
        onChange: value => { assignSounds(settings.store.volume, value); }
    }
});

export default definePlugin({
    name: "KeyboardSounds",
    description: "Adds OperaGX, osu! or Mechvibes sound effects when typing on your keyboard.",
    tags: ["Fun"],
    authors: [Devs.HypedDomi, EquicordDevs.Etorix],
    dependencies: ["AudioPlayerAPI"],
    settings,
    enabledByDefault: false,
    start() {
        assignSounds(settings.store.volume, settings.store.soundPack);
        document.addEventListener("keyup", keyup as EventListener);
        document.addEventListener("keydown", keydown as EventListener);
    },
    stop: () => {
        clearSounds();
        document.removeEventListener("keyup", keyup as EventListener);
        document.removeEventListener("keydown", keydown as EventListener);
    },
});
