/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import merge from 'deepmerge-json';
import { ScriptAnalyzer } from "./ast/analyzer";
import { IScriptFile, l10nJsonDetails, l10nJsonFormat } from './common';
import { logger } from './logger';
import { XLF } from "./xlf/xlf";
import { AwsTranslatorConfig, awsTranslatorTranslate } from './translators/aws';
import { azureTranslatorTranslate } from './translators/azure';
import { pseudoLocalizedTranslate } from './translators/pseudo';

export { l10nJsonDetails, l10nJsonFormat, l10nJsonMessageFormat, IScriptFile } from './common';
export { AwsTranslatorConfig }  from './translators/aws';

const analyzer = new ScriptAnalyzer();

/**
 * @public
 * The options for the l10n JSON to XLF conversion.
 */
export interface L10nToXlfOptions {
	/**
	 * The language that the source is in. Defaults to `en`.
	 */
	sourceLanguage?: string;
}

/**
 * @public
 * Export strings from source files
 * @param fileContents - Array of file contents to analyze
 * @returns l10nJsonFormat
 */
export async function getL10nJson(fileContents: IScriptFile[]): Promise<l10nJsonFormat> {
	logger.debug(`Analyzing ${fileContents.length} script files...`);

	// Create a Set to keep track of keys that have been seen before
	const seenKeys = new Set<string>();
	const bundles: l10nJsonFormat[] = [];
	for (const contents of fileContents) {
		const result = await analyzer.analyze(contents);
		bundles.push(result);

		// Validation
		for (const [key, value] of Object.entries(result)) {
			if (seenKeys.has(key)) {
				logger.verbose(`The string '${key}' without comments has been seen multiple times.`);
			} else if (typeof value === 'string' || !value.comment.length) {
				seenKeys.add(key);
			}
		}
	}

	logger.debug('Analyzed script files.');
	const mergedJson: l10nJsonFormat = merge.multi({}, ...bundles);
	return mergedJson;
}

/**
 * @public
 * Get XLF data from a package.nls.json and computed l10n data
 * @param l10nFileContents - a map of file names to {@link l10nJsonFormat} (basically the parsed contents of those files)
 * @param options - {@link L10nToXlfOptions} that influence how the XLF file should be generated
 * @returns XLF data as a string
 */
export function getL10nXlf(l10nFileContents: Map<string, l10nJsonFormat>, options?: L10nToXlfOptions): string {
	logger.debug(`Analyzing ${l10nFileContents.size} L10N files...`);
	const xlf = new XLF(options)
	for (const [name, l10nBundle] of l10nFileContents) {
		logger.debug(`Adding file ${name}...`);
		xlf.addFile(name, l10nBundle);
		logger.debug(`Added file ${name}.`);
	}
	logger.debug('Analyzed L10N files.');
	return xlf.toString();
}

/**
 * @public
 * Import XLF data into an array of l10nJsonDetails
 * @param xlfContents - XLF data as a string
 * @returns Array of l10nJsonDetails
 */
export async function getL10nFilesFromXlf(xlfContents: string): Promise<l10nJsonDetails[]> {
	logger.debug('Parsing XLF content...');
	const details = await XLF.parse(xlfContents);
	logger.debug(`Parsed XLF contents into ${details.length}.`);
	details.forEach(detail => {
		logger.debug(`Found ${detail.language} file with ${Object.keys(detail.messages).length} messages called '${detail.name}'.`);
		switch (detail.language) {
			// Fix up the language codes for the languages we ship as language packs
			case 'zh-hans':
				// https://github.com/microsoft/vscode-loc/blob/ee1a0b34bb545253a8a28e6d21193052c478e32d/i18n/vscode-language-pack-zh-hans/package.json#L22
				detail.language = 'zh-cn';
				logger.debug(`Changed 'zh-hans' to 'zh-cn' for file: ${detail.name}.`);
				break;
			case 'zh-hant':
				// https://github.com/microsoft/vscode-loc/blob/ee1a0b34bb545253a8a28e6d21193052c478e32d/i18n/vscode-language-pack-zh-hant/package.json#L22
				detail.language = 'zh-tw';
				logger.debug(`Changed 'zh-hant' to 'zh-tw' for file: ${detail.name}.`);
				break;
			default:
				break;
		}
	});
	return details;
}

/**
 * @public
 * Get pseudo localized l10n data for a given l10n bundle
 * @param dataToLocalize - package.nls.json or bundle.l10n.json contents parsed
 * @returns l10nJsonFormat
 */
export function getL10nPseudoLocalized(dataToLocalize: l10nJsonFormat): l10nJsonFormat {
	logger.debug('Localizing data using pseudo-localization...');
	
	const result = pseudoLocalizedTranslate(dataToLocalize);
	logger.debug(`Pseudo-localized ${Object.keys(result).length} strings.`);
	return result;
}

/**
 * @public
 * Get pseudo localized l10n data for a given l10n bundle
 * @param dataToLocalize - package.nls.json or bundle.l10n.json contents parsed
 * @param languages - languages to translate to
 * @param config - configuration for the Azure Translator instance
 * @returns l10nJsonFormat[] where each element is the localized data for that respective language in the languages array
 */
export async function getL10nAzureLocalized(dataToLocalize: l10nJsonFormat, languages: string[], config: { azureTranslatorKey: string, azureTranslatorRegion: string }): Promise<l10nJsonFormat[]> {
	logger.debug('Localizing data using Azure...');

	const result = await azureTranslatorTranslate(dataToLocalize, languages, config);
	if (result.length) {
		logger.debug(`Localized ${Object.keys(result[0]!).length * languages.length} strings.`);
	} else {
		logger.debug('No strings localized.');
	}
	return result;
}

/**
 * @alpha
 * Get  localized l10n data for a given l10n bundle
 * @param dataToLocalize - package.nls.json or bundle.l10n.json contents parsed
 * @param languages - languages to translate to
 * @returns l10nJsonFormat[] where each element is the localized data for that respective language in the languages array
 */
export async function getL10nAwsLocalized(dataToLocalize: l10nJsonFormat, languages: string[], config: AwsTranslatorConfig): Promise<l10nJsonFormat[]> {
	logger.debug('Localizing data using AWS...');

	const result = await awsTranslatorTranslate(dataToLocalize, languages, config);
	if (result.length) {
		logger.debug(`Localized ${Object.keys(result[0]!).length * languages.length} strings.`);
	} else {
		logger.debug('No strings localized.');
	}
	return result;
}

