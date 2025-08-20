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
	plugins: [{
		name: 'rebuild-notify',
		setup(build) {
			build.onEnd(result => {
				console.log(`[${type}] build started`);
				if (result.errors.length > 0) {
					result.errors.forEach((error) => console.error(`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`));
				}
				console.log(`[${type}] build finished`);
			})
		},
	}]
}

console.log(`[${type}] build started`);
Promise.all([
	esbuild.context({
		...sharedConfig,
		platform: 'node',
		outfile: 'dist/main.js'
	}),
	esbuild.context({
		...sharedConfig,
		format: 'esm',
		globalName: 'l10n',
		platform: 'browser',
		outfile: 'dist/browser.js',
	})
])
.then(async ([nodeResult, browserResult]) => {
	console.log(`[${type}] build finished`);
	
	if (watch) {
		return Promise.all([
			nodeResult.watch(),
			browserResult.watch()
		]);
	}
	
	console.log(`[${type}] generating types started`);
	const extractorResult = Extractor.invoke(ExtractorConfig.loadFileAndPrepare(path.join(__dirname, './api-extractor.json')));
	
	if (!extractorResult.succeeded) {
		console.error(`API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`);
		process.exit(1);
	}
	console.log(`[${type}] generating types finished`);

	await Promise.all([
		nodeResult.dispose(),
		browserResult.dispose()
	]);
})
.catch((err) => {
	console.error(err);
	process.exit(1);
});
