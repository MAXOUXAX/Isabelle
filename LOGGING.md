# Logging System

Isabelle uses [Winston](https://github.com/winstonjs/winston) for structured logging. This replaces the previous `console.log` statements with a professional logging solution.

## Features

- **File Logging**: Logs are saved to rotating files in the `logs/` directory
- **Multiple Log Levels**: `error`, `warn`, `info`, `debug`
- **Structured Output**: Consistent timestamp and level formatting
- **Development Mode**: Enhanced debug logging when `NODE_ENV=development`
- **Log Rotation**: Automatic file rotation (5MB max, 5 files retained)
- **Colorized Console**: Pretty colored output in development

## Log Files

- `logs/isabelle.log` - All log messages
- `logs/error.log` - Error messages only  
- `logs/debug.log` - Debug messages (development mode only)

## Usage

```typescript
import { logger } from '@/utils/logger.js';

// Different log levels
logger.error('Error message', errorObject);
logger.warn('Warning message');
logger.info('Info message');  
logger.debug('Debug message'); // Only shows in development
```

## Log Levels

- **error**: Errors and exceptions
- **warn**: Warnings and potential issues
- **info**: General informational messages (default in production)
- **debug**: Detailed debugging info (only in development mode)

The system automatically adjusts log levels:
- **Production**: `info` level and above
- **Development**: `debug` level and above