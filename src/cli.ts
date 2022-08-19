import { readFileSync, writeFileSync } from "fs";
import path from "path";
import glob from 'glob';
import { getI18nJson } from "./main";
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

yargs(hideBin(process.argv))
.usage('$0 <cmd> [args]')
.command('export', 'Export strings from source files', yargs => {
	yargs.positional('pattern', {
		demandOption: true,
		type: 'string',
		describe: 'Glob pattern of ts files to include'
	})
	yargs.option('outDir', {
		string: true,
		default: '.',
		describe: 'Output directory'
	});
}, function (argv) {
	i18nExportStrings(argv._ as any, argv.outDir as any);
}).help()
.argv

function i18nExportStrings(pattern: string, outDir: string): void {
	const matches = glob.sync(pattern);
	const fileContents = matches.map(m => readFileSync(path.resolve(m), 'utf8'));

	const result = getI18nJson(fileContents);

	const resolvedOutFile = path.resolve(path.join(outDir, 'i18n.default.json'));
	writeFileSync(resolvedOutFile, JSON.stringify(result));
}
