import { readFileSync, writeFileSync } from "fs";
import path from "path";
import * as glob from 'glob';
import { getI18nFilesFromXlf, getI18nJson, getI18nXlf } from "./main";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { i18nJsonFormat } from "./common";

yargs(hideBin(process.argv))
.usage('$0 <cmd> [args]')
.command(
	'export [args] <pattern..>',
	'Export strings from source files',
	yargs => {
		yargs.positional('pattern', {
			demandOption: true,
			type: 'string',
			array: true,
			normalize: true,
			describe: 'Glob pattern of ts files to include'
		})
		yargs.option('outDir', {
			alias: 'o',
			string: true,
			default: '.',
			describe: 'Output directory'
		});
	}, function (argv) {
		i18nExportStrings(argv.pattern as string[], argv.outDir as string);
	})
.command(
	'generate-xlf [args]',
	'Generate an XLF file from a JSON i18n file',
	yargs => {
		yargs.option('packageNlsJsonPath', {
			demandOption: true,
			type: 'string',
			normalize: true,
			describe: 'JSON i18n file to generate XLF from',
			alias: 'p'
		});
		yargs.option('i18nBundleJsonPath', {
			demandOption: true,
			type: 'string',
			normalize: true,
			describe: 'JSON i18n file to generate XLF from',
			alias: 'b'
		});
		yargs.option('outFile', {
			demandOption: true,
			string: true,
			describe: 'Output file',
			alias: 'o'
		});
	}, function (argv) {
		i18nGenerateXlf(argv.packageNlsJsonPath as string, argv.i18nBundleJsonPath as string, argv.outFile as string);
	})
.command(
	'import-xlf [args] <xlfPath>',
	'Import an XLF file into a JSON i18n file',
	yargs => {
		yargs.positional('xlfPath', {
			demandOption: true,
			type: 'string',
			normalize: true,
			describe: 'Glob pattern of ts files to include'
		});
		yargs.option('outDir', {
			alias: 'o',
			string: true,
			default: '.',
			describe: 'Output directory that will contain the i18n.<locale>.json file and the package.nls.json file'
		});
	}, function (argv) {
		i18nImportXlf(argv.xlfPath as string, argv.outDir as string);
	})
.help().argv;

function i18nExportStrings(patterns: string[], outDir: string): void {
	const matches = patterns.map(p => glob.sync(p)).flat();
	const tsFileContents = matches.reduce<string[]>((prev, curr) => {
		if (curr.endsWith('.ts')) {
			prev.push(readFileSync(path.resolve(curr), 'utf8'));
		}
		const results = glob.sync(path.join(curr, '**', '*.ts'));
		for (const result of results) {
			prev.push(readFileSync(path.resolve(result), 'utf8'));
		}
		return prev;
	}, []);
	const jsonResult = getI18nJson(tsFileContents);
	const resolvedOutFile = path.resolve(path.join(outDir, 'bundle.i18n.default.json'));
	writeFileSync(resolvedOutFile, JSON.stringify(jsonResult));

}

function i18nGenerateXlf(packageNlsJsonPath: string, bundleNlsPath: string, outFile: string): void {
	const packageNlsJsonContents = JSON.parse(readFileSync(path.resolve(packageNlsJsonPath), 'utf8')) as i18nJsonFormat;
	const bundleNlsJsonContents = JSON.parse(readFileSync(path.resolve(bundleNlsPath), 'utf8')) as i18nJsonFormat;
	const result = getI18nXlf(packageNlsJsonContents, bundleNlsJsonContents);
	writeFileSync(path.resolve(outFile), result);
}

async function i18nImportXlf(xlfPath: string, outDir: string): Promise<void> {
	const xlfContents = readFileSync(path.resolve(xlfPath), 'utf8');
	const details = await getI18nFilesFromXlf(xlfContents);
	for (const detail of details) {
		switch(detail.type) {
			case 'bundle':
				writeFileSync(path.resolve(path.join(outDir, `i18n.${detail.language}.json`)), JSON.stringify(detail.messages));
				break;
			case 'package':
				writeFileSync(path.resolve(path.join(outDir, `package.nls.${detail.language}.json`)), JSON.stringify(detail.messages));
				break;
			default:
				throw new Error(`Unexpected type ${detail.type}`);
		}
	}
}
