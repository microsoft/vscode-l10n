/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import * as glob from 'glob';
import { getL10nFilesFromXlf, getL10nJson, getL10nPseudoLocalized, getL10nXlf } from "./main";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { IScriptFile, l10nJsonFormat } from "./common";

yargs(hideBin(process.argv))
.scriptName("vscode-l10n-dev")
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
			describe: 'Output directory'
		});
	}, async function (argv) {
		await l10nExportStrings(argv.path as string[], argv.outDir as string | undefined);
	})
.command(
	'generate-xlf [args] <path..>',
	'Generate an XLF file from a collection of `*.l10n.json` or `package.nls.json` files. Supports glob patterns.',
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
	}, async function (argv) {
		await l10nImportXlf(argv.path as string[], argv.outDir as string);
	})
.command(
	'generate-pseudo [args] <path..>',
	'Generate Pseudo language files for `*.l10n.json` or `package.nls.json` files. This is useful for testing localization with the Pseudo Language Language Pack in VS Code.',
	yargs => {
		yargs.positional('path', {
			demandOption: true,
			type: 'string',
			array: true,
			normalize: true,
			describe: 'L10N JSON files to generate an XLF from. Supports folders and glob patterns.'
		});
		yargs.option('language', {
			alias: 'l',
			string: true,
			default: 'qps-ploc',
			describe: 'The Pseudo language identifier that will be used.'
		});
	}, function (argv) {
		l10nGeneratePseudo(argv.path as string[], argv.language as string);
	})
.help().argv;

export async function l10nExportStrings(paths: string[], outDir?: string): Promise<void> {
	console.log('Searching for TypeScript/JavaScript files...');
	const matches = paths.map(p => glob.sync(toPosixPath(p))).flat();
	const tsFileContents = matches.reduce<IScriptFile[]>((prev, curr) => {
		const ext = path.extname(curr);
		switch(ext) {
			case '.ts':
			case '.tsx':
			case '.js':
			case '.jsx':
				prev.push({
					extension: ext,
					contents: readFileSync(path.resolve(curr), 'utf8')
				});
				break;
		}
		const results = glob.sync(path.posix.join(curr, '{,**}', '*.{ts,tsx,js,jsx}'));
		for (const result of results) {
			prev.push({
				extension: path.extname(result),
				contents: readFileSync(path.resolve(result), 'utf8')
			});
		}
		return prev;
	}, []);

	if (!tsFileContents.length) {
		console.log('No TypeScript files found.');
		return;
	}

	console.log(`Found ${tsFileContents.length} TypeScript files. Extracting strings...`);
	const jsonResult = await getL10nJson(tsFileContents);

	const stringsFound = Object.keys(jsonResult).length;
	if (!stringsFound) {
		console.log('No strings found. Skipping writing to a bundle.l10n.json.');
		return;
	}
	console.log(`Extracted ${stringsFound} strings...`);

	let packageJSON;
	try {
		packageJSON = JSON.parse(readFileSync('package.json').toString('utf-8'));
	} catch(err) {
		// Ignore
	}
	if (packageJSON) {
		if (outDir) {
			if (!packageJSON.l10n || path.resolve(packageJSON.l10n) === path.resolve(outDir)) {
				console.warn('The l10n property in the package.json does not match the outDir specified. For an extension to work correctly, l10n must be set to the location of the bundle files.');
			}
		} else {
			outDir = packageJSON.l10n ?? '.';
		}
	} else {
		if (!outDir) {
			console.debug('No package.json found in directory and no outDir specified. Using the current directory.');
			return;
		}
		outDir = outDir ?? '.';
	}
	const resolvedOutFile = path.resolve(path.join(outDir!, 'bundle.l10n.json'));
	console.info(`Writing exported strings to: ${resolvedOutFile}`);
	mkdirSync(path.resolve(outDir!), { recursive: true });
	writeFileSync(resolvedOutFile, JSON.stringify(jsonResult, undefined, 2));
}

