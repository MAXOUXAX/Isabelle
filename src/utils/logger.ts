import fs from 'fs';
import path from 'path';
import pino from 'pino';

/**
 * Rotates the current log file to a dated archive folder
 */
function rotateLogFile(logsDir: string, currentLogPath: string): void {
  if (!fs.existsSync(currentLogPath)) {
    return;
  }

  const now = new Date();
  const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0]; // YYYY-MM-DDTHH-MM-SS

  const archiveDir = path.join(logsDir, dateFolder);
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const archivedLogPath = path.join(archiveDir, `${timestamp}.log`);

  try {
    fs.renameSync(currentLogPath, archivedLogPath);
  } catch (error) {
    console.error('Failed to rotate log file:', error);
  }
}

/**
 * Initialize logging system with automatic log rotation
 */
function initializeLogging() {
  const logsDir = path.join(process.cwd(), 'logs');

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const currentLogPath = path.join(logsDir, 'latest.log');

  // Rotate existing log file if it exists
  rotateLogFile(logsDir, currentLogPath);

  const baseLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

  // Create file logger with clean output
  const fileTransport: pino.DestinationStream = pino.transport({
    target: 'pino/file',
    options: {
      destination: currentLogPath,
      mkdir: true,
    },
  }) as pino.DestinationStream;

  // Create console logger with pretty printing
  const consoleTransport: pino.DestinationStream = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname,prefix',
      messageFormat: '{if prefix}[{prefix}]{end} {msg}',
    },
  }) as pino.DestinationStream;

  // Create multistream for both file and console
  // Set level on each stream to control which messages go where
  const streams = [
    { stream: fileTransport },
    { stream: consoleTransport, level: baseLevel },
  ];

  return pino(
    {
      level: baseLevel,
    },
    pino.multistream(streams),
  );
}

// Initialize the base logger
const baseLogger = initializeLogging();

/**
 * Creates a logger instance with a specific prefix
 * @param prefix - The prefix to use for all log messages (e.g., module name)
 * @returns A Pino logger instance with the prefix as context
 */
export function createLogger(prefix: string) {
  return baseLogger.child({ prefix });
}
