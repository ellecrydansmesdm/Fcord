import { findByProps } from "@webpack";
import definePlugin from "@utils/types";
import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { UserAreaButton, UserAreaRenderProps } from "@api/UserArea";
import { React, ContextMenuApi, Menu } from "@webpack/common";

let isGhostActive = true;
let configFakeMute = true;
let configFakeDeafen = true;

const syncState = () => {
    const SelectedChannelStore = findByProps("getVoiceChannelId");
    const vm = findByProps("toggleSelfMute");
    if (vm && SelectedChannelStore?.getVoiceChannelId()) {
        vm.toggleSelfMute();
        vm.toggleSelfMute();
    }
};

function FakeDeafenIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
                color: isGhostActive ? "#23a55a" : "currentColor",
                filter: isGhostActive ? "drop-shadow(0 0 2.5px #23a55a)" : "none"
            }}
        >
            {/* Microphone Capsule */}
            <rect x="9" y="6" width="6" height="10" rx="3" fill="currentColor" />
            {/* Microphone Stand */}
            <path d="M5 11 Q5 17 12 17 Q19 17 19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            
            {/* Sparkle (four-pointed star) at top-left */}
            <path
                d="M 2,5.5 Q 4.5,5.5 4.5,3 Q 4.5,5.5 7,5.5 Q 4.5,5.5 4.5,8 Q 4.5,5.5 2,5.5 Z"
                fill="currentColor"
            />
            
            {/* Flame on top-right */}
            <path
                d="M17.5 2 C17.5 2 19 3.5 19 5.5 C19 7 18 8.5 16 8.5 C14.5 8.5 13.5 7.5 13.5 6 C13.5 5 14 4 15 3 C14.5 4 14.5 5 15 5.5 C15.5 6 16 5.5 16.5 4.5 C17 3.5 17.5 2 17.5 2 Z"
                fill="currentColor"
            />
        </svg>
    );
}

function GhostContextMenu() {
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
    return (
        <Menu.Menu navId="fake-voice-menu" aria-label="Configuration Fake Voice">
            <Menu.MenuGroup label="Options du Fantôme">
                <Menu.MenuCheckboxItem
                    id="opt-both"
                    label="Fake Mute & Deafen"
                    checked={configFakeMute && configFakeDeafen}
                    action={() => {
                        const nextState = !(configFakeMute && configFakeDeafen);
                        configFakeMute = nextState;
                        configFakeDeafen = nextState;
                        forceUpdate();
                    }}
                />
                <Menu.MenuSeparator />
                <Menu.MenuCheckboxItem
                    id="opt-mute"
                    label="Fake Mute"
                    checked={configFakeMute}
                    action={() => {
                        configFakeMute = !configFakeMute;
                        forceUpdate();
                    }}
                />
                <Menu.MenuCheckboxItem
                    id="opt-deafen"
                    label="Fake Deafen"
                    checked={configFakeDeafen}
                    action={() => {
                        configFakeDeafen = !configFakeDeafen;
                        forceUpdate();
                    }}
                />
            </Menu.MenuGroup>
        </Menu.Menu>
    );
}

function FakeDeafenUserButton({ iconForeground, hideTooltips, nameplate }: UserAreaRenderProps & { hideTooltips?: boolean }) {
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
    return (
        <UserAreaButton
            onClick={() => {
                isGhostActive = !isGhostActive;
                syncState();
                forceUpdate();
            }}
            onContextMenu={(e: React.MouseEvent) => ContextMenuApi.openContextMenu(e, () => <GhostContextMenu />)}
            tooltipText={hideTooltips ? undefined : isGhostActive ? "Désactiver Fake Voice" : "Activer Fake Voice (Droit: Config)"}
            icon={<FakeDeafenIcon className={iconForeground} />}
            role="switch"
            aria-checked={isGhostActive}
            redGlow={false}
            plated={nameplate != null}
        />
    );
}

export default definePlugin({
    name: "Fake Voice Option",
    description: "Apparaissez mute ou sourd tout en écoutant. Par mushzi.",
    authors: [{ name: "mushzi", id: 449282863582412850n }],
    dependencies: ["CommandsAPI", "UserAreaAPI"],
    enabledByDefault: true,

    patches: [
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+),self_video:([^,]+)/,
                replace: "self_mute:$self.toggle($1,'mute'),self_deaf:$self.toggle($2,'deaf'),self_video:$self.toggle($3,'video')"
            }
        }
    ],

    toggle(val: any, what: string) {
        if (!isGhostActive) return val;
        switch (what) {
            case "mute": return configFakeMute ? true : val;
            case "deaf": return configFakeDeafen ? true : val;
            case "video": return val;
        }
    },

    userAreaButton: {
        icon: FakeDeafenIcon,
        render: FakeDeafenUserButton
    },

    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "fakemute",
            description: "Toggle Fake Mute",
            execute: async (_, ctx) => {
                configFakeMute = !configFakeMute;
                isGhostActive = configFakeMute;
                syncState();
                sendBotMessage(ctx.channel.id, { content: `👻 **Fake Mute** est ${isGhostActive ? "activé" : "désactivé"}.` });
            },
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "fakedeafen",
            description: "Toggle Fake Deafen",
            execute: async (_, ctx) => {
                configFakeDeafen = !configFakeDeafen;
                isGhostActive = configFakeDeafen;
                syncState();
                sendBotMessage(ctx.channel.id, { content: `👻 **Fake Deafen** est ${isGhostActive ? "activé" : "désactivé"}.` });
            },
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "fakedeafen_mute",
            description: "Toggle Fake Deafen & Mute simultanément",
            execute: async (_, ctx) => {
                const next = !(configFakeMute && configFakeDeafen);
                configFakeMute = next;
                configFakeDeafen = next;
                isGhostActive = next;
                syncState();
                sendBotMessage(ctx.channel.id, { content: `👻 **Fake Deafen & Mute** sont ${isGhostActive ? "activés" : "désactivés"}.` });
            },
        },
    ],

    start() {
        const { addUserAreaButton } = Vencord.Api.UserArea;
        addUserAreaButton("fake-voice-option", {
            icon: FakeDeafenIcon,
            render: FakeDeafenUserButton
        });
    },

    stop() {
        const { removeUserAreaButton } = Vencord.Api.UserArea;
        removeUserAreaButton("fake-voice-option");
    }
});