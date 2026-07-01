/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { copyWithToast } from "@utils/discord";
import { Margins } from "@utils/margins";
import { ModalContent, ModalFooter, ModalHeader, ModalProps,ModalRoot } from "@utils/modal";
import { Button,React } from "@webpack/common";

interface ContributeModalProps {
    onClose: () => void;
}

function CryptoAddress({ label, address, symbol }: { label: string, address: string, symbol: string; }) {
    return (
        <Card
            variant="primary"
            outline
            style={{
                padding: "16px",
                marginBottom: "16px",
                cursor: "pointer",
                borderRadius: "12px",
                borderColor: "rgba(88, 101, 242, 0.3)",
                transition: "all 0.2s ease",
                backgroundColor: "rgba(0,0,0,0.1)"
            }}
            onClick={() => copyWithToast(address, `Successfully copied ${label} address!`)}
        >
            <Flex direction={Flex.Direction.VERTICAL}>
                <Flex justify={Flex.Justify.BETWEEN} align={Flex.Align.CENTER} style={{ marginBottom: "8px" }}>
                    <Heading level={3} variant="heading-sm/bold" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {label} ({symbol})
                    </Heading>
                    <Paragraph size="xs" color="text-brand" style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: "bold" }}>
                        click to copy
                    </Paragraph>
                </Flex>
                <code style={{
                    backgroundColor: "rgba(0,0,0,0.3)",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    wordBreak: "break-all",
                    fontFfriendly: "var(--font-code)",
                    display: "block",
                    border: "1px solid rgba(0,0,0,0.1)",
                    color: "var(--text-normal)"
                }}>
                    {address}
                </code>
            </Flex>
        </Card>
    );
}

export function ContributeModal(props: ModalProps) {
    const { onClose } = props;
    return (
        <ModalRoot {...props} size="small" style={{ overflow: "hidden", borderRadius: "12px" }}>
            <ModalHeader separator={false} style={{ paddingTop: "24px", paddingBottom: "8px" }}>
                <Flex direction={Flex.Direction.VERTICAL} align={Flex.Align.CENTER} style={{ width: "100%" }}>
                    <Heading level={2} variant="heading-xl/bold" style={{ color: "#fff", textShadow: "0 0 10px rgba(88, 101, 242, 0.5)" }}>
                        Support Fcord ❤️
                    </Heading>
                </Flex>
            </ModalHeader>
            <ModalContent style={{ padding: "0 24px" }}>
                <Paragraph className={Margins.bottom24} style={{ textAlign: "center", fontStyle: "italic", opacity: 0.9, lineHeight: "1.4" }}>
                    Fcord is a solo project — built from scratch over many days. If it saves you time or brings you joy, any contribution helps me keep updating it.
                </Paragraph>

                <CryptoAddress
                    label="Bitcoin"
                    symbol="BTC"
                    address="bc1qaw2rykpexk69grqgn0ssuyzfh7fgs846sz3tct"
                />

                <CryptoAddress
                    label="Ethereum"
                    symbol="ETH"
                    address="0xf03a7117cB6cA2874b7296e386438A073e3227a5"
                />

                <CryptoAddress
                    label="Solana"
                    symbol="SOL"
                    address="8QUDWumpDpTiUL7iVKe6WD5CeAfBwtdSeZWUQrNBaKG"
                />

                <Paragraph size="xs" color="text-muted" style={{ textAlign: "center", marginTop: "20px", marginBottom: "10px" }}>
                    Thank you for your support! Every donation helps keep the project alive.
                </Paragraph>
            </ModalContent>
            <ModalFooter style={{ backgroundColor: "rgba(0,0,0,0.1)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <Flex direction={Flex.Direction.HORIZONTAL} justify={Flex.Justify.END} style={{ width: "100%" }}>
                    <Button
                        color={Button.Colors.BRAND}
                        onClick={onClose}
                        look={Button.Looks.FILLED}
                        style={{ padding: "0 32px" }}
                    >
                        Close
                    </Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}
