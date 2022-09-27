/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import ts from "typescript";

export enum CollectStepResult {
	Yes,
	YesAndRecurse,
	No,
	NoAndRecurse
}

export function collect(node: ts.Node, fn: (node: ts.Node) => CollectStepResult): ts.Node[] {
	const result: ts.Node[] = [];

	function loop(node: ts.Node) {
		const stepResult = fn(node);

		if (stepResult === CollectStepResult.Yes || stepResult === CollectStepResult.YesAndRecurse) {
			result.push(node);
		}

		if (stepResult === CollectStepResult.YesAndRecurse || stepResult === CollectStepResult.NoAndRecurse) {
			ts.forEachChild(node, loop);
		}
	}

	loop(node);
	return result;
}

const vscodeRegExp = /^\s*(["'])(vscode|@vscode\/l10n)\1\s*$/;

export function isImportNode(node: ts.Node): boolean {
	if (ts.isImportDeclaration(node)) {
		return ts.isStringLiteralLike(node.moduleSpecifier) && vscodeRegExp.test(node.moduleSpecifier.getText());
	}

	if (ts.isImportEqualsDeclaration(node)) {
		return ts.isExternalModuleReference(node.moduleReference)
			&& ts.isStringLiteralLike(node.moduleReference.expression)
			&& vscodeRegExp.test(node.moduleReference.expression.getText());
	}
	return false;
}

export function isRequireImport(node: ts.Node): boolean {
	if (!ts.isCallExpression(node)) {
		return false;
	}

	if (node.expression.getText() !== 'require' || !node.arguments || node.arguments.length !== 1) {
		return false;
	}
	const argument = node.arguments[0]!;
	return ts.isStringLiteralLike(argument) && vscodeRegExp.test(argument.getText());
}

export function findClosestNode(node: ts.Node, textSpan: ts.TextSpan): ts.Node | undefined {
	const textSpanEnd = textSpan.start + textSpan.length;
	function loop(node: ts.Node): ts.Node | undefined {
		const length = node.end - node.pos;
		if (node.pos === textSpan.start && length === textSpan.length) {
			return node;
		}
		if (node.pos <= textSpan.start && textSpanEnd <= node.end) {
			const candidate = ts.forEachChild(node, loop);
			return candidate || node;
		}
		return undefined;
	}
	return loop(node);
}

const unescapeMap: { [key: string]: string } = {
	'\'': '\'',
	'"': '"',
	'\\': '\\',
	'n': '\n',
	'r': '\r',
	't': '\t',
	'b': '\b',
	'f': '\f'
};

export function unescapeString(str: string): string {
	const result: string[] = [];
	for (let i = 0; i < str.length; i++) {
		const ch = str.charAt(i);
		if (ch === '\\') {
			if (i + 1 < str.length) {
				const replace = unescapeMap[str.charAt(i + 1)];
				if (replace !== undefined) {
					result.push(replace);
					i++;
					continue;
				}
			}
		}
		result.push(ch);
	}
	return result.join('');
}
