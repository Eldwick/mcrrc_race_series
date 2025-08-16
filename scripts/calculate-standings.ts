#!/usr/bin/env tsx
/**
 * Calculate MCRRC Championship Series Standings
 * 
 * This script calls the standings calculation API to generate the leaderboard data.
 * Must be run after races have been scraped to see results on the leaderboard.
 * 
 * Usage:
 *   npm run calculate:standings
 *   npx tsx scripts/calculate-standings.ts
 */

// Default series ID - MCRRC Championship Series 2025
const DEFAULT_SERIES_ID = 'f75a7257-ad21-495c-a127-69240dd0193d';
const TARGET_YEAR = 2025;

async function calculateStandings(baseUrl: string = 'http://localhost:3000'): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('🏆 Initiating MCRRC Championship Series Standings Calculation...');
    console.log(`📊 Series ID: ${DEFAULT_SERIES_ID}`);
    console.log(`📅 Year: ${TARGET_YEAR}`);
    console.log(`🌐 API URL: ${baseUrl}/api/standings/calculate`);
    console.log('');

    console.log('⏳ Starting calculation (this may take a while for large datasets)...');
    console.log('💡 Watch the server logs for detailed progress information');
    console.log('');

    // Add timeout for long-running calculations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 300000); // 5 minute timeout

    const requestStart = Date.now();
    const response = await fetch(`${baseUrl}/api/standings/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seriesId: DEFAULT_SERIES_ID,
        year: TARGET_YEAR
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const requestTime = Date.now() - requestStart;

    console.log(`📡 API request completed in ${requestTime}ms (${Math.round(requestTime/1000)}s)`);

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status}:`);
      console.error(`   Status: ${response.statusText}`);
      console.error(`   Error: ${data.error || 'Unknown error'}`);
      
      if (data.message) {
        console.error(`   Details: ${data.message}`);
      }
      
      throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }

    if (!data.success) {
      console.error('❌ API returned failure response:');
      console.error(`   Error: ${data.error || 'Unknown error'}`);
      if (data.message) {
        console.error(`   Message: ${data.message}`);
      }
      throw new Error(data.error || data.message || 'Calculation failed');
    }

    const totalTime = Date.now() - startTime;
    
    console.log('');
    console.log('🎉 CALCULATION COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(50));
    console.log(`📊 Series: ${data.data.seriesId}`);
    console.log(`📅 Year: ${data.data.year}`);  
    console.log(`🕐 Calculated at: ${new Date(data.data.calculatedAt).toLocaleString()}`);
    console.log(`⏱️  Total time: ${totalTime}ms (${Math.round(totalTime/1000)}s)`);
    console.log('');
    
    console.log('✅ NEXT STEPS:');
    console.log('   1. Check leaderboard: http://localhost:3000/leaderboard');
    console.log('   2. Verify standings look correct');
    console.log('   3. Test different filters (Overall vs Age Group)');
    console.log('   4. Check individual runner pages');
    console.log('');
    
    console.log('📋 MCRRC SCORING RULES APPLIED:');
    console.log('   • 10-9-8-7-6-5-4-3-2-1 points for top 10 M/F overall');
    console.log('   • 10-9-8-7-6-5-4-3-2-1 points for top 10 M/F in age group');
    console.log('   • Series score = sum of best Q races (Q = ceil(total_races/2))');
    console.log('   • Separate overall and age group category standings');
    console.log('   • Tie-breaking by races participated, then total time');

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error('');
    console.error('❌ CALCULATION FAILED');
    console.error('=' .repeat(30));
    console.error(`⏱️  Failed after: ${totalTime}ms (${Math.round(totalTime/1000)}s)`);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏰ Calculation timed out after 5 minutes');
        console.error('   This usually indicates:');
        console.error('   • Very large dataset (many runners/races)');
        console.error('   • Database performance issues');
        console.error('   • Server overload');
      } else {
        console.error(`💥 Error: ${error.message}`);
      }
    } else {
      console.error(`💥 Error: ${error}`);
    }
    
    console.error('');
    console.error('🩺 TROUBLESHOOTING STEPS:');
    console.error('   1. Check server is running: npm run dev');
    console.error('   2. Verify data exists: npm run diagnose:leaderboard');
    console.error('   3. Check server terminal for detailed logs');
    console.error('   4. Look for database connection issues');
    console.error('   5. Consider running with smaller dataset first');
    console.error('');
    console.error('📊 PERFORMANCE TIPS:');
    console.error('   • The optimized algorithm should handle 100+ runners efficiently');
    console.error('   • Pre-calculated rankings eliminate N+1 query problems');
    console.error('   • Batch processing provides progress updates');
    console.error('   • Check database indexes are in place');
    
    process.exit(1);
  }
}

// Run the calculation function if called directly
if (require.main === module) {
  // Parse command line args for custom base URL
  const args = process.argv.slice(2);
  const baseUrlArg = args.find(arg => arg.startsWith('--url='));
  const baseUrl = baseUrlArg ? baseUrlArg.split('=')[1] : 'http://localhost:3000';

  calculateStandings(baseUrl)
    .then(() => {
      console.log('✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Calculation script failed:', error);
      process.exit(1);
    });
}

export { calculateStandings };
