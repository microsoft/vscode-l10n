/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import markdownit from 'markdown-it';
import TextTranslationClient, { InputTextItem, TranslatedTextItemOutput, ErrorResponseOutput, TextTranslationClient as TranslationClient } from "@azure-rest/ai-translation-text";
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { l10nJsonFormat } from '../common';

const MAX_SIZE_OF_ARRAY_ELEMENT = 50000;
const MAX_NUMBER_OF_ARRAY_ELEMENTS = 1000;
// This is the request size times the number of languages
const MAX_REQUEST_SIZE = 50000;

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
	let partialBody: InputTextItem[] = [];
	let currentCharacterCount = 0;
	for (const item of body) {
		if (item.text.length > MAX_SIZE_OF_ARRAY_ELEMENT) {
			throw new Error(`Failed to translate. Item is too large: ${item.text}`)
		}
		const requestAddition = item.text.length * languages.length;
		if (currentCharacterCount + requestAddition > MAX_REQUEST_SIZE
			|| partialBody.length === MAX_NUMBER_OF_ARRAY_ELEMENTS
		) {
			promises.push(translate(partialBody, languages, config));
			partialBody = [];
			currentCharacterCount = 0;
		}
		partialBody.push(item);
		currentCharacterCount += requestAddition;
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
