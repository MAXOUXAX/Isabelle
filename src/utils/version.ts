import { createRequire } from 'node:module';
import { environment } from './environment.js';

const require = createRequire(import.meta.url);

// In development, the package.json file will be in ../../package.json
// In production, it will be in ./package.json (since the index.mjs and package.json files will be in the root)
const packageJsonPath =
  environment === 'development' ? '../../package.json' : './package.json';
const packageJson = require(packageJsonPath) as { version: string };

/**
 * The current version of the bot, read from package.json.
 */
export const version = packageJson.version;
