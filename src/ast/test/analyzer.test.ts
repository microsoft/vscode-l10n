import * as assert from 'assert';
import { i18nJsonMessageFormat } from '../../common';
import { JavaScriptAnalyzer } from '../analyzer';

describe('JavaScriptAnalyzer', () => {
    const basecaseText = 'Hello World';

    it('require basecase', () => {
        const analyzer = new JavaScriptAnalyzer();
        const result = analyzer.analyze(`
            const vscode = require('vscode');
            vscode.env.i18n('${basecaseText}');
        `);
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('require basecase object binding', () => {
        const analyzer = new JavaScriptAnalyzer();
        const result = analyzer.analyze(`
            const { env } = require('vscode');
            env.i18n('${basecaseText}');
        `);
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('import basecase', () => {
        const analyzer = new JavaScriptAnalyzer();
        const result = analyzer.analyze(`
            import * as vscode from 'vscode';
            vscode.env.i18n('${basecaseText}');
        `);
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('import basecase named imports', () => {
        const analyzer = new JavaScriptAnalyzer();
        const result = analyzer.analyze(`
            import { env } from 'vscode';
            env.i18n('${basecaseText}');
        `);
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('import newlines named imports', () => {
        const analyzer = new JavaScriptAnalyzer();
        const result = analyzer.analyze(`
            import {
                Command,
                Disposable,
                env,
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
            env.i18n('${basecaseText}');
        `);
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('with comments', () => {
        const analyzer = new JavaScriptAnalyzer();
        const comment = 'This is a comment';
        const result = analyzer.analyze(`
            import { env } from 'vscode';
            env.i18n(['${comment}'], '${basecaseText}', 'this is an arg');
        `);
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual((result.bundle[basecaseText]! as i18nJsonMessageFormat).message, basecaseText);
        assert.strictEqual((result.bundle[basecaseText]! as i18nJsonMessageFormat).comment.length, 1);
        assert.strictEqual((result.bundle[basecaseText]! as i18nJsonMessageFormat).comment[0], comment);
    });

    it('vscode-i18n basecase', () => {
        const analyzer = new JavaScriptAnalyzer();
        const result = analyzer.analyze(`
            import * as vscodei18n from 'vscode-i18n';
            vscodei18n.i18n('${basecaseText}');
        `);
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });

    it('vscode-i18n named imports', () => {
        const analyzer = new JavaScriptAnalyzer();
        const result = analyzer.analyze(`
            import { i18n } from 'vscode-i18n';
            i18n('${basecaseText}');
        `);
        assert.strictEqual(Object.keys(result.bundle).length, 1);
        assert.strictEqual(result.bundle[basecaseText], basecaseText);
    });
});
