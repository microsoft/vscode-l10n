/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from "assert";
import { XLF } from "../xlf";

describe('XLF', () => {
    it('works', () => {
        const xlf = new XLF();
        xlf.addFile('bundle', { Hello: 'Hello' });
        const result = xlf.toString();
        assert.strictEqual(result, '<?xml version="1.0" encoding="utf-8"?>\r\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\r\n  <file original="bundle" source-language="en" datatype="plaintext"><body>\r\n    <trans-unit id="Hello">\r\n      <source xml:lang="en">Hello</source>\r\n    </trans-unit>\r\n  </body></file>\r\n</xliff>');
    });

    it('escapes double quotes', () => {
        const xlf = new XLF();
        xlf.addFile('bundle', { '"': 'Hello' });
        const result = xlf.toString();
        assert.strictEqual(result, '<?xml version="1.0" encoding="utf-8"?>\r\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\r\n  <file original="bundle" source-language="en" datatype="plaintext"><body>\r\n    <trans-unit id="&quot;">\r\n      <source xml:lang="en">Hello</source>\r\n    </trans-unit>\r\n  </body></file>\r\n</xliff>');
    });

    it('parses double quotes correctly', async () => {
        const result = await XLF.parse(`
<?xml version="1.0" encoding="utf-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
<file original="package" source-language="en" datatype="plaintext" target-language="de">
<body>
    <trans-unit id="&quot;">
        <source xml:lang="en">Hello</source>
        <target state="translated">World</target>
    </trans-unit>
</body>
</file>
</xliff>`);

        assert.ok(result);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0]!.language, 'de');
        assert.strictEqual(result[0]!.name, 'package');
        assert.ok(result[0]!.messages['"']);
        assert.strictEqual(result[0]!.messages['"'], 'World');
    });
});
