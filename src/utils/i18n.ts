export type Locale = "en" | "de" | "fr" | "es" | "it" | "pt" | "pl";
export type TranslationMap = Record<string, Partial<Record<Locale, string>>>;

const LOCALE_ALIASES: Record<string, Locale> = {
    "en-US": "en", "en-GB": "en", "en-AU": "en", "en-CA": "en",
    "de-DE": "de", "de-AT": "de", "de-CH": "de",
    "fr-FR": "fr", "fr-CA": "fr", "fr-BE": "fr", "fr-CH": "fr",
    "es-ES": "es", "es-MX": "es", "es-AR": "es",
    "it-IT": "it", "it-CH": "it",
    "pt-PT": "pt", "pt-BR": "pt",
    "pl-PL": "pl",
};

let _cachedLocale: Locale = "en";

function normalizeLocale(raw: string): Locale {
    const normalized = raw.replace(/_/g, "-");
    return LOCALE_ALIASES[normalized] ?? normalized.split("-")[0] as Locale ?? "en";
}

export function setLocale(locale: string): void {
    _cachedLocale = normalizeLocale(locale);
}

export function getLocale(): Locale {
    return _cachedLocale;
}

export function detectLocale(): Locale {
    try {
        const { getLocale } = require("@webpack").findByPropsLazy("getLocale") as { getLocale: () => string };
        if (getLocale) return normalizeLocale(getLocale());
    } catch {}
    try {
        if (typeof navigator !== "undefined" && navigator.language)
            return normalizeLocale(navigator.language);
    } catch {}
    try {
        const { app } = require("electron") as typeof import("electron");
        if (app?.getLocale) return normalizeLocale(app.getLocale());
    } catch {}
    return "en";
}

export function t(translations: TranslationMap, key: string, locale?: Locale): string {
    const map = translations[key];
    if (!map) return key;
    const lang = locale ?? _cachedLocale;
    return map[lang] ?? map["en"] ?? key;
}
