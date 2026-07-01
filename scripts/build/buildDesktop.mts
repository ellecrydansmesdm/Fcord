/*
 * Fcord, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execSync } from "child_process";
import { BuildContext, BuildOptions, context } from "esbuild";
import { copyFile } from "fs/promises";
import * as path from "path";
import { obfuscateDistJs } from "./obfuscate.mjs";

import vencordDep from "./vencordDep.mjs";
import { includeDirPlugin } from "./includeDirPlugin.mts";

const isDev = process.argv.includes("--dev");

let gitHash: string;
try {
    gitHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
} catch {
    gitHash = "unknown";
}

const CommonOpts: BuildOptions = {
    minify: !isDev,
    bundle: true,
    sourcemap: "linked",
    logLevel: "info"
};

const NodeCommonOpts: BuildOptions = {
    ...CommonOpts,
    format: "cjs",
    platform: "node",
    external: ["electron", "original-fs"],
    target: ["esnext"],
    loader: {
        ".node": "file"
    },
    define: {
        IS_DEV: JSON.stringify(isDev),
        EQUIBOP_GIT_HASH: JSON.stringify(gitHash)
    }
};

const contexts = [] as BuildContext[];
async function createContext(options: BuildOptions) {
    contexts.push(await context(options));
}

await Promise.all([
    // Main process
    createContext({
        ...NodeCommonOpts,
        entryPoints: ["src/fcord/main/index.ts"],
        outfile: "dist/js/main.js",
        footer: { js: "//# sourceURL=VesktopMain" }
    }),
    // Preloads
    createContext({
        ...NodeCommonOpts,
        entryPoints: ["src/fcord/preload/index.ts"],
        outfile: "dist/js/preload.js",
        footer: { js: "//# sourceURL=VesktopPreload" }
    }),
    createContext({
        ...NodeCommonOpts,
        entryPoints: ["src/fcord/preload/splash.ts"],
        outfile: "dist/js/splashPreload.js",
        footer: { js: "//# sourceURL=VesktopSplashPreload" }
    }),
    createContext({
        ...NodeCommonOpts,
        entryPoints: ["src/fcord/preload/updater.ts"],
        outfile: "dist/js/updaterPreload.js",
        footer: { js: "//# sourceURL=VesktopUpdaterPreload" }
    }),
    // Renderer
    createContext({
        ...CommonOpts,
        globalName: "Equibop",
        entryPoints: ["src/fcord/renderer/index.ts"],
        outfile: "dist/js/renderer.js",
        format: "iife",
        inject: ["./scripts/build/injectReact.mjs"],
        jsxFactory: "VencordCreateElement",
        jsxFragment: "VencordFragment",
        external: ["@Fcord/types/*", "@fcord/types/*"],
        plugins: [vencordDep, includeDirPlugin("patches", "src/fcord/renderer/patches")],
        footer: { js: "//# sourceURL=VesktopRenderer" }
    })
]);

const watch = process.argv.includes("--watch");

if (watch) {
	await Promise.all(contexts.map((ctx) => ctx.watch()));
} else {
	const results = await Promise.all(
		contexts.map(async (ctx) => {
			const result = await ctx.rebuild();
			await ctx.dispose();
			return result;
		}),
	);

	for (const result of results) {
		if (result.metafile) {
			const outputs = Object.keys(result.metafile.outputs);
			for (const output of outputs) {
				const meta = result.metafile.outputs[output];
				const size = (meta.bytes / 1024).toFixed(2);
				console.log(`  ${output} ${size} KB`);
			}
		}
	}

	// Post-build obfuscation (disabled in dev mode)
	if (!isDev) {
		await obfuscateDistJs();
	}
}
