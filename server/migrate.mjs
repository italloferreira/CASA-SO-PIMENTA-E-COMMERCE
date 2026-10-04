#!/usr/bin/env node
import dotenv from 'dotenv';
import { createTables } from './src/database/schema.js';
import { seedDatabase } from './src/database/seed.js';

dotenv.config();

async function main() {
  try {
    console.log('[migrate] Running createTables()...');
    await createTables();
    console.log('[migrate] createTables() OK');

    console.log('[migrate] Running seedDatabase()...');
    await seedDatabase();
    console.log('[migrate] seedDatabase() OK');

    console.log('[migrate] DONE');
    process.exit(0);
  } catch (err) {
    console.error('[migrate] ERROR:', err);
    process.exit(1);
  }
}

main();