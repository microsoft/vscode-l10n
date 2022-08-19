import ts from "typescript";
import { JavaScriptMessageBundle } from "../common";
import { SingleFileServiceHost } from "../singleFileServiceHost";
import { collect, isRequireImport, isImportNode, CollectStepResult, findClosestNode, unescapeString } from "./utils";

export interface AnalysisResult {
	errors: string[];
	bundle: JavaScriptMessageBundle;
}

export class JavaScriptAnalyzer {
    analyze(contents: string): AnalysisResult {
        const options: ts.CompilerOptions = {};
        options.noResolve = true;
        options.allowJs = true;
    
        const filename = 'file.js';
        const serviceHost = new SingleFileServiceHost(options, filename, contents);
        const service = ts.createLanguageService(serviceHost);
        const sourceFile = service.getProgram()!.getSourceFile(filename)!;
    
        const errors: string[] = [];
        const bundle: JavaScriptMessageBundle = {};
    
        // all imports
        const imports = collect(sourceFile, n => isRequireImport(n) || isImportNode(n) ? CollectStepResult.YesAndRecurse : CollectStepResult.NoAndRecurse);
    
        const vscodeOrEnvReferences = imports.reduce<ts.Node[]>((memo, node) => {
            let references: ts.ReferenceEntry[] | undefined;
    
            if (ts.isCallExpression(node)) {
                let parent = node.parent;
                if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === '__importStar') {
                    parent = node.parent.parent;
                }
                if (ts.isVariableDeclaration(parent)) {
                    if (ts.isObjectBindingPattern(parent.name)) {
                        const item = parent.name.elements.find(e => e.name.getText() === 'env');
                        if (item) {
                            references = service.getReferencesAtPosition(filename, item.name.pos + 1);
                        }
                    } else {
                        references = service.getReferencesAtPosition(filename, parent.name.pos + 1);
                    }
                }
            } else if (ts.isImportDeclaration(node)&& node.importClause && node.importClause.namedBindings) {
                if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                    references = service.getReferencesAtPosition(filename, node.importClause.namedBindings.pos);
                } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                    references = service.getReferencesAtPosition(filename, node.importClause.namedBindings.pos);
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
    
        const i18nCalls = vscodeOrEnvReferences.reduce<ts.CallExpression[]>((memo, node) => {
    
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
                if (expression.name.text === 'i18n') {
                    memo.push(callExpresssionNode);
                }
            }
            return memo;
        }, []);
    
        i18nCalls.forEach((localizeCall) => {
            const firstArg = localizeCall.arguments[0]!;
            const secondArg = localizeCall.arguments[1]!;
            let key: string | undefined;
            let comment: string[] = [];
            if (ts.isStringLiteralLike(firstArg)) {
                const text = firstArg.getText();
                key = text.substring(1, text.length - 1);
            } else if (ts.isArrayLiteralExpression(firstArg)) {
                firstArg.elements.forEach(element => {
                    if (ts.isStringLiteralLike(element)) {
                        const text = element.getText();
                        comment.push(text.substring(1, text.length - 1));
                    }
                });

                if (ts.isStringLiteralLike(secondArg)) {
                    const text = secondArg.getText();
                    key = text.substring(1, text.length - 1);
                }
            }
            // TODO: better error handling
            if (!key) {
                const position = ts.getLineAndCharacterOfPosition(sourceFile, firstArg.pos);
                errors.push(`(${position.line + 1},${position.character + 1}): first argument of an i18n call must either be a string literal or an string array literal.`);
                return;
            }
            const unescapedKey = unescapeString(key);
            bundle[unescapedKey] = comment.length ? { message: unescapedKey, comment } : unescapedKey;
        });
    
        return {
            errors,
            bundle
        };
    }
}
