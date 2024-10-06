import { EventEmitter } from 'eventemitter3';
import type { IO, IOInterface, IOMessage, SupportedInterface, SupportedInterfaceName } from './io.js';
import { interfaces, isIO } from './io.js';
import { LogLevel, allLogLevels } from './levels.js';
import { formatMessage, type FormatOptions } from './utils.js';

/**
 * Options for configuring the Logger.
 */
export interface LoggerOptions {
	/**
	 * Whether to attach the global console to the Logger during initialization.
	 * @default false
	 */
	noGlobalConsole: boolean;

	/**
	 * Whether to retain logs in memory.
	 * @default false
	 */
	retainLogs: boolean;

	/**
	 * Whether to disable clearing log entries
	 * @default false
	 */
	disableClearing: boolean;

	/**
	 * The format to use for log messages
	 * @see formatMessage
	 * @default '($time) [$prefix$level] $message'
	 */
	format: string;

	/**
	 * Options to use for formatting
	 * @see FormatOptions
	 */
	formatOptions: FormatOptions;

	/**
	 * The prefix to use (will not affect "passthrough" messages)
	 */
	prefix: string;

	/**
	 * Whether logged errors will include a stack
	 * @default false
	 */
	hideStack: boolean;
}

export class Logger extends EventEmitter<{
	entry: [data: string, level: LogLevel];
	log: [data: string];
	info: [data: string];
	warn: [data: string | Error];
	error: [data: string | Error];
	debug: [data: string];
	send: [data: IOMessage];
}> {
	protected _entries: string[] = [];
	protected readonly io: Set<IO<SupportedInterface>> = new Set();
	constructor(protected options: Partial<LoggerOptions> = {}) {
		super();

		if (!options.noGlobalConsole && 'console' in globalThis) {
			this.attach(globalThis.console);
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
	public get attachedIO(): number {
		return this.io.size;
	}

	/**
	 * Attaches an input or output to the Logger
	 * @param io The interface to attach.
	 * @param levels The log levels for the i/o.
	 * @param inputLevels The log levels to use from the i/o
	 * @param outputLevels The log levels to use from the i/o
	 * If log levels are not provided, all log levels will be attached.
	 */
	public attach(io: Logger, inputLevels: LogLevel[], outputLevels: LogLevel[], prefix?: string): void;
	public attach<I extends SupportedInterface>(io: I, levels?: LogLevel[], prefix?: string): void;
	public attach<I extends SupportedInterface>(io: IO<I>): void;
	public attach<I extends SupportedInterface>(_io: IO<I> | I, inputLevels: LogLevel[] = allLogLevels, outputLevels?: LogLevel[] | string, prefix?: string): void {
		inputLevels = inputLevels instanceof Array ? inputLevels : allLogLevels;
		outputLevels = outputLevels instanceof Array ? outputLevels : inputLevels;
		prefix = typeof outputLevels == 'string' ? outputLevels : prefix;
		const io = isIO(_io) ? _io.io : _io;
		const type = ('io' in _io && 'type' in _io ? _io.type : _io instanceof globalThis.console.constructor ? 'Console' : _io.constructor.name) as SupportedInterfaceName;
		if (!(type in interfaces)) {
			throw new TypeError('Unsupported I/O: ' + type);
		}
		const existing = [...this.io.values()].find(({ io: existing }) => existing == io) as IO<I>;
		if (existing) {
			for (const level of inputLevels) {
				existing.input.levels.add(level);
			}
			for (const level of outputLevels) {
				existing.output.levels.add(level);
			}
			if (prefix) {
				existing.prefix = prefix;
			}
			return;
		}
		this.io.add({
			io,
			type,
			prefix,
			input: {
				levels: new Set(inputLevels),
				enabled: typeof interfaces[type].receive == 'function',
			},
			output: {
				levels: new Set(outputLevels),
				enabled: typeof interfaces[type].send == 'function',
			},
		});
	}

	/**
	 * Detaches an input or output from the Logger
	 * @param io The interface to detach.
	 * @param levels The log levels for the i/o.
	 * @param inputLevels The log levels to use from the i/o
	 * @param outputLevels The log levels to use from the i/o
	 * If log levels are not provided, all log levels will be detached.
	 */
	public detach(io: Logger, inputLevels: LogLevel[], outputLevels: LogLevel[]): void;
	public detach<I extends SupportedInterface>(io: I, levels?: LogLevel[]): void;
	public detach<I extends SupportedInterface>(io: IO<I>): void;
	public detach<I extends SupportedInterface>(_io: IO<I> | I, inputLevels: LogLevel[] = allLogLevels, outputLevels?: LogLevel[]): void {
		inputLevels = inputLevels instanceof Array ? inputLevels : allLogLevels;
		outputLevels = outputLevels instanceof Array ? outputLevels : inputLevels;
		const io = [...this.io.values()].find(({ io: existing }) => existing == (isIO(_io) ? _io.io : _io)) as IO<I>;
		if (!io) {
			throw new ReferenceError('I/O not attached to Logger');
		}
		for (const level of inputLevels) {
			io.input.levels.delete(level);
		}
		for (const level of outputLevels) {
			io.output.levels.delete(level);
		}
		if (io.input.levels.size > 0 || io.input.levels.size > 0) {
			return;
		}
		this.io.delete(io);
	}

	/**
	 * Detaches all I/O
	 */
	public clearIO(): void {
		this.io.clear();
	}

	/**
	 * Outputs a log message to attached outputs.
	 * @param contents The log message to be sent.
	 * @param level The log level for the message. Defaults to LogLevel.LOG.
	 * @param computed Whether the log message is already computed
	 */
	public send(contents: string, level: LogLevel): void;

	/**
	 * Outputs a log message to attached outputs.
	 * @param message The message
	 */
	public send(message: IOMessage): void;

	/**
	 * Outputs a log message to attached outputs.
	 * @param message The log message to be sent. Can be an object with the message details or string with the message contents.
	 * @param level The log level for the message. Defaults to LogLevel.LOG.
	 */
	public send(message: string | IOMessage, level: LogLevel = LogLevel.LOG): void {
		if (typeof message == 'string') {
			message = {
				contents: message,
				level,
				prefix: this.options.prefix,
			};
		}
		message.computed ||= formatMessage(message, this.options.format, this.options.formatOptions);
		if (this.options.retainLogs) {
			this._entries.push(message.computed);
		}

		for (const { io, output, type, prefix } of this.io) {
			if (!output.enabled || !output.levels.has(level)) {
				continue;
			}

			if (!(type in interfaces)) {
				throw new TypeError('Invalid I/O type: ' + type);
			}

			const int: IOInterface<SupportedInterface> = interfaces[type];
			int.send(io, { ...message, prefix });
		}
		this.emit('send', message);
		this.emit('entry', message.computed, level);
	}

	/**
	 * Converts the log entries to a string.
	 * @returns A string representation of the log entries.
	 */
	public toString(): string {
		return this.entries.join('\n');
	}

	/**
	 * Clears retained log entries
	 * @returns whether the entries where cleared or not
	 */
	public clear(): boolean {
		if (!this.options.retainLogs || this.options.disableClearing) {
			return false;
		}

		this._entries = [];
		return true;
	}

	// easy to use shortcut methods

	/**
	 * Logs a message with the LogLevel.LOG level.
	 * @param data - The log message.
	 */
	public log(data: string): void {
		this.send(data, LogLevel.LOG);
		this.emit('log', data);
	}

	/**
	 * Logs a info message with the LogLevel.INFO level.
	 * @param data - The log message.
	 */
	public info(data: string): void {
		this.send(data, LogLevel.INFO);
		this.emit('info', data);
	}

	/**
	 * Logs a warning message with the LogLevel.WARN level.
	 * @param data - The error or log message.
	 */
	public warn(data: Error | string): Error {
		const error = data instanceof Error ? data : new Error(data);
		const message = this.options.hideStack ? error.toString() : error.stack;
		this.send(message, LogLevel.WARN);
		this.emit('warn', message);
		return error;
	}

	/**
	 * Logs an error message with the LogLevel.ERROR level.
	 * @param data - The error or log message.
	 */
	public error(data: Error | string): Error {
		const error = data instanceof Error ? data : new Error(data);
		const message = this.options.hideStack ? error.toString() : error.stack;
		this.send(message, LogLevel.ERROR);
		this.emit('error', message);
		return error;
	}

	/**
	 * Logs a debug message with the LogLevel.DEBUG level.
	 * @param data - The log message.
	 */
	public debug(data: string): void {
		this.send(data, LogLevel.DEBUG);
		this.emit('debug', data);
	}
}
