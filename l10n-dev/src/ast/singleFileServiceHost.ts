/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import ts from "typescript";

export class SingleFileServiceHost implements ts.LanguageServiceHost {

	private file: ts.IScriptSnapshot;
	private lib: ts.IScriptSnapshot;

	constructor(private options: ts.CompilerOptions, private filename: string, contents: string) {
		this.file = ts.ScriptSnapshot.fromString(contents);
		this.lib = ts.ScriptSnapshot.fromString('');
	}
	readFile(): string | undefined {
		return this.file.getText(0, this.file.getLength());
	}
	fileExists(): boolean {
		return true;
	}

	getCompilationSettings(): ts.CompilerOptions { return this.options; }
	getScriptFileNames(): string[] { return [this.filename];}
	getScriptVersion(): string { return '1'; }
	getScriptSnapshot(name: string): ts.IScriptSnapshot { return name === this.filename ? this.file : this.lib; }
	getCurrentDirectory(): string { return ''; }
	getDefaultLibFileName(): string { return 'lib.d.ts'; }
}
