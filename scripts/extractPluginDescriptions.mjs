#!/usr/bin/env node
/**
 * Extract all plugin names, descriptions, and setting keys from plugin source files.
 * Outputs a JSON file ready for translation.
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PLUGIN_DIRS = [
    join(ROOT, "src/plugins"),
    join(ROOT, "src/fcordplugins"),
];

const pluginEntries = [];

// Mimic Vencord's case transformation
function wordsFromCamel(text) {
    return text.split(/(?=[A-Z][a-z])|(?<=[a-z])(?=[A-Z])/).map(w => /^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase());
}
function wordsToTitle(words) {
    return words.map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function extractFromFile(content) {
    // Match: name: "Something",
    const nameMatch = content.match(/^\s*name:\s*["'`]([^"'`]+)["'`]/m);
    
    // Match: description: "Something" or 'Something' or `Something`
    // Properly matches content even if it contains other quotes
    const descMatches = [...content.matchAll(/^\s*description:\s*(["'`])([\s\S]*?)\1/gm)];
    const descriptions = descMatches.map(m => m[2]).filter(d =>
        d.length > 5 &&
        !d.includes("${") &&
        !d.startsWith("http")
    );

    // Extract setting keys
    // Settings are defined like:
    // const settings = definePluginSettings({
    //     keyName: { ... }
    // })
    // We'll look for property names right before "type: OptionType"
    const settingKeys = [];
    const settingMatches = [...content.matchAll(/^\s*([a-zA-Z0-9_]+):\s*{[\s\S]*?type:\s*OptionType/gm)];
    for (const match of settingMatches) {
        const key = match[1];
        settingKeys.push(wordsToTitle(wordsFromCamel(key)));
    }

    const name = nameMatch?.[1] ?? null;
    return { name, descriptions, settingKeys };
}

for (const dir of PLUGIN_DIRS) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pluginDir = join(dir, entry.name);
        const candidates = ["index.tsx", "index.ts", "index.jsx", "index.js"];

        for (const file of candidates) {
            const filePath = join(pluginDir, file);
            if (!existsSync(filePath)) continue;

            try {
                const content = readFileSync(filePath, "utf-8");
                const { name, descriptions, settingKeys } = extractFromFile(content);
                if (name) {
                    pluginEntries.push({ name, descriptions, settingKeys, file: filePath.replace(ROOT, "") });
                }
            } catch (e) {}
            break;
        }
    }
}

// Also scan .tsx files directly at root
for (const dir of PLUGIN_DIRS) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
            const filePath = join(dir, entry.name);
            try {
                const content = readFileSync(filePath, "utf-8");
                const { name, descriptions, settingKeys } = extractFromFile(content);
                if (name) {
                    pluginEntries.push({ name, descriptions, settingKeys, file: filePath.replace(ROOT, "") });
                }
            } catch (e) {}
        }
    }
}

// Deduplicate by name
const seen = new Set();
const unique = pluginEntries.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
});

// Collect all unique translation strings (names, descriptions, setting names)
const allStrings = new Set();
for (const p of unique) {
    allStrings.add(p.name);
    for (const d of p.descriptions) {
        allStrings.add(d);
    }
    for (const s of p.settingKeys) {
        allStrings.add(s);
    }
}

const output = {
    plugins: unique,
    allDescriptions: [...allStrings].sort(),
};

writeFileSync(
    join(ROOT, "scripts/pluginDescriptions.json"),
    JSON.stringify(output, null, 2),
    "utf-8"
);

console.log(`Extracted ${unique.length} plugins, ${allStrings.size} unique strings.`);
console.log("Output: scripts/pluginDescriptions.json");
