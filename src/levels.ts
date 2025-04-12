/**
 * Enumeration of log levels.
 */
export const enum LogLevel {
	ERROR = 0,
	WARN = 1,
	NOTICE = 2,
	INFO = 3,
	DEBUG = 4,
}

export const levelText = ['debug', 'info', 'notice', 'warn', 'error'] as const satisfies { [K in LogLevel]: string };

/**
 * An array of all the log levels
 */
export const allLogLevels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.NOTICE, LogLevel.INFO, LogLevel.DEBUG] as const satisfies LogLevel[];
