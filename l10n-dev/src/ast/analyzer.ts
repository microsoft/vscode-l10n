/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import ts from "typescript";
import { l10nJsonFormat } from "../common";
import { SingleFileServiceHost } from "./singleFileServiceHost";
import { collect, isRequireImport, isImportNode, CollectStepResult, findClosestNode, unescapeString } from "./utils";

export interface AnalysisResult {
	errors: string[];
	bundle: l10nJsonFormat;
}

export class JavaScriptAnalyzer {
    analyze(contents: string): AnalysisResult {
        const options: ts.CompilerOptions = {};
        options.noResolve = true;

        // TODO: Support TSX files or maybe even JS and JSX files by passing the file extension to the service host
        const filename = 'file.ts';
        const serviceHost = new SingleFileServiceHost(options, filename, contents);
        const service = ts.createLanguageService(serviceHost);
        const sourceFile = service.getProgram()!.getSourceFile(filename)!;
    
        const errors: string[] = [];
        const bundle: l10nJsonFormat = {};
    
        // all imports
        const imports = collect(sourceFile, n => isRequireImport(n) || isImportNode(n) ? CollectStepResult.YesAndRecurse : CollectStepResult.NoAndRecurse);

        const vscodeOrL10nReferences = imports.reduce<ts.Node[]>((memo, node) => {
            let references: ts.ReferenceEntry[] | undefined;
    
            if (ts.isCallExpression(node)) {
                let parent = node.parent;
                if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === '__importStar') {
                    parent = node.parent.parent;
                }
                if (ts.isVariableDeclaration(parent)) {
                    if (ts.isObjectBindingPattern(parent.name)) {
                        const item = parent.name.elements.find(e => e.name.getText() === 'l10n');
                        if (item) {
                            references = service.getReferencesAtPosition(filename, item.name.end);
                        }
                    } else {
                        references = service.getReferencesAtPosition(filename, parent.name.end);
                    }
                }
            } else if (ts.isImportDeclaration(node)&& node.importClause && node.importClause.namedBindings) {
                if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                    references = service.getReferencesAtPosition(filename, node.importClause.namedBindings.end);
                } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                    const item = node.importClause.namedBindings.elements.find(e => e.name.getText() === 'l10n');
                    if (item) {
                        references = service.getReferencesAtPosition(filename, item.end);
                    }
                }
            } else if (ts.isImportEqualsDeclaration(node)) {
                references = service.getReferencesAtPosition(filename, node.name.pos);
            }
    
            if (references) {
                references.forEach(reference => {
                    if (!reference.isWriteAccess) {
                        const node = findClosestNode(sourceFile, reference.textSpan);
                        if (node) {
                            memo.push(node);
                        }
                    }
                });
            }
    
            return memo;
        }, []);
    
        const tCalls = vscodeOrL10nReferences.reduce<ts.CallExpression[]>((memo, node) => {
    
            if (!ts.isIdentifier(node)) {
                return memo;
            }

            let callExpresssionNode: ts.Node | undefined = node.parent;
            while (callExpresssionNode) {
                if (!ts.isPropertyAccessExpression(callExpresssionNode)) {
                    if (!ts.isCallExpression(callExpresssionNode)) {
                        return memo;
                    }
                    break;
                }
                callExpresssionNode = callExpresssionNode.parent;
            }

            if (!callExpresssionNode) {
                return memo;
            }

            const expression = callExpresssionNode.expression;
            if (ts.isPropertyAccessExpression(expression)) {
                if (expression.name.text === 't') {
                    memo.push(callExpresssionNode);
                }
            } else if (ts.isIdentifier(expression)) {
                if (expression.text === 't') {
                    memo.push(callExpresssionNode);
                }
            }
            return memo;
        }, []);
    
        tCalls.forEach((localizeCall) => {
            const firstArg = localizeCall.arguments[0]!;
            let key: string | undefined;
            let message: string | undefined;
            const comment: string[] = [];
            if (ts.isStringLiteralLike(firstArg)) {
                const text = firstArg.getText();
                key = text.substring(1, text.length - 1);
                message = key;
            } else if (ts.isObjectLiteralExpression(firstArg)) {
                if (ts.isObjectLiteralElement(firstArg.properties[0]!)) {
                    firstArg.properties.forEach((property) => {
                        if (ts.isPropertyAssignment(property)) {
                            switch(property.name.getText()) {
                                case 'message':
                                    if (ts.isStringLiteralLike(property.initializer)) {
                                        const text = property.initializer.getText();
                                        message = text.substring(1, text.length - 1);
                                    }
                                    break;
                                case 'comment':
                                    if (ts.isArrayLiteralExpression(property.initializer)) {
                                        property.initializer.elements.forEach((element) => {
                                            if (ts.isStringLiteralLike(element)) {
                                                const text = element.getText();
                                                comment.push(text.substring(1, text.length - 1));
                                            }
                                        });
                                    } else if (ts.isStringLiteralLike(property.initializer)) {
                                        const text = property.initializer.getText();
                                        comment.push(text.substring(1, text.length - 1));
                                    }
                                    break;
                            }
                        }
                    });

                    if (message) {
                        key = message;
                        if (comment.length) {
                            // in the format: message/commentcommentcomment
                            key += `/${comment.join()}`;
                        }
                    }
                }
            }
            // TODO: better error handling
            if (!key || !message) {
                const position = ts.getLineAndCharacterOfPosition(sourceFile, firstArg.pos);
                errors.push(`(${position.line + 1},${position.character + 1}): first argument of an t() call must either be a string literal or an object literal with a message property`);
                return;
            }
            const unescapedKey = unescapeString(key);
            bundle[unescapedKey] = comment.length ? { message, comment } : unescapedKey;
        });
    
        return {
            errors,
            bundle
        };
    }
}
