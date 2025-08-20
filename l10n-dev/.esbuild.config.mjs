import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import copy from 'esbuild-copy-files-plugin';
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';
import { createRequire } from 'module';

// fill __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// require package.json
const require = createRequire(__filename);
const { dependencies, peerDependencies } = require('./package.json');

const watch = process.argv.includes('--watch');
const type = watch ? 'watch' : 'compile';

const sharedConfig = {
	bundle: true,
	sourcemap: watch,
	platform: 'node',
	minify: false,
	external: Object.keys(dependencies ?? {}).concat(Object.keys(peerDependencies ?? {})),
	plugins: [{
		name: 'rebuild-notify',
		setup(build) {
			build.onEnd(result => {
				console.log(`[${type}] build started`);
				console.log(JSON.stringify(result));
				if (result.errors.length > 0) {
					result.errors.forEach((error) => console.error(`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`));
				}
				console.log(`[${type}] build finished`);
			})
		},
	}]
};

console.log(`[${type}] build started`);

Promise.all([
	esbuild.context({
		...sharedConfig,
		entryPoints: ['src/main.ts'],
		outfile: 'dist/main.js',
		plugins: sharedConfig.plugins.concat([
			copy({
				source: ['./src/ast/tree-sitter-tsx.wasm', './src/ast/tree-sitter-typescript.wasm'],
				target: './dist',
				copyWithFolder: false
			})
		])
	}),
	esbuild.context({
		...sharedConfig,
		entryPoints: ['src/cli.ts'],
		outfile: 'dist/cli.js',
		banner: { js: '#!/usr/bin/env node' }, 
	})
])
.then(async ([apiResult, cliResult]) => {
	console.log(`[${type}] build finished`);
	// no need to generate types for watch mode
	if (watch) {
		return Promise.all([
			apiResult.watch(),
			cliResult.watch()
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
		apiResult.dispose(),
		cliResult.dispose()
	]);
})
.catch((err) => {
	console.log(err);
	process.exit(1);
});
