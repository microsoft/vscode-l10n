import * as ts from 'typescript';
import { MappingItem, RawSourceMap, SourceMapConsumer, SourceMapGenerator } from "source-map";

interface ExtendedMappingItem extends MappingItem {
	delete?: boolean;
	columnDelta?: number;
	lineDelta?: number;
}

interface Line {
	content: string | null;
	ending: string;
	mappings: ExtendedMappingItem[] | null;
}

interface Span {
	start: ts.LineAndCharacter;
	end: ts.LineAndCharacter;
}

interface Patch {
	span: Span;
	content: string;
}

export class TextModel {

	private lines: Line[];

	constructor(contents: string, private rawSourceMap?: RawSourceMap) {
		const regex = /\r\n|\r|\n/g;
		let index = 0;
		let match: RegExpExecArray | null;

		this.lines = [];

		while (match = regex.exec(contents)) {
			this.lines.push({ content: contents.substring(index, match.index), ending: match[0]!, mappings: null });
			index = regex.lastIndex;
		}

		if (contents.length > 0) {
			this.lines.push({ content: contents.substring(index, contents.length), ending: '', mappings: null });
		}
		if (rawSourceMap) {
			const sourceMapConsumer = new SourceMapConsumer(rawSourceMap);
			sourceMapConsumer.eachMapping((mapping) => {
				// Note that the generatedLine index is one based;
				let line = this.lines[mapping.generatedLine - 1];
				if (line) {
					if (!line.mappings) {
						line.mappings = [];
					}
					line.mappings.push(mapping);
				}
			}, null, SourceMapConsumer.GENERATED_ORDER);
		}
	}

	public get lineCount(): number {
		return this.lines.length;
	}

	/**
	 * Applies patch(es) to the model.
	 * Multiple patches must be ordered.
	 * Does not support patches spanning multiple lines.
	 */
	public apply(patches: Patch[]): void {
		if (patches.length === 0) {
			return;
		}

		patches = patches.sort((a, b) => {
			const lca = a.span.start;
			const lcb = b.span.start;
			return lca.line !== lcb.line ? lca.line - lcb.line : lca.character - lcb.character;
		});

		let overlapping = false;
		const previousSpan = patches[0]!.span;
		for (let i = 1; i < patches.length; i++) {
			const nextSpan = patches[i]!.span;

			if (previousSpan.end.line > nextSpan.start.line || (previousSpan.end.line === nextSpan.start.line && previousSpan.end.character >= nextSpan.start.character)) {
				overlapping = true;
				break;
			}
		}

		if (overlapping) {
			throw new Error(`Overlapping text edits generated.`);
		}
		const lastPatch = patches[patches.length - 1]!;
		const lastLine = this.lines[this.lineCount - 1]!;

		if (lastPatch.span.end.line > this.lines.length || (lastPatch.span.end.line === this.lineCount && lastPatch.span.end.character > lastLine.content!.length)) {
			throw new Error(`Patches are outside of the buffer content.`);
		}

		let mappingCursor: {
			line: number;
			index: number;
		} = { line: -1, index: -1 };
		patches.reverse().forEach((patch) => {
			const startLineNumber = patch.span.start.line;
			const endLineNumber = patch.span.end.line;

			const startLine = this.lines[startLineNumber]!;
			const endLine = this.lines[endLineNumber]!;

			// Do the textual manipulations.
			startLine.content = [
				startLine.content!.substring(0, patch.span.start.character),
				patch.content,
				endLine.content!.substring(patch.span.end.character)
			].join('');
			for (let i = startLineNumber + 1; i <= endLineNumber; i++) {
				this.lines[i]!.content = null;
			}

			// Adopt source mapping if available
			if (this.rawSourceMap) {
				if (startLineNumber === endLineNumber) {
					if (!mappingCursor || mappingCursor.line !== startLineNumber) {
						mappingCursor.line = startLineNumber;
						mappingCursor.index = startLine.mappings ? startLine.mappings.length - 1 : -1;
					}
					let delta = patch.content.length - (patch.span.end.character - patch.span.start.character);
					let mappingItem: ExtendedMappingItem | null = null;
					while ((mappingItem = mappingCursor.index !== -1 ? startLine.mappings![mappingCursor.index]! : null) !== null
						&& mappingItem.generatedColumn > patch.span.start.character) {
						if (mappingItem.generatedColumn < patch.span.end.character) {
							// The patch covers the source mapping. Delete it
							mappingItem.delete = true;
						}
						mappingCursor.index--;
					}
					// Record the delta on the first source marker after the patch.
					if (mappingCursor.index + 1 < startLine.mappings!.length) {
						let mapping = startLine.mappings![mappingCursor.index + 1]!;
						mapping.columnDelta = (mapping.columnDelta || 0) + delta;
					}
				} else {
					let startLineMappings = startLine.mappings;
					if (startLineMappings) {
						for (let i = startLineMappings.length - 1; i >= 0 && startLineMappings[i]!.generatedColumn > patch.span.start.character; i--) {
							startLineMappings[i]!.delete = true;
						}
					}
					for (let i = startLineNumber + 1; i < endLineNumber; i++) {
						let line = this.lines[i]!;
						if (line.mappings) {
							line.mappings.forEach(mapping => mapping.delete = true);
						}
					}
					let endLineMappings = endLine.mappings;
					if (endLineMappings) {
						let lineDelta = startLineNumber - endLineNumber;
						let index = 0;
						for (; index < endLineMappings.length; index++) {
							let mapping = endLineMappings[index]!;
							if (mapping.generatedColumn < patch.span.end.character) {
								mapping.delete = true;
							} else {
								break;
							}
						}
						if (index < endLineMappings.length) {
							let mapping = endLineMappings[index]!;
							mapping.lineDelta = lineDelta;
							mapping.columnDelta = (patch.span.start.character - patch.span.end.character) + patch.content.length;
						}
					}
				}
			}
		});
	}

	public generateSourceMap(): string | undefined {
		if (!this.rawSourceMap) {
			return undefined;
		}
		const sourceMapGenerator = new SourceMapGenerator({ sourceRoot: this.rawSourceMap.sourceRoot });
		let lineDelta = 0;
		this.lines.forEach(line => {
			const mappings = line.mappings;
			let columnDelta = 0;
			if (mappings) {
				mappings.forEach(mapping => {
					lineDelta = (mapping.lineDelta || 0) + lineDelta;
					columnDelta = (mapping.columnDelta || 0) + columnDelta;
					if (mapping.delete) {
						return;
					}
					sourceMapGenerator.addMapping({
						source: mapping.source,
						name: mapping.name,
						original: { line: mapping.originalLine, column: mapping.originalColumn },
						generated: { line: mapping.generatedLine + lineDelta, column: mapping.generatedColumn + columnDelta }
					});
				});
			}
		});
		return sourceMapGenerator.toString();
	}

	public toString(): string {
		let count = this.lineCount;
		let buffer: string[] = [];
		for (let i = 0; i < count; i++) {
			let line = this.lines[i]!;
			if (line.content) {
				buffer.push(line.content + line.ending);
			}
		}
		return buffer.join('');
	}
}
