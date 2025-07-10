/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * @public
 * The format of a message in a bundle.
 */

export type l10nJsonMessageFormat = string | string[] | {
	message: string;
	comment: string[];
};

/**
 * @public
 * Normalizes a message format to a string by joining arrays with newlines
 * @param value The message format to normalize
 * @returns The normalized message string
 */
export function normalizeMessage(value: l10nJsonMessageFormat): string {
	if (typeof value === 'string') {
		return value;
	}
	if (Array.isArray(value)) {
		return value.join('\n');
	}
	return value.message;
}

/**
 * @public
 * Normalizes all messages in an l10nJsonFormat object
 * @param data The l10nJsonFormat object to normalize
 * @returns A normalized l10nJsonFormat object with all arrays converted to strings
 */
export function normalizeL10nJsonFormat(data: l10nJsonFormat): l10nJsonFormat {
	const normalized: l10nJsonFormat = {};
	for (const [key, value] of Object.entries(data)) {
		if (Array.isArray(value)) {
			normalized[key] = value.join('\n');
		} else {
			normalized[key] = value;
		}
	}
	return normalized;
}

/**
 * @public
 * The format of package.nls.json and l10n bundle files
 */
export interface l10nJsonFormat {
	[key: string]: l10nJsonMessageFormat;
}

/**
 * @public
 * Details of a file extracted from an XLF file
 */
export interface l10nJsonDetails {
	messages: l10nJsonFormat;
	name: string;
	language: string;
}

/**
 * @public
 * Data structure of a script file
 */
export interface IScriptFile {
	contents: string;
	extension: string;
}
