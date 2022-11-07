import * as assert from 'assert';
import { ScriptAnalyzer } from '../analyzer';

describe('ScriptAnalyzer', () => {
    const basecaseText = 'Hello World';

    it('require basecase', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
            extension: '.ts',
            contents: `
                const vscode = require('vscode');
                vscode.l10n.t('${basecaseText}');`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('require basecase js', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
            extension: '.js',
            contents: `
                const vscode = require('vscode');
                vscode.l10n.t('${basecaseText}');`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('require basecase object binding', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
            extension: '.ts',
            contents: `
                const { l10n } = require('vscode');
                l10n.t('${basecaseText}');`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('import basecase', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
            extension: '.ts',
            contents: `
                import * as vscode from 'vscode';
                vscode.l10n.t('${basecaseText}');`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('import basecase named imports', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
            extension: '.ts',
            contents: `
                import { l10n } from 'vscode';
                l10n.t('${basecaseText}');`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('import newlines named imports', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
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
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('with comment', () => {
        const analyzer = new ScriptAnalyzer();
        const comment = 'This is a comment';
        const key = `${basecaseText}/${comment}`;
        const result = analyzer.analyze({
            extension: '.ts',
            contents: `
                import { l10n } from 'vscode';
                l10n.t({
                    message: '${basecaseText}',
                    comment: '${comment}',
                    args: ['this is an arg']
                });`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual((result.bundle[key]! as { message: string }).message, basecaseText);
        assert.strictEqual((result.bundle[key]! as { comment: string[] }).comment.length, 1);
        assert.strictEqual((result.bundle[key]! as { comment: string[] }).comment[0], comment);
    });

    it('with comments as array', () => {
        const analyzer = new ScriptAnalyzer();
        const comment = 'This is a comment';
        const key = `${basecaseText}/${comment}`;
        const result = analyzer.analyze({
            extension: '.ts',
            contents: `
                import { l10n } from 'vscode';
                l10n.t({
                    message: '${basecaseText}',
                    comment: ['${comment}'],
                    args: ['this is an arg']
                });`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual((result.bundle[key]! as { message: string }).message, basecaseText);
        assert.strictEqual((result.bundle[key]! as { comment: string[] }).comment.length, 1);
        assert.strictEqual((result.bundle[key]! as { comment: string[] }).comment[0], comment);
    });

    it('@vscode/l10n basecase', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
            extension: '.ts',
            contents: `
                import * as l10n from '@vscode/l10n';
                l10n.t('${basecaseText}');`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('@vscode/l10n does not pickup config calls', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
            extension: '.ts',
            contents: `
                import * as l10n from '@vscode/l10n';
                l10n.config({});`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 0);
    });

    it('does not count other t functions', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
            extension: '.ts',
            contents: `
                import * as i18next from 'i18next';
                i18next.t('${basecaseText}');`
        });
        assert.strictEqual(Object.keys(result.bundle).length, 0);
    });

    it('@vscode/l10n tsx works', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
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
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('@vscode/l10n jsx works', () => {
        const analyzer = new ScriptAnalyzer();
        const result = analyzer.analyze({
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
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });
});
