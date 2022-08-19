import ts from "typescript";

export class SingleFileServiceHost implements ts.LanguageServiceHost {

	private file: ts.IScriptSnapshot;
	private lib: ts.IScriptSnapshot;

	constructor(private options: ts.CompilerOptions, private filename: string, contents: string) {
		this.file = ts.ScriptSnapshot.fromString(contents);
		this.lib = ts.ScriptSnapshot.fromString('');
	}
	readFile(_path: string, _encoding?: string | undefined): string | undefined {
		return this.file.getText(0, this.file.getLength());
	}
	fileExists(_path: string): boolean {
		return true;
	}

	getCompilationSettings() { return this.options; }
	getScriptFileNames() { return [this.filename];}
	getScriptVersion() { return '1'; }
	getScriptSnapshot = (name: string) => name === this.filename ? this.file : this.lib;
	getCurrentDirectory = () => '';
	getDefaultLibFileName = () => 'lib.d.ts';
}
