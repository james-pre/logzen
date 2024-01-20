import { Writable } from 'stream';
import { IO, SupportedInterface } from './io';
import { LogLevel } from './levels';
import { Logger } from './logger';
import { computeLogMessage } from './utils';

describe('Logger', () => {
	let logger: Logger;

	beforeEach(() => {
		logger = new Logger({ attachGlobalConsole: false });
	});

	test('Logger initialization', () => {
		expect(logger).toBeInstanceOf(Logger);
		expect(logger.attachedIO).toBe(0);
		expect(logger.entries).toEqual([]);
	});

	test('Attach and detach IO', () => {
		const mockIO: IO<SupportedInterface> = {
			io: {} as SupportedInterface,
			input: { levels: new Set([LogLevel.INFO]), enabled: true },
			output: { levels: new Set([LogLevel.ERROR]), enabled: false },
			type: 'Readable',
		};

		logger.attach(mockIO);
		expect(logger.attachedIO).toBe(1);

		logger.detach(mockIO);
		expect(logger.attachedIO).toBe(0);
	});

	test('Send log message', () => {
		const mockIO: IO<Writable> = {
			io: {
				write: jest.fn(),
			} as any, // eslint-disable-line  @typescript-eslint/no-explicit-any
			input: { levels: new Set([LogLevel.INFO]), enabled: false },
			output: { levels: new Set([LogLevel.INFO]), enabled: true },
			type: 'Writable',
		};

		logger.attach(mockIO);

		const message = 'Test log message';
		logger.send(message, LogLevel.INFO);

		const expected = computeLogMessage(message, LogLevel.INFO);

		expect(mockIO.io.write).toHaveBeenCalledWith(expected);
		expect(logger.entries).toContain(expected);
	});

	test('Clear retained log entries', () => {
		const logMessage = 'Test log message';
		logger.send(logMessage, LogLevel.INFO);

		expect(logger.entries.length).toBeGreaterThan(0);

		const cleared = logger.clear();
		expect(cleared).toBe(true);
		expect(logger.entries.length).toBe(0);
	});

	test('Shortcut methods', () => {
		const logMessage = 'Test log message';

		logger.log(logMessage);
		expect(logger.entries).toContain(computeLogMessage(logMessage, LogLevel.LOG));

		logger.info(logMessage);
		expect(logger.entries).toContain(computeLogMessage(logMessage, LogLevel.INFO));

		const logError = new Error(logMessage);
		logger.warn(logError);
		expect(logger.entries).toContain(computeLogMessage(logError.toString(), LogLevel.WARN));

		logger.error(logError);
		expect(logger.entries).toContain(computeLogMessage(logError.toString(), LogLevel.ERROR));

		logger.debug(logMessage);
		expect(logger.entries).toContain(computeLogMessage(logMessage, LogLevel.DEBUG));
	});
});
