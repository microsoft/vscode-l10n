const esbuild = require('esbuild');
const { dependencies, peerDependencies } = require('./package.json')
const { Generator } = require('npm-dts');

const watch = process.argv.includes('--watch');

if (!watch) {
	new Generator({
		entry: 'main.ts',
		output: 'dist/main.d.ts',
	}).generate();
}

esbuild.build({
	entryPoints: ['src/main.ts'],
	bundle: true,
	watch,
	sourcemap: watch,
	external: Object.keys(dependencies ?? {}).concat(Object.keys(peerDependencies ?? {})),
	platform: 'node',
	minify: !watch,
	outfile: 'dist/main.js',
}).catch(() => process.exit(1))
