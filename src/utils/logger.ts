import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create the base logger configuration
const baseLoggerConfig = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  formatters: {
    time: () => `,"time":"${new Date().toISOString().replace('T', ' ').slice(0, -5)}"`
  }
};

// Create the main logger instance for file logging
const fileLogger = pino(
  baseLoggerConfig,
  pino.multistream([
    { 
      stream: pino.destination({
        dest: path.join(logsDir, 'isabelle.log'),
        sync: false
      })
    },
    { 
      stream: pino.destination({
        dest: path.join(logsDir, 'error.log'),
        sync: false
      }), 
      level: 'error' 
    },
    ...(process.env.NODE_ENV === 'development' 
      ? [{ 
          stream: pino.destination({
            dest: path.join(logsDir, 'debug.log'),
            sync: false
          }), 
          level: 'debug' 
        }]
      : []
    )
  ])
);

// Create the console logger for development with pretty printing
const consoleLogger = process.env.NODE_ENV === 'development' 
  ? pino({
      ...baseLoggerConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    })
  : null;

/**
 * Creates a logger instance for a specific module or file
 * @param name - The name of the module/file (will be used as prefix)
 * @returns A Pino logger instance with the name as context
 */
export function createLogger(name: string) {
  const childContext = { name };
  
  // Create child loggers that include the name context
  const fileChild = fileLogger.child(childContext);
  const consoleChild = consoleLogger?.child(childContext);
  
  // Create a combined logger that logs to both file and console
  return {
    debug: (message: string, ...args: any[]) => {
      fileChild.debug(message, ...args);
      consoleChild?.debug(message, ...args);
    },
    info: (message: string, ...args: any[]) => {
      fileChild.info(message, ...args);
      consoleChild?.info(message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      fileChild.warn(message, ...args);
      consoleChild?.warn(message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      fileChild.error(message, ...args);
      consoleChild?.error(message, ...args);
    }
  };
}

// Export a default logger for general use
export const logger = createLogger('main');