# LogZen

LogZen is a simple and flexible logging library for Node.js that provides easy-to-use logging functionality with customizable log levels and the ability to output logs to different streams and consoles.

[Documentation](https://dr-vortex.github.io/logzen)

## Installation

You can install LogZen using npm:

```bash
npm install logzen
```

## Usage

To use LogZen in your project, you need to import the `Logger` class from the LogZen package:

```javascript
import { Logger } from 'logzen';
```

### Basic Logging

Create a new `Logger` instance to start logging:

```javascript
const logger = new Logger();

logger.log('This is a log message.');
logger.warn('This is a warning message.');
logger.error('This is an error message.');
logger.debug('This is a debug message.');
```

### Customizing Log Levels

You can customize the log levels by setting the `attachGlobalConsole` option to `false` and manually attaching the console with custom log levels:

```javascript
import { Logger, LogLevel } from 'logzen';
const logger = new Logger({ attachGlobalConsole: false });

// Attach console with custom log levels
logger.attachConsole(console, LogLevel.WARN, LogLevel.ERROR);

logger.error('This message will be sent to the console.');
logger.log('This message will not be sent to the console!');
```

### Logging to Files

LogZen supports logging to files by attaching file streams to the `Logger` instance. This allows you to send log entries with specific log levels to separate log files.

```javascript
import { Logger, LogLevel } from 'logzen';
import fs from 'fs';

// Create a writable stream to a log file
const logFileStream = fs.createWriteStream('app.log', { flags: 'a' });
const errorFileStream = fs.createWriteStream('error.log', { flags: 'a' });

// Create the Logger instance
const logger = new Logger({ attachGlobalConsole: false });

// Attach the file stream with specific log levels
logger.attachStream(logFileStream, LogLevel.LOG, LogLevel.INFO);
logger.attachStream(errorFileStream, LogLevel.WARN, LogLevel.ERROR);

logger.log('This log message will be written to the app.log file.');
logger.error('This error message will also be written to the error.log file.');
```

### Detaching Streams and Consoles

You can detach streams and consoles from the `Logger` using the `detachStream` and `detachConsole` methods:

```javascript
const logger = new Logger();

// Detach streams and Console objects
logger.detachStream(stream, LogLevel.LOG, LogLevel.WARN);
logger.detachConsole(console);
```

### Attaching Consoles

You can also attach Console objects to the Logger instance to output logs to the console. This is useful if you have multiple consoles and want to output to all of them.

```javascript
const logger = new Logger({ attachGlobalConsole: false });

logger.attachConsole(console, LogLevel.WARN, LogLevel.ERROR);

logger.log('This log message will be not sent to the console.');
logger.error('This error will be sent to the console!');
```

### Retaining Logs

By default, logs are retained in memory. You can disable log retention by setting the retainLogs option to false. Note that if you disable log retention, calling a `Logger`'s `toString` method will return an empty string.

```javascript
const logger = new Logger({ retainLogs: false });

logger.log('This log message will not be retained in memory.');
logger.warn('This warning message will also not be retained.');
```

### Default log levels for attaching and detaching

When attaching a stream or console without specifying log levels, all will be attached. Likewise, when detaching, the stream or console will be completly removed.

## FAQs

None yet!
