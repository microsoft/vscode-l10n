/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IAlternativeVariableNames {
	vscode?: string;
	l10n?: string;
	t?: string;
}

// matches require('vscode') and require('@vscode/l10n')
const requireQuery = `(call_expression
	function: (identifier) @requireFunc (#eq? @requireFunc require)
	arguments: (arguments . (string (string_fragment) @requireArg (#match? @requireArg "^(vscode|@vscode/l10n)$")))
)`;

// matches `require('vscode')` and `require('vscode').l10n` (and @vscode/l10n equivalent)
const righthandSideQuery = `[
	${requireQuery}
	(member_expression
		object: ${requireQuery}
		property: (property_identifier) @propertyIdentifier (#match? @propertyIdentifier "^(l10n|t)$")
	)
]`;

// matches `const a = ...`
const variableDeclaratorRequireQuery = `(variable_declarator
	name: [
		((identifier) @variableName)
		(object_pattern [
			((shorthand_property_identifier_pattern) @propertyIdentifier (#match? @propertyIdentifier "^(l10n|t)$"))
			(pair_pattern
				key: (property_identifier) @propertyIdentifier (#match? @propertyIdentifier "^(l10n|t)$")
				value: (identifier) @propertyIdentifierAlias
			)
		])
	]
	value: ${righthandSideQuery}
)`;

// matches `let a; a = ...`
const assignmentExpressionRequireQuery = `(assignment_expression
	left: (identifier) @variableName
	right: ${righthandSideQuery}
)`;

// matches `import * as foo from 'vscode'` and `import { l10n } from 'vscode'` (and @vscode/l10n equivalent)
const importQuery = `(import_statement
	(import_clause [
		(namespace_import (identifier) @namespace)
		(named_imports (import_specifier
			name: (identifier) @namedImport (#match? @namedImport "^(l10n|t)$")
			alias: (identifier)? @namedImportAlias
		))
	])
	source: (string (string_fragment) @importArg (#match? @importArg "^(vscode|@vscode/l10n)$"))
)`;

export const importOrRequireQuery = `${variableDeclaratorRequireQuery}
${assignmentExpressionRequireQuery}
${importQuery}`;

// Gets a query that will find and extract all t() calls into @message and @comment
export function getTQuery({ vscode = 'vscode', l10n = 'l10n', t = 't' }: IAlternativeVariableNames): string {
	return `(call_expression
		(member_expression
			object: [
				((identifier) @l10n (#eq? @l10n ${l10n}))
				(member_expression
					object: (identifier) @vscode (#eq? @vscode ${vscode})
					property: (property_identifier) @l10n (#eq? @l10n ${l10n})
				)
			]
			property: (property_identifier) @t (#eq? @t ${t})
		)
		arguments: [
			(template_string (template_substitution)* @sub) @tagged_template
			(arguments . [(string) (template_string (template_substitution)? @message_template_arg)] @message)
			(arguments . (number) @message)
			(arguments . (object
				(pair
					key: (property_identifier) @message-prop (#eq? @message-prop message)
					value: [(string) (template_string (template_substitution)? @message_template_arg)] @message
				)
				(pair
					key: (property_identifier) @comment-prop (#eq? @comment-prop comment)
					value: [(string) (array) (template_string)] @comment
				)
			))
		]
	)`;
}
