import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findByProps } from "@webpack";
import { React, Button } from "@webpack/common";

function SoundUpload({ value, onChange, description }: { value: string; onChange: (v: string) => void; description: string; }) {
    const fileRef = React.useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) onChange(ev.target.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ color: "var(--header-secondary)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
                {description}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                    type="text"
                    value={value?.startsWith("data:") ? "Local File (Upload)" : value}
                    onChange={e => onChange(e.target.value)}
                    style={{
                        flex: 1,
                        background: "rgba(0,0,0,0.2)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 4,
                        padding: "8px 12px",
                        color: "#fff",
                        fontSize: 14
                    }}
                    placeholder="Sound URL..."
                />
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.PRIMARY}
                    onClick={() => fileRef.current?.click()}
                >
                    Upload
                </Button>
                {value && (
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.RED}
                        look={Button.Looks.OUTLINED}
                        onClick={() => onChange("")}
                    >
                        Reset
                    </Button>
                )}
                <input ref={fileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleFile} />
            </div>
        </div>
    );
}

const settings = definePluginSettings({
    message: { description: "Message Notification Sound", type: OptionType.STRING, default: "", render: (props) => <SoundUpload {...props} description="Message Notification" /> },
    user_join: { description: "User Join VC Sound", type: OptionType.STRING, default: "", render: (props) => <SoundUpload {...props} description="User Join VC" /> },
    user_leave: { description: "User Leave VC Sound", type: OptionType.STRING, default: "", render: (props) => <SoundUpload {...props} description="User Leave VC" /> },
    call_ringing: { description: "Call Ringing Sound", type: OptionType.STRING, default: "", render: (props) => <SoundUpload {...props} description="Call Ringing" /> },
    mute: { description: "Mute Sound", type: OptionType.STRING, default: "", render: (props) => <SoundUpload {...props} description="Mute" /> },
    unmute: { description: "Unmute Sound", type: OptionType.STRING, default: "", render: (props) => <SoundUpload {...props} description="Unmute" /> },
    deafen: { description: "Deafen Sound", type: OptionType.STRING, default: "", render: (props) => <SoundUpload {...props} description="Deafen" /> },
    undeafen: { description: "Undeafen Sound", type: OptionType.STRING, default: "", render: (props) => <SoundUpload {...props} description="Undeafen" /> }
});

const getCustomUrl = (soundName: string): string => {
    switch (soundName) {
        case "message1": return settings.store.message;
        case "user_join": return settings.store.user_join;
        case "user_leave": return settings.store.user_leave;
        case "call_calling": return settings.store.call_ringing;
        case "call_ringing": return settings.store.call_ringing;
        case "mute": return settings.store.mute;
        case "unmute": return settings.store.unmute;
        case "deafen": return settings.store.deafen;
        case "undeafen": return settings.store.undeafen;
        default: return "";
    }
};

export default definePlugin({
    name: "CustomSounds",
    description: "Replace all Discord sounds with custom sounds (.mp3/.wav). Support URLs and local uploads.",
    authors: [{ name: "Nightcord", id: 0n }],
    settings,
    enabledByDefault: false,

    _unpatch: null as (() => void) | null,

    start() {
        const soundModule = findByProps("playSound", "createSound");
        if (!soundModule) return;
        const orig = soundModule.playSound.bind(soundModule);
        soundModule.playSound = function (soundName: string, ...rest: any[]) {
            const customUrl = getCustomUrl(soundName);
            if (customUrl && (customUrl.startsWith("http") || customUrl.startsWith("data:"))) {
                const audio = new Audio(customUrl);
                audio.play().catch(console.error);
                return;
            }
            return orig(soundName, ...rest);
        };
        this._unpatch = () => { soundModule.playSound = orig; };
    },

    stop() {
        this._unpatch?.();
        this._unpatch = null;
    }
});
