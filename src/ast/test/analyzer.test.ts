import * as assert from 'assert';
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
});
