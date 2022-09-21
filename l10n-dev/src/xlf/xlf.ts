/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as xml2js from 'xml2js';
import { Line } from "./line";
import { l10nJsonDetails, l10nJsonFormat, MessageInfo } from "../common";

interface Item {
	id: string;
	message: string;
	comment?: string;
}

function getMessage(value: MessageInfo): string {
	return typeof value === 'string' ? value : value.message;
}
function getComment(value: MessageInfo): string[] | undefined {
	return typeof value === 'string' ? undefined : value.comment;
}

export class XLF {
	private buffer: string[];
	private files: { [key: string]: Item[] };
	private sourceLanguage: string;

	constructor(options?: { sourceLanguage?: string; }) {
		this.buffer = [];
		this.files = Object.create(null);
		this.sourceLanguage = options?.sourceLanguage ?? 'en';
	}

	public toString(): string {
		this.appendHeader();

		for (const file in this.files) {
			this.appendNewLine(`<file original="${file}" source-language="${this.sourceLanguage}" datatype="plaintext"><body>`, 2);
			for (const item of this.files[file]!) {
				this.addStringItem(item);
			}
			this.appendNewLine('</body></file>', 2);
		}

		this.appendFooter();
		return this.buffer.join('\r\n');
	}

	public addFile(key: string, bundle: l10nJsonFormat): void {
		if (Object.keys(bundle).length === 0) {
			return;
		}
		this.files[key] = [];
		const existingKeys: Set<string> = new Set();

		for (const id in bundle) {
			if (existingKeys.has(id)) {
				continue;
			}
			existingKeys.add(id);

			const message = encodeEntities(getMessage(bundle[id]!));
			const comment = getComment(bundle[id]!)?.map(c => encodeEntities(c)).join(`\r\n`);
			this.files[key]!.push({ id, message, comment });
		}
	}

	private addStringItem(item: Item): void {
		if (!item.id || !item.message) {
			throw new Error('No item ID or value specified.');
		}

		this.appendNewLine(`<trans-unit id="${item.id.replace(/"/, '&quot;')}">`, 4);
		this.appendNewLine(`<source xml:lang="${this.sourceLanguage}">${item.message}</source>`, 6);

		if (item.comment) {
			this.appendNewLine(`<note>${item.comment}</note>`, 6);
		}

		this.appendNewLine('</trans-unit>', 4);
	}

	private appendHeader(): void {
		this.appendNewLine('<?xml version="1.0" encoding="utf-8"?>', 0);
		this.appendNewLine('<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">', 0);
	}

	private appendFooter(): void {
		this.appendNewLine('</xliff>', 0);
	}

	private appendNewLine(content: string, indent?: number): void {
		const line = new Line(indent);
		line.append(content);
		this.buffer.push(line.toString());
	}

	static async parse(xlfString: string): Promise<l10nJsonDetails[]> {
		const getValue = function (this: void, target: any): string | undefined {
			if (typeof target === 'string') {
				return target;
			}
			if (typeof target._ === 'string') {
				return target._;
			}
			if (Array.isArray(target) && target.length === 1) {
				const item = target[0];
				if (typeof item === 'string') {
					return item;
				}
				if (typeof item._ === 'string') {
					return item._;
				}
				return target[0]._;
			}
			return undefined;
		};

		const parser = new xml2js.Parser();
		const files: l10nJsonDetails[] = [];
		const result = await parser.parseStringPromise(xlfString);

		const fileNodes: any[] = result['xliff']['file'];
		if (!fileNodes) {
			throw new Error('XLIFF file does not contain "xliff" or "file" node(s) required for parsing.');
		}

		fileNodes.forEach((file) => {
			const type = file.$.original;
			if (!type) {
				throw new Error('XLIFF file node does not contain original attribute to determine the original location of the resource file.');
			}
			const language = file.$['target-language'].toLowerCase();
			if (!language) {
				throw new Error('XLIFF file node does not contain target-language attribute to determine translated language.');
			}

			const messages: { [key: string]: string } = {};
			const transUnits = file.body[0]['trans-unit'];
			if (transUnits) {
				transUnits.forEach((unit: any) => {
					const key = unit.$.id;
					if (!unit.target) {
						return; // No translation available
					}

					const val = getValue(unit.target);
					if (key && val) {
						messages[key] = decodeEntities(val);
					} else {
						throw new Error('XLIFF file does not contain full localization data. ID or target translation for one of the trans-unit nodes is not present.');
					}
				});

				files.push({ messages, name: type, language });
			}
		});

		return files;
	}
}

function encodeEntities(value: string): string {
	const result: string[] = [];
	for (let i = 0; i < value.length; i++) {
		const ch = value[i]!;
		switch (ch) {
			case '<':
				result.push('&lt;');
				break;
			case '>':
				result.push('&gt;');
				break;
			case '&':
				result.push('&amp;');
				break;
			default:
				result.push(ch);
		}
	}
	return result.join('');
}

function decodeEntities(value: string): string {
	return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
