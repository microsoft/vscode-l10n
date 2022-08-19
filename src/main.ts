import merge from 'deepmerge-json';

import { JavaScriptAnalyzer } from "./ast/analyzer";
import { KeyInfo } from "./common";
import { XLF } from "./xlf/xlf";

interface i18nJsonMessageFormat {
	message: string;
	comment: string[];
}

interface i18nJsonFormat {
	[key: string]: string | i18nJsonMessageFormat;
}

export interface BundledMetaDataEntry {
	messages: string[];
	keys: KeyInfo[];
}

export interface BundledMetaDataFile {
	[key: string]: BundledMetaDataEntry;
}
export interface SingleMetaDataFile {
	messages: string[];
	keys: KeyInfo[];
	filePath: string;
}

const analyzer = new JavaScriptAnalyzer();

export function getI18nJson(fileContents: string[]): i18nJsonFormat {
	const bundles = fileContents.map(contents => {
		const result = analyzer.analyze(contents);
		return result.bundle;
	});

	const mergedJson = merge.multi({}, ...bundles);
	return mergedJson;
}

export function getI18nXlf(packageNlsJsonContents?: i18nJsonFormat, i18nBundleContents?: i18nJsonFormat): string {
	const xlf = new XLF();
	if (packageNlsJsonContents) {
		xlf.addFile('package', packageNlsJsonContents);
	}
	if (i18nBundleContents) {
		xlf.addFile('bundle', i18nBundleContents);
	}
	return xlf.toString();
}
