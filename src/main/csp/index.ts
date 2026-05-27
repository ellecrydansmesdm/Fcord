import { NativeSettings } from "@main/settings";
import { session } from "electron";

type PolicyMap = Record<string, string[]>;

export const ConnectSrc = ["connect-src"];
export const ImageSrc = [...ConnectSrc, "img-src"];
export const CssSrc = ["style-src", "font-src"];
export const ImageAndCssSrc = [...ImageSrc, ...CssSrc];
export const ImageScriptsAndCssSrc = [...ImageAndCssSrc, "script-src", "worker-src"];
export const CSPSrc = ["style-src", "connect-src", "img-src", "frame-src", "font-src", "media-src", "worker-src"];

export const CspPolicies: PolicyMap = {
    "http://localhost:*": ImageAndCssSrc,
    "http://127.0.0.1:*": ImageAndCssSrc,
    "localhost:*": ImageAndCssSrc,
    "127.0.0.1:*": ImageAndCssSrc,

    "*.github.io": ImageAndCssSrc,
    "github.com": ImageAndCssSrc,
    "raw.githubusercontent.com": ImageAndCssSrc,
    "*.raw.githubusercontent.com": ImageAndCssSrc,
    "github-production-user-asset-6210df.s3.amazonaws.com": CSPSrc,
    "*.gitlab.io": ImageAndCssSrc,
    "gitlab.com": ImageAndCssSrc,
    "*.codeberg.page": ImageAndCssSrc,
    "codeberg.org": ImageAndCssSrc,

    "*.githack.com": ImageAndCssSrc,
    "jsdelivr.net": ImageAndCssSrc,

    "fonts.googleapis.com": CssSrc,

    "i.imgur.com": ImageSrc,
    "i.ibb.co": ImageSrc,
    "i.pinimg.com": ImageSrc,
    "*.tenor.com": ImageSrc,
    "files.catbox.moe": ImageAndCssSrc,

    "cdn.discordapp.com": ImageAndCssSrc,
    "media.discordapp.net": ImageSrc,

    "cdnjs.cloudflare.com": ImageScriptsAndCssSrc,
    "cdn.jsdelivr.net": ImageScriptsAndCssSrc,

    "api.groq.com": ConnectSrc,
    "*.speech.googleapis.com": ConnectSrc,
    "speech.googleapis.com": ConnectSrc,
    "www.google.com": ConnectSrc,
    "*.google.com": ConnectSrc,

    "api.github.com": ConnectSrc,
    "ws.audioscrobbler.com": ConnectSrc,
    "translate-pa.googleapis.com": ConnectSrc,
    "*.vencord.dev": ImageSrc,
    "manti.vendicated.dev": ImageSrc,
    "decor.fieryflames.dev": ConnectSrc,
    "ugc.decor.fieryflames.dev": ImageSrc,
    "sponsor.ajay.app": ConnectSrc,
    "dearrow-thumb.ajay.app": ImageSrc,
    "usrbg.is-hardly.online": ImageSrc,
    "icons.duckduckgo.com": ImageSrc,

    "*.sndcdn.com": CSPSrc,
    "soundcloud.com": CSPSrc,
    "*.soundcloud.com": CSPSrc,
};

const findHeader = (headers: PolicyMap, headerName: Lowercase<string>) => {
    return Object.keys(headers).find(h => h.toLowerCase() === headerName);
};

const parsePolicy = (policy: string): PolicyMap => {
    const result: PolicyMap = {};
    policy.split(";").forEach(directive => {
        const [directiveKey, ...directiveValue] = directive.trim().split(/\s+/g);
        if (directiveKey && !Object.prototype.hasOwnProperty.call(result, directiveKey)) {
            result[directiveKey] = directiveValue;
        }
    });

    return result;
};

const stringifyPolicy = (policy: PolicyMap): string =>
    Object.entries(policy)
        .filter(([, values]) => values?.length)
        .map(directive => directive.flat().join(" "))
        .join("; ");

const patchCsp = (headers: PolicyMap) => {
    const reportOnlyHeader = findHeader(headers, "content-security-policy-report-only");
    if (reportOnlyHeader)
        delete headers[reportOnlyHeader];

    const permissionsPolicyHeader = findHeader(headers, "permissions-policy");
    if (permissionsPolicyHeader) delete headers[permissionsPolicyHeader];

    const permissionsPolicyReportOnlyHeader = findHeader(headers, "permissions-policy-report-only");
    if (permissionsPolicyReportOnlyHeader) delete headers[permissionsPolicyReportOnlyHeader];

    const featurePolicyHeader = findHeader(headers, "feature-policy");
    if (featurePolicyHeader) delete headers[featurePolicyHeader];

    const featurePolicyReportOnlyHeader = findHeader(headers, "feature-policy-report-only");
    if (featurePolicyReportOnlyHeader) delete headers[featurePolicyReportOnlyHeader];

    const header = findHeader(headers, "content-security-policy");

    if (header) {
        const csp = parsePolicy(headers[header][0]);

        const pushDirective = (directive: string, ...values: string[]) => {
            csp[directive] ??= [...(csp["default-src"] ?? [])];
            csp[directive].push(...values);
        };

        pushDirective("style-src", "'unsafe-inline'");
        pushDirective("script-src", "'unsafe-inline'", "'unsafe-eval'");

        for (const directive of ["style-src", "connect-src", "img-src", "font-src", "media-src", "worker-src"]) {
            pushDirective(directive, "blob:", "data:", "vencord:", "vesktop:", "equicord:", "equibop:", "https://*.githubusercontent.com", "https://*.amazonaws.com");
        }

        for (const [host, directives] of Object.entries(NativeSettings.store.customCspRules)) {
            for (const directive of directives) {
                pushDirective(directive, host);
            }
        }

        for (const [host, directives] of Object.entries(CspPolicies)) {
            for (const directive of directives) {
                pushDirective(directive, host);
            }
        }

        headers[header] = [stringifyPolicy(csp)];
    }
};

export function initCsp() {
    session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, resourceType }, cb) => {
        if (responseHeaders) {
            if (resourceType === "mainFrame" || resourceType === "subFrame")
                patchCsp(responseHeaders);

            if (resourceType === "stylesheet") {
                const header = findHeader(responseHeaders, "content-type");
                if (header)
                    responseHeaders[header] = ["text/css"];
            }
        }

        cb({ cancel: false, responseHeaders });
    });

    session.defaultSession.webRequest.onHeadersReceived = () => { };
}
