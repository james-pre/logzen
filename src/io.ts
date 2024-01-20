import { LogLevel } from './levels';
import type { Readable, Writable } from 'stream';
import type { ReadableStream, WritableStream } from 'stream/web';
import { Logger } from './logger';

/**
 * For sending messages between interfaces and loggers
 */
export interface IOMessage<Computed extends boolean = boolean> {
	/**
	 * The message contents
	 */
	data: string;

	/**
	 * Whether data is the contents or the computed log entry
	 */
	computed: Computed;

	/**
	 * The log level of the message
	 */
	level?: Computed extends true ? LogLevel : never;
}

/**
 * Input, output, etc.
 */
export interface IOChannel {
	/**
	 * Which log levels should be used with the channel
	 */
	levels: Set<LogLevel>;

	/**
	 * Whether the channel is enabled
	 */
	enabled: boolean;
}

/**
 * Stores an I/O interface and associated log levels.
 */
export interface IO<I extends SupportedInterface = SupportedInterface> {
	/**
	 * The internal input/output.
	 */
	io: I;

	/**
	 * Input channel
	 */
	input: IOChannel;

	/**
	 * Output channel
	 */
	output: IOChannel;

	/**
	 * The type of interface
	 */
	type: NameOfInterface<I>;
}

/**
 * Checks if arg is an IO
 * @param arg thing to check
 * @returns If arg is an IO
 */
export function isIO<I extends SupportedInterface>(arg: unknown): arg is IO<I> {
	return !!(typeof arg == 'object' && arg && 'io' in arg && !(arg instanceof Logger));
}

/**
 * Common interface for I/O
 */
export interface IOInterface<I extends SupportedInterface> {
	send?(io: I, message: IOMessage): boolean;
	receive?(io: I, handler: (message: IOMessage) => boolean): void;
}

/**
 * @internal
 */
export interface SupportedInterfaces {
	Readable: Readable;
	Writable: Writable;
	ReadableStream: ReadableStream<string>;
	WritableStream: WritableStream<string>;
	Console: Console;
	Logger: Logger;
}

/**
 * The names of interfaces Logger can use
 */
export type SupportedInterfaceName = keyof SupportedInterfaces;

/**
 * The interfaces Logger can use
 */
export type SupportedInterface = SupportedInterfaces[SupportedInterfaceName];

export type InterfaceWithName<N extends SupportedInterfaceName> = SupportedInterfaces[N];

export type NameOfInterface<I> = {
	[K in SupportedInterfaceName]: I extends SupportedInterfaces[K] ? K : never;
}[SupportedInterfaceName];

export const interfaces: { [N in SupportedInterfaceName]: IOInterface<SupportedInterfaces[N]> } = {
	Readable: {
		receive(io, handler) {
			io.on('data', (data: Buffer | string) => {
				handler({ computed: false, data: data.toString().trim() });
			});
		},
	},
	Writable: {
		send(io, { data }) {
			try {
				io.write(data);
				return true;
			} catch (e) {
				return false;
			}
		},
	},
	ReadableStream: {
		async receive(io, handler) {
			let data = '';
			for await (const chunk of io) {
				data += chunk;
			}
			handler({ computed: false, data });
		},
	},
	WritableStream: {
		send(io, { data }) {
			try {
				io.getWriter().write(data);
				return true;
			} catch (e) {
				return false;
			}
		},
	},
	Console: {
		send(io, { data, level }) {
			try {
				const method = LogLevel[level].toLowerCase();
				if (typeof io[method] == 'function') {
					io[method](data);
				}
				return true;
			} catch (e) {
				return false;
			}
		},
	},
	Logger: {
		send(io, { data, level }) {
			try {
				io.send(data, level, true);
				return true;
			} catch (e) {
				return false;
			}
		},
		receive(io, handler) {
			io.on('entry', (data, level) => {
				handler({ data, level, computed: true });
			});
		},
	},
};
