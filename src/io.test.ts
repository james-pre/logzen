import { Readable, Writable } from 'stream';
import { ReadableStream, WritableStream } from 'stream/web';
import { IO, IOInterface, SupportedInterface, SupportedInterfaces, interfaces, isIO } from './io';
import { LogLevel } from './levels';
import { Logger } from './logger';

const _interfaces: SupportedInterfaces = {
	Readable: new Readable({
		read(size) {
			return typeof size == 'number';
		},
	}),
	Writable: new Writable({
		write(chunk, encoding, callback) {
			callback();
		},
	}),
	ReadableStream: new ReadableStream(),
	WritableStream: new WritableStream(),
	Console: new console.Console(process.stdout),
	Logger: new Logger(),
};

describe('IO', () => {
	test('isIO()', () => {
		const readable: IO<Readable> = {
			io: new Readable(),
			input: { levels: new Set([LogLevel.INFO]), enabled: true },
			output: { levels: new Set([LogLevel.ERROR]), enabled: false },
			type: 'Readable',
		};

		const writable = {
			io: new Writable(),
			input: { levels: new Set([LogLevel.INFO]), enabled: true },
			output: { levels: new Set([LogLevel.ERROR]), enabled: false },
			type: 'Writable',
		};

		expect(isIO(readable)).toBe(true);
		expect(isIO(writable)).toBe(true);
		expect(isIO(null)).toBe(false);
		expect(isIO({})).toBe(false);
	});

	for (const [interfaceName, ioInstance] of Object.entries(_interfaces)) {
		const ioInterface: IOInterface<SupportedInterface> = interfaces[interfaceName];

		if (typeof ioInterface.send == 'function') {
			test(`${interfaceName}.send()`, () => {
				const result = ioInterface.send(ioInstance, { contents: 'test', level: LogLevel.LOG, computed: 'test' });
				expect(result).toBe(true);
			});
		}

		if (typeof ioInterface.receive == 'function') {
			test(`${interfaceName}.receive`, () => {
				const handler = jest.fn();
				ioInterface.receive(ioInstance, handler);
			});
		}
	}
});
