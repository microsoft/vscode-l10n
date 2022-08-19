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

const sharedConfig = {
	entryPoints: ['src/main.ts'],
	bundle: true,
	watch,
	sourcemap: watch,
	external: Object.keys(dependencies ?? {}).concat(Object.keys(peerDependencies ?? {})),
}

esbuild.build({
	...sharedConfig,
	platform: 'node',
	minify: false,
	outfile: 'dist/main.js',
}).catch(() => process.exit(1))

esbuild.build({
	...sharedConfig,
	platform: 'neutral',
	minify: !watch,
	format: 'esm',
	outfile: 'dist/main.esm.js',
}).catch(() => process.exit(1))

esbuild.build({
	...sharedConfig,
	entryPoints: ['src/cli.ts'],
	minify: false,
	platform: 'node',
	outfile: 'dist/cli.js',
}).catch(() => process.exit(1))
