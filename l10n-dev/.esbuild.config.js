const esbuild = require('esbuild');
const path = require('path');
const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor');
const { dependencies, peerDependencies } = require('./package.json')

const watch = process.argv.includes('--watch');
const type = watch ? 'watch' : 'compile';

const sharedConfig = {
	bundle: true,
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
	sourcemap: watch,
	platform: 'node',
	minify: false,
	external: Object.keys(dependencies ?? {}).concat(Object.keys(peerDependencies ?? {})),
};

console.log(`[${type}] build started`);

Promise.all([
	esbuild.build({
		...sharedConfig,
		entryPoints: ['src/main.ts'],
		outfile: 'dist/main.js',
	}),
	esbuild.build({
		...sharedConfig,
		entryPoints: ['src/cli.ts'],
		outfile: 'dist/cli.js',
		banner: { js: '#!/usr/bin/env node' }, 
	})
])
.then(() => {
	console.log(`[${type}] build finished`);
	// no need to generate types for watch mode
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
.catch(() => process.exit(1));
