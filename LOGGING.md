# Logging System

Isabelle uses [Pino](https://github.com/pinojs/pino) for structured, high-performance logging. This replaces the previous `console.log` statements with a professional logging solution that provides automatic module prefixing and eliminates the need for hardcoded bracketed names.

## Features

- **Individual Module Loggers**: Each module/file has its own logger with automatic prefixing
- **File Logging**: Logs are saved to rotating files in the `logs/` directory  
- **Multiple Log Levels**: `error`, `warn`, `info`, `debug`
- **Structured Output**: JSON format in files, pretty-printed in development console
- **Development Mode**: Enhanced debug logging and colorized console output when `NODE_ENV=development`
- **High Performance**: Pino is one of the fastest Node.js loggers available

## Log Files

- `logs/isabelle.log` - All log messages in JSON format
- `logs/error.log` - Error messages only in JSON format
- `logs/debug.log` - Debug messages in JSON format (development mode only)

## Usage

### Creating a Module Logger

```typescript
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('module-name');

// Use the logger - module name is automatically included
logger.info('Module initialized'); // Outputs: [INFO] (module-name): Module initialized
logger.error('Something went wrong', error);
logger.debug('Debug information');
```

### Log Levels

- **error**: Errors and exceptions
- **warn**: Warnings and potential issues
- **info**: General informational messages (default in production)
- **debug**: Detailed debugging info (only in development mode)

## Example Output

**Console (Development):**
```
[2025-09-23 15:05:51] INFO (core): Connected to Discord's Gateway! 🎉
[2025-09-23 15:05:51] INFO (modules): Initializing module Core
[2025-09-23 15:05:51] WARN (russian-roulette): Target not moderatable
[2025-09-23 15:05:51] ERROR (interactions): Failed to reply to interaction
```

**File (JSON):**
```json
{"level":30,"time":1758639951052,"name":"core","msg":"Connected to Discord's Gateway! 🎉"}
{"level":40,"time":1758639951052,"name":"russian-roulette","msg":"Target not moderatable"}
```

## Migration Benefits

- **Automatic prefixing**: No more hardcoded `[ModuleName]` brackets in log messages
- **Better performance**: Pino is significantly faster than Winston
- **Cleaner code**: Each module gets its own logger with automatic context
- **Structured data**: JSON logs are easily parseable by log analysis tools

The system automatically adjusts log levels:
- **Production**: `info` level and above
- **Development**: `debug` level and above with colorized console output