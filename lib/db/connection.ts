// Database connection configuration for Neon PostgreSQL
import { neon } from '@neondatabase/serverless';

// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create database connection
export const sql = neon(databaseUrl);

// Test connection function
export async function testConnection() {
  try {
    const result = await sql`SELECT current_timestamp`;
    console.log('Database connected successfully:', result[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
