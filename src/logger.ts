import { EventEmitter } from 'eventemitter3';
import type { IO, IOInterface, IOMessage, SupportedInterface, SupportedInterfaceName } from './io.js';
import { interfaces, isIO } from './io.js';
import { LogLevel, allLogLevels, parseLevel, type LevelText } from './levels.js';
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
	 * Whether logged warnings will include a stack
	 * @default false
	 */
	hideWarningStack: boolean;

	/**
	 * Whether logged errors will include a stack
	 * @default false
	 */
	hideErrorStack: boolean;
}

/**
 * The input or output levels for an input or output.
 * - array			=> the levels to use
 * - single level	=> the passed level or more severe
 * - false 			=> no levels
 * - nullish		=> all levels
 */
export type AttachLevels = (LogLevel | LevelText)[] | LogLevel | LevelText | false | null;

export interface IODetachOptions {
	/** The log levels to use from the i/o input */
	input?: AttachLevels;
	/** The log levels to use for output to the i/o */
	output?: AttachLevels;
}

export interface IOAttachOptions extends IODetachOptions {
	prefix?: string;
}

function parseAttachLevels(levels: AttachLevels, defaultLevels: LogLevel[]): LogLevel[] {
	if (levels === false) return [];
	if (!levels) return defaultLevels;
	if (typeof levels == 'string') return parseAttachLevels(parseLevel(levels), defaultLevels);
	if (typeof levels == 'number') return allLogLevels.slice(0, levels + 1);
	if (Array.isArray(levels)) return levels.map(parseLevel);
	throw new TypeError('Invalid log level: ' + levels);
}

export class Logger extends EventEmitter<{
	entry: [data: string, level: LogLevel];
	send: [data: IOMessage];
	error: [data: string | Error];
	warn: [data: string | Error];
	notice: [data: string];
	info: [data: string];
	debug: [data: string];
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
	 * @param opt Options for the I/O
	 * If log levels are not provided, all log levels will be attached.
	 */
	public attach(io: Logger, opt: IOAttachOptions): void;
	public attach<I extends SupportedInterface>(io: I, opt?: IOAttachOptions): void;
	public attach<I extends SupportedInterface>(io: IO<I>): void;
	public attach<I extends SupportedInterface>(_io: IO<I> | I, opt: IOAttachOptions = {}): void {
		const inputLevels = parseAttachLevels(opt.input, allLogLevels);
		const outputLevels = parseAttachLevels(opt.output, inputLevels);
		const io = isIO(_io) ? _io.io : _io;

		const type = ('io' in _io && 'type' in _io ? _io.type : _io instanceof globalThis.console.constructor ? 'Console' : _io.constructor.name) as SupportedInterfaceName;
		if (!(type in interfaces)) throw new TypeError('Unsupported I/O: ' + type);

		const existing = [...this.io.values()].find(({ io: existing }) => existing == io) as IO<I>;
		if (existing) {
			for (const level of inputLevels) {
				existing.input.levels.add(level);
			}
			for (const level of outputLevels) {
				existing.output.levels.add(level);
			}

			if (opt.prefix) existing.prefix = opt.prefix;

			return;
		}

		this.io.add({
			io,
			type,
			prefix: opt.prefix,
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
	 *
	 * If log levels are not provided, all log levels will be detached.
	 */
	public detach(io: Logger, opt: IODetachOptions): void;
	public detach<I extends SupportedInterface>(io: I, opt?: IODetachOptions): void;
	public detach<I extends SupportedInterface>(io: IO<I>): void;
	public detach<I extends SupportedInterface>(_io: IO<I> | I, opt: IODetachOptions = {}): void {
		const inputLevels = parseAttachLevels(opt.input, allLogLevels);
		const outputLevels = parseAttachLevels(opt.output, inputLevels);

		const io = [...this.io.values()].find(({ io: existing }) => existing == (isIO(_io) ? _io.io : _io)) as IO<I>;
		if (!io) throw new ReferenceError('I/O not attached to Logger');

		for (const level of inputLevels) {
			io.input.levels.delete(level);
		}

		for (const level of outputLevels) {
			io.output.levels.delete(level);
		}

		if (io.input.levels.size > 0 || io.input.levels.size > 0) return;

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
	 * @param level The log level for the message. Defaults to LogLevel.INFO.
	 */
	public send(message: string | IOMessage, level: LogLevel = LogLevel.INFO): void {
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
	 * Logs a message with the LogLevel.INFO level.
	 * @param data - The log message.
	 */
	public info(...data: string[]): void {
		this.send(data.join(' '), LogLevel.INFO);
		this.emit('info', data.join(' '));
	}

	/**
	 * Logs a info message with the LogLevel.NOTICE level.
	 * @param data - The log message.
	 */
	public notice(...data: string[]): void {
		this.send(data.join(' '), LogLevel.INFO);
		this.emit('notice', data.join(' '));
	}

	/**
	 * Logs a warning message with the LogLevel.WARN level.
	 * @param data - The error or log message.
	 * @todo Replace with `Error.isError` once it is widely available
	 */
	public warn(data: Error | string): Error {
		const error = data instanceof Error ? data : new Error(data);
		const message = this.options.hideWarningStack ? error.toString() : error.stack;
		this.send(message, LogLevel.WARN);
		this.emit('warn', message);
		return error;
	}

	/**
	 * Logs an error message with the LogLevel.ERROR level.
	 * @param data - The error or log message.
	 * @todo Replace with `Error.isError` once it is widely available
	 */
	public error(data: Error | string): Error {
		const error = data instanceof Error ? data : new Error(data);
		const message = this.options.hideErrorStack ? error.toString() : error.stack;
		this.send(message, LogLevel.ERROR);
		this.emit('error', message);
		return error;
	}

	/**
	 * Logs a debug message with the LogLevel.DEBUG level.
	 * @param data - The log message.
	 */
	public debug(...data: string[]): void {
		this.send(data.join(' '), LogLevel.DEBUG);
		this.emit('debug', data.join(' '));
	}
}
