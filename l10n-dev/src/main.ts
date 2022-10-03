/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import merge from 'deepmerge-json';
import { localize } from 'pseudo-localization';
import { JavaScriptAnalyzer } from "./ast/analyzer";
import { l10nJsonDetails, l10nJsonFormat } from './common';
import { XLF } from "./xlf/xlf";

export { l10nJsonDetails, l10nJsonFormat, MessageInfo, l10nJsonMessageFormat } from './common';

const analyzer = new JavaScriptAnalyzer();

/**
 * Export strings from source files
 * @param fileContents Array of file contents to analyze
 * @returns l10nJsonFormat
 */
export function getL10nJson(fileContents: string[]): l10nJsonFormat {
	const bundles = fileContents.map(contents => {
		const result = analyzer.analyze(contents);
		return result.bundle;
	});

	const mergedJson = merge.multi({}, ...bundles);
	return mergedJson;
}

/**
 * Get XLF data from a package.nls.json and computed l10n data
 * @param packageNlsJsonContents package.nls.json contents parsed
 * @param l10nBundleContents l10n bundle contents parsed
 * @returns XLF data as a string
 */
export function getL10nXlf(l10nFileContents: Map<string, l10nJsonFormat>, options?: { sourceLanguage?: string }): string {
	const xlf = new XLF(options)
	for (const [name, l10nBundle] of l10nFileContents) {
		xlf.addFile(name, l10nBundle);
	}
	return xlf.toString();
}

/**
 * Import XLF data into an array of l10nJsonDetails
 * @param xlfContents XLF data as a string
 * @returns Array of l10nJsonDetails
 */
export async function getL10nFilesFromXlf(xlfContents: string): Promise<l10nJsonDetails[]> {
	const details = await XLF.parse(xlfContents);
	details.forEach(detail => {
		switch (detail.language) {
			// Fix up the language codes for the languages we ship as language packs
			case 'zh-hans':
				// https://github.com/microsoft/vscode-loc/blob/ee1a0b34bb545253a8a28e6d21193052c478e32d/i18n/vscode-language-pack-zh-hans/package.json#L22
				detail.language = 'zh-cn';
				break;
			case 'zh-hant':
				// https://github.com/microsoft/vscode-loc/blob/ee1a0b34bb545253a8a28e6d21193052c478e32d/i18n/vscode-language-pack-zh-hant/package.json#L22
				detail.language = 'zh-tw';
				break;
			default:
				break;
		}
	});
	return details;
}

/**
 * Get pseudo localized l10n data for a given l10n bundle
 * @param contents package.nls.json or bundle.l10n.json contents parsed
 * @returns l10nJsonFormat
 */
export function getL10nPseudoLocalized(dataToLocalize: l10nJsonFormat): l10nJsonFormat {
	// deep clone
	const contents = JSON.parse(JSON.stringify(dataToLocalize));
	for(const key of Object.keys(contents)) {
		const value = contents[key];
		const message = typeof value === 'string' ? value : value!.message;
		let index = 0;
		let localized = '';
		// escape command and icon syntax
		for (const match of message.matchAll(/(?:\(command:\S+)|(?:\$\([A-Za-z-~]+\))/g)) {
			const section = localize(message.substring(index, match.index));
			localized += section + match[0]!;
			index = match.index! + match[0]!.length;
		}

		contents[key] = index === 0
			? localize(message)
			: localized + localize(message.substring(index));
	}
	return contents;
}
