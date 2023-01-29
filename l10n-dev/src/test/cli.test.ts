/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { readFileSync } from "fs";
import mock from "mock-fs";
import path from "path";
import * as cli from "../cli";

describe('cli', () => {
	context('l10nExportStrings', () => {
		before(() => {
			mock({
				'big.ts': mock.load(path.resolve(__dirname, 'testcases/big.txt')),
				'package.json': '{ "l10n": "./l10n"}'
			});
		})
		afterEach(() => {
			mock.restore();
		});
		it('big.ts', async () => {
			await cli.l10nExportStrings(['big.ts'], 'l10n');
			const result = readFileSync('l10n/bundle.l10n.json', 'utf8');
			const actualLines = result.split('\n');
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
				'  "foobar/foobar": {',
				'    "message": "foobar",',
				'    "comment": [',
				'      "foobar"',
				'    ]',
				'  },',
				// comment case with newline
				'  "foobar/foo\\nbarbar\\nfoo": {',
				'    "message": "foobar",',
				'    "comment": [',
				'      "foo\\nbar",',
				'      "bar\\nfoo"',
				'    ]',
				'  }',
				'}',
			]

			for (let i = 0; i < expectedLines.length; i++) {
				const expectedLine = expectedLines[i];
				const actualLine = actualLines[i];
				assert.strictEqual(actualLine, expectedLine);
			}
		});
	});
});
