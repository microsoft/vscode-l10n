import merge from 'deepmerge-json';
import { JavaScriptAnalyzer } from "./ast/analyzer";
import { l10nJsonDetails, l10nJsonFormat } from './common';
import { XLF } from "./xlf/xlf";

export { l10nJsonDetails } from './common';

const analyzer = new JavaScriptAnalyzer();

/**
 * Export strings from source files
 * @param fileContents Array of file contents to analyze
 * @returns l10nJsonFormat
 */
export function getL10nJson(fileContents: string[]): l10nJsonFormat {
	const bundles = fileContents.map(contents => {
		const result = analyzer.analyze(contents);
		return result.bundle;
	});

	const mergedJson = merge.multi({}, ...bundles);
	return mergedJson;
}

/**
 * Get XLF data from a package.nls.json and computed l10n data
 * @param packageNlsJsonContents package.nls.json contents parsed
 * @param l10nBundleContents l10n bundle contents parsed
 * @returns XLF data as a string
 */
export function getL10nXlf(packageNlsJsonContents?: l10nJsonFormat, l10nBundleContents?: l10nJsonFormat): string {
	const xlf = new XLF();
	if (packageNlsJsonContents) {
		xlf.addFile('package', packageNlsJsonContents);
	}
	if (l10nBundleContents) {
		xlf.addFile('bundle', l10nBundleContents);
	}
	return xlf.toString();
}

/**
 * Import XLF data into an array of l10nJsonDetails
 * @param xlfContents XLF data as a string
 * @returns Array of l10nJsonDetails
 */
export async function getL10nFilesFromXlf(xlfContents: string): Promise<l10nJsonDetails[]> {
	return await XLF.parse(xlfContents);
}
