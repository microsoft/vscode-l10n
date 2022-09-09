/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from "assert";
import importFresh from "import-fresh";
import mock from "mock-fs";

let l10n: typeof import("../main");

describe('@vscode/l10n', () => {
    beforeEach(() => {
        // ensure we always get a fresh copy of the module
        // so config calls don't bleed between tests
        l10n = importFresh("../main");
    })

    it('fallsback when no bundle', () => {
        assert.strictEqual(l10n.t("message"), "message");
    });

    it('load from contents', () => {
        l10n.config({
            contents: {
                message: "translated message"
            }
        });

        assert.strictEqual(l10n.t("message"), "translated message");
    });

    it('load from uri', () => {
        mock({
            'mock-bundle.json': `{ "message": "translated message" }`
        });
        l10n.config({
            uri: 'mock-bundle.json'
        });
        try {
            assert.strictEqual(l10n.t("message"), "translated message");
        } finally {
            mock.restore();
        }
    });

    it('supports comments', () => {
        const message = 'message';
        const comment = 'This is a comment';
        const result = 'translated message';

        const key = `${message}/${comment}`;

        l10n.config({
            contents: {
                [key]: { message: result, comment: [comment] }
            }
        });

        // Normally we would be more static in the declaration of the object 
        // in order to extract them properly but for tests we don't need to do that.
        assert.strictEqual(l10n.t({
            message,
            comment: [comment],
            args: ['this is an arg']
        }), result);
    });
});
