/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import markdownit from 'markdown-it';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { l10nJsonFormat } from '../common';

import { TranslateClient, TranslateDocumentCommand, Document, TranslatedDocument, TranslateDocumentRequest, Formality, Profanity } from "@aws-sdk/client-translate";
import {fromSSO, fromEnv } from "@aws-sdk/credential-providers";

/**
 * The configuration for the AWS translator.
 * @alpha
 */
export type AwsTranslatorConfig = {
	region: string;
	sourceLanguage: string
	formality: Formality | undefined;
	profanity: Profanity | undefined;
	profile?: string
}

function handleSuccess(outputs: Translation[], languages: string[], keys: string[]) {
	const decoder = new TextDecoder()
	const files: l10nJsonFormat[] = [];
	
	for(const output of outputs) {
		const index = languages.indexOf(output.language)
		output.documents.forEach((document, i) => {
			files[index] ??= {};
			files[index]![keys[i]!] = NodeHtmlMarkdown.translate(decoder.decode(document?.Content))
		})
	}
	return files;
}

type Translation = {
	language: string;
	documents: (TranslatedDocument | undefined)[];
}

function getCredentials(config: AwsTranslatorConfig) {
	if (process.env["AWS_ACCESS_KEY_ID"] !== undefined && process.env["AWS_SECRET_ACCESS_KEY"] !== undefined)  {
		return fromEnv();
	} else {
		return fromSSO({ profile: config.profile });
	}
}

async function batchTranslate(body: Document[], languages: string[], config: AwsTranslatorConfig): Promise<Translation[]> {
	const client = new TranslateClient({ 
		region: config.region,
		credentials: getCredentials(config),
		maxAttempts: 50
	 });
	const translations: Translation[] = [];

	for(const language of languages) {
		console.debug(`Submitting translation for ${language}`)
		const translatedDocuments = await Promise.all(body.map((document) => {
			const request: TranslateDocumentRequest = {
				Document: document,
				SourceLanguageCode: config.sourceLanguage,
				TargetLanguageCode: language,
				Settings: {
					Formality: config.formality,
					Profanity: config.profanity
				}
			}
			
			return client.send(new TranslateDocumentCommand(request))
				.then((response) => response.TranslatedDocument);
		}));

		translations.push({ language, documents: translatedDocuments });
	}

	return translations;
}

let md: markdownit | undefined;
export async function awsTranslatorTranslate(dataToLocalize: l10nJsonFormat, languages: string[], config: AwsTranslatorConfig): Promise<l10nJsonFormat[]> {
	md ??= markdownit();

	const body: Document[] = [];
	const keys = Object.keys(dataToLocalize);
	for (const key of keys) {
		const value = dataToLocalize[key];
		const message = typeof value === 'string' ? value : value!.message;
		// Render markdown to HTML since Amazon Translator supports HTML and not markdown
		const html = md.render(message);

		body.push({ Content: Buffer.from(html, 'utf8'), ContentType: 'text/html' });
	}
	
	const result = await batchTranslate(body, languages, config);
	return handleSuccess(result, languages, keys);
}