function l10nGenerateXlf(paths: string[], language: string, outFile: string): void {
	console.log('Searching for L10N JSON files...');
	const matches = paths.map(p => glob.sync(toPosixPath(p))).flat();
	const l10nFileContents = matches.reduce<Map<string, l10nJsonFormat>>((prev, curr) => {
		const results = curr.endsWith('.l10n.json') || curr.endsWith('package.nls.json')
			? [curr]
			: glob.sync(path.posix.join(curr, `{,!(node_modules)/**}`, '{*.l10n.json,package.nls.json}'));
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

	if (!l10nFileContents.size) {
		console.log('No L10N JSON files found so skipping generating XLF.');
		return;
	}
	console.log(`Found ${l10nFileContents.size} L10N JSON files. Generating XLF...`);

	const result = getL10nXlf(l10nFileContents, { sourceLanguage: language });
	writeFileSync(path.resolve(outFile), result);
	console.log(`Wrote XLF file to: ${outFile}`);
}

async function l10nImportXlf(paths: string[], outDir: string): Promise<void> {
	console.log('Searching for XLF files...');
	const matches = paths.map(p => glob.sync(toPosixPath(p))).flat();
	const xlfFiles = matches.reduce<string[]>((prev, curr) => {
		if (curr.endsWith('.xlf')) {
			prev.push(readFileSync(path.resolve(curr), 'utf8'));
		}
		const results = glob.sync(path.posix.join(curr, `{,!(node_modules)/**}`, '*.xlf'));
		for (const result of results) {
			prev.push(readFileSync(path.resolve(result), 'utf8'));
		}
		return prev;
	}, []);

	if (!xlfFiles.length) {
		console.log('No XLF files found.');
		return;
	}

	console.log(`Found ${xlfFiles.length} XLF files. Generating localized L10N JSON files...`);
	let count = 0;

	if (xlfFiles.length) {
		mkdirSync(path.resolve(outDir), { recursive: true });
	}

	for (const xlfContents of xlfFiles) {
		const details = await getL10nFilesFromXlf(xlfContents);
		count += details.length;
		for (const detail of details) {
			const type = detail.name === 'package' ? 'nls' : 'l10n';
			writeFileSync(path.resolve(path.join(outDir, `${detail.name}.${type}.${detail.language}.json`)), JSON.stringify(detail.messages));
		}
	}
	console.log(`Wrote ${count} localized L10N JSON files to: ${outDir}`);
}

function l10nGeneratePseudo(paths: string[], language: string): void {
	console.log('Searching for L10N JSON files...');
	const matches = paths.map(p => glob.sync(toPosixPath(p))).flat();
	matches.forEach(curr => {
		const results = curr.endsWith('.l10n.json') || curr.endsWith('package.nls.json')
			? [curr]
			: glob.sync(path.posix.join(curr, `{,!(node_modules)/**}`, '{*.l10n.json,package.nls.json}'));
		for (const result of results) {
			if (result.endsWith('.l10n.json')) {
				const name = path.basename(curr).split('.l10n.json')[0] ?? '';
				const contents = getL10nPseudoLocalized(JSON.parse(readFileSync(path.resolve(curr), 'utf8')));
				writeFileSync(path.resolve(path.join(path.dirname(curr), `${name}.l10n.${language}.json`)), JSON.stringify(contents));
			}
			if (result.endsWith('package.nls.json')) {
				const contents = getL10nPseudoLocalized(JSON.parse(readFileSync(path.resolve(curr), 'utf8')));
				writeFileSync(path.resolve(path.join(path.dirname(curr), `package.nls.${language}.json`)), JSON.stringify(contents));
			}
		}
	});

	if (!matches.length) {
		console.log('No L10N JSON files.');
		return;
	}
	console.log(`Wrote ${matches.length} L10N JSON files.`);
}

function toPosixPath(pathToConvert: string): string {
	return pathToConvert.split(path.win32.sep).join(path.posix.sep);
}
