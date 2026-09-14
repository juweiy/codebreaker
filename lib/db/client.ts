import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('Neon is not configured. Add DATABASE_URL to .env.local.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new DatabaseNotConfiguredError();
  return neon(databaseUrl);
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
