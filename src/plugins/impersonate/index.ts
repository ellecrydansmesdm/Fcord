/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandOptionType, sendBotMessage, Argument, CommandContext } from "@api/Commands";
import { ApplicationCommandInputType } from "@api/Commands/types";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { FluxDispatcher, UserStore, DraftType } from "@webpack/common";
import { findByPropsLazy } from "@webpack";
import { MessageActions } from "@webpack/common";

const logger = new Logger("Impersonate");

const UploadStore = findByPropsLazy("getUpload");

async function resolveFile(options: Argument[], ctx: CommandContext): Promise<File | null> {
    for (const opt of options) {
        if (opt.name === "image") {
            const upload = UploadStore.getUpload(ctx.channel.id, opt.name, DraftType.SlashCommand);
            return upload?.item?.file || null;
        }
    }
    return null;
}

export default definePlugin({
    name: "Impersonate",
    enabledByDefault: true,
    description: "Locally simulates a message sent by any user via the /impersonate command. Only visible to you.",
    authors: [Devs.BigDuck],
    dependencies: ["CommandsAPI"],

    commands: [
        {
            name: "impersonate",
            description: "Impersonate a user.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    type: ApplicationCommandOptionType.USER,
                    name: "user",
                    description: "The user you wish to impersonate.",
                    required: true
                },
                {
                    type: ApplicationCommandOptionType.STRING,
                    name: "message",
                    description: "The message you would like this user to say.",
                    required: true
                },
                {
                    type: ApplicationCommandOptionType.CHANNEL,
                    name: "channel",
                    description: "Channel the impersonated message should be sent in.",
                    required: false
                },
                {
                    type: ApplicationCommandOptionType.INTEGER,
                    name: "delay",
                    description: "Delay for the impersonated message to appear on your client (in seconds).",
                    required: false
                },
                {
                    type: ApplicationCommandOptionType.ATTACHMENT,
                    name: "image",
                    description: "Image to attach to the impersonated message.",
                    required: false
                }
            ],
            execute: async (args, ctx) => {
                try {
                    const channel = args.find(x => x.name === "channel") ?? { value: ctx.channel.id };
                    const delay = args.find(x => x.name === "delay");
                    const user = UserStore.getUser(args[0].value);
                    const file = await resolveFile(args, ctx);

                    const fakeAuthor = {
                        id: user.id,
                        username: user.username,
                        avatar: user.avatar,
                        discriminator: user.discriminator,
                        public_flags: user.publicFlags,
                        premium_type: user.premiumType,
                        flags: user.flags,
                        banner: user.banner,
                        accent_color: null,
                        // @ts-ignore
                        global_name: user.globalName,
                        // @ts-ignore
                        avatar_decoration_data: user.avatarDecorationData
                            ? { asset: user.avatarDecorationData.asset, sku_id: user.avatarDecorationData.skuId }
                            : null,
                        banner_color: null
                    };

                    if (delay) {
                        FluxDispatcher.dispatch({
                            type: "TYPING_START",
                            channelId: channel.value,
                            userId: user.id,
                        });
                    }

                    setTimeout(async () => {
                        try {
                            if (file) {
                                const result = await MessageActions.sendMessage(channel.value, {
                                    content: args[1].value,
                                    files: [file]
                                });
                                if (result) {
                                    FluxDispatcher.dispatch({
                                        type: "MESSAGE_CREATE",
                                        channelId: channel.value,
                                        message: { ...result, author: fakeAuthor },
                                        optimistic: false,
                                        isPushNotification: false
                                    });
                                }
                            } else {
                                FluxDispatcher.dispatch({
                                    type: "MESSAGE_CREATE",
                                    channelId: channel.value,
                                    message: {
                                        attachments: [],
                                        author: fakeAuthor,
                                        channel_id: channel.value,
                                        components: [],
                                        content: args[1].value,
                                        edited_timestamp: null,
                                        embeds: [],
                                        flags: 0,
                                        id: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
                                        mention_everyone: false,
                                        mention_roles: [],
                                        mentions: [],
                                        nonce: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
                                        pinned: false,
                                        timestamp: new Date(),
                                        tts: false,
                                        type: 19
                                    },
                                    optimistic: false,
                                    isPushNotification: false
                                });
                            }
                        } catch (error) {
                            logger.error("Failed to send message:", error);
                            FluxDispatcher.dispatch({
                                type: "MESSAGE_CREATE",
                                channelId: channel.value,
                                message: {
                                    attachments: [],
                                    author: fakeAuthor,
                                    channel_id: channel.value,
                                    components: [],
                                    content: args[1].value,
                                    edited_timestamp: null,
                                    embeds: [],
                                    flags: 0,
                                    id: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
                                    mention_everyone: false,
                                    mention_roles: [],
                                    mentions: [],
                                    nonce: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
                                    pinned: false,
                                    timestamp: new Date(),
                                    tts: false,
                                    type: 19
                                },
                                optimistic: false,
                                isPushNotification: false
                            });
                        }
                    }, (Number(delay?.value ?? 0.5) * 1000));
                } catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: `Something went wrong: \`${error}\``,
                    });
                }
            }
        }
    ]
});
