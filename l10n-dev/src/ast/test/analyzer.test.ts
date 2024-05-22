/* eslint-disable no-useless-escape */
import { describe, it, expect } from '@jest/globals';
import { ScriptAnalyzer } from '../analyzer';

describe('ScriptAnalyzer', () => {
    const basecaseText = 'Hello World' as string;

    describe('importing vscode', () => {
        it('require js', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.js',
                contents: `
                    const vscode = require('vscode');
                    vscode.l10n.t('${basecaseText}');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
        });

        it('require object binding', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    const { l10n } = require('vscode');
                    l10n.t('${basecaseText}');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
        });

        it('require property accessing', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    const l10n = require('vscode').l10n;
                    l10n.t('${basecaseText}');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
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
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
        });

        it('import namespace', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as vscode from 'vscode';
                    vscode.l10n.t('${basecaseText}');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
        });

        it('import named imports', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import { l10n } from 'vscode';
                    l10n.t('${basecaseText}');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
        });

        it('import named imports renamed', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import { l10n as _ } from 'vscode';
                    _.t('${basecaseText}');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
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
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
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
                expect(Object.keys(result!).length).toBe(1);
                expect(result![basecaseText]!).toBe(basecaseText);
            }
        });
    });

    describe('importing @vscode/l10n', () => {
        it('import namespace', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t('${basecaseText}');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
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
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
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
            expect(Object.keys(result!).length).toBe(1);
            expect(result![basecaseText]!).toBe(basecaseText);
        });
    });

    describe('usage of l10n.t tagged template', () => {
        it('args are object with comment as string', async () => {
            const analyzer = new ScriptAnalyzer();
            const key = `hello {0} and {1}!`;
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import { l10n } from 'vscode';
                    l10n.t\`hello \${name} and \${other}!\`;`
            });
            expect(result).toEqual({ [key]: 'hello {0} and {1}!' });
        });

        it('does not count other t functions', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as i18next from 'i18next';
                    i18next.t\`${basecaseText}\`;`
            });
            expect(result).toEqual({});
        });

        it('exports escaped quotes correctly', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t\`foo\\\`bar\``
            });
            expect(result).toEqual({ 'foo`bar': 'foo`bar' });
        });

        it('exports unnecessary escaped characters correctly', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t\`foo\\"bar'\``
            });
            expect(result).toEqual({ 'foo"bar\'': 'foo"bar\'' });
        });

        it('allows tagged template messages with new lines', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: "import * as l10n from '@vscode/l10n';\r\nl10n.t\`a\r\nb\`"
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result![`a\nb`]!).toBe(`a\nb`);
        });
    });

    describe('usage of l10n.t()', () => {
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
            expect(Object.keys(result!).length).toBe(1);
            expect((result[key]! as { message: string }).message).toBe(basecaseText);
            expect((result[key]! as { comment: string[] }).comment.length).toBe(1);
            expect((result[key]! as { comment: string[] }).comment[0]).toBe(comment);
        });

        it('args are object with comment as template string', async () => {
            const analyzer = new ScriptAnalyzer();
            const comment = 'This is a comment';
            const key = `${basecaseText}/${comment}`;
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import { l10n } from 'vscode';
                    l10n.t({
                        message: '${basecaseText}',
                        comment: \`${comment}\`,
                        args: ['this is an arg']
                    });`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect((result[key]! as { message: string }).message).toBe(basecaseText);
            expect((result[key]! as { comment: string[] }).comment.length).toBe(1);
            expect((result[key]! as { comment: string[] }).comment[0]).toBe(comment);
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
            expect(Object.keys(result!).length).toBe(1);
            expect((result[key]! as { message: string }).message).toBe(basecaseText);
            expect((result[key]! as { comment: string[] }).comment.length).toBe(1);
            expect((result[key]! as { comment: string[] }).comment[0]).toBe(comment);
        });

        it('args are object with comments as array of template string', async () => {
            const analyzer = new ScriptAnalyzer();
            const comment = 'This is a comment';
            const key = `${basecaseText}/${comment}`;
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import { l10n } from 'vscode';
                    l10n.t({
                        message: '${basecaseText}',
                        comment: [\`${comment}\`],
                        args: ['this is an arg']
                    });`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect((result[key]! as { message: string }).message).toBe(basecaseText);
            expect((result[key]! as { comment: string[] }).comment.length).toBe(1);
            expect((result[key]! as { comment: string[] }).comment[0]).toBe(comment);
        });

        it('@vscode/l10n does not pickup config calls', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.config({});`
            });
            expect(Object.keys(result!).length).toBe(0);
        });

        it('does not count other t functions', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as i18next from 'i18next';
                    i18next.t('${basecaseText}');`
            });
            expect(Object.keys(result!).length).toBe(0);
        });

        it('handles newlines in message in t calls', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                import { l10n } from 'vscode';
                l10n.t('foo\\nbar');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result!['foo\nbar']).toBe('foo\nbar');
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
                expect(Object.keys(result!).length).toBe(1);
                expect((result!['foobar/foo\nbarbar\nfoo']! as { message: string }).message).toBe('foobar');
                expect((result!['foobar/foo\nbarbar\nfoo']! as { comment: string[] }).comment[0]).toBe('foo\nbar');
                expect((result!['foobar/foo\nbarbar\nfoo']! as { comment: string[] }).comment[1]).toBe('bar\nfoo');
            });

        it('exports escaped quotes correctly', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t('foo\\'bar');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result!['foo\'bar']).toBe('foo\'bar');
        });

        it('exports unnecessary escaped characters correctly', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: `
                    import * as l10n from '@vscode/l10n';
                    l10n.t('foo\"bar');`
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result!['foo\"bar']).toBe('foo\"bar');
        });

        it('allows template literal messages without template args in l10n.t() calls', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({ extension: '.ts', contents: "import * as l10n from '@vscode/l10n';\nl10n.t(`foo`)" });
            expect(Object.keys(result!).length).toBe(1);
            expect(result!['foo']!).toBe('foo');
        });

        it('allows template literal messages with new lines', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: "import * as l10n from '@vscode/l10n';\r\nl10n.t(\`a\r\nb\`)"
            });
            expect(Object.keys(result!).length).toBe(1);
            expect(result![`a\nb`]!).toBe(`a\nb`);
        });

        it('disallows template literal messages containing template args in l10n.t() calls', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = analyzer.analyze({ extension: '.ts', contents: "import * as l10n from '@vscode/l10n';\nl10n.t(`${42}`)" });
            await expect(result).rejects.toThrow();
        });

        it('allows template literal comments with new lines', async () => {
            const analyzer = new ScriptAnalyzer();
            const result = await analyzer.analyze({
                extension: '.ts',
                contents: "import * as l10n from '@vscode/l10n';l10n.t({ message: 'a', comment: [\`a\r\nb\`] });"
            });
            expect(Object.keys(result!).length).toBe(1);
            expect((result!['a/a\nb']! as { message: string }).message).toBe('a');
            expect((result!['a/a\nb']! as { comment: string[] }).comment[0]).toBe('a\nb');
        });
    });
});
