#!/usr/bin/env tsx
/**
 * Reset Database Script
 * 
 * Executes the reset database SQL to wipe everything clean
 */

import { getSql } from '../lib/db/connection';
import { readFileSync } from 'fs';
import { join } from 'path';

async function resetDatabase() {
  console.log('🗑️  Resetting database to clean state...');
  
  try {
    const sql = getSql();
    
    // Read the reset SQL file
    const resetSql = readFileSync(
      join(process.cwd(), 'migrations', '1755199033000_reset-database.sql'), 
      'utf8'
    );
    
    // Split on semicolons and execute each statement
    const statements = resetSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📄 Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`   🔄 ${statement.substring(0, 50)}...`);
        await sql.unsafe(statement);
      }
    }
    
    console.log('✅ Database reset complete!');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase();
}
