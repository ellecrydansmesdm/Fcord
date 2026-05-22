/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const packs = {
    "operagx": {
        others: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/click1.wav",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/click2.wav",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/click3.wav"
        ],
        backspaces: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/backspace.wav"
        ]
    },
    "osu": {
        others: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-1.mp3",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-2.mp3",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-3.mp3",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-4.mp3"
        ],
        backspaces: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-delete.mp3"
        ],
        caps: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-caps.mp3"
        ],
        enters: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-confirm.mp3"
        ],
        arrows: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-movement.mp3"
        ],
        allowedIgnored: [
            "CapsLock",
            "ArrowUp",
            "ArrowRight",
            "ArrowLeft",
            "ArrowDown"
        ]
    }
} as Record<"operagx" | "osu", {
    others: string[];
    backspaces: string[];
    caps?: string[];
    enters?: string[];
    arrows?: string[];
    allowedIgnored?: string[];
}>;

export const ignoredKeys = [
    "CapsLock",
    "ShiftLeft",
    "ShiftRight",
    "ControlLeft",
    "ControlRight",
    "AltLeft",
    "AltRight",
    "MetaLeft",
    "MetaRight",
    "ArrowUp",
    "ArrowRight",
    "ArrowLeft",
    "ArrowDown",
    "MediaPlayPause",
    "MediaStop",
    "MediaTrackNext",
    "MediaTrackPrevious",
    "MediaSelect",
    "MediaEject",
    "MediaVolumeUp",
    "MediaVolumeDown",
    "AudioVolumeUp",
    "AudioVolumeDown"
];

const baseUrl = "https://raw.githubusercontent.com/nightcordoff/sounds/main/sounds/";

const commonDefines = {
    "1": "q.wav", "2": "w.wav", "3": "e.wav", "4": "e.wav", "5": "r.wav", "6": "t.wav", "7": "y.wav", "8": "u.wav", "9": "i.wav", "10": "o.wav", "11": "p.wav", "12": "[.wav", "13": "].wav", "14": "backspace.wav", "15": "tab.wav", "16": "q.wav", "17": "w.wav", "18": "e.wav", "19": "r.wav", "20": "t.wav", "21": "y.wav", "22": "u.wav", "23": "i.wav", "24": "o.wav", "25": "p.wav", "26": "[.wav", "27": "].wav", "28": "enter.wav", "29": "tab.wav", "30": "a.wav", "31": "s.wav", "32": "d.wav", "33": "f.wav", "34": "g.wav", "35": "h.wav", "36": "j.wav", "37": "k.wav", "38": "l.wav", "39": "[.wav", "40": "].wav", "41": "q.wav", "42": "shift.wav", "43": "backspace.wav", "44": "z.wav", "45": "x.wav", "46": "c.wav", "47": "v.wav", "48": "b.wav", "49": "n.wav", "50": "m.wav", "51": "l.wav", "52": "[.wav", "53": "].wav", "54": "shift.wav", "55": "o.wav", "56": "e.wav", "57": "space.wav", "58": "caps lock.wav", "59": "w.wav", "60": "e.wav", "61": "e.wav", "62": "r.wav", "63": "t.wav", "64": "y.wav", "65": "u.wav", "66": "i.wav", "67": "o.wav", "68": "p.wav", "69": "u.wav", "70": "i.wav", "71": "y.wav", "72": "u.wav", "73": "i.wav", "74": "p.wav", "75": "h.wav", "76": "j.wav", "77": "k.wav", "78": "enter.wav", "79": "b.wav", "80": "n.wav", "81": "m.wav", "82": "shift.wav", "83": "[.wav", "87": "].wav", "88": "].wav", "3612": "shift.wav", "3613": "backspace.wav", "3637": "i.wav", "3639": "u.wav", "3640": "p.wav", "3653": "o.wav", "3655": "h.wav", "3657": "k.wav", "3663": "n.wav", "3665": "m.wav", "3666": "h.wav", "3667": "b.wav", "3675": "q.wav", "3676": "[.wav", "3677": "].wav", "57416": "g.wav", "57419": "c.wav", "57421": "b.wav", "57424": "v.wav", "60999": "h.wav", "61000": "g.wav", "61001": "k.wav", "61003": "c.wav", "61005": "b.wav", "61007": "n.wav", "61008": "v.wav", "61009": "m.wav", "61010": "h.wav", "61011": "b.wav"
};

const buildPack = (folder: string, id: string, name: string, generic: string, customDefines?: Record<string, string>) => {
    const defines: Record<string, string> = {};
    const base = `${baseUrl}${encodeURIComponent(folder)}/`;
    
    if (customDefines) {
        Object.entries(customDefines).forEach(([k, v]) => {
            defines[k] = `${base}${v}`;
        });
    } else {
        Object.entries(commonDefines).forEach(([k, v]) => {
            let filename = v;
            if (id === 'banana-split') filename = `banana-l-${(parseInt(k) % 6) + 1}.wav`;
            if (id === 'mx-speed-silver') filename = `mx-speed-silver-${(parseInt(k) % 6) + 1}.wav`;
            defines[k] = `${base}${filename}`;
        });
    }

    return {
        name,
        type: "multi",
        multi: {
            sound: `${base}${generic}`,
            defines
        }
    };
};

export const mechvibesPacks: Record<string, any> = {
    "razer-green": buildPack("Razer Green (Blackwidow Elite) - Akira", "razer-green", "Razer Green (Akira)", "key1.wav", {
        "1": "ctrl.wav", "2": "key1.wav", "3": "key2.wav", "4": "key3.wav", "5": "key4.wav", "6": "key5.wav", "7": "key6.wav", "8": "key1.wav", "9": "key2.wav", "10": "key3.wav", "11": "key4.wav", "12": "key5.wav", "13": "key6.wav", "14": "back.wav", "15": "rshift.wav", "16": "key1.wav", "17": "key2.wav", "18": "key3.wav", "19": "key4.wav", "20": "key5.wav", "21": "key6.wav", "22": "key1.wav", "23": "key2.wav", "24": "key3.wav", "25": "key4.wav", "26": "key5.wav", "27": "key6.wav", "28": "ent.wav", "29": "ctrl.wav", "30": "key1.wav", "31": "key2.wav", "32": "key3.wav", "33": "key4.wav", "34": "key5.wav", "35": "key6.wav", "36": "key1.wav", "37": "key2.wav", "38": "key3.wav", "39": "key4.wav", "40": "key5.wav", "41": "key6.wav", "42": "shift.wav", "43": "key1.wav", "44": "key2.wav", "45": "key3.wav", "46": "key4.wav", "47": "key5.wav", "48": "key6.wav", "49": "key1.wav", "50": "key2.wav", "51": "key3.wav", "52": "key4.wav", "53": "key5.wav", "54": "shift.wav", "55": "ctrl.wav", "56": "alt.wav", "57": "space1.wav", "58": "rshift.wav", "74": "alt.wav", "78": "space.wav", "3612": "ent.wav", "3613": "ctrl.wav", "3640": "alt.wav", "3675": "nO.wav", "3676": "nO.wav", "3677": "nO.wav"
    }),
    "banana-split": buildPack("banana split lubed", "banana-split", "Banana Split (Akira)", "banana-l-1.wav"),
    "mx-speed-silver": buildPack("mx-speed-silver", "mx-speed-silver", "MX Speed Silver (Akira)", "mx-speed-silver-1.wav"),
    "nk-cream": buildPack("nk-cream", "nk-cream", "NK Cream (Akira)", "sound.ogg")
};
