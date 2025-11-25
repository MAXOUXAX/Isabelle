import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version: string };

/**
 * The current version of the bot, read from package.json.
 */
export const version = packageJson.version;
