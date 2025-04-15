/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import * as glob from 'glob';
import { getL10nAwsLocalized, getL10nAzureLocalized, getL10nFilesFromXlf, getL10nJson, getL10nPseudoLocalized, getL10nXlf, l10nJsonFormat } from "./main";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger, LogLevel } from "./logger";
import { AwsTranslatorConfig } from "./translators/aws";

const GLOB_DEFAULTS = {
	// We only want files.
	nodir: true,
	// Absolute paths are easier to work with.
	absolute: true,
	// Ultimately, we should remove this but I worry that folks have already taken advantage of the fact that we handled Windows paths.
	// For now, we'll keep it, but in the future, we should remove it.
	windowsPathsNoEscape: true
};

yargs(hideBin(process.argv))
.scriptName("vscode-l10n-dev")
.usage('$0 <cmd> [args]')
.option('verbose', {
	alias: 'v',
	boolean: true,
	describe: 'Enable verbose logging'
})
.option('debug', {
	alias: 'd',
	boolean: true,
	describe: 'Enable debug logging'
})
.middleware(function (argv) {
	if (argv.debug) {
		logger.setLogLevel(LogLevel.Debug);
	} else if (argv.verbose) {
		logger.setLogLevel(LogLevel.Verbose);
	}
})
.command(
	'export [args] <path..>',
	'Export strings from source files. Supports glob patterns.',
	yargs => {
		yargs.positional('path', {
			demandOption: true,
			type: 'string',
			array: true,
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
.command(
	'generate-azure [args] <path..>',
	'(Experimental) Generate language files for `*.l10n.json` or `package.nls.json` files. You must create an Azure Translator instance, get the key and region, and set the AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION environment variables to these values.',
	yargs => {
		yargs.positional('path', {
			demandOption: true,
			type: 'string',
			array: true,
			normalize: true,
			describe: 'L10N JSON files to generate an XLF from. Supports folders and glob patterns.'
		});
		yargs.option('languages', {
			alias: 'l',
			type: 'string',
			array: true,
			default: ['fr', 'it', 'de', 'es', 'ru', 'zh-cn', 'zh-tw', 'ja', 'ko', 'cs', 'pt-br', 'tr', 'pl'],
			describe: 'The Pseudo language identifier that will be used.'
		});
		yargs.env('AZURE_TRANSLATOR');
	}, async function (argv) {
		if (!argv.key) {
			throw new Error('AZURE_TRANSLATOR_KEY environment variable is not defined.');
		}
		if (!argv.region) {
			throw new Error('AZURE_TRANSLATOR_REGION environment variable is not defined.');
		}
		await azureL10nGenerateTranslationService(
			argv.path as string[],
			argv.languages as string[],
			argv.key as string,
			argv.region as string
		);
	})
.command(
	'generate-aws [args] <path..>',
	'(Experimental) Generate language files for `*.l10n.json` or `package.nls.json` files.',
	yargs => {
		yargs.positional('path', {
			demandOption: true,
			type: 'string',
			array: true,
			normalize: true,
			describe: 'L10N JSON files to translate from. Supports folders and glob patterns.'
		});
		yargs.option('languages', {
			alias: 'l',
			type: 'string',
			array: true,
			default: ['fr', 'it', 'de', 'es', 'ru', 'zh-cn', 'zh-tw', 'ja', 'ko', 'cs', 'pt-br', 'tr', 'pl'],
			describe: 'The language identifier that will be used.'
		});
		yargs.option('region', {
			type: 'string',
			default: 'us-west-2',
			describe: 'The AWS region to use.'
		});
		yargs.option('source-language', {
			alias: 's',
			type: 'string',
			default: 'en',
			describe: 'The language of the source.'
		});
		yargs.option('sso-profile', {
			type: 'string',
			default: '',
			describe: 'The SSO profile name.'
		});
		yargs.option('formality', {
			type: 'string',
			choices: ['FORMAL', 'INFORMAL'],
			default: 'FORMAL',
			describe: 'The formality of the translation.'
		});
		yargs.option('profanity', {
			type: 'boolean',
			default: true,
			describe: 'Mask profanities.'
		});
	}, async function (argv) {
		await awsL10nGenerateTranslationService(
			argv.path as string[],
			argv.languages as string[],
			{
				region: argv.region as string,
				sourceLanguage: argv['source-language'] as string,
				formality: argv.formality as 'FORMAL' | 'INFORMAL',
				profanity: argv.profanity as boolean ? "MASK" : undefined,
				profile: argv['sso-profile'] as string
			}
		);
	})
.help().argv;

export async function l10nExportStrings(paths: string[], outDir?: string): Promise<void> {
	logger.log('Searching for TypeScript/JavaScript files...');

	const matches = glob.sync(
		paths.map(p => /\.(ts|tsx|js|jsx)$/.test(p) ? p : path.posix.join(p, '{,**}', '*.{ts,tsx,js,jsx}')),
		GLOB_DEFAULTS
	);
	const tsFileContents = matches.map(m => ({
		extension: path.extname(m),
		contents: readFileSync(path.resolve(m), 'utf8')
	}));

	if (!tsFileContents.length) {
		logger.log('No TypeScript files found.');
		return;
	}

	logger.log(`Found ${tsFileContents.length} TypeScript files. Extracting strings...`);
	const jsonResult = await getL10nJson(tsFileContents);

	const stringsFound = Object.keys(jsonResult).length;
	if (!stringsFound) {
		logger.log('No strings found. Skipping writing to a bundle.l10n.json.');
		return;
	}
	logger.log(`Extracted ${stringsFound} strings...`);

	let packageJSON;
	try {
		packageJSON = JSON.parse(readFileSync('package.json').toString('utf-8'));
	} catch(err) {
		// Ignore
	}
	if (packageJSON) {
		if (outDir) {
			if (!packageJSON.l10n || path.resolve(packageJSON.l10n) !== path.resolve(outDir)) {
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

export function l10nGenerateXlf(paths: string[], language: string, outFile: string): void {
	logger.log('Searching for L10N JSON files...');

	const matches = glob.sync(
		paths.map(p => /(\.l10n\.json|package\.nls\.json)$/.test(p) ? p : path.posix.join(p, `{,!(node_modules)/**}`, '{*.l10n.json,package.nls.json}')),
		GLOB_DEFAULTS
	);

	const l10nFileContents = new Map<string, l10nJsonFormat>();
	for (const match of matches) {
		if (match.endsWith('.l10n.json')) {
			const name = path.basename(match).split('.l10n.json')[0] ?? '';
			l10nFileContents.set(name, JSON.parse(readFileSync(path.resolve(match), 'utf8')));
		} else if (match.endsWith('package.nls.json')) {
			l10nFileContents.set('package', JSON.parse(readFileSync(path.resolve(match), 'utf8')));
		}
	}

	if (!l10nFileContents.size) {
		logger.log('No L10N JSON files found so skipping generating XLF.');
		return;
	}
	logger.log(`Found ${l10nFileContents.size} L10N JSON files. Generating XLF...`);

	const result = getL10nXlf(l10nFileContents, { sourceLanguage: language });
	writeFileSync(path.resolve(outFile), result);
	logger.log(`Wrote XLF file to: ${outFile}`);
}

export async function l10nImportXlf(paths: string[], outDir: string): Promise<void> {
	logger.log('Searching for XLF files...');

	const matches = glob.sync(
		paths.map(p => /\.xlf$/.test(p) ? p : path.posix.join(p, `{,!(node_modules)/**}`, '*.xlf')),
		GLOB_DEFAULTS
	);
	const xlfFiles = matches.map(m => readFileSync(path.resolve(m), 'utf8'));
	if (!xlfFiles.length) {
		logger.log('No XLF files found.');
		return;
	}

	logger.log(`Found ${xlfFiles.length} XLF files. Generating localized L10N JSON files...`);
	let count = 0;

	if (xlfFiles.length) {
		mkdirSync(path.resolve(outDir), { recursive: true });
	}

	for (const xlfContents of xlfFiles) {
		const details = await getL10nFilesFromXlf(xlfContents);
		count += details.length;
		for (const detail of details) {
			const type = detail.name === 'package' ? 'nls' : 'l10n';
			writeFileSync(
				path.resolve(path.join(outDir, `${detail.name}.${type}.${detail.language}.json`)),
				JSON.stringify(detail.messages, undefined, 2)
			);
		}
	}
	logger.log(`Wrote ${count} localized L10N JSON files to: ${outDir}`);
}

export function l10nGeneratePseudo(paths: string[], language: string): void {
	logger.log('Searching for L10N JSON files...');

	const matches = glob.sync(
		paths.map(p => /(\.l10n\.json|package\.nls\.json)$/.test(p) ? p : path.posix.join(p, `{,!(node_modules)/**}`, '{*.l10n.json,package.nls.json}')),
		GLOB_DEFAULTS
	);

	for (const match of matches) {
		const contents = getL10nPseudoLocalized(JSON.parse(readFileSync(path.resolve(match), 'utf8')));
		if (match.endsWith('.l10n.json')) {
			const name = path.basename(match).split('.l10n.json')[0] ?? '';
			writeFileSync(
				path.resolve(path.join(path.dirname(match), `${name}.l10n.${language}.json`)),
				JSON.stringify(contents, undefined, 2)
			);
		} else if (path.basename(match) === 'package.nls.json') {
			writeFileSync(
				path.resolve(path.join(path.dirname(match), `package.nls.${language}.json`)),
				JSON.stringify(contents, undefined, 2)
			);
		}
	}

	if (!matches.length) {
		logger.log('No L10N JSON files.');
		return;
	}
	logger.log(`Wrote ${matches.length} L10N JSON files.`);
}

export async function azureL10nGenerateTranslationService(paths: string[], languages: string[], key: string, region: string): Promise<void> {
	logger.log('Searching for L10N JSON files...');

	const matches = findL10nFiles(paths)

	for (const match of matches) {
		const contents = await getL10nAzureLocalized(
			JSON.parse(readFileSync(path.resolve(match), 'utf8')),
			languages,
			{ azureTranslatorKey: key, azureTranslatorRegion: region }
		);
		writeTranslations(languages, match, contents);
	}

	if (!matches.length) {
		logger.log('No L10N JSON files.');
		return;
	}
	logger.log(`Wrote ${matches.length * languages.length} L10N JSON files.`);
}

export async function awsL10nGenerateTranslationService(paths: string[], languages: string[], config: AwsTranslatorConfig ): Promise<void> {
	logger.log('Searching for L10N JSON files...');

	const matches = findL10nFiles(paths)

	for (const match of matches) {
		const contents = await getL10nAwsLocalized(
			JSON.parse(readFileSync(path.resolve(match), 'utf8')),
			languages,
			config
		);
		writeTranslations(languages, match, contents);
	}

	if (!matches.length) {
		logger.log('No L10N JSON files.');
		return;
	}
	logger.log(`Wrote ${matches.length * languages.length} L10N JSON files.`);
}

function findL10nFiles(paths: string[]): string[] {
	return glob.sync(
		paths.map(p => /(\.l10n\.json|package\.nls\.json)$/.test(p) ? p : path.posix.join(p, `{,!(node_modules)/**}`, '{*.l10n.json,package.nls.json}')),
		GLOB_DEFAULTS
	);
}

function writeTranslations(languages: string[], match: string, contents: l10nJsonFormat[]) {
	for (let i = 0; i < languages.length; i++) {
		const language = languages[i];
		if (match.endsWith('.l10n.json')) {
			const name = path.basename(match).split('.l10n.json')[0] ?? '';
			writeFileSync(
				path.resolve(path.join(path.dirname(match), `${name}.l10n.${language}.json`)),
				JSON.stringify(contents[i], undefined, 2)
			);
		} else if (path.basename(match) === 'package.nls.json') {
			writeFileSync(
				path.resolve(path.join(path.dirname(match), `package.nls.${language}.json`)),
				JSON.stringify(contents[i], undefined, 2)
			);
		}
	}
}

