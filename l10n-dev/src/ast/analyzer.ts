/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import Parser, { QueryMatch } from "web-tree-sitter";
import { IScriptFile, l10nJsonFormat } from "../common";
import { importOrRequireQuery, getTQuery, IAlternativeVariableNames } from "./queries";

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

export class ScriptAnalyzer {
	static #tsParser: Parser | undefined;
	static #tsxParser: Parser | undefined;
	static #tsGrammar: Parser.Language | undefined;
	static #tsxGrammar: Parser.Language | undefined;

	#getCommentsFromMatch(match: QueryMatch): string[] {
		const commentCapture = match.captures.find(c => c.name === 'comment');
		const comment: string[] = [];
		if (commentCapture) {
			commentCapture.node.childCount
				? commentCapture.node.children.filter(c => c.type === 'string').forEach(c => comment.push(c.children[1]!.text))
				: comment.push(commentCapture.node.text);
		}
		return comment;
	}

	#getStringFromMatch(match: QueryMatch, id: string): string | undefined {
		const capture = match.captures.find(c => c.name === id);
		return capture ? capture.node.text : undefined;
	}

	#getImportDetails(match: QueryMatch): IAlternativeVariableNames {
		const importArg = this.#getStringFromMatch(match, 'importArg');
		// we have imported vscode or @vscode/l10n
		if (importArg) {
			const namespace = this.#getStringFromMatch(match, 'namespace');
			if (namespace) {
				return importArg === 'vscode'
					// import * as foo from 'vscode'
					? { vscode: namespace }
					// import * as foo from '@vscode/l10n'
					: { l10n: namespace };
			}
			const namedImportAlias = this.#getStringFromMatch(match, 'namedImportAlias');
			return importArg === 'vscode'
				// import { l10n as foo } from 'vscode' or import { l10n } from 'vscode'
				? { l10n: namedImportAlias }
				// import { t as foo } from '@vscode/l10n' or import { t } from '@vscode/l10n'
				:  { t: namedImportAlias };
		}

		// we have required vscode or @vscode/l10n
		const requireArg = this.#getStringFromMatch(match, 'requireArg');
		const propertyIdentifier = this.#getStringFromMatch(match, 'propertyIdentifier');
		const variableName = this.#getStringFromMatch(match, 'variableName');
		if (!propertyIdentifier) {
			return requireArg === 'vscode'
				// const a = require('vscode') or let a; a = require('vscode')
				? { vscode: variableName }
				// const a = require('@vscode/l10n') or let a; a = require('@vscode/l10n')
				: { l10n: variableName };
		}
		if (!variableName) {
			const propertyIdentifierAlias = this.#getStringFromMatch(match, 'propertyIdentifierAlias');
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
		let parser, grammar;
		switch(extension) {
			case '.jsx':
			case '.tsx':
				if (!ScriptAnalyzer.#tsxParser) {
					await Parser.init();
					ScriptAnalyzer.#tsxParser = new Parser();
					ScriptAnalyzer.#tsxGrammar = await Parser.Language.load(
						path.join(__dirname, '../../tree-sitter-tsx.wasm')
					);
					ScriptAnalyzer.#tsxParser.setLanguage(ScriptAnalyzer.#tsxGrammar);
				}
				grammar = ScriptAnalyzer.#tsxGrammar!;
				parser = ScriptAnalyzer.#tsxParser!;
				break;
			case '.js':
			case '.ts':
				if (!ScriptAnalyzer.#tsParser) {
					await Parser.init();
					ScriptAnalyzer.#tsParser = new Parser();
					ScriptAnalyzer.#tsGrammar = await Parser.Language.load(
						path.join(__dirname, '../../tree-sitter-typescript.wasm')
					);
					ScriptAnalyzer.#tsParser.setLanguage(ScriptAnalyzer.#tsGrammar);
				}
				grammar = ScriptAnalyzer.#tsGrammar!;
				parser = ScriptAnalyzer.#tsParser!;
				break;

			default:
				throw new Error(`File format '${extension}' not supported.`);
		}

		parser.setLanguage(grammar);
		const parsed = parser.parse(contents);

		const importQuery = grammar.query(importOrRequireQuery);
		const importMatches = importQuery.matches(parsed.rootNode);

		const bundle: l10nJsonFormat = {};
		for (const importMatch of importMatches) {
			const importDetails = this.#getImportDetails(importMatch);
			const tQuery = grammar.query(getTQuery(importDetails));
			const matches = tQuery.matches(parsed.rootNode);

			for (const match of matches) {
				const message = this.#getStringFromMatch(match, 'message')!;
				const comment = this.#getCommentsFromMatch(match);

				if (comment.length) {
					const key = `${message}/${comment.join('')}`;
					bundle[key] = { message, comment };
				} else {
					bundle[message] = message;
				}
			}
		}
		return bundle;
	}
}
