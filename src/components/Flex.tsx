/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type { CSSProperties, HTMLAttributes } from "react";

export enum FlexDirection {
    HORIZONTAL = "row",
    HORIZONTAL_REVERSE = "row-reverse",
    VERTICAL = "column",
    VERTICAL_REVERSE = "column-reverse",
}

export enum FlexAlign {
    START = "flex-start",
    END = "flex-end",
    CENTER = "center",
    STRETCH = "stretch",
    BASELINE = "baseline",
}

export enum FlexJustify {
    START = "flex-start",
    END = "flex-end",
    CENTER = "center",
    BETWEEN = "space-between",
    AROUND = "space-around",
    EVENLY = "space-evenly",
}

export enum FlexWrap {
    NO_WRAP = "nowrap",
    WRAP = "wrap",
    WRAP_REVERSE = "wrap-reverse",
}

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
    direction?: CSSProperties["flexDirection"];
    flexDirection?: CSSProperties["flexDirection"];
    gap?: CSSProperties["gap"];
    alignContent?: CSSProperties["alignContent"];
    justifyContent?: CSSProperties["justifyContent"];
    justify?: CSSProperties["justifyContent"];
    alignItems?: CSSProperties["alignItems"];
    align?: CSSProperties["alignItems"];
    flexWrap?: CSSProperties["flexWrap"];
    wrap?: CSSProperties["flexWrap"];
}

export function Flex({ direction, flexDirection, gap = "1em", alignContent, justify, justifyContent, align, alignItems, wrap, flexWrap, children, style, ...restProps }: FlexProps) {
    style = {
        display: "flex",
        flexDirection: direction ?? flexDirection,
        gap,
        alignContent,
        justifyContent: justify ?? justifyContent,
        alignItems: align ?? alignItems,
        flexWrap: wrap ?? flexWrap,
        ...style
    };

    return (
        <div style={style} {...restProps}>
            {children}
        </div>
    );
}

Flex.Direction = FlexDirection;
Flex.Align = FlexAlign;
Flex.Justify = FlexJustify;
Flex.Wrap = FlexWrap;
