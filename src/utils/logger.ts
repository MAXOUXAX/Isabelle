import { createLogger, format, transports } from 'winston';
import path from 'path';

const { combine, timestamp, errors, printf, colorize } = format;

// Custom format for readable logs
const logFormat = printf(({ level, message, timestamp, stack }: {
  level: string;
  message: string;
  timestamp: string;
  stack?: string;
}) => {
  return `${timestamp} [${level}] ${stack ?? message}`;
});

// Create the logger instance
export const logger = createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console transport with colors for development
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      )
    }),
    // File transport for all logs
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'isabelle.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Separate error log file
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add development-only debug file logging
if (process.env.NODE_ENV === 'development') {
  logger.add(new transports.File({
    filename: path.join(process.cwd(), 'logs', 'debug.log'),
    level: 'debug',
    maxsize: 5242880, // 5MB
    maxFiles: 3
  }));
}