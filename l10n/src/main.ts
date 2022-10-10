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

const _format2Regexp = /{([^}]+)}/g;

/**
 * Helper to create a string from a template and a string record.
 * Similar to `format` but with objects instead of positional arguments.
 * 
 * Copied from https://github.com/microsoft/vscode/blob/5dfca53892a1061b1c103542afe49d51f1041778/src/vs/base/common/strings.ts#L44
 */
export function format(template: string, values: Record<string, unknown>): string {
	return template.replace(_format2Regexp, (match, group) => (values[group] ?? match) as string);
}

/**
 * Marks a string for localization. If a localized bundle is available for the language specified by
 * {@link env.language} and the bundle has a localized value for this message, then that localized
 * value will be returned (with injected {@link args} values for any templated values).
 * @param message The message to localize. Supports index templating where strings like {0} and {1} are
 * replaced by the item at that index in the {@link args} array.
 * @param args The arguments to be used in the localized string. The index of the argument is used to
 * match the template placeholder in the localized string.
 * @returns localized string with injected arguments.
 * @example l10n.localize('hello', 'Hello {0}!', 'World');
 */
export function t(message: string, ...args: Array<string | number>): string;
/**
 * Marks a string for localization. If a localized bundle is available for the language specified by
 * {@link env.language} and the bundle has a localized value for this message, then that localized
 * value will be returned (with injected {@link args} values for any templated values).
 * @param message The message to localize. Supports named templating where strings like {foo} and {bar} are
 * replaced by the value in the Record for that key (foo, bar, etc).
 * @param args The arguments to be used in the localized string. The name of the key in the record is used to
 * match the template placeholder in the localized string.
 * @returns localized string with injected arguments.
 * @example l10n.t('Hello {name}', { name: 'Erich' });
 */
export function t(message: string, args: Record<string, any>): string;

/**
 * Marks a string for localization. If a localized bundle is available for the language specified by
 * {@link env.language} and the bundle has a localized value for this message, then that localized
 * value will be returned (with injected args values for any templated values).
 * @param options The options to use when localizing the message.
 * @returns localized string with injected arguments.
 */
export function t(options: {
    /**
     * The message to localize. If {@link args} is an array, this message supports index templating where strings like
     * {0} and {1} are replaced by the item at that index in the {@link args} array. If args is a Record<string, any>,
     * this supports named templating where strings like {foo} and {bar} are replaced by the value in
     * the Record for that key (foo, bar, etc).
     */
    message: string;
    /**
     * The arguments to be used in the localized string. As an array, the index of the argument is used to
     * match the template placeholder in the localized string. As a Record, the key is used to match the template
     * placeholder in the localized string.
     */
    args?: Array<string | number> | Record<string, any>;
    /**
     * A comment to help translators understand the context of the message.
     */
    comment: string[];
}): string;
export function t(...args: [str: string, ...args: Array<string | number>] | [message: string, args: Record<string, any>] | [options: { message: string; args?: Array<string | number> | Record<string, any>; comment?: string[] }]): string {
    const firstArg = args[0];
    let key: string;
    let message: string;
    let formatArgs: Array<string | number> | Record<string, any> | undefined;
    if (typeof firstArg === 'string') {
        key = firstArg;
        message = firstArg;
        args.splice(0, 1);
        formatArgs = !args || typeof args[0] !== 'object' ? args : args[0];
    } else {
        message = firstArg.message;
        key = message;
        if (firstArg.comment && firstArg.comment.length > 0) {
            // in the format: message/commentcommentcomment
            key += `/${firstArg.comment.join()}`;
        }
        formatArgs = firstArg.args as any[] ?? {};
    }
    if (!bundle) {
        return format(message, formatArgs as Record<string, unknown>);
    }

    const messageFromBundle = bundle[key];
    if (!messageFromBundle) {
        return format(message, formatArgs as Record<string, unknown>);
    }

    if (typeof messageFromBundle === 'string') {
        return format(messageFromBundle, formatArgs as Record<string, unknown>);
    }
    
    if (messageFromBundle.comment) {
        return format(messageFromBundle.message, formatArgs as Record<string, unknown>);
    }
    return format(message, formatArgs as Record<string, unknown>);
}
