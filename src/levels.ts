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
