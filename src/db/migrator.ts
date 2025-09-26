import 'dotenv/config';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { existsSync } from 'fs';
import { db } from './index.js';

export async function runMigrations(): Promise<void> {
  try {
    console.log('🔄 Running database migrations...');
    
    // Try different possible locations for the migrations folder
    const possiblePaths = [
      './drizzle',           // From project root (production)
      '../drizzle',          // From dist/ directory
      '../../drizzle',       // From dist/db/ directory if needed
    ];
    
    let migrationsFolder = '';
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        migrationsFolder = path;
        break;
      }
    }
    
    if (!migrationsFolder) {
      throw new Error('Could not find migrations folder. Please ensure the drizzle folder exists.');
    }
    
    console.log(`📁 Using migrations folder: ${migrationsFolder}`);
    
    await migrate(db, {
      migrationsFolder,
    });
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Failed to run database migrations:', error);
    throw error;
  }
}