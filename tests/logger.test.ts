import { Writable } from 'stream';
import { IO, SupportedInterface } from '../src/io.js';
import { LogLevel } from '../src/levels.js';
import { Logger } from '../src/logger.js';
import { formatMessage } from '../src/utils.js';
import { test, suite, mock } from 'node:test';
import assert from 'node:assert';

const logger = new Logger({ noGlobalConsole: true, retainLogs: true, hideWarningStack: true, hideErrorStack: true });

suite('Logger', () => {
	test('Logger initialization', () => {
		assert(logger instanceof Logger);
		assert(logger.attachedIO === 0);
		assert(logger.entries.length == 0);
	});

	test('Attach and detach IO', () => {
		const mockIO: IO<SupportedInterface> = {
			io: {} as SupportedInterface,
			input: { levels: new Set([LogLevel.INFO]), enabled: true },
			output: { levels: new Set([LogLevel.ERROR]), enabled: false },
			type: 'Readable',
		};

		logger.attach(mockIO);
		assert(logger.attachedIO);

		logger.detach(mockIO);
		assert(!logger.attachedIO);
	});

	test('Send log message', () => {
		const mockIO = {
			io: {
				write: mock.fn(),
			},
			input: { levels: new Set([LogLevel.INFO]), enabled: false },
			output: { levels: new Set([LogLevel.INFO]), enabled: true },
			type: 'Writable',
		};

		logger.attach(mockIO as unknown as IO<Writable>);

		const contents = 'Test log message';
		logger.send(contents, LogLevel.INFO);

		const expected = formatMessage({ contents, level: LogLevel.INFO });

		assert(mockIO.io.write.mock.calls[0].arguments[0] == expected);
		assert(logger.entries.includes(expected));
	});

	test('Send log message with prefix', () => {
		const mockIO = {
			io: {
				write: mock.fn(),
			},
			input: { levels: new Set([LogLevel.INFO]), enabled: false },
			output: { levels: new Set([LogLevel.INFO]), enabled: true },
			type: 'Writable',
		};

		logger.attach(mockIO as unknown as IO<Writable>);

		const message = { contents: 'Test log message', level: LogLevel.INFO, prefix: 'PREFIX' };

		// Test sending log messages with a prefix
		logger.send(message);

		// Validate that the write method of the mock IO was called with the correct message including prefix
		const expected = formatMessage(message);
		assert(mockIO.io.write.mock.calls[0].arguments[0] == expected);

		// Validate that the log message with prefix was recorded in the logger's entries
		assert(logger.entries.includes(expected));
	});

	test('Logger to Logger testing', { todo: true }, () => {
		const receiverLogger = new Logger({ noGlobalConsole: true, retainLogs: true });

		// Attach the receiver logger as an output to the sender logger
		logger.attach(receiverLogger);

		const contents = 'Test log message';

		// Send a log message from the sender logger
		logger.send(contents, LogLevel.INFO);

		// Validate that the log message was received by the receiver logger
		const expected = formatMessage({ contents, level: LogLevel.INFO });
		assert(receiverLogger.entries.includes(expected));
	});

	test('Clear retained log entries', () => {
		const logMessage = 'Test log message';
		logger.send(logMessage, LogLevel.INFO);

		assert(logger.entries.length > 0);

		const cleared = logger.clear();
		assert(cleared);
		assert(logger.entries.length === 0);
	});

	test('Shortcut methods', () => {
		const contents = 'Test log message';

		logger.log(contents);
		assert(logger.entries.includes(formatMessage({ contents, level: LogLevel.LOG })));

		logger.info(contents);
		assert(logger.entries.includes(formatMessage({ contents, level: LogLevel.INFO })));

		const errorContents = new Error(contents);
		logger.warn(errorContents);
		assert(logger.entries.includes(formatMessage({ contents: errorContents.toString(), level: LogLevel.WARN })));

		logger.error(errorContents);
		assert(logger.entries.includes(formatMessage({ contents: errorContents.toString(), level: LogLevel.ERROR })));

		logger.debug(contents);
		assert(logger.entries.includes(formatMessage({ contents, level: LogLevel.DEBUG })));
	});
});
