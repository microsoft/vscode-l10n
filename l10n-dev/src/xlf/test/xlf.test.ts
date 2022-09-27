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


    it('escapes things correctly', () => {
        const xlf = new XLF();
        // Use to of each to ensure we don't accidentally just grab the first one
        xlf.addFile('bundle', {
            '""': 'quotes',
            "''": 'apostrophes',
            '<<': 'less than',
            '>>': 'greater than',
            '&&': 'ampersands'
        });
        const result = xlf.toString();
        const header = '<?xml version="1.0" encoding="utf-8"?>\r\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\r\n  <file original="bundle" source-language="en" datatype="plaintext"><body>';
        const quotes = '\r\n    <trans-unit id="&quot;&quot;">\r\n      <source xml:lang="en">quotes</source>\r\n    </trans-unit>';
        const apostrophes = '\r\n    <trans-unit id="&apos;&apos;">\r\n      <source xml:lang="en">apostrophes</source>\r\n    </trans-unit>';
        const lessThan = '\r\n    <trans-unit id="&lt;&lt;">\r\n      <source xml:lang="en">less than</source>\r\n    </trans-unit>';
        const greaterThan = '\r\n    <trans-unit id="&gt;&gt;">\r\n      <source xml:lang="en">greater than</source>\r\n    </trans-unit>';
        const amp = '\r\n    <trans-unit id="&amp;&amp;">\r\n      <source xml:lang="en">ampersands</source>\r\n    </trans-unit>';
        const footer = '\r\n  </body></file>\r\n</xliff>';
        assert.strictEqual(result, header + quotes + apostrophes + lessThan + greaterThan + amp + footer);
    });

    it('parses double quotes correctly', async () => {
        const result = await XLF.parse(`
<?xml version="1.0" encoding="utf-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
<file original="package" source-language="en" datatype="plaintext" target-language="de">
<body>
    <trans-unit id="&quot;&quot;">
        <source xml:lang="en">&quot;&quot;</source>
        <target state="translated">&quot;&quot;</target>
    </trans-unit>
    <trans-unit id="&apos;&apos;">
        <source xml:lang="en">&apos;&apos;</source>
        <target state="translated">&apos;&apos;</target>
    </trans-unit>
    <trans-unit id="&lt;&lt;">
        <source xml:lang="en">&lt;&lt;</source>
        <target state="translated">&lt;&lt;</target>
    </trans-unit>
    <trans-unit id="&gt;&gt;">
        <source xml:lang="en">&gt;&gt;</source>
        <target state="translated">&gt;&gt;</target>
    </trans-unit>
    <trans-unit id="&amp;&amp;">
        <source xml:lang="en">&amp;&amp;</source>
        <target state="translated">&amp;&amp;</target>
    </trans-unit>
</body>
</file>
</xliff>`);

        assert.ok(result);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0]!.language, 'de');
        assert.strictEqual(result[0]!.name, 'package');
        assert.ok(result[0]!.messages['""']);
        assert.strictEqual(result[0]!.messages['""'], '""');
        assert.ok(result[0]!.messages["''"]);
        assert.strictEqual(result[0]!.messages["''"], "''");
        assert.ok(result[0]!.messages['<<']);
        assert.strictEqual(result[0]!.messages['<<'], '<<');
        assert.ok(result[0]!.messages['>>']);
        assert.strictEqual(result[0]!.messages['>>'], '>>');
        assert.ok(result[0]!.messages['&&']);
        assert.strictEqual(result[0]!.messages['&&'], '&&');
    });
});
