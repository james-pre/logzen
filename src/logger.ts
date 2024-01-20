import EventEmitter from 'eventemitter3';
import type { IO, IOMessage, SupportedInterface, SupportedInterfaceName } from './io';
import { interfaces, isIO } from './io';
import { LogLevel, allLogLevels } from './levels';
import { computeLogMessage } from './utils';

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

export class Logger extends EventEmitter<{
	entry: (data: string, level: LogLevel) => void;
	log: (data: string) => void;
	info: (data: string) => void;
	warn: (data: string | Error) => void;
	error: (data: string | Error) => void;
	debug: (data: string) => void;
}> {
	protected _entries: string[] = [];
	protected readonly io: Set<IO<SupportedInterface>> = new Set();
	protected options: LoggerOptions;
	constructor({ attachGlobalConsole = true, retainLogs = true, allowClearing = true, logFormat = '($time) [$level] $message' }: Partial<LoggerOptions> = {}) {
		super();

		this.options = {
			attachGlobalConsole,
			retainLogs,
			allowClearing,
			logFormat,
		};

		if (this.options.attachGlobalConsole && 'console' in globalThis) {
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
	public attach(io: Logger, inputLevels: LogLevel[], outputLevels: LogLevel[]): void;
	public attach<I extends SupportedInterface>(io: I, levels?: LogLevel[]): void;
	public attach<I extends SupportedInterface>(io: IO<I>): void;
	public attach<I extends SupportedInterface>(_io: IO<I> | I, inputLevels: LogLevel[] = allLogLevels, outputLevels?: LogLevel[]): void {
		inputLevels = inputLevels instanceof Array ? inputLevels : allLogLevels;
		outputLevels = outputLevels instanceof Array ? outputLevels : inputLevels;
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
			return;
		}
		this.io.add({
			io,
			type,
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
	 * @param message The log message to be sent.
	 * @param level The log level for the message. Defaults to LogLevel.LOG.
	 * @param _computed Whether the log message is already computed
	 */
	public send(message: string, level: LogLevel = LogLevel.LOG, _computed = false): void {
		const data = _computed ? message : computeLogMessage(message, level, this.options.logFormat);
		if (this.options.retainLogs) {
			this._entries.push(data);
		}

		for (const { io, output, type } of this.io) {
			if (!output.enabled || !output.levels.has(level)) {
				continue;
			}

			if (!(type in interfaces)) {
				throw new TypeError('Invalid I/O type: ' + type);
			}
			// eslint-disable-next-line  @typescript-eslint/no-explicit-any
			interfaces[type].send(io as any, { data, level, computed: true });
		}

		this.emit('entry', data, level);
	}

	/**
	 * Sends an I/O message
	 * @param message the data from the input
	 * @returns whether the message was sent
	 * This is used to recieve data from inputs
	 */
	protected _send({ data, level, computed }: IOMessage): boolean {
		try {
			this.send(data, level, computed);
			return true;
		} catch (e) {
			return false;
		}
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
		if (!this.options.retainLogs || !this.options.allowClearing) {
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
	public warn(data: Error | string): void {
		const message = data.toString();
		this.send(message, LogLevel.WARN);
		this.emit('warn', message);
	}

	/**
	 * Logs an error message with the LogLevel.ERROR level.
	 * @param data - The error or log message.
	 */
	public error(data: Error | string): void {
		const message = data.toString();
		this.send(message, LogLevel.ERROR);
		this.emit('error', message);
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