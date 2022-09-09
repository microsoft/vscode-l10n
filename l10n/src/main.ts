/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { readFileSync } from "fs";

export interface l10nJsonMessageFormat {
	message: string;
	comment: string[];
}

export type MessageInfo = string | l10nJsonMessageFormat;

export interface l10nJsonFormat {
	[key: string]: MessageInfo;
}

let bundle: l10nJsonFormat | undefined;

export function config(config: { uri: string; } | { contents: string | l10nJsonFormat }): void {
    if ('contents' in config) {
        if (typeof config.contents === 'string') {
            bundle = JSON.parse(config.contents);
        } else {
            bundle = config.contents;
        }
        return;
    }
    if(config.uri) {
        bundle = JSON.parse(readFileSync(config.uri, 'utf8'));
    }
}

function format(message: string, args: any[]): string {
    let result: string;
    if (args.length === 0) {
        result = message;
    }
    else {
        result = message.replace(/\{(\d+)\}/g, (match, rest) => {
            const index = rest[0];
            const arg = args[index];
            let replacement = match;
            if (typeof arg === 'string') {
                replacement = arg;
            }
            else if (typeof arg === 'number' || typeof arg === 'boolean' || arg === void 0 || arg === null) {
                replacement = String(arg);
            }
            return replacement;
        });
    }
    return result;
}

export function t(str: string, ...args: any[]): string;
export function t(options: { message: string; args?: any[]; comment?: string[] }): string;
export function t(...args: [str: string, ...args: string[]] | [options: { message: string; args?: any[]; comment?: string[] }]): string {
    const firstArg = args[0];
    let key: string;
    let message: string;
    if (typeof firstArg === 'string') {
        key = firstArg;
        message = firstArg;
    } else {
        message = firstArg.message;
        key = message;
        if (firstArg.comment) {
            key += `/${firstArg.comment.join()}`;
        }
    }
    if (!bundle) {
        return format(message, args);
    }

    const messageFromBundle = bundle[key];
    if (!messageFromBundle) {
        return format(message, args);
    }

    if (typeof messageFromBundle === 'string') {
        return format(messageFromBundle, args);
    }
    
    if (messageFromBundle.comment) {
        return format(messageFromBundle.message, args);
    }
    return format(message, args);
}
