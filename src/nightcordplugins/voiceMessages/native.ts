import { app } from "electron";
import { readFile, rm } from "fs/promises";
import { basename, normalize, sep } from "path";

export async function readRecording(_: any, filePath: string) {
    filePath = normalize(filePath);
    const filename = basename(filePath);

    // Accepter tout fichier .ogg ou .wav retourné par Discord
    // (peut être recording.ogg, tmp_recording_123.ogg, voice_message_xxx.ogg, etc.)
    if (!/\.(ogg|wav|webm|mp4)$/i.test(filename)) return null;

    // Vérifier que le fichier est dans un répertoire Discord connu (userData ou temp)
    const userData = normalize(app.getPath("userData"));
    const tempDir = normalize(app.getPath("temp"));
    const isInUserData = filePath.startsWith(userData + sep) || filePath.startsWith(userData + "/");
    const isInTemp = filePath.startsWith(tempDir + sep) || filePath.startsWith(tempDir + "/");

    if (!isInUserData && !isInTemp) {
        console.warn("[VoiceMessages] readRecording: path outside allowed dirs:", filePath);
        return null;
    }

    try {
        const buf = await readFile(filePath);
        rm(filePath).catch(() => { });
        return new Uint8Array(buf.buffer);
    } catch (e) {
        console.error("[VoiceMessages] readRecording error:", e);
        return null;
    }
}