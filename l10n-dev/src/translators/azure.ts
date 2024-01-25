/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import markdownit from 'markdown-it';
import TextTranslationClient, { InputTextItem, TranslatedTextItemOutput, ErrorResponseOutput, TextTranslationClient as TranslationClient } from "@azure-rest/ai-translation-text";
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { l10nJsonFormat } from '../common';

let client: TranslationClient | undefined;
/**
 * Translates the given body to the given languages using Azure Translator.
 * @param body The body of the request
 * @param languages The languages to translate to
 * @param config The config object
 * @returns 
 */
function translate(body: InputTextItem[], languages: string[], config: { azureTranslatorKey: string, azureTranslatorRegion: string }) {
	client ??= TextTranslationClient('https://api.cognitive.microsofttranslator.com/', { key: config.azureTranslatorKey, region: config.azureTranslatorRegion });
	const to = languages.join(',');
	return client.path("/translate").post({
		body,
		queryParameters: {
			to,
			// extend this to allow for other languages
			from: 'en',
			textType: 'html'
		}
	})
}

/**
 * Translates the given body to the given languages. Handles batching the requests if the body is too large.
 * @param body The body of the request
 * @param languages The languages to translate to
 * @param config The config object
 * @returns 
 */
async function batchTranslate(body: InputTextItem[], languages: string[], config: { azureTranslatorKey: string, azureTranslatorRegion: string }) {
	const promises = [];

	const partialBody: InputTextItem[] = [];
	const characterLimit = 33000;
	let currentCharacterCount = 0;
	for (const item of body) {
		if (currentCharacterCount + item.text.length > characterLimit) {
			promises.push(translate(partialBody, languages, config));
			partialBody.length = 0;
			currentCharacterCount = 0;
		} else {
			partialBody.push(item);
			currentCharacterCount += item.text.length;
		}
	}
	
	if (partialBody.length > 0) {
		promises.push(translate(partialBody, languages, config));
	}

	const responses = await Promise.allSettled(promises);
	const outputs: TranslatedTextItemOutput[] = [];

	for (const response of responses) {
		if (response.status === 'fulfilled') {
			switch (response.value.status) {
				case "200":
					outputs.push(...(response.value.body as TranslatedTextItemOutput[]));
					break;
				default: {
					const error = response.value.body as ErrorResponseOutput;
					throw new Error(`Failed to translate: ${error.error.message}`);
				}
			}
		} else {
			throw response.reason;
		}
	}

	return outputs;
}

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
	
	const result = await batchTranslate(body, languages, config);
	return handleSuccess(result, keys);
}
