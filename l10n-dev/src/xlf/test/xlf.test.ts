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
        assert.strictEqual(result, '<?xml version="1.0" encoding="utf-8"?>\r\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\r\n  <file original="bundle" source-language="en" datatype="plaintext"><body>\r\n    <trans-unit id="185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969">\r\n      <source xml:lang="en">Hello</source>\r\n    </trans-unit>\r\n  </body></file>\r\n</xliff>');
    });


    it('escapes things correctly', () => {
        const xlf = new XLF();
        // Use to of each to ensure we don't accidentally just grab the first one
        xlf.addFile('bundle', {
            '""': '""',
            "''": "''",
            '<<': '<<',
            '>>': '>>',
            '&&': '&&'
        });
        const result = xlf.toString();
        const header = '<?xml version="1.0" encoding="utf-8"?>\r\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\r\n  <file original="bundle" source-language="en" datatype="plaintext"><body>';
        const quotes = '\r\n    <trans-unit id="12ae32cb1ec02d01eda3581b127c1fee3b0dc53572ed6baf239721a03d82e126">\r\n      <source xml:lang="en">&quot;&quot;</source>\r\n    </trans-unit>';
        const apostrophes = '\r\n    <trans-unit id="6f49cdbd80e1b95d5e6427e1501fc217790daee87055fa5b4e71064288bddede">\r\n      <source xml:lang="en">&apos;&apos;</source>\r\n    </trans-unit>';
        const lessThan = '\r\n    <trans-unit id="4be261c018f23deac37f17f24abb5f42c4f32044fa3116d7b618446fb03ca09e">\r\n      <source xml:lang="en">&lt;&lt;</source>\r\n    </trans-unit>';
        const greaterThan = '\r\n    <trans-unit id="0f02c6bad08d9ff1858d26cf1af766e336d71e34c2e74e8c7d417b3550cbfc44">\r\n      <source xml:lang="en">&gt;&gt;</source>\r\n    </trans-unit>';
        const amp = '\r\n    <trans-unit id="73e7b6f86214bc78ee505fb5f7d4fb97cfa99924a67ca3105113c9a3d52f8fef">\r\n      <source xml:lang="en">&amp;&amp;</source>\r\n    </trans-unit>';
        const footer = '\r\n  </body></file>\r\n</xliff>';
        assert.strictEqual(result, header + quotes + apostrophes + lessThan + greaterThan + amp + footer);
    });

    it('parses double quotes correctly', async () => {
        const result = await XLF.parse(`
<?xml version="1.0" encoding="utf-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
<file original="package" source-language="en" datatype="plaintext" target-language="de">
<body>
    <trans-unit id="12ae32cb1ec02d01eda3581b127c1fee3b0dc53572ed6baf239721a03d82e126">
        <source xml:lang="en">&quot;&quot;</source>
        <target state="translated">&quot;&quot;</target>
    </trans-unit>
    <trans-unit id="6f49cdbd80e1b95d5e6427e1501fc217790daee87055fa5b4e71064288bddede">
        <source xml:lang="en">&apos;&apos;</source>
        <target state="translated">&apos;&apos;</target>
    </trans-unit>
    <trans-unit id="4be261c018f23deac37f17f24abb5f42c4f32044fa3116d7b618446fb03ca09e">
        <source xml:lang="en">&lt;&lt;</source>
        <target state="translated">&lt;&lt;</target>
    </trans-unit>
    <trans-unit id="0f02c6bad08d9ff1858d26cf1af766e336d71e34c2e74e8c7d417b3550cbfc44">
        <source xml:lang="en">&gt;&gt;</source>
        <target state="translated">&gt;&gt;</target>
    </trans-unit>
    <trans-unit id="73e7b6f86214bc78ee505fb5f7d4fb97cfa99924a67ca3105113c9a3d52f8fef">
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
