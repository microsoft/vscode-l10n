/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { getL10nFilesFromXlf, getL10nJson, getL10nXlf } from "../main";

describe('main', () => {
	context('getL10nJson', () => {
		it('works', () => {
			const result = getL10nJson([`
			import * as vscode from "vscode";
			vscode.l10n.t("Hello World");
		`]);
			assert.strictEqual(JSON.stringify(result), '{"Hello World":"Hello World"}');
		});

		it('using a TS construct that could be confused as JS should also work fine', () => {
			// The casting originally caused a problem where l10n calls after it would be ignored
			// because we were analyzing JS as TS... now that we use file.ts in the analyzer, this
			// issue goes away.
			const result = getL10nJson([`import * as vscode from 'vscode';
console.log(<any>"foo");
vscode.l10n.t("Hello World");
`]);
			assert.strictEqual(JSON.stringify(result), '{"Hello World":"Hello World"}');
		});
	});

	context('getL10nXlf', () => {
		it('works', () => {
			const map = new Map();
			map.set('a', {
				'Hello World': 'Hello World',
			});
			map.set('b', {
				'Hello Universe': 'Hello Universe',
			});
			const xlf = getL10nXlf(map);
			assert.strictEqual(xlf, '<?xml version="1.0" encoding="utf-8"?>\r\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\r\n  <file original="a" source-language="en" datatype="plaintext"><body>\r\n    <trans-unit id="Hello World">\r\n      <source xml:lang="en">Hello World</source>\r\n    </trans-unit>\r\n  </body></file>\r\n  <file original="b" source-language="en" datatype="plaintext"><body>\r\n    <trans-unit id="Hello Universe">\r\n      <source xml:lang="en">Hello Universe</source>\r\n    </trans-unit>\r\n  </body></file>\r\n</xliff>');
		});
	});

	context('getL10nFilesFromXlf', () => {
		function generateTextXLF(language: string): string {
			return `
<?xml version="1.0" encoding="utf-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="package" source-language="en" datatype="plaintext" target-language="${language}">
    <body>
      <trans-unit id="description">
        <source xml:lang="en">Hello</source>
        <target state="new">World</target>
      </trans-unit>
    </body>
  </file>
  <file original="bundle" source-language="en" datatype="plaintext" target-language="${language}">
    <body>
      <trans-unit id="description">
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
			assert.strictEqual(details.length, 2);
			assert.strictEqual(details[0]!.name, 'package');
			assert.strictEqual(details[0]!.language, 'de');
			assert.strictEqual(details[0]!.messages['description'], 'World');
			assert.strictEqual(details[1]!.name, 'bundle');
			assert.strictEqual(details[1]!.language, 'de');
			assert.strictEqual(details[1]!.messages['description'], 'World');
		});

		it('properly changes some of the languages based on VS Code language packs', async () => {
			let details = await getL10nFilesFromXlf(generateTextXLF('zh-Hans'))
			assert.strictEqual(details.length, 2);
			assert.strictEqual(details[0]!.language, 'zh-cn');
			details = await getL10nFilesFromXlf(generateTextXLF('zh-Hant'))
			assert.strictEqual(details.length, 2);
			assert.strictEqual(details[0]!.language, 'zh-tw');
			details = await getL10nFilesFromXlf(generateTextXLF('pt-BR'))
			assert.strictEqual(details.length, 2);
			assert.strictEqual(details[0]!.language, 'pt-br');
		});
	});
});
