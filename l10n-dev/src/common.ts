/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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
