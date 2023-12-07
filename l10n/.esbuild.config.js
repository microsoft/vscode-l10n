const esbuild = require('esbuild');
const path = require('path');
const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor');

const watch = process.argv.includes('--watch');
const type = watch ? 'watch' : 'compile';

const sharedConfig = {
	entryPoints: ['src/main.ts'],
	bundle: true,
	minify: false,
	sourcemap: watch,
	watch: !watch ? false : {
		onRebuild(error, result) {
			console.log(`[${type}] build started`)
			if (error) {
				error.errors.forEach((error) => console.error(`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`))
			} else {
				console.log(`[${type}] build finished`)
			}
		},
	},
}

console.log(`[${type}] build started`);
Promise.all([
	esbuild.build({
		...sharedConfig,
		platform: 'node',
		outfile: 'dist/main.js',
	}),
	esbuild.build({
		...sharedConfig,
		format: 'esm',
		globalName: 'l10n',
		platform: 'browser',
		outfile: 'dist/browser.js',
	})
])
.then(() => {
	console.log(`[${type}] build finished`);
	
	if (watch) {
		return;
	}
	
	console.log(`[${type}] generating types started`);
	const extractorResult = Extractor.invoke(ExtractorConfig.loadFileAndPrepare(path.join(__dirname, './api-extractor.json')));
	
	if (!extractorResult.succeeded) {
		console.error(`API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`);
		process.exit(1);
	}
	console.log(`[${type}] generating types finished`);
})
.catch((err) => {
	console.error(err);
	process.exit(1);
});
