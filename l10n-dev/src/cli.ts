import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import * as glob from 'glob';
import { getL10nFilesFromXlf, getL10nJson, getL10nXlf } from "./main";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { l10nJsonFormat } from "./common";

yargs(hideBin(process.argv))
.usage('$0 <cmd> [args]')
.command(
	'export [args] <path..>',
	'Export strings from source files. Supports glob patterns.',
	yargs => {
		yargs.positional('path', {
			demandOption: true,
			type: 'string',
			array: true,
			normalize: true,
			describe: 'TypeScript files to extract strings from. Supports folders and glob patterns.'
		});
		yargs.option('outDir', {
			alias: 'o',
			string: true,
			default: '.',
			describe: 'Output directory'
		});
	}, function (argv) {
		l10nExportStrings(argv.path as string[], argv.outDir as string);
	})
.command(
	'generate-xlf [args] <path..>',
	'Generate an XLF file from a collection of `*.l10n.json` files. Supports glob patterns.',
	yargs => {
		yargs.positional('path', {
			demandOption: true,
			type: 'string',
			array: true,
			normalize: true,
			describe: 'L10N JSON files to generate an XLF from. Supports folders and glob patterns.'
		});
		yargs.option('outFile', {
			demandOption: true,
			string: true,
			describe: 'Output file',
			alias: 'o'
		});
		yargs.option('language', {
			alias: 'l',
			string: true,
			default: 'en',
			describe: 'The source language that will be written to the XLF file.'
		});
	}, function (argv) {
		l10nGenerateXlf(argv.path as string[], argv.language as string, argv.outFile as string);
	})
.command(
	'import-xlf [args] <path..>',
	'Import an XLF file into a JSON l10n file',
	yargs => {
		yargs.positional('path', {
			demandOption: true,
			type: 'string',
			array: true,
			normalize: true,
			describe: 'XLF files to turn into `*.l10n.<language>.json` files. Supports folders and glob patterns.'
		});
		yargs.option('outDir', {
			alias: 'o',
			string: true,
			default: '.',
			describe: 'Output directory that will contain the l10n.<language>.json files'
		});
	}, function (argv) {
		l10nImportXlf(argv.path as string[], argv.outDir as string);
	})
.help().argv;

function l10nExportStrings(paths: string[], outDir: string): void {
	console.log('Searching for TypeScript files...');
	const matches = paths.map(p => glob.sync(p)).flat();
	const tsFileContents = matches.reduce<string[]>((prev, curr) => {
		if (curr.endsWith('.ts')) {
			prev.push(readFileSync(path.resolve(curr), 'utf8'));
		}
		const results = glob.sync(path.join(curr, `{,!(node_modules)/**}`, '*.ts'));
		for (const result of results) {
			prev.push(readFileSync(path.resolve(result), 'utf8'));
		}
		return prev;
	}, []);
	console.log(`Found ${tsFileContents.length} TypeScript files. Extracting strings...`);
	const jsonResult = getL10nJson(tsFileContents);
	const resolvedOutFile = path.resolve(path.join(outDir, 'bundle.l10n.json'));
	console.log(`Writing exported strings to: ${resolvedOutFile}`);
	mkdirSync(path.resolve(outDir), { recursive: true });
	writeFileSync(resolvedOutFile, JSON.stringify(jsonResult));
}

function l10nGenerateXlf(paths: string[], language: string, outFile: string): void {
	console.log('Searching for L10N JSON files...');
	const matches = paths.map(p => glob.sync(p)).flat();
	const l10nFileContents = matches.reduce<Map<string, l10nJsonFormat>>((prev, curr) => {
		if (curr.endsWith('.l10n.json')) {
			const name = path.basename(curr).split('.l10n.json')[0] ?? '';
			prev.set(name, JSON.parse(readFileSync(path.resolve(curr), 'utf8')));
			return prev;
		}
		if (curr.endsWith('package.nls.json')) {
			prev.set('package', JSON.parse(readFileSync(path.resolve(curr), 'utf8')));
			return prev;
		}
		const results = glob.sync(path.join(curr, `{,!(node_modules)/**}`, '{*.l10n.json,package.nls.json}'));
		for (const result of results) {
			if (result.endsWith('.l10n.json')) {
				const name = path.basename(curr).split('.l10n.json')[0] ?? '';
				prev.set(name, JSON.parse(readFileSync(path.resolve(curr), 'utf8')));
				return prev;
			}
			if (result.endsWith('package.nls.json')) {
				prev.set('package', JSON.parse(readFileSync(path.resolve(curr), 'utf8')));
				return prev;
			}
		}
		return prev;
	}, new Map());
	console.log(`Found ${l10nFileContents.size} L10N JSON files. Generating XLF...`);
	const result = getL10nXlf(l10nFileContents, { sourceLanguage: language });
	writeFileSync(path.resolve(outFile), result);
	console.log(`Wrote XLF file to: ${outFile}`);
}

async function l10nImportXlf(paths: string[], outDir: string): Promise<void> {
	console.log('Searching for XLF files...');
	const matches = paths.map(p => glob.sync(p)).flat();
	const xlfFiles = matches.reduce<string[]>((prev, curr) => {
		if (curr.endsWith('.xlf')) {
			prev.push(readFileSync(path.resolve(curr), 'utf8'));
		}
		const results = glob.sync(path.join(curr, `{,!(node_modules)/**}`, '*.xlf'));
		for (const result of results) {
			prev.push(readFileSync(path.resolve(result), 'utf8'));
		}
		return prev;
	}, []);

	console.log(`Found ${xlfFiles.length} XLF files. Generating localized L10N JSON files...`);
	let count = 0;

	if (xlfFiles.length) {
		mkdirSync(path.resolve(outDir), { recursive: true });
	}

	for (const xlfContents of xlfFiles) {
		const details = await getL10nFilesFromXlf(xlfContents);
		count += details.length;
		for (const detail of details) {
			writeFileSync(path.resolve(path.join(outDir, `${detail.name}.l10n.${detail.language}.json`)), JSON.stringify(detail.messages));
		}
	}
	console.log(`Wrote ${count} localized L10N JSON files to: ${outDir}`);
}
