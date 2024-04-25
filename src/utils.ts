import type { IOMessage } from './io.js';
import { LogLevel } from './levels.js';

/**
 * Helper function to get a formatted time string from a timestamp.
 * @param timestamp - The timestamp to format.
 * @returns A formatted time string in the format "hh:mm:ss".
 */
export function getTimeString(time: number): string {
	const timeInSeconds = +(time / 1000).toFixed();
	const seconds = timeInSeconds % 60;
	const minutes = Math.floor((timeInSeconds % 3600) / 60);
	const hours = Math.floor(timeInSeconds / 3600);
	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Options when computing/formatting log messages
 */
export interface FormatOptions {
	/**
	 * The delimiter to place after the prefix
	 * @default '/'
	 */
	prefixDelimiter: string;
}

/**
 * Formats the log message
 * @param message The log message to be formatted/computed.
 * @param format The message format to use
 * @returns The formatted log message.
 *
 * Variables ($name):
 * - message: The message contents
 * - time: The time since the program started in hh:mm:ss
 * - level: The log level as a string
 * - prefix: The prefix with a '/' appended if the prefix is truthy
 */
export function formatMessage(message: IOMessage, format = '($time) [$prefix$level] $message', { prefixDelimiter = '/' }: Partial<FormatOptions> = {}): string {
	const variables: Map<string, string> = new Map([
		['time', getTimeString(performance.now())],
		['level', LogLevel[message.level]],
		['prefix', message.prefix ? message.prefix + prefixDelimiter : ''],
		['message', message.contents],
	]);
	return format.replaceAll(/\$([\w_]+)/g, (text, key) => (variables.has(key) ? variables.get(key) : text));
}
