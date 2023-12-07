/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as reader from "./node/reader";

/**
 * @public
 * The format of a message in a bundle.
 */

 export type l10nJsonMessageFormat = string | {
	message: string;
	comment: string[];
};

/**
 * @public
 * The format of package.nls.json and l10n bundle files.
 */
export interface l10nJsonFormat {
	[key: string]: l10nJsonMessageFormat;
}

let bundle: l10nJsonFormat | undefined;

/**
 * @public
 * Loads the bundle from the given contents. Must be run before the first call to any `l10n.t()` variant.
 * **Note** The best way to set this is to pass the value of the VS Code API `vscode.l10n.contents`
 * to the process that uses `@vscode/l10n`.
 * @param config - An object that contains one property, contents, which should contain the contents of the bundle.
 */
export function config(config: { contents: string | l10nJsonFormat }): void;
/**
 * @public
 * Loads the bundle from the given fsPath. Must be run before the first call to any `l10n.t()` variant.
 * **Warning** This is not implemented in the browser and will throw an Error.
 * **Note** The best way to set this is to pass the value of the VS Code API `vscode.l10n.uri.fsPath`
 * to the process that uses `@vscode/l10n`.
 * @param config - An object that contains one property, fsPath, which should be a path to a file that contains the bundle.
 */
export function config(config: { fsPath: string }): void;
/**
 * @public
 * Loads the bundle from the given URI using an asynchronous fetch request.
 * **Warning** Since this is an asynchronous API, you need to ensure that it resolves before
 * the first call to any `l10n.t()` variant.
 * **Note** The best way to set this is to pass the value of the VS Code API `vscode.l10n.uri.toString()`
 * to the process that uses `@vscode/l10n`.
 * @param config - An object that contains one property, uri, which should be a URL to the bundle.
 */
export function config(config: { uri: string | URL; }): Promise<void>;
export function config(config: { contents: string | l10nJsonFormat } | { fsPath: string } | { uri: string | URL; }): void | Promise<void> {
    if ('contents' in config) {
        if (typeof config.contents === 'string') {
            bundle = JSON.parse(config.contents);
        } else {
            bundle = config.contents;
        }
        return;
    }
    if ('fsPath' in config) {
        const fileContent = reader.readFileFromFsPath(config.fsPath);
        const content = JSON.parse(fileContent);
        bundle = isBuiltinExtension(content) ? content.contents.bundle : content;
        return;
    }
    if(config.uri) {
        let uri = config.uri;
        if (typeof config.uri === 'string') {
            uri = new URL(config.uri);
        }
        return new Promise((resolve, reject) => {
            reader.readFileFromUri(uri as URL)
            .then((uriContent) => {
                try {
                    const content = JSON.parse(uriContent);
                    bundle = isBuiltinExtension(content) ? content.contents.bundle : content;
                    resolve();
                } catch (err) {
                    reject(err);
                }
            })
            .catch((err) => {
                reject(err);
            });
        });
    }
}

/**
 * @public
 * Type that can be used as replacements in `l10n.t()` calls.
 */
export type L10nReplacement = string | number | boolean;

/**
 * @public
 * Marks a string for localization. If the bundle has a localized value for this message, then that localized
 * value will be returned (with injected `args` values for any templated values).
 * @param message - The message to localize. Supports index templating where strings like `{0}` and `{1}` are
 * replaced by the item at that index in the `args` array.
 * @param args - The arguments to be used in the localized string. The index of the argument is used to
 * match the template placeholder in the localized string.
 * @returns localized string with injected arguments.
 * @example `l10n.localize('hello', 'Hello {0}!', 'World');`
 */
export function t(message: string, ...args: Array<L10nReplacement>): string;
/**
 * @public
 * Marks a string for localization. If the bundle has a localized value for this message, then that localized
 * value will be returned (with injected `args` values for any templated values).
 * @param message - The message to localize. Supports named templating where strings like `{foo}` and `{bar}` are
 * replaced by the value in the Record for that key (foo, bar, etc).
 * @param args - The arguments to be used in the localized string. The name of the key in the record is used to
 * match the template placeholder in the localized string.
 * @returns localized string with injected arguments.
 * @example `l10n.t('Hello {name}', { name: 'Erich' });`
 */
