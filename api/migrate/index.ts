// POST /api/migrate - Run database migrations
// This endpoint allows you to run migrations after deployment

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Simple security - in production you'd want proper auth
const MIGRATION_SECRET = process.env.MIGRATION_SECRET || 'dev-migration-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Simple authentication
    const { secret } = req.body;
    if (secret !== MIGRATION_SECRET) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - invalid secret'
      });
    }

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL environment variable not set'
      });
    }

    // Run migrations
    console.log('Starting database migrations...');
    const { stdout, stderr } = await execAsync('npm run migrate', {
      cwd: process.cwd(),
      env: { ...process.env }
    });

    console.log('Migration stdout:', stdout);
    if (stderr) {
      console.log('Migration stderr:', stderr);
    }

    return res.status(200).json({
      success: true,
      message: 'Migrations completed successfully',
      output: stdout,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Migration error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
