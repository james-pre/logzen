/**
 * Enumeration of log levels.
 */
export enum LogLevel {
	ERROR = 0,
	WARN = 1,
	NOTICE = 2,
	INFO = 3,
	DEBUG = 4,
}

export const levelText = ['error', 'warn', 'notice', 'info', 'debug'] as const satisfies { [K in LogLevel]: string };

export type LevelText = (typeof levelText)[LogLevel];

export function parseLevel(text: LogLevel | LevelText): LogLevel {
	return typeof text == 'string' ? (levelText.indexOf(text) as LogLevel) : text;
}

/**
 * An array of all the log levels
 */
export const allLogLevels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.NOTICE, LogLevel.INFO, LogLevel.DEBUG] as const satisfies LogLevel[];
