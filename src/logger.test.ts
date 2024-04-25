import { Writable } from 'stream';
import { IO, SupportedInterface } from './io';
import { LogLevel } from './levels';
import { Logger } from './logger';
import { formatMessage } from './utils';

describe('Logger', () => {
	let logger: Logger;

	beforeEach(() => {
		logger = new Logger({ noGlobalConsole: true, retainLogs: true });
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

		const contents = 'Test log message';
		logger.send(contents, LogLevel.INFO);

		const expected = formatMessage({ contents, level: LogLevel.INFO });

		expect(mockIO.io.write).toHaveBeenCalledWith(expected);
		expect(logger.entries).toContain(expected);
	});

	test('Send log message with prefix', () => {
		const mockIO: IO<Writable> = {
			io: {
				write: jest.fn(),
			} as any, // eslint-disable-line  @typescript-eslint/no-explicit-any
			input: { levels: new Set([LogLevel.INFO]), enabled: false },
			output: { levels: new Set([LogLevel.INFO]), enabled: true },
			type: 'Writable',
		};

		logger.attach(mockIO);

		const message = { contents: 'Test log message', level: LogLevel.INFO, prefix: 'PREFIX' };

		// Test sending log messages with a prefix
		logger.send(message);

		// Validate that the write method of the mock IO was called with the correct message including prefix
		const expected = formatMessage(message);
		expect(mockIO.io.write).toHaveBeenCalledWith(expected);

		// Validate that the log message with prefix was recorded in the logger's entries
		expect(logger.entries).toContain(expected);
	});

	test('Logger to Logger testing', () => {
		const receiverLogger = new Logger({ noGlobalConsole: true, retainLogs: true });

		// Attach the receiver logger as an output to the sender logger
		logger.attach(receiverLogger);

		const contents = 'Test log message';

		// Send a log message from the sender logger
		logger.send(contents, LogLevel.INFO);

		// Validate that the log message was received by the receiver logger
		const expected = formatMessage({ contents, level: LogLevel.INFO });
		expect(receiverLogger.entries).toContain(expected);
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
		const contents = 'Test log message';

		logger.log(contents);
		expect(logger.entries).toContain(formatMessage({ contents, level: LogLevel.LOG }));

		logger.info(contents);
		expect(logger.entries).toContain(formatMessage({ contents, level: LogLevel.INFO }));

		const errorContents = new Error(contents);
		logger.warn(errorContents);
		expect(logger.entries).toContain(formatMessage({ contents: errorContents.toString(), level: LogLevel.WARN }));

		logger.error(errorContents);
		expect(logger.entries).toContain(formatMessage({ contents: errorContents.toString(), level: LogLevel.ERROR }));

		logger.debug(contents);
		expect(logger.entries).toContain(formatMessage({ contents, level: LogLevel.DEBUG }));
	});
});
