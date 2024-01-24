/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import markdownit from 'markdown-it';
import TextTranslationClient, { InputTextItem, TranslatedTextItemOutput, ErrorResponseOutput, TextTranslationClient as TranslationClient } from "@azure-rest/ai-translation-text";
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { l10nJsonFormat } from '../common';

function handleSuccess(outputs: TranslatedTextItemOutput[], keys: string[]) {
	const files: l10nJsonFormat[] = [];
	for (let i = 0; i < outputs.length; i++) {
		const output = outputs[i];
		output?.translations.forEach((translation, languageIndex) => {
			files[languageIndex] ??= {};
			// Translate HTML back to markdown
			files[languageIndex]![keys[i]!] = NodeHtmlMarkdown.translate(translation.text);
		});
	}
	return files;
}

let md: markdownit | undefined;
let client: TranslationClient | undefined;
export async function azureTranslatorTranslate(dataToLocalize: l10nJsonFormat, languages: string[], config: { azureTranslatorKey: string, azureTranslatorRegion: string }): Promise<l10nJsonFormat[]> {
	md ??= markdownit();
	client ??= TextTranslationClient('https://api.cognitive.microsofttranslator.com/', { key: config.azureTranslatorKey, region: config.azureTranslatorRegion });

	const body: InputTextItem[] = [];
	const keys = Object.keys(dataToLocalize);
	for (const key of keys) {
		const value = dataToLocalize[key];
		const message = typeof value === 'string' ? value : value!.message;
		// Render markdown to HTML since Azure Translator supports HTML and not markdown
		const html = md.render(message);

		body.push({ text: html });
	}
	const translateResponse = await client.path("/translate").post({
		body,
		queryParameters: {
			to: languages.join(','),
			from: 'en',
			textType: 'html'
		}
	});

	switch (translateResponse.status) {
		case "200":
			return handleSuccess(translateResponse.body as TranslatedTextItemOutput[], keys);
		default: {
			const error = translateResponse.body as ErrorResponseOutput;
			throw new Error(`Failed to translate: ${error.error.message}`);
		}
	}
}
