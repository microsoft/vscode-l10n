const esbuild = require('esbuild');
const { dependencies, peerDependencies } = require('./package.json')
const { Generator } = require('npm-dts');

const watch = process.argv.includes('--watch');
const type = watch ? 'watch' : 'compile';

if (!watch) {
	new Generator({
		entry: 'main.ts',
		output: 'dist/main.d.ts',
	}).generate();
}

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
}

console.log(`[${type}] build started`)

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
	})
])
.then(() => { console.log(`[${type}] build finished`)})
.catch(() => process.exit(1))
