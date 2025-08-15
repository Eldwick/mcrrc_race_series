// GET /api/health - Health check and database connectivity test

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { testConnection } from '../../lib/db/connection';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Test basic health
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      hasDatabase: !!process.env.DATABASE_URL
    };

    // Test database connection if DATABASE_URL exists
    if (process.env.DATABASE_URL) {
      try {
        await testConnection();
        health.database = 'connected';
      } catch (dbError) {
        health.database = 'error';
        health.databaseError = dbError instanceof Error ? dbError.message : 'Unknown database error';
      }
    } else {
      health.database = 'not_configured';
    }

    const statusCode = health.database === 'error' ? 503 : 200;

    return res.status(statusCode).json({
      success: health.database !== 'error',
      data: health
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
