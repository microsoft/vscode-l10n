/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect } from "@jest/globals";
import { getL10nFilesFromXlf, getL10nJson, getL10nPseudoLocalized, getL10nXlf } from "../main";

describe('main', () => {
	describe('getL10nJson', () => {
		it('works for ts', async () => {
			const result = await getL10nJson([{
				extension: '.ts',
				contents: `
					import * as vscode from "vscode";
					vscode.l10n.t("Hello World");`
			}]);
			expect(JSON.stringify(result)).toBe('{"Hello World":"Hello World"}');
		});

		it('works for js', async () => {
			const result = await getL10nJson([{
				extension: '.js',
				contents: `
					const vscode = require("vscode");
					vscode.l10n.t("Hello World");`
			}]);
			expect(JSON.stringify(result)).toBe('{"Hello World":"Hello World"}');
		});

		it('works for tsx', async () => {
			const result = await getL10nJson([{
				extension: '.tsx',
				contents: `
					import React from 'react';
					import * as l10n from '@vscode/l10n';
					function foo() {
						return (
							<span>
								<textarea placeholder={l10n.t('Hello World')} />
								<span>{l10n.t('Hello Globe')}</span>
							</span>
						);
					}`
			}]);
			expect(JSON.stringify(result)).toBe('{"Hello World":"Hello World","Hello Globe":"Hello Globe"}');
		});

		it('works for jsx', async () => {
			const result = await getL10nJson([{
				extension: '.jsx',
				contents: `
					const l10n = require('@vscode/l10n');
					function foo() {
						return (
							<span>
								<textarea placeholder={l10n.t('Hello World')} />
								<span>{l10n.t('Hello Globe')}</span>
							</span>
						);
					}`
			}]);
			expect(JSON.stringify(result)).toBe('{"Hello World":"Hello World","Hello Globe":"Hello Globe"}');
		});

		it('using a TS construct that could be confused as JS should also work fine', async () => {
			// The casting originally caused a problem where l10n calls after it would be ignored
			// because we were analyzing JS as TS... now that we use file.ts in the analyzer, this
			// issue goes away.
			const result = await getL10nJson([{
				extension: '.ts',
				contents: `import * as vscode from 'vscode';
					console.log(<any>"foo");
					vscode.l10n.t("Hello World");`
			}]);
			expect(JSON.stringify(result)).toBe('{"Hello World":"Hello World"}');
		});
	});

	describe('getL10nXlf', () => {
		it('works', () => {
			const map = new Map();
			map.set('a', {
				'Hello World': 'Hello World',
			});
			map.set('b', {
				'Hello Universe': 'Hello Universe',
			});
			const xlf = getL10nXlf(map);
			expect(xlf).toBe('<?xml version="1.0" encoding="utf-8"?>\r\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\r\n  <file original="a" source-language="en" datatype="plaintext"><body>\r\n    <trans-unit id="++CODE++a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e">\r\n      <source xml:lang="en">Hello World</source>\r\n    </trans-unit>\r\n  </body></file>\r\n  <file original="b" source-language="en" datatype="plaintext"><body>\r\n    <trans-unit id="++CODE++d73d0e9e4c117844d0621a950e8b65c635d023e12a5e6f80b89d077a6b14a71b">\r\n      <source xml:lang="en">Hello Universe</source>\r\n    </trans-unit>\r\n  </body></file>\r\n</xliff>');
		});
	});

	describe('getL10nFilesFromXlf', () => {
		function generateTextXLF(language: string): string {
			return `
<?xml version="1.0" encoding="utf-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="package" source-language="en" datatype="plaintext" target-language="${language}">
    <body>
      <trans-unit id="id">
        <source xml:lang="en">Hello</source>
        <target state="new">World</target>
      </trans-unit>
    </body>
  </file>
  <file original="bundle" source-language="en" datatype="plaintext" target-language="${language}">
    <body>
      <trans-unit id="++CODE++a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e">
        <source xml:lang="en">Hello</source>
        <target state="new">World</target>
      </trans-unit>
    </body>
  </file>
</xliff>
`
		}

		it('works', async () => {
			const details = await getL10nFilesFromXlf(generateTextXLF('de'))
			expect(details.length).toBe(2);
			expect(details[0]!.name).toBe('bundle');
			expect(details[0]!.language).toBe('de');
			expect(details[0]!.messages['Hello']).toBe('World');
			expect(details[1]!.name).toBe('package');
			expect(details[1]!.language).toBe('de');
			expect(details[1]!.messages['id']).toBe('World');
		});

		it('properly changes some of the languages based on VS Code language packs', async () => {
			let details = await getL10nFilesFromXlf(generateTextXLF('zh-Hans'))
			expect(details.length).toBe(2);
			expect(details[0]!.language).toBe('zh-cn');
			details = await getL10nFilesFromXlf(generateTextXLF('zh-Hant'))
			expect(details.length).toBe(2);
			expect(details[0]!.language).toBe('zh-tw');
			details = await getL10nFilesFromXlf(generateTextXLF('pt-BR'))
			expect(details.length).toBe(2);
			expect(details[0]!.language).toBe('pt-br');
		});
	});

	describe('getL10nPseudoLocalized', () => {
		it('works', () => {
			const l10nContents = {
				// base case
				Hello: 'Hello',
				// icon syntax should not be localized
				'$(alert) Hello': '$(alert) Hello',
				// command syntax should not be localized
				'[hello](command:hello)': '[hello](command:hello)',
				// arguments syntax (just the 'this', not the whole { } string) should not be localized
				'{Hello {this}}': '{Hello {this}}',
				// supports long syntax
				'Hello/Hello': {
					message: 'Hello',
					comment: ['Hello']
				}
			};

			const result = getL10nPseudoLocalized(l10nContents);
			expect(JSON.stringify(result)).toBe('{"Hello":"Ħḗḗŀŀǿǿ","$(alert) Hello":"$(alert) Ħḗḗŀŀǿǿ","[hello](command:hello)":"[ħḗḗŀŀǿǿ](command:hello)","{Hello {this}}":"{Ħḗḗŀŀǿǿ {this}}","Hello/Hello":"Ħḗḗŀŀǿǿ"}');
		});
	});
});
