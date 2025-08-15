// Database connection configuration for Neon PostgreSQL
import { neon } from '@neondatabase/serverless';

let cachedSql: ReturnType<typeof neon> | null = null;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  if (!cachedSql) cachedSql = neon(url);
  return cachedSql;
}

// Optional helper that does not throw when URL is missing
export function tryGetSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!cachedSql) cachedSql = neon(url);
  return cachedSql;
}

// Test connection function
export async function testConnection() {
  try {
    const sql = getSql();
    const result = await sql`SELECT current_timestamp`;
    console.log('Database connected successfully:', result[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
