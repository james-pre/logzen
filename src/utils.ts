import { LogLevel } from './levels';

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
 * Computes the log message with the timestamp and log level.
 * @param message The log message to be formatted.
 * @param level The log level for the message. Defaults to LogLevel.LOG.
 * @param format The message format to use
 * @returns The formatted log message.
 */
export function computeLogMessage(message: string, level: LogLevel = LogLevel.LOG, format = '($time) [$level] $message'): string {
	const variables: Map<string, string> = new Map([
		['time', getTimeString(performance.now())],
		['level', LogLevel[level]],
		['message', message],
	]);
	return format.replaceAll(/\$([\w_]+)/g, (text, key) => (variables.has(key) ? variables.get(key) : text));
}
