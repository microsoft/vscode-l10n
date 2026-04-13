/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { execFileSync, spawnSync } from 'child_process';
import { describe, beforeEach, afterEach, expect, it, jest } from '@jest/globals';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import mock from "mock-fs";
import { tmpdir } from 'os';
import { join } from 'path';
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

    it('declares dual-publish entrypoints', () => {
        const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

        expect(packageJson.exports?.['.']).toMatchObject({
            types: './dist/main.d.ts',
            browser: './dist/browser.js',
            import: './dist/main.mjs',
            require: './dist/main.js',
            default: './dist/main.js'
        });
    });

    it('loads the packed module with both require and import', () => {
        const packageRoot = join(__dirname, '../..');
        const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const tempDir = mkdtempSync(join(tmpdir(), 'vscode-l10n-pack-'));
        let tarball: string | undefined;

        // Use spawnSync for npm commands to avoid circular-reference errors in the
        // Error thrown by execFileSync when the spawn itself fails on Windows.
        const runNpm = (args: string[], cwd: string, stdio: 'pipe' | 'ignore' = 'pipe'): string => {
            const result = spawnSync(npmCommand, args, { cwd, encoding: 'utf8', stdio });
            if (result.error) {
                throw new Error(`npm ${args.join(' ')}: ${result.error.message}`);
            }
            if (result.status !== 0) {
                throw new Error(`npm ${args.join(' ')} exited with ${result.status ?? 'null'}\n${result.stderr ?? ''}`);
            }
            return result.stdout ?? '';
        };

        try {
            // Build and install the real packed artifact into an isolated temp project.
            runNpm(['run', 'compile'], packageRoot);
            tarball = runNpm(['pack', '--silent'], packageRoot).trim().split(/\r?\n/).pop();

            runNpm(['init', '-y'], tempDir, 'ignore');
            runNpm(['install', join(packageRoot, tarball!)], tempDir);

            const cjsOutput = execFileSync(process.execPath, ['-e', "const l10n=require('@vscode/l10n'); console.log(typeof l10n.t, typeof l10n.config)"], {
                cwd: tempDir,
                encoding: 'utf8'
            }).trim();
            const esmOutput = execFileSync(process.execPath, ['--input-type=module', '-e', "import * as l10n from '@vscode/l10n'; console.log(typeof l10n.t, typeof l10n.config)"], {
                cwd: tempDir,
                encoding: 'utf8'
            }).trim();

            expect(cjsOutput).toBe('function function');
            expect(esmOutput).toBe('function function');
        } finally {
            if (tarball) {
                rmSync(join(packageRoot, tarball), { force: true });
            }
            rmSync(tempDir, { recursive: true, force: true });
        }
    }, 30000);

    //#region error cases

    it('rejects when uri does not resolve', () => {
        return expect(l10n.config({ uri: new URL('http://localhost:1234') })).rejects.toThrow();
    });

    it('throws when file path does not exist', () => {
        expect(() => l10n.config({ fsPath: '/does-not-exist' })).toThrow();
    })

    //#endregion
});
