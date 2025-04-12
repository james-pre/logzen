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

/**
 * An array of all the log levels
 */
export const allLogLevels = Object.values(LogLevel).filter(value => typeof value == 'number') as LogLevel[];
