/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from "assert";
import importFresh from "import-fresh";
import mock from "mock-fs";
import { platform } from "process";

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
            '/mock-bundle.json': `{ "message": "translated message" }`,
            'C:\\mock-bundle.json': `{ "message": "translated message" }`
        });
        l10n.config({ uri: new URL(platform === 'win32' ? 'file:///c:/mock-bundle.json' : 'file:///mock-bundle.json') });

        try {
            assert.strictEqual(l10n.t("message"), "translated message");
        } finally {
            mock.restore();
        }
    });

    it('load from uri as string', () => {
        mock({
            '/mock-bundle.json': `{ "message": "translated message" }`,
            'C:\\mock-bundle.json': `{ "message": "translated message" }`
        });
        l10n.config({
            uri: new URL(platform === 'win32' ? 'file:///c:/mock-bundle.json' : 'file:///mock-bundle.json').toString()
        });
        try {
            assert.strictEqual(l10n.t("message"), "translated message");
        } finally {
            mock.restore();
        }
    });

    it('supports index args', () => {
        l10n.config({
            contents: {
                message: 'translated {0} message {1}'
            }
        });

        assert.strictEqual(l10n.t("message", "foo", "bar"), "translated foo message bar");
    });

    it('supports record args', () => {
        l10n.config({
            contents: {
                message: 'translated {this} message {that}'
            }
        });

        assert.strictEqual(l10n.t("message", { this: "foo", that: "bar" }), "translated foo message bar");
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
        }), result);
    });

    it('supports index args and comments', () => {
        const message = 'message {0}';
        const comment = 'This is a comment';
        const result = 'translated message foo';

        const key = `${message}/${comment}`;

        l10n.config({
            contents: {
                [key]: { message: 'translated message {0}', comment: [comment] }
            }
        });

        // Normally we would be more static in the declaration of the object 
        // in order to extract them properly but for tests we don't need to do that.
        assert.strictEqual(l10n.t({
            message,
            comment: [comment],
            args: ['foo']
        }), result);
    });

    it('supports object args and comments', () => {
        const message = 'message {this}';
        const comment = 'This is a comment';
        const result = 'translated message foo';

        const key = `${message}/${comment}`;

        l10n.config({
            contents: {
                [key]: { message: 'translated message {this}', comment: [comment] }
            }
        });

        // Normally we would be more static in the declaration of the object 
        // in order to extract them properly but for tests we don't need to do that.
        assert.strictEqual(l10n.t({
            message,
            comment: [comment],
            args: { this: 'foo' }
        }), result);
    });
});
