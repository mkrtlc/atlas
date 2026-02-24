import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { env } from './env';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Ensure the directory exists for the database file
const dbPath = env.DATABASE_URL;
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
// Enforce foreign key constraints (off by default in SQLite)
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);
