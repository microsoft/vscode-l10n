import merge from 'deepmerge-json';
import { JavaScriptAnalyzer } from "./ast/analyzer";
import { i18nJsonDetails, i18nJsonFormat } from './common';
import { XLF } from "./xlf/xlf";

export { i18nJsonDetails } from './common';

const analyzer = new JavaScriptAnalyzer();

/**
 * Export strings from source files
 * @param fileContents Array of file contents to analyze
 * @returns i18nJsonFormat
 */
export function getI18nJson(fileContents: string[]): i18nJsonFormat {
	const bundles = fileContents.map(contents => {
		const result = analyzer.analyze(contents);
		return result.bundle;
	});

	const mergedJson = merge.multi({}, ...bundles);
	return mergedJson;
}

/**
 * Get XLF data from a package.nls.json and computed i18n data
 * @param packageNlsJsonContents package.nls.json contents parsed
 * @param i18nBundleContents i18n bundle contents parsed
 * @returns XLF data as a string
 */
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

/**
 * Import XLF data into an array of i18nJsonDetails
 * @param xlfContents XLF data as a string
 * @returns Array of i18nJsonDetails
 */
export async function getI18nFilesFromXlf(xlfContents: string): Promise<i18nJsonDetails[]> {
	return await XLF.parse(xlfContents);
}
