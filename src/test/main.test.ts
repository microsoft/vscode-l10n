import assert from 'assert';
import { getI18nJson, getI18nXlf } from "../main";

describe('main', () => {
	context('getI18nJson', () => {
		it('works', () => {
			const result = getI18nJson([`
			import * as vscode from "vscode";
			vscode.env.i18n("Hello World");
		`]);
			assert.strictEqual(JSON.stringify(result), '{"Hello World":"Hello World"}');
		});
	});

	context('getI18nXlf', () => {
		it('works', () => {
			const a = {
				'Hello World': 'Hello World',
			};
			const b = {
				'Hello Universe': 'Hello Universe',
			};

			const xlf = getI18nXlf(a, b);
			assert.strictEqual(xlf, '<?xml version="1.0" encoding="utf-8"?>\r\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\r\n  <file original="package" source-language="en" datatype="plaintext"><body>\r\n    <trans-unit id="Hello World">\r\n      <source xml:lang="en">Hello World</source>\r\n    </trans-unit>\r\n  </body></file>\r\n  <file original="bundle" source-language="en" datatype="plaintext"><body>\r\n    <trans-unit id="Hello Universe">\r\n      <source xml:lang="en">Hello Universe</source>\r\n    </trans-unit>\r\n  </body></file>\r\n</xliff>');
		});
	});
});
