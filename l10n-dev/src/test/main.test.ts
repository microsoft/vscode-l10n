import assert from 'assert';
import { getL10nJson, getL10nXlf } from "../main";

describe('main', () => {
	context('getL10nJson', () => {
		it('works', () => {
			const result = getL10nJson([`
			import * as vscode from "vscode";
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
});
