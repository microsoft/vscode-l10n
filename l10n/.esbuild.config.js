const esbuild = require('esbuild');
const path = require('path');
const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor');
const { dependencies, peerDependencies } = require('./package.json')

const watch = process.argv.includes('--watch');
const type = watch ? 'watch' : 'compile';

console.log(`[${type}] build started`);
esbuild.buildSync({
	entryPoints: ['src/main.ts'],
	bundle: true,
	watch,
	sourcemap: watch,
	external: Object.keys(dependencies ?? {}).concat(Object.keys(peerDependencies ?? {})),
	platform: 'node',
	minify: !watch,
	outfile: 'dist/main.js',
});
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
