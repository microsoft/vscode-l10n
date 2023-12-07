/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { readFileSync } from "fs";
import mock from "mock-fs";
import path from "path";
import * as cli from "../cli";

// TODO: Is there a better way to do this?
const tsGrammarPath = path.resolve(__dirname, '../ast/tree-sitter-typescript.wasm');
const tsxGrammarPath = path.resolve(__dirname, '../ast/tree-sitter-tsx.wasm');

describe('cli', () => {
	describe('l10nExportStrings', () => {
		beforeEach(() => {
			mock({
				'big.ts': mock.load(path.resolve(__dirname, 'testcases/big.txt')),
				'package.json': '{ "l10n": "./l10n"}',
				[tsGrammarPath]: mock.load(tsGrammarPath),
				[tsxGrammarPath]: mock.load(tsxGrammarPath),
			});
		})
		afterEach(() => {
			mock.restore();
		});
		it('big file of test cases', async () => {
			await cli.l10nExportStrings(['big.ts'], 'l10n');
			const result = readFileSync('l10n/bundle.l10n.json', 'utf8');
			const actualLines = result.split(/\r?\n/);
			const expectedLines = [
				'{',
				// simple case
				'  "Hello World": "Hello World",',
				// simple case with quote
				'  "foo\'bar": "foo\'bar",',
				// simple case with escaped quote
				'  "foo\\"bar": "foo\\"bar",',
				// simple case with newline
				'  "foo\\nbaz": "foo\\nbaz",',
				// comment case
				'  "foobar/foobarbarfoo": {',
				'    "message": "foobar",',
				'    "comment": [',
				'      "foobar",',
				'      "barfoo"',
				'    ]',
				'  }',
				'}',
			]

			for (let i = 0; i < expectedLines.length; i++) {
				const expectedLine = expectedLines[i];
				const actualLine = actualLines[i];
				expect(actualLine).toBe(expectedLine);
			}
		});
	});
	describe('l10nGenerateXlf', () => {
		beforeEach(() => {
			mock({
				'bundle.l10n.json': mock.load(path.resolve(__dirname, 'testcases/testBundle.json'))
			});
		})
		afterEach(() => {
			mock.restore();
		});
		it('big file of test cases', async () => {
			cli.l10nGenerateXlf(['bundle.l10n.json'], 'en', 'result.xlf');
			const result = readFileSync('result.xlf', 'utf8');
			const actualLines = result.split(/\r?\n/);
			const expectedLines = [
				'<?xml version="1.0" encoding="utf-8"?>',
				'<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">',
				'  <file original="bundle" source-language="en" datatype="plaintext"><body>',
				'    <trans-unit id="++CODE++a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e">',
				'      <source xml:lang="en">Hello World</source>',
				'    </trans-unit>',
                '    <trans-unit id="++CODE++f7169bcdd14bcdffa49e1c5f2be8d62e6537e3388d5c0c4b3038fc19e2d87f51">',
                '      <source xml:lang="en">foo&#10;baz</source>',
                '    </trans-unit>',
                '    <trans-unit id="++CODE++34bfea118ab80523cc666a19e02fc9bf8fb04fc7ed57f3a1b2225ffb05003db8">',
                '      <source xml:lang="en">foo&apos;bar</source>',
                '    </trans-unit>',
                '    <trans-unit id="++CODE++cf24e195fe61138ec386aef8e03531ceaeca2cb07f2e59e467c0b7c216a69436">',
                '      <source xml:lang="en">foo&quot;bar</source>',
                '    </trans-unit>',
                '    <trans-unit id="++CODE++4583d71a6609d5b41265349689b437c4d01aef9765ed70032fe3600c216d6b48">',
                '      <source xml:lang="en">foobar</source>',
                '      <note>foobar',
                'barfoo</note>',
                '    </trans-unit>',
                '  </body></file>',
                '</xliff>'
			];
			for (let i = 0; i < expectedLines.length; i++) {
				const expectedLine = expectedLines[i];
				const actualLine = actualLines[i];
				expect(actualLine).toBe(expectedLine);
			}
		});
	});
	describe('l10nImportXlf', () => {
		beforeEach(() => {
			mock({
				'test.xlf': mock.load(path.resolve(__dirname, 'testcases/test.xml'))
			});
		})
		afterEach(() => {
			mock.restore();
		});
		it('big file of test cases', async () => {
			await cli.l10nImportXlf(['test.xlf'], 'l10n');
			const bundleResult = readFileSync('l10n/bundle.l10n.qps-ploc.json', 'utf8');
			const bundleActualLines = bundleResult.split(/\r?\n/);
			const bundleExpectedLines = [
				'{',
				'  "Hello World": "Hèℓℓô Wôřℓδ",',
				'  "foo\\nbaz": "ƒôô\\nβáƺ",',
				'  "foo\\"bar": "ƒôô\\"βář",',
				'  "foo\'bar": "ƒôô\'βář",',
				'  "foobar/foobarbarfoo": "ƒôôβář"',
				'}',
			];
			for (let i = 0; i < bundleExpectedLines.length; i++) {
				const expectedLine = bundleExpectedLines[i];
				const actualLine = bundleActualLines[i];
				expect(actualLine).toBe(expectedLine);
			}

			const packageResult = readFileSync('l10n/package.nls.qps-ploc.json', 'utf8');
			const packageActualLines = packageResult.split(/\r?\n/);
			const packageExpectedLines = [
				'{',
				'  "basecase": "Hèℓℓô Wôřℓδ",',
				'  "with apos": "ƒôô\'βář",',
				'  "with newline": "ƒôô\\nβáƺ",',
				'  "with notes": "ƒôôβář",',
				'  "with quote": "ƒôô\\"βář"',
				'}',
			];
			for (let i = 0; i < packageExpectedLines.length; i++) {
				const expectedLine = packageExpectedLines[i];
				const actualLine = packageActualLines[i];
				expect(actualLine).toBe(expectedLine);
			}
		});
	});

	describe('l10nGeneratePseudo', () => {
		beforeEach(() => {
			mock({
				'bundle.l10n.json': mock.load(path.resolve(__dirname, 'testcases/testBundle.json'))
			});
		})
		afterEach(() => {
			mock.restore();
		});
		it('big file of test cases', async () => {
			cli.l10nGeneratePseudo(['bundle.l10n.json'], 'qps-ploc');
			const result = readFileSync('bundle.l10n.qps-ploc.json', 'utf8');
			const actualLines = result.split(/\r?\n/);
			const expectedLines = [
				'{',
				'  "Hello World": "Ħḗḗŀŀǿǿ Ẇǿǿřŀḓ",',
				'  "foo\'bar": "ƒǿǿǿǿ\'ƀȧȧř",',
				'  "foo\\"bar": "ƒǿǿǿǿ\\"ƀȧȧř",',
				'  "foo\\nbaz": "ƒǿǿǿǿ\\nƀȧȧẑ",',
				'  "foobar/foobarbarfoo": "ƒǿǿǿǿƀȧȧř"',
				'}',
			];
			for (let i = 0; i < expectedLines.length; i++) {
				const expectedLine = expectedLines[i];
				const actualLine = actualLines[i];
				expect(actualLine).toBe(expectedLine);
			}
		});
	});
});
