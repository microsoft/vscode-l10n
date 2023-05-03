/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import Parser, { QueryMatch } from "web-tree-sitter";
import { IScriptFile, l10nJsonFormat } from "../common";
import { importOrRequireQuery, getTQuery, IAlternativeVariableNames, getLitQuery } from "./queries";
import { unescapeString } from './unescapeString';

// Workaround for https://github.com/tree-sitter/tree-sitter/issues/1765
try {
	const matches = /^v(\d+).\d+.\d+$/.exec(process.version);
	if (matches && matches[1]) {
		const majorVersion = matches[1];
		if (parseInt(majorVersion) >= 18) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-ignore
			delete WebAssembly.instantiateStreaming
		}
	}
} catch {
	// ignore any errors here
}

const initParser = Parser.init();

export class ScriptAnalyzer {
	static #tsParser: Promise<Parser> = (async () => {
		await initParser;
		const parser = new Parser();
		parser.setLanguage(await ScriptAnalyzer.#tsGrammar);
		return parser;
	})();
	static #tsxParser: Promise<Parser> = (async () => {
		await initParser;
		const parser = new Parser();
		parser.setLanguage(await ScriptAnalyzer.#tsxGrammar);
		return parser;
	})();
	static #tsGrammar: Promise<Parser.Language> = (async () => {
		await initParser;
		return await Parser.Language.load(
			path.resolve(__dirname, 'tree-sitter-typescript.wasm')
		);
	})();
	static #tsxGrammar: Promise<Parser.Language> = (async () => {
		await initParser;
		return await Parser.Language.load(
			path.resolve(__dirname, 'tree-sitter-tsx.wasm')
		);
	})();

	#getCommentsFromMatch(match: QueryMatch): string[] {
		const commentCapture = match.captures.find(c => c.name === 'comment');
		if (!commentCapture) {
			return [];
		}
		if (commentCapture.node.type === 'string') {
			const text = commentCapture.node.text;
			// remove quotes using indirect eval
			return [(0, eval)(text)];
		}

		// we have an array of comments
		return commentCapture.node.children
			.filter(c => c.type === 'string')
			// remove quotes using indirect eval
			.map(c => (0, eval)(c.text));
	}

	#getStringFromMatch(match: QueryMatch, id: string, unescape: boolean): string | undefined {
		const capture = match.captures.find(c => c.name === id);
		if (!capture) {
			return undefined;
		}
		const text = capture.node.text;
		// remove quotes
		if (!unescape) {
			return text;
		}

		return this.#getUnquotedString(text);
	}

	#getUnquotedString(text: string): string {
		const character = text[0];
		if (character !== '\'' && character !== '"' && character !== '`') {
			return text;
		}

		return unescapeString(text.slice(1, -1));
	}

	#getImportDetails(match: QueryMatch): IAlternativeVariableNames {
		const importArg = this.#getStringFromMatch(match, 'importArg', false);
		// we have imported vscode or @vscode/l10n
		if (importArg) {
			const namespace = this.#getStringFromMatch(match, 'namespace', false);
			if (namespace) {
				return importArg === 'vscode'
					// import * as foo from 'vscode'
					? { vscode: namespace }
					// import * as foo from '@vscode/l10n'
					: { l10n: namespace };
			}
			const namedImportAlias = this.#getStringFromMatch(match, 'namedImportAlias', false);
			return importArg === 'vscode'
				// import { l10n as foo } from 'vscode' or import { l10n } from 'vscode'
				? { l10n: namedImportAlias }
				// import { t as foo } from '@vscode/l10n' or import { t } from '@vscode/l10n'
				:  { t: namedImportAlias };
		}

		// we have required vscode or @vscode/l10n
		const requireArg = this.#getStringFromMatch(match, 'requireArg', false);
		const propertyIdentifier = this.#getStringFromMatch(match, 'propertyIdentifier', false);
		const variableName = this.#getStringFromMatch(match, 'variableName', false);
		if (!propertyIdentifier) {
			return requireArg === 'vscode'
				// const a = require('vscode') or let a; a = require('vscode')
				? { vscode: variableName }
				// const a = require('@vscode/l10n') or let a; a = require('@vscode/l10n')
				: { l10n: variableName };
		}
		if (!variableName) {
			const propertyIdentifierAlias = this.#getStringFromMatch(match, 'propertyIdentifierAlias', false);
			return requireArg === 'vscode'
				// const { l10n } = require('vscode') or const { l10n: foo } = require('vscode')
				? { l10n: propertyIdentifierAlias }
				// const { t } = require('@vscode/l10n') or const { t: foo } = require('@vscode/l10n')
				: { t: propertyIdentifierAlias };
		}
		return requireArg === 'vscode'
			// const a = require('vscode').l10n or let a; a = require('vscode').l10n
			? { l10n: variableName }
			// const a = require('@vscode/l10n').t or let a; a = require('@vscode/l10n').t
			: { t: variableName };
	}

	async analyze({ extension, contents }: IScriptFile): Promise<l10nJsonFormat> {
		// if the file doesn't contain l10n or vscode, it isn't importing what we care about
		// so we don't need to spend time parsing it
		if (!contents.includes('l10n') || !contents.includes('vscode')) {
			return {};
		}

		let parser, grammar;
		switch(extension) {
			case '.jsx':
			case '.tsx':
				grammar = await ScriptAnalyzer.#tsxGrammar;
				parser = await ScriptAnalyzer.#tsxParser;
				break;
			case '.js':
			case '.ts':
				grammar = await ScriptAnalyzer.#tsGrammar;
				parser = await ScriptAnalyzer.#tsParser;
				break;

			default:
				throw new Error(`File format '${extension}' not supported.`);
		}

		const parsed = parser.parse(contents);

		const importQuery = grammar.query(importOrRequireQuery);
		const importMatches = importQuery.matches(parsed.rootNode);

		const bundle: l10nJsonFormat = {};
		for (const importMatch of importMatches) {
			const importDetails = this.#getImportDetails(importMatch);
			const tQuery = grammar.query(getTQuery(importDetails));
			const tmatches = tQuery.matches(parsed.rootNode);
			for (const match of tmatches) {
				const message = this.#getStringFromMatch(match, 'message', true)!;
				const comment = this.#getCommentsFromMatch(match);

				if (comment.length) {
					const key = `${message}/${comment.join('')}`;
					bundle[key] = { message, comment };
				} else {
					bundle[message] = message;
				}
			}

			const litQuery = grammar.query(getLitQuery(importDetails));
			const litmatches = litQuery.matches(parsed.rootNode);
			for (const match of litmatches) {
				// don't unescape yet, otherwise offsets will be wrong:
				const str = match.captures.find(c => c.name === 'str')!.node;
				const subs = match.captures.filter(c => c.name === 'sub');
				let message = str.text;
				for (let i = subs.length - 1; i >= 0; i--) {
					const sub = subs[i]!;
					message = message.slice(0, sub.node.startIndex - str.startIndex) + `{${i}}` + message.slice(sub.node.endIndex - str.startIndex);
				}

				message = this.#getUnquotedString(message);
				bundle[message] = message;
			}
		}
		return bundle;
	}
}