export function t(message: string, args: Record<string, L10nReplacement>): string;

/**
 * @public
 * Marks a string for localization. This function signature is made for usage
 * with tagged template literals.
 *
 * The more verbose overload should still be used if comments are required.
 * @example
 * ```
 * l10n.t`Hello ${name}!`
 * ```
 * @param message - String message components
 * @param args - Replacement components in the string
 * @returns localized string with injected arguments.
 */
export function t(strs: TemplateStringsArray, ...replacements: L10nReplacement[]): string;

/**
 * @public
 * Marks a string for localization. If the bundle has a localized value for this message, then that localized
 * value will be returned (with injected args values for any templated values).
 * @param options - The options to use when localizing the message.
 * @returns localized string with injected arguments.
 * @example `l10n.t({ message: 'Hello {0}', args: ['Erich'], comment: 'This is a comment' } );`
 */
export function t(options: {
    /**
     * The message to localize. If `args` is an array, this message supports index templating where strings like
     * `{0}` and `{1}` are replaced by the item at that index in the `args` array. If `args` is a `Record<string, any>`,
     * this supports named templating where strings like `{foo}` and `{bar}` are replaced by the value in
     * the Record for that key (foo, bar, etc).
     */
    message: string;
    /**
     * The arguments to be used in the localized string. As an array, the index of the argument is used to
     * match the template placeholder in the localized string. As a Record, the key is used to match the template
     * placeholder in the localized string.
     */
    args?: Array<string | number | boolean> | Record<string, any>;
    /**
     * A comment to help translators understand the context of the message.
     */
    comment: string | string[];
}): string;
export function t(...args: [str: string, ...args: Array<string | number | boolean>]
    | [message: string, args: Record<string, any>]
    | [message: TemplateStringsArray, ...args: L10nReplacement[]]
    | [options: { message: string; args?: Array<string | number | boolean> | Record<string, any>; comment?: string | string[] }]): string {
    const firstArg = args[0];
    let key: string;
    let message: string;
    let formatArgs: Array<string | number> | Record<string, any> | undefined;
    if (typeof firstArg === 'string') {
        key = firstArg;
        message = firstArg;
        args.splice(0, 1);
        formatArgs = !args || typeof args[0] !== 'object' ? args : args[0];
    } else if (firstArg instanceof Array) {
        const replacements = args.slice(1) as L10nReplacement[];
        if (firstArg.length !== replacements.length + 1) {
            throw new Error('expected a string as the first argument to l10n.t');
        }

        let str = firstArg[0]!; // implied strs.length > 0 since replacements.length >= 0
        for (let i = 1; i < firstArg.length; i++) {
            str += `{${i - 1}}` + firstArg[i];
        }

        return t(str, ...replacements);
    } else {
        message = firstArg.message;
        key = message;
        if (firstArg.comment && firstArg.comment.length > 0) {
            // in the format: message/commentcommentcomment
            key += `/${Array.isArray(firstArg.comment) ? firstArg.comment.join('') : firstArg.comment}`;
        }
        formatArgs = firstArg.args as any[] ?? {};
    }

    const messageFromBundle = bundle?.[key];
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

const _format2Regexp = /{([^}]+)}/g;

/**
 * Helper to create a string from a template and a string record.
 * Similar to `format` but with objects instead of positional arguments.
 *
 * Copied from https://github.com/microsoft/vscode/blob/5dfca53892a1061b1c103542afe49d51f1041778/src/vs/base/common/strings.ts#L44
 */
function format(template: string, values: Record<string, unknown>): string {
	if (Object.keys(values).length === 0) {
        return template;
	}
	return template.replace(_format2Regexp, (match, group) => (values[group] ?? match) as string);
}

/**
 * detect if we're reading a built-in extension
 */
function isBuiltinExtension(json: any): boolean {
    // HACK: for now, we basically try to guess the schema of the json to see if it's a built-in extension.
    // The schema looks like https://github.com/microsoft/vscode-loc/blob/23ad94192526c028b45f011fd878ad922fd9cfda/i18n/vscode-language-pack-cs/translations/extensions/vscode.extension-editing.i18n.json#L11
    return !!(typeof json?.contents?.bundle === 'object' && typeof json?.version === 'string')
}
