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
			});
		},
	}]
};

// Emit CommonJS and ESM entry points for Node consumers and keep a browser-focused bundle.
const buildTargets = [
	{
		...sharedConfig,
		format: 'cjs',
		platform: 'node',
		outfile: 'dist/main.js'
	},
	{
		...sharedConfig,
		format: 'esm',
		platform: 'node',
		outfile: 'dist/main.mjs'
	},
	{
		...sharedConfig,
		format: 'esm',
		platform: 'browser',
		outfile: 'dist/browser.js'
	}
];

async function main() {
	console.log(`[${type}] build started`);

	if (watch) {
		const buildContexts = await Promise.all(buildTargets.map((target) => esbuild.context(target)));
		await Promise.all(buildContexts.map((context) => context.watch()));
		return;
	}

	await Promise.all(buildTargets.map((target) => esbuild.build(target)));
	
	console.log(`[${type}] generating types started`);
	const extractorResult = Extractor.invoke(ExtractorConfig.loadFileAndPrepare(path.join(__dirname, './api-extractor.json')));
	
	if (!extractorResult.succeeded) {
		console.error(`API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`);
		process.exit(1);
	}
	console.log(`[${type}] generating types finished`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
