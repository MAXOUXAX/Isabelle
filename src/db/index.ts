import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

function connect() {
  if (!process.env.DB_FILE_NAME) {
    throw new Error('DB_FILE_NAME is not set in the environment variables');
  }

  return drizzle(process.env.DB_FILE_NAME, {
    schema,
  });
}

export const db = connect();
export type Database = typeof db;
