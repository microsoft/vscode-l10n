const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');
const minify = !watch || process.argv.includes('--minify');

// Build the editor provider
esbuild.build({
	entryPoints: ['src/main.ts'],
	tsconfig: "./tsconfig.json",
	bundle: true,
	external: ['vscode'],
	sourcemap: watch,
	minify,
	watch,
	platform: 'node',
	outfile: 'dist/main.js',
}).catch(() => process.exit(1))

esbuild.build({
	entryPoints: ['src/cli.ts'],
	tsconfig: "./tsconfig.json",
	bundle: true,
	external: ['vscode'],
	sourcemap: watch,
	minify,
	watch,
	platform: 'node',
	outfile: 'dist/cli.js',
}).catch(() => process.exit(1))
