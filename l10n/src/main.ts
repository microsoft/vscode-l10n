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

export function config(config: { uri: string | URL; } | { contents: string | l10nJsonFormat }): void {
    if ('contents' in config) {
        if (typeof config.contents === 'string') {
            bundle = JSON.parse(config.contents);
        } else {
            bundle = config.contents;
        }
        return;
    }
    if(config.uri) {
        let uri = config.uri;
        if (typeof config.uri === 'string' && config.uri.startsWith('file://')) {
            uri = new URL(config.uri);
        }
        bundle = JSON.parse(readFileSync(uri, 'utf8'));
    }
}

const _formatRegexp = /{(\d+)}/g;

/**
 * Helper to produce a string with a variable number of arguments. Insert variable segments
 * into the string using the {n} notation where N is the index of the argument following the string.
 * @param value string to which formatting is applied
 * @param args replacements for {n}-entries
 */
function format(value: string, ...args: any[]): string {
	if (args.length === 0) {
		return value;
	}
	return value.replace(_formatRegexp, function (match, group) {
		const idx = parseInt(group, 10);
		return isNaN(idx) || idx < 0 || idx >= args.length ?
			match :
			args[idx];
	});
}

export function t(str: string, ...args: any[]): string;
export function t(options: { message: string; args?: any[]; comment?: string[] }): string;
export function t(...args: [str: string, ...args: string[]] | [options: { message: string; args?: any[]; comment?: string[] }]): string {
    const firstArg = args[0];
    let key: string;
    let message: string;
    let formatArgs: any[] | undefined;
    if (typeof firstArg === 'string') {
        key = firstArg;
        message = firstArg;
        args.splice(0, 1);
        formatArgs = args;
    } else {
        message = firstArg.message;
        key = message;
        if (firstArg.comment && firstArg.comment.length > 0) {
            // in the format: message/commentcommentcomment
            key += `/${firstArg.comment.join()}`;
        }
        formatArgs = firstArg.args as any[] ?? [];
    }
    if (!bundle) {
        return format(message, ...formatArgs);
    }

    const messageFromBundle = bundle[key];
    if (!messageFromBundle) {
        return format(message, ...formatArgs);
    }

    if (typeof messageFromBundle === 'string') {
        return format(messageFromBundle, ...formatArgs);
    }
    
    if (messageFromBundle.comment) {
        return format(messageFromBundle.message, ...formatArgs);
    }
    return format(message, ...formatArgs);
}
