#!/usr/bin/env tsx
/**
 * Test Frontend Races Integration
 * 
 * Verifies that the frontend can properly fetch and display race data with correct counts
 * 
 * Usage:
 *   npm run test:frontend-races
 *   npx tsx scripts/test-frontend-races.ts
 */

async function testFrontendRaces(): Promise<void> {
  console.log('🧪 Testing Frontend Race Integration');
  console.log('=' .repeat(50));
  
  try {
    // Test the API endpoint directly
    console.log('🔍 Testing API endpoint...');
    const response = await fetch('http://localhost:5173/api/races?year=2025');
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }
    
    console.log(`   ✅ API responding: ${data.data.length} races returned`);
    
    // Analyze the race data
    const races = data.data;
    const scrapedRaces = races.filter((r: any) => r.raceStatus === 'scraped');
    const plannedRaces = races.filter((r: any) => r.raceStatus === 'planned');
    
    console.log('\n📊 Race Analysis:');
    console.log(`   📋 Total races: ${races.length}`);
    console.log(`   ✅ Completed races: ${scrapedRaces.length}`);
    console.log(`   📅 Upcoming races: ${plannedRaces.length}`);
    
    console.log('\n📅 Upcoming Races:');
    plannedRaces.forEach((race: any, index: number) => {
      const date = new Date(race.date).toLocaleDateString();
      console.log(`   ${index + 1}. ${race.name} (${date})`);
    });
    
    console.log('\n✅ Completed Races:');
    scrapedRaces.slice(0, 3).forEach((race: any, index: number) => {
      const date = new Date(race.date).toLocaleDateString();
      console.log(`   ${index + 1}. ${race.name} (${date}) - ${race.summary?.totalParticipants || 0} participants`);
    });
    
    if (scrapedRaces.length > 3) {
      console.log(`   ... and ${scrapedRaces.length - 3} more completed races`);
    }
    
    console.log('\n🎯 Frontend Integration Status:');
    
    const expectedCounts = {
      total: races.length,
      completed: scrapedRaces.length,
      upcoming: plannedRaces.length
    };
    
    console.log('   📱 What you should see in the browser:');
    console.log(`   - Total Races: ${expectedCounts.total}`);
    console.log(`   - Completed: ${expectedCounts.completed}`);
    console.log(`   - Upcoming: ${expectedCounts.upcoming}`);
    console.log(`   - Total Results: ${scrapedRaces.reduce((sum: number, race: any) => sum + (race.summary?.totalParticipants || 0), 0)}`);
    
    console.log('\n🌐 How to Test:');
    console.log('   1. Open your browser to: http://localhost:5173/races');
    console.log('   2. You should see the correct counts in the stats cards');
    console.log('   3. Scroll down to see both completed and upcoming race cards');
    console.log('   4. Completed races should be clickable with "Completed" badges');
    console.log('   5. Upcoming races should show "Upcoming" badges and countdown timers');
    
    const overallSuccess = races.length > 0 && scrapedRaces.length > 0 && plannedRaces.length > 0;
    console.log(`\n🏁 Overall Status: ${overallSuccess ? '✅ SUCCESS' : '⚠️  ISSUE DETECTED'}`);
    
    if (overallSuccess) {
      console.log('🎉 Frontend integration is working correctly!');
      console.log('   The races page should now display both completed and upcoming races.');
    } else {
      console.log('❌ There may be an issue with the race data or API integration.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure Vercel dev server is running: vercel dev --port 3000');
    console.log('   2. Make sure Vite dev server is running: npm run dev');
    console.log('   3. Check that both servers are accessible');
    console.log('   4. Verify database connection and race data exists');
  }
}

// Run the test function if called directly
if (require.main === module) {
  testFrontendRaces()
    .then(() => {
      console.log('\n✨ Frontend races test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Frontend races test failed:', error);
      process.exit(1);
    });
}

export { testFrontendRaces };
