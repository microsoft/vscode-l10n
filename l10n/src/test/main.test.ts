/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { describe, beforeEach, afterEach, expect, it, jest } from '@jest/globals';
import mock from "mock-fs";
import { platform } from "process";
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();
let l10n: typeof import("../main");

describe('@vscode/l10n', () => {
    beforeEach(() => {
        // ensure we always get a fresh copy of the module
        // so config calls don't bleed between tests
        jest.isolateModules(() => {
            l10n = require("../main");
        });
    })

    afterEach(() => {
        mock.restore();
    });

    it('fallsback when no bundle', () => {
        expect(l10n.t("message")).toBe("message");
    });

    it('load from contents', () => {
        l10n.config({
            contents: {
                message: "translated message"
            }
        });

        expect(l10n.t("message")).toBe("translated message");
    });

    it('load from file uri', async () => {
        mock({
            [process.platform === 'win32' ? 'C:\\mock-bundle.json' : '/mock-bundle.json']: `{ "message": "translated message" }`,
        });
        await l10n.config({ uri: new URL(platform === 'win32' ? 'file:///c:/mock-bundle.json' : 'file:///mock-bundle.json') });

        expect(l10n.t("message")).toBe("translated message");
    });

    it('load from file uri as string', async () => {
        mock({
            [process.platform === 'win32' ? 'C:\\mock-bundle.json' : '/mock-bundle.json']: `{ "message": "translated message" }`,
        });
        await l10n.config({
            uri: new URL(platform === 'win32' ? 'file:///c:/mock-bundle.json' : 'file:///mock-bundle.json').toString()
        });

        expect(l10n.t("message")).toBe("translated message");
    });

    it('load from http uri', async () => {
        fetchMock.mockResponseOnce('{ "message": "translated message" }');
        await l10n.config({ uri: new URL('http://localhost:1234') });
        expect(l10n.t("message")).toBe("translated message");
    });

    it('load from http uri with built-in schema', async () => {
        fetchMock.mockResponseOnce('{ "version": "1.0.0", "contents": { "bundle": { "message": "translated message" } } }');
        await l10n.config({ uri: new URL('http://localhost:1234') });
        expect(l10n.t("message")).toBe("translated message");
    });

    it('load from fsPath', async () => {
        mock({
            [process.platform === 'win32' ? 'C:\\mock-bundle.json' : '/mock-bundle.json']: `{ "message": "translated message" }`,
        });
        l10n.config({
            fsPath: platform === 'win32' ? 'C:\\mock-bundle.json' : '/mock-bundle.json'
        });
        expect(l10n.t("message")).toBe("translated message");
    });

    it('load from fsPath with built-in schema', async () => {
        mock({
            [process.platform === 'win32' ? 'C:\\mock-bundle.json' : '/mock-bundle.json']: '{ "version": "1.0.0", "contents": { "bundle": { "message": "translated message" } } }',
        });
        l10n.config({
            fsPath: platform === 'win32' ? 'C:\\mock-bundle.json' : '/mock-bundle.json'
        });

        expect(l10n.t("message")).toBe("translated message");
    });

    it('supports index args', () => {
        l10n.config({
            contents: {
                message: 'translated {0} message {1}'
            }
        });

        expect(l10n.t("message", "foo", "bar")).toBe("translated foo message bar");
    });

    it('supports record args', () => {
        l10n.config({
            contents: {
                message: 'translated {this} message {that}'
            }
        });

        expect(l10n.t("message", { this: "foo", that: "bar" })).toBe("translated foo message bar");
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
        expect(l10n.t({
            message,
            comment: [comment],
        })).toBe(result);
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
        expect(l10n.t({
            message,
            comment: [comment],
            args: ['foo']
        })).toBe(result);
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
        expect(l10n.t({
            message,
            comment: [comment],
            args: { this: 'foo' }
        })).toBe(result);
    });

    it('supports template literals', () => {
        l10n.config({
            contents: {
                'original {0} message {1}': 'translated {0} message {1}'
            }
        });

        const a = 'foo';
        const b = 'bar';
        expect(l10n.t`original ${a} message ${b}`).toBe("translated foo message bar");
    });

    //#region error cases

    it('rejects when uri does not resolve', () => {
        return expect(l10n.config({ uri: new URL('http://localhost:1234') })).rejects.toThrow();
    });

    it('throws when file path does not exist', () => {
        expect(() => l10n.config({ fsPath: '/does-not-exist' })).toThrow();
    })

    //#endregion
});
