import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { TablesRelationalConfig } from 'drizzle-orm';
import * as schema from './schema';

/** Structural type satisfied by both the neon-http driver (prod) and PGlite (tests). */
export type DB = PgDatabase<PgQueryResultHKT, typeof schema, TablesRelationalConfig>;

let _db: DB | null = null;

export function getDb(): DB {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _db = drizzle(neon(url), { schema }) as unknown as DB;
  }
  return _db;
}
