import { build } from 'esbuild';
import pkg from '../package.json' assert { type: 'json' };

const commonConfig = {
	entryPoints: ['src/index.ts'],
	define: { $pkg: JSON.stringify(pkg) },
};

//browser minifed
await build({
	...commonConfig,
	outfile: 'dist/logzen.min.js',
	platform: 'browser',
	bundle: true,
	minify: true,
});

//browser unminifed
await build({
	...commonConfig,
	outfile: 'dist/logzen.js',
	platform: 'browser',
	bundle: true,
});

//node
await build({
	...commonConfig,
	outdir: 'dist/node',
	platform: 'node',
	bundle: false,
});
