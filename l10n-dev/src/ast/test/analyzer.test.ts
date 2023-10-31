/* eslint-disable no-useless-escape */
import * as assert from 'assert';
import { ScriptAnalyzer } from '../analyzer';

describe('ScriptAnalyzer', async () => {
    const basecaseText = 'Hello World' as string;

    context('importing vscode', async () => {
        it('require', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    const vscode = require('vscode');
                    vscode.l10n.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });
        it('require js', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.js',
                contents: `
                    const vscode = require('vscode');
                    vscode.l10n.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });

        it('require object binding', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    const { l10n } = require('vscode');
                    l10n.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });

        it('require property accessing', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    const l10n = require('vscode').l10n;
                    l10n.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });

        it('require variable declared elsewhere for try/catch scenario', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    let l10n;
                    try {
                        l10n = require('vscode').l10n;
                    } catch (e) {
                        l10n = { t: (message) => message };
                    }

                    // Shouldn't pick up these other BinaryExpressions
                    l10n === undefined;
                    l10n !== undefined;
                    const a = l10n;

                    l10n.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });

        it('import namespace', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as vscode from 'vscode';
                    vscode.l10n.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });

        it('import named imports', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import { l10n } from 'vscode';
                    l10n.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });

        it('import newlines named imports', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import {
                        Command,
                        Disposable,
                        l10n,
                        Event,
                        EventEmitter,
                        FilePermission,
                        FileStat,
                        FileSystemError,
                        FileType,
                        Range,
                        TextDocumentShowOptions,
                        Uri,
                        window,
                        workspace,
                        WorkspaceEdit,
                    } from 'vscode';
                    l10n.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });

        it('require ensure it can run on multiple files', async () => {
            const analyzer = new ScriptAnalyzer();
            for (let i = 0; i < 10; i++) {
                const result = await analyzer.analyze({
                    extension: '.ts',
                    contents: `
                        const vscode = require('vscode');
                        vscode.l10n.t('${basecaseText}');`
                });
                assert.strictEqual(Object.keys(result!).length, 1);
                assert.strictEqual(result![basecaseText]!, basecaseText);
            }
        }).timeout(10000);
    });

    context('importing @vscode/l10n', async () => {
        it('import namespace', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });

        it('@vscode/l10n import namespace tsx', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.tsx',
                contents: `
                    import React from 'react';
                    import * as l10n from '@vscode/l10n';
                    function foo() {
                        return (
                            <textarea placeholder={l10n.t('${basecaseText}')} />
                        );
                    }`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });

        it('@vscode/l10n import namespace jsx', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.jsx',
                contents: `
                    import React from 'react';
                    import * as l10n from '@vscode/l10n';
                    function foo() {
                        return (
                            <textarea placeholder={l10n.t('${basecaseText}')} />
                        );
                    }`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result![basecaseText]!, basecaseText);
        });
    });

    context('usage of l10n.t literal', async () => {
        it('args are object with comment as string', async () => {
            const analyzer = new ScriptAnalyzer();
            const key = `hello {0} and {1}!`;
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import { l10n } from 'vscode';
                    l10n.t\`hello \${name} and \${other}!\`;`
            });
            assert.deepStrictEqual(result, { [key]: 'hello {0} and {1}!' });
        });

        it('does not count other t functions', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as i18next from 'i18next';
                    i18next.t\`${basecaseText}\`;`
            });
            assert.deepStrictEqual(result, {});
        });

        it('exports escaped quotes correctly', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t\`foo\\\`bar\``
            });
            assert.deepStrictEqual(result, { 'foo`bar': 'foo`bar' });
        });

        it('exports unnecessary escaped characters correctly', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t\`foo\\"bar'\``
            });
            assert.deepStrictEqual(result, { 'foo"bar\'': 'foo"bar\'' });
        });
    });

    context('usage of l10n.t()', async () => {
        it('args are object with comment as string', async () => {
            const analyzer = new ScriptAnalyzer();
            const comment = 'This is a comment';
            const key = `${basecaseText}/${comment}`;
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import { l10n } from 'vscode';
                    l10n.t({
                        message: '${basecaseText}',
                        comment: '${comment}',
                        args: ['this is an arg']
                    });`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual((result[key]! as { message: string }).message, basecaseText);
            assert.strictEqual((result[key]! as { comment: string[] }).comment.length, 1);
            assert.strictEqual((result[key]! as { comment: string[] }).comment[0], comment);
        });

        it('args are object with comments as array', async () => {
            const analyzer = new ScriptAnalyzer();
            const comment = 'This is a comment';
            const key = `${basecaseText}/${comment}`;
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import { l10n } from 'vscode';
                    l10n.t({
                        message: '${basecaseText}',
                        comment: ['${comment}'],
                        args: ['this is an arg']
                    });`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual((result[key]! as { message: string }).message, basecaseText);
            assert.strictEqual((result[key]! as { comment: string[] }).comment.length, 1);
            assert.strictEqual((result[key]! as { comment: string[] }).comment[0], comment);
        });

        it('@vscode/l10n does not pickup config calls', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.config({});`
            });
            assert.strictEqual(Object.keys(result!).length, 0);
        });

        it('does not count other t functions', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as i18next from 'i18next';
                    i18next.t('${basecaseText}');`
            });
            assert.strictEqual(Object.keys(result!).length, 0);
        });

        it('handles newlines in message in t calls', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                import { l10n } from 'vscode';
                l10n.t('foo\\nbar');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result!['foo\nbar']!, 'foo\nbar');
        });

        it('handles newlines in comment in t calls', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                import { l10n } from 'vscode';
                l10n.t({
                    message: 'foobar',
                    comment: ['foo\\nbar', 'bar\\nfoo']
                });`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual((result!['foobar/foo\nbarbar\nfoo']! as { message: string }).message, 'foobar');
            assert.strictEqual((result!['foobar/foo\nbarbar\nfoo']! as { comment: string[] }).comment[0], 'foo\nbar');
            assert.strictEqual((result!['foobar/foo\nbarbar\nfoo']! as { comment: string[] }).comment[1], 'bar\nfoo');
        });

        it('exports escaped quotes correctly', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t('foo\\'bar');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result!['foo\'bar']!, 'foo\'bar');
        });

        it('exports unnecessary escaped characters correctly', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t('foo\"bar');`
            });
            assert.strictEqual(Object.keys(result!).length, 1);
            assert.strictEqual(result!['foo\"bar']!, 'foo\"bar');
        });

        it('allows template literal messages without template args in l10n.t() calls', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({ extension: '.ts', contents: 'import * as l10n from @vscode/l10n\nl10n.t(`foo`)' });
            assert.deepStrictEqual(result, { foo: 'foo' });
        });

        it('disallows template literal messages containing template args in l10n.t() calls', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = analyzer.analyze({ extension: '.ts', contents: 'import * as l10n from @vscode/l10n\nl10n.t(`${42}`)' });
            assert.throws(() => result);
        });
    });
});
