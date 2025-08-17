#!/usr/bin/env tsx

/**
 * Link Existing Races to Race Courses
 * 
 * This script links existing races in the database to the newly created race courses
 * based on name matching from the historical championship series data.
 */

import { getSql } from '../lib/db/connection.js';

// Race course mapping based on the historical data
const RACE_COURSE_MAPPINGS = [
  {
    courseName: 'Kemp Mill (C)hills 10k',
    matchKeywords: ['kemp mill', 'chill'],
    establishedYear: 2018
  },
  {
    courseName: 'Piece of Cake 10k', 
    matchKeywords: ['piece of cake', 'piece', 'cake'],
    establishedYear: 2000
  },
  {
    courseName: 'Capital for a Day 5k',
    matchKeywords: ['capital for a day', 'capital day', 'brookeville'],
    establishedYear: 2009
  },
  {
    courseName: 'Memorial Day 4 Miler',
    matchKeywords: ['memorial', 'kevin stoddard', 'superhero'],
    establishedYear: 2011
  },
  {
    courseName: 'Midsummer Night\'s Mile',
    matchKeywords: ['midsummer', 'night\'s mile', 'nights mile'],
    establishedYear: 2000
  },
  {
    courseName: 'Riley\'s Rumble Half Marathon',
    matchKeywords: ['riley', 'rumble'],
    establishedYear: 2000
  },
  {
    courseName: 'Going Green Track Meet 2 miler',
    matchKeywords: ['going green'],
    establishedYear: 2009
  },
  {
    courseName: 'Matthew Henson Trail 5k',
    matchKeywords: ['matthew henson', 'henson'],
    establishedYear: 2013
  },
  {
    courseName: 'Eastern County 8k',
    matchKeywords: ['eastern county'],
    establishedYear: 2013
  },
  {
    courseName: 'Country Road 5k',
    matchKeywords: ['country road'],
    establishedYear: 2000
  },
  {
    courseName: 'Turkey Burnoff 10m',
    matchKeywords: ['turkey burnoff', 'turkey'],
    establishedYear: 2000
  },
  {
    courseName: 'Jingle Bell Jog 8k',
    matchKeywords: ['jingle bell', 'jingle'],
    establishedYear: 2000
  }
];

async function linkRacesToCourses() {
  const sql = getSql();
  
  console.log('🔗 Linking existing races to race courses...\n');
  
  try {
    // First, get all race courses
    const courses = await sql`
      SELECT id, name, established_year FROM race_courses WHERE is_active = true
    ` as any[];
    
    console.log(`📋 Found ${courses.length} race courses`);
    
    // Get all races that don't have a course assigned yet
    const unlinkedRaces = await sql`
      SELECT id, name, year FROM races WHERE race_course_id IS NULL ORDER BY year DESC, name
    ` as any[];
    
    console.log(`🔍 Found ${unlinkedRaces.length} unlinked races\n`);
    
    if (unlinkedRaces.length === 0) {
      console.log('✅ All races are already linked to courses!');
      return;
    }
    
    let linkedCount = 0;
    let skippedCount = 0;
    
    // Process each unlinked race
    for (const race of unlinkedRaces) {
      console.log(`🏁 Processing: "${race.name}" (${race.year})`);
      
      let bestMatch: typeof RACE_COURSE_MAPPINGS[0] | null = null;
      let bestMatchScore = 0;
      
      // Try to match against each course mapping
      for (const mapping of RACE_COURSE_MAPPINGS) {
        // Skip if race year is before course was established
        if (race.year < mapping.establishedYear) {
          continue;
        }
        
        const raceName = race.name.toLowerCase();
        
        // Calculate match score based on keyword matches
        let matchScore = 0;
        for (const keyword of mapping.matchKeywords) {
          if (raceName.includes(keyword.toLowerCase())) {
            matchScore += keyword.length; // Longer keywords get higher scores
          }
        }
        
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatch = mapping;
        }
      }
      
      if (bestMatch && bestMatchScore > 0) {
        // Find the course ID
        const course = courses.find(c => c.name === bestMatch.courseName);
        
        if (course) {
          // Link the race to the course
          await sql`
            UPDATE races 
            SET race_course_id = ${course.id}, updated_at = NOW()
            WHERE id = ${race.id}
          `;
          
          console.log(`   ✅ Linked to: ${bestMatch.courseName} (score: ${bestMatchScore})`);
          linkedCount++;
        } else {
          console.log(`   ❌ Course not found: ${bestMatch.courseName}`);
          skippedCount++;
        }
      } else {
        console.log(`   ⏭️  No matching course found`);
        skippedCount++;
      }
    }
    
    console.log('\n📊 Linking Summary:');
    console.log(`   ✅ Races linked: ${linkedCount}`);
    console.log(`   ⏭️  Races skipped: ${skippedCount}`);
    console.log(`   📋 Total processed: ${unlinkedRaces.length}`);
    
    // Show final statistics
    const finalStats = await sql`
      SELECT 
        rc.name as course_name,
        COUNT(r.id) as race_count,
        MIN(r.year) as first_year,
        MAX(r.year) as last_year
      FROM race_courses rc
      LEFT JOIN races r ON rc.id = r.race_course_id
      GROUP BY rc.id, rc.name, rc.established_year
      ORDER BY rc.established_year, rc.name
    ` as any[];
    
    console.log('\n🏆 Final Course Statistics:');
    finalStats.forEach((stat: any) => {
      if (stat.race_count > 0) {
        console.log(`   ${stat.course_name}: ${stat.race_count} races (${stat.first_year}-${stat.last_year})`);
      } else {
        console.log(`   ${stat.course_name}: No races linked yet`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error linking races to courses:', error);
    throw error;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  linkRacesToCourses().catch(console.error);
}

export { linkRacesToCourses };
