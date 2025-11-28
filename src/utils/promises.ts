import { createLogger } from '@/utils/logger.js';

const logger = createLogger('promises-utils');

export function voidAndTrackError<T>(promise: Promise<T>): void {
  promise.catch((error: unknown) => {
    logger.error({ error }, 'Unhandled promise rejection');
  });
}
