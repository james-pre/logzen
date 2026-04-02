import type { IOMessage } from './io.js';
import { levelText } from './levels.js';

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
 * - `%b`: short UTC month name (Jan–Dec)
 * - `%c`: UTC timestamp shortcut (Mon dd hh:mm:ss)
 * - `%d`: 2-digit UTC day of month (01–31)
 * - `%e`: 2-digit UTC month with leading whitespace for single-digit months ( 1–12)
 * - `%H`: 2-digit UTC hour (00–23)
 * - `%l`: log level
 * - `%M`: 2-digit UTC minute (00–59)
 * - `%m`: 2-digit UTC month (01–12)
 * - `%p`: prefix (with trailing delimiter if present)
 * - `%S`: 2-digit UTC second (00–59)
 * - `%s`: message contents
 * - `%Y`: 4-digit UTC year
 */
export function formatMessage(message: IOMessage, format = '(%c) [%p%l] %s', { prefixDelimiter = '/' }: Partial<FormatOptions> = {}): string {
	const now = new Date();

	const variables = {
		b: now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
		c: now.toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', ''),
		d: String(now.getUTCDate()).padStart(2, '0'),
		e: String(now.getUTCMonth() + 1).padStart(2),
		H: String(now.getUTCHours()).padStart(2, '0'),
		l: levelText[message.level],
		M: String(now.getUTCMinutes()).padStart(2, '0'),
		m: String(now.getUTCMonth() + 1).padStart(2, '0'),
		p: message.prefix ? message.prefix + prefixDelimiter : '',
		s: message.contents,
		S: String(now.getUTCSeconds()).padStart(2, '0'),
		Y: now.getUTCFullYear().toString().padStart(4, '0'),
	};

	return format.replaceAll(/%([\w]+)/g, (text, key: keyof typeof variables) => (key in variables ? variables[key] : text));
}
