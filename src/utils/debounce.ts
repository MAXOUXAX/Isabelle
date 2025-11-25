import { createLogger } from '@/utils/logger.js';

const logger = createLogger('debounce');

export type DebouncedFunction<Args extends unknown[]> = ((
  ...args: Args
) => void) & {
  cancel: () => void;
};

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void | Promise<void>,
  wait: number,
): DebouncedFunction<Args> {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = ((...args: Args) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      Promise.resolve(fn(...args)).catch((error: unknown) => {
        logger.error({ error }, 'Debounced function threw an error');
      });
    }, wait);
  }) as DebouncedFunction<Args>;

  debounced.cancel = () => {
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
}
