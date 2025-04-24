import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';

function connect() {
  if (!process.env.DB_FILE_NAME) {
    throw new Error('DB_FILE_NAME is not set in the environment variables');
  }
  return drizzle(process.env.DB_FILE_NAME);
}

export const db = connect();
