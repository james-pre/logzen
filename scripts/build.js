/* eslint-env node */
import { context } from 'esbuild';
import pkg from '../package.json' assert { type: 'json' };
import { parseArgs } from 'node:util';
import { rmSync } from 'node:fs';

const { values: options } = parseArgs({
	options: {
		watch: { short: 'w', type: 'boolean', default: false },
		keep: { short: 'k', type: 'boolean', default: false },
	},
});

if (!options.keep) {
	rmSync('dist', { recursive: true, force: true });
}

const commonConfig = {
	entryPoints: ['src/index.ts'],
	define: { $pkg: JSON.stringify(pkg) },
	globalName: 'Logzen',
	sourcemap: true,
};

const contexts = [
	await context({
		...commonConfig,
		outfile: `dist/${pkg.name}.min.js`,
		format: 'esm',
		platform: 'neutral',
		bundle: true,
		minify: true,
	}),

	await context({
		...commonConfig,
		outfile: `dist/${pkg.name}.js`,
		format: 'esm',
		platform: 'neutral',
		bundle: true,
	}),

	await context({
		...commonConfig,
		outfile: `dist/${pkg.name}.browser.js`,
		platform: 'browser',
		bundle: true,
		minify: true,
	}),
];

const promises = [];
for (const ctx of contexts) {
	if (options.watch) {
		promises.push(ctx.watch());
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}
if (options.watch) {
	console.log('Watching...');
	await Promise.all(promises);
}
