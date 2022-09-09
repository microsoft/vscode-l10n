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
	watch: !watch ? false : {
		onRebuild(error, result) {
			console.log('[watch] build started')
			if (error) {
				error.errors.forEach((error) => console.error(`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`))
			} else {
				console.log('[watch] build finished')
			}
		},
	},
	sourcemap: watch,
	external: Object.keys(dependencies ?? {}).concat(Object.keys(peerDependencies ?? {})),
}

console.log('[watch] build started')

Promise.all([
	esbuild.build({
		...sharedConfig,
		platform: 'node',
		minify: false,
		outfile: 'dist/main.js',
	}),
	esbuild.build({
		...sharedConfig,
		entryPoints: ['src/cli.ts'],
		minify: false,
		platform: 'node',
		outfile: 'dist/cli.js',
	})
])
.then(() => { console.log('[watch] build finished')})
.catch(() => process.exit(1))
