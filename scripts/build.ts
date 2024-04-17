/* eslint-env node */
import { context, build, BuildOptions } from 'esbuild';
import pkg from '../package.json' assert { type: 'json' };
import { parseArgs } from 'node:util';
import { rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const {
	values: { watch, keep, quiet },
} = parseArgs({
	options: {
		watch: { short: 'w', type: 'boolean', default: false },
		keep: { short: 'k', type: 'boolean', default: false },
		quiet: { short: 'q', type: 'boolean', default: false },
	},
});

const config = {
	entryPoints: ['src/index.ts'],
	target: 'esnext',
	globalName: 'Logzen',
	outfile: 'dist/browser.min.js',
	sourcemap: true,
	keepNames: true,
	bundle: true,
	minify: true,
	define: { $pkg: JSON.stringify(pkg) },
	platform: 'browser',
	plugins: [
		{
			name: 'tsc',
			setup({ onStart }) {
				onStart(() => {
					if (!keep) {
						rmSync('dist', { recursive: true, force: true });
					}

					try {
						execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
					} catch (e) {
						console.error(e);
					}
				});
			},
		},
	],
} satisfies BuildOptions;

if (watch) {
	if (!quiet) {
		console.log('Watching for changes...');
	}
	const ctx = await context(config);
	await ctx.watch();
} else {
	await build(config);
}
