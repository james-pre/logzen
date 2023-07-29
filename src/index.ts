import EventEmitter from 'eventemitter3';
import type { Readable, Writable } from 'stream';
export { version } from '../package.json';

/**
 * Enumeration of log levels.
 */
export enum LogLevel {
	LOG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	DEBUG = 4,
}

/**
 * An array of all the log levels
 */
export const allLogLevels = Object.values(LogLevel).filter(value => typeof value == 'number') as LogLevel[];

/**
 * Helper function to get a formatted time string from a timestamp.
 * @param timestamp - The timestamp to format.
 * @returns A formatted time string in the format "hh:mm:ss".
 */
function getTimeString(time: number): string {
	const timeInSeconds = +(time / 1000).toFixed();
	const seconds = timeInSeconds % 60;
	const minutes = Math.floor((timeInSeconds % 3600) / 60);
	const hours = Math.floor(timeInSeconds / 3600);
	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Computes the log message with the timestamp and log level.
 * @param message The log message to be formatted.
 * @param level The log level for the message. Defaults to LogLevel.LOG.
 * @param format The message format to use 
 * @returns The formatted log message.
 */
function computeLogMessage(message: string, level: LogLevel = LogLevel.LOG, format = '($time) [$level] $message'): string {
	const variables: Map<string, string> = new Map([
		['time', getTimeString(performance.now())],
		['level', LogLevel[level]],
		['message', message],
	]);
	return format.replaceAll(/\$([\w_]+)/g, (text, key) => (variables.has(key) ? variables.get(key) : text));
}

/**
 * Type for streams that can be used with Logger
 */
export type LogStream = Readable | Writable;

/**
 * Interface for storing log I/O and associated log levels.
 */
interface LogIO<IOInterface> {
	/**
	 * The interface to which logs are attached.
	 */
	io: IOInterface;

	/**
	 * The log levels to send to the stream.
	 */
	levels: LogLevel[];
}

/**
 * Options for configuring the Logger.
 */
export interface LoggerOptions {
	/**
	 * Flag to attach the global console to the Logger during initialization.
	 * @default true
	 */
	attachGlobalConsole: boolean;

	/**
	 * Whether to retain logs in memory.
	 * @default true
	 */
	retainLogs: boolean;

	/**
	 * Whether to allow clearing log entries
	 * @default true
	 */
	allowClearing: boolean;

	/**
	 * The format to use for log messages
	 * Variables:
	 * 	$time: The time since the program started in hh:mm:ss
	 * 	$level: The log level as a string
	 * 	$message: The message
	 * @default '($time) [$level] $message'
	 */
	logFormat: string;
}

export class Logger extends EventEmitter {
	private _entries: string[] = [];
	private readonly streams: Set<LogIO<LogStream>> = new Set();
	private readonly consoles: Set<LogIO<Console>> = new Set();
	private options: LoggerOptions;
	constructor({ attachGlobalConsole = true, retainLogs = true, allowClearing = true, logFormat = '($time) [$level] $message' }: Partial<LoggerOptions> = {}) {
		super();

		this.options = {
			attachGlobalConsole,
			retainLogs,
			allowClearing,
			logFormat,
		};

		if (this.options.attachGlobalConsole && 'console' in globalThis) {
			this.attachConsole(globalThis.console);
		}
	}

	/**
	 * Gets the array of log entries. Empty if retainLogs is false.
	 * @returns A copy of the log entries array.
	 */
	get entries(): string[] {
		return this._entries.slice(0);
	}

	/**
	 * Get the number of attached streams
	 * @return number of attached streams
	 */
	public get attachedStreams(): number {
		return this.streams.size;
	}

	/**
	 * Get the number of attached consoles
	 * @return number of attached consoles
	 */
	public get attachedConsoles(): number {
		return this.streams.size;
	}

	/**
	 * Attaches a stream to the Logger to output logs with specified log levels.
	 * @param stream - The stream to attach.
	 * @param levels - The log levels for the stream. If not provided, all log levels will be attached.
	 */
	attachStream(stream: LogStream, ...levels: LogLevel[]): void {
		levels = levels.length ? levels : allLogLevels;
		if (!('read' in stream || 'write' in stream)) {
			throw new TypeError('Stream must be a Readable or Writable.');
		}

		const existingContainer = Array.from(this.streams).find(container => container.io === stream);

		if (existingContainer) {
			existingContainer.levels.push(...levels);
			return;
		}

		const container: LogIO<LogStream> = { io: stream, levels };
		this.streams.add(container);

		if ('read' in stream) {
			stream.on('data', (data: Buffer | string) => {
				this.send(data.toString().trim(), levels[0] || LogLevel.LOG);
			});
		}
	}

	/**
	 * Detaches a stream from the Logger.
	 * @param stream - The stream to detach.
	 * @param levels - The log levels to detach from the stream. If not provided, all log levels will be detached.
	 */
	detachStream(stream: LogStream, ...levels: LogLevel[]): void {
		const container = Array.from(this.streams).find(container => container.io === stream);

		if (!container) return;

		for (const level of levels) {
			const levelIndex = container.levels.indexOf(level);
			if (levelIndex !== -1) {
				container.levels.splice(levelIndex, 1);
			}
		}

		if (container.levels.length == 0 || levels.length == 0) {
			this.streams.delete(container);
			if ('read' in stream) {
				stream.removeAllListeners('data');
			}
		}
	}

	/**
	 * Attaches a Console object to the Logger to output logs with specified log levels.
	 * @param console - The Console object to attach.
	 * @param levels - The log levels for the console. If not provided, all log levels will be attached.
	 */
	attachConsole(console: Console, ...levels: LogLevel[]): void {
		levels = levels.length ? levels : allLogLevels;
		const existingContainer = Array.from(this.consoles).find(container => container.io === console);

		if (existingContainer) {
			existingContainer.levels.push(...levels);
			return;
		}

		this.consoles.add({ io: console, levels });
	}

	/**
	 * Detaches a Console object from the Logger.
	 * @param console - The Console object to detach.
	 * @param levels - The log levels to detach from the console. If not provided, all log levels will be detached.
	 */
	detachConsole(console: Console, ...levels: LogLevel[]): void {
		const container = Array.from(this.consoles).find(container => container.io === console);

		if (!container) return;

		for (const level of levels) {
			const levelIndex = container.levels.indexOf(level);
			if (levelIndex !== -1) {
				container.levels.splice(levelIndex, 1);
			}
		}

		if (container.levels.length == 0 || levels.length == 0) {
			this.consoles.delete(container);
		}
	}

	/**
	 * Detaches all streams and consoles
	 */
	detachAll(): void {
		this.streams.clear();
		this.consoles.clear();
	}

	/**
	 * Outputs a log message to attached streams and consoles.
	 * @param message - The log message to be sent.
	 * @param level - The log level for the message. Defaults to LogLevel.LOG.
	 */
	send(message = '', level: LogLevel = LogLevel.LOG): void {
		const logEntry = computeLogMessage(message, level, this.options.logFormat);
		if (this.options.retainLogs) {
			this._entries.push(logEntry);
		}

		for (const stream of this.streams) {
			if (stream.levels.includes(level) && 'write' in stream.io) {
				stream.io.write(logEntry + '\n');
			}
		}

		for (const console of this.consoles) {
			const method = LogLevel[level].toLowerCase();
			if (console.levels.includes(level) && typeof console.io[method] == 'function') {
				console.io[method](logEntry);
			}
		}
	}

	/**
	 * Converts the log entries to a string.
	 * @returns A string representation of the log entries.
	 */
	toString(): string {
		return this.entries.join('\n');
	}

	/**
	 *
	 * @returns whether the entries where cleared or not
	 */
	clearRetainedEntries(): boolean {
		if (!this.options.retainLogs || !this.options.allowClearing) {
			return false;
		}

		this._entries = [];
		return true;
	}

	//easy to use shortcut methods

	/**
	 * Logs a message with the LogLevel.LOG level.
	 * @param message - The log message.
	 */
	log(message = ''): void {
		this.send(message, LogLevel.LOG);
		this.emit('log');
	}

	/**
	 * Logs a info message with the LogLevel.INFO level.
	 * @param message - The log message.
	 */
	info(message = ''): void {
		this.send(message, LogLevel.INFO);
		this.emit('info');
	}

	/**
	 * Logs a warning message with the LogLevel.WARN level.
	 * @param errorOrMessage - The error or log message.
	 */
	warn(errorOrMessage: Error | string = ''): void {
		const message = errorOrMessage.toString();
		this.send(message, LogLevel.WARN);
		this.emit('warn');
	}

	/**
	 * Logs an error message with the LogLevel.ERROR level.
	 * @param errorOrMessage - The error or log message.
	 */
	error(errorOrMessage: Error | string = ''): void {
		const message = errorOrMessage.toString();
		this.send(message, LogLevel.ERROR);
		this.emit('error');
	}

	/**
	 * Logs a debug message with the LogLevel.DEBUG level.
	 * @param message - The log message.
	 */
	debug(message = ''): void {
		this.send(message, LogLevel.DEBUG);
		this.emit('debug');
	}
}
