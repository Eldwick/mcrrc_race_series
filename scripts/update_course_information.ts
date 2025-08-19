#!/usr/bin/env tsx
/**
 * Update Course Information Script
 * 
 * Updates race course locations and descriptions based on COURSE_INFORMATION data
 */

import 'dotenv/config';
import { getSql } from '../lib/db/connection.js';

const COURSE_INFORMATION = [
  {
    courseName: 'Kemp Mill (C)hills 10k',
    location: 'Silver Spring, MD',
    description: 'This race takes place in Silver Spring, MD, starting at Kemp Mill Elementary School. The course is known for its challenging hills, providing a rigorous workout for participants.'
  },
  {
    courseName: 'Piece of Cake 10k',
    location: 'Potomac, MD',
    description: 'Held annually in March, this race celebrates MCRRC\'s birthday. The course is typically set in a scenic park, offering a mix of flat and rolling terrains suitable for runners of all levels.'
  },
  {
    courseName: 'Capital for a Day 5k',
    location: 'Poolesville, MD',
    description: 'This 5K race is part of MCRRC\'s Championship Series. The course is designed to be fast and flat, making it ideal for setting personal records.'
  },
  {
    courseName: 'Memorial Day 4 Miler',
    location: 'Rockville, MD',
    description: 'Scheduled on Memorial Day, this 4-mile race honors the holiday with a course that winds through local neighborhoods, featuring moderate hills and a festive atmosphere.'
  },
  {
    courseName: 'Midsummer Night\'s Mile',
    location: 'Gaithersburg, MD',
    description: 'An evening track event held in July, this race consists of multiple heats to accommodate runners of varying speeds. It\'s a great opportunity for participants to test their mile time in a supportive environment.'
  },
  {
    courseName: 'Riley\'s Rumble Half Marathon',
    location: 'Boyds/Dickerson, MD',
    description: 'Known for its challenging hills and summer heat, this half marathon is not for the faint of heart. The course traverses rural roads, offering scenic views and a true test of endurance.'
  },
  {
    courseName: 'Going Green Track Meet 2 miler',
    location: 'Gaithersburg, MD',
    description: 'This event is part of MCRRC\'s track meet series, featuring a 2-mile race on the track. It\'s an excellent opportunity for runners to experience track racing in a friendly setting.'
  },
  {
    courseName: 'Matthew Henson Trail 5k',
    location: 'Silver Spring, MD',
    description: 'Held on the Matthew Henson Trail in Silver Spring, MD, this 5K race offers a scenic route through wooded areas, providing a mix of paved and natural surfaces.'
  },
  {
    courseName: 'Eastern County 8k',
    location: 'Silver Spring, MD',
    description: 'This 8K race takes place in the eastern part of Montgomery County, featuring a course that includes both road and trail sections, offering a diverse running experience.'
  },
  {
    courseName: 'Country Road 5k',
    location: 'Dickerson, MD',
    description: 'Set at Calleva Farm in Dickerson, MD, this race offers views of horses, hayfields, and a big red barn, truly embodying a "country road run."'
  },
  {
    courseName: 'Turkey Burnoff 10m',
    location: 'Gaithersburg, MD',
    description: 'Work off those extra holiday calories at one of MCRRC\'s most popular club races at Seneca Creek State Park in Gaithersburg. The course features rolling hills, a dam crossing, and scenic park roads (double loop for 10 miles). Due to limited parking, all runners need to be in the park by 7:50 AM.'
  },
  {
    courseName: 'Jingle Bell Jog 8k',
    location: 'Rockville, MD',
    description: 'Set for December at the Rockville Senior Center, this 8K course winds through quiet residential neighborhoods, offering a festive atmosphere to close out the racing year. Participants are encouraged to dress in holiday attire for this generally flat, accessible course.'
  }
];

async function updateCourseInformation(): Promise<void> {
  console.log('🏃 Starting Course Information Update');
  console.log('=' .repeat(50));
  
  const sql = getSql();
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  try {
    for (const courseInfo of COURSE_INFORMATION) {
      console.log(`\n📍 Processing: ${courseInfo.courseName}`);
      
      try {
        // Find the course by name
        const existingCourse = await sql`
          SELECT id, name, location, description 
          FROM race_courses 
          WHERE name = ${courseInfo.courseName}
          AND is_active = true
        ` as any[];
        
        if (existingCourse.length === 0) {
          console.log(`   ⚠️  Course not found in database: ${courseInfo.courseName}`);
          notFound++;
          continue;
        }
        
        const course = existingCourse[0];
        console.log(`   ✓ Found course ID: ${course.id}`);
        
        // Check if update is needed
        const needsUpdate = (
          course.location !== courseInfo.location || 
          course.description !== courseInfo.description
        );
        
        if (!needsUpdate) {
          console.log(`   ✓ Course information already up to date`);
          continue;
        }
        
        // Show what will be updated
        if (course.location !== courseInfo.location) {
          console.log(`   📍 Location: "${course.location}" → "${courseInfo.location}"`);
        }
        if (course.description !== courseInfo.description) {
          console.log(`   📝 Description updated (${courseInfo.description.length} chars)`);
        }
        
        // Update the course
        await sql`
          UPDATE race_courses
          SET 
            location = ${courseInfo.location},
            description = ${courseInfo.description},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${course.id}
        `;
        
        console.log(`   ✅ Successfully updated`);
        updated++;
        
      } catch (error) {
        console.error(`   ❌ Error updating ${courseInfo.courseName}:`, error);
        errors++;
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error during update:', error);
    process.exit(1);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Update Summary:');
  console.log(`   ✅ Updated: ${updated} courses`);
  console.log(`   ⚠️  Not found: ${notFound} courses`);
  console.log(`   ❌ Errors: ${errors} courses`);
  console.log(`   📝 Total processed: ${COURSE_INFORMATION.length} courses`);
  
  if (notFound > 0) {
    console.log('\n🔍 Courses not found in database:');
    for (const courseInfo of COURSE_INFORMATION) {
      const existingCourse = await sql`
        SELECT id FROM race_courses 
        WHERE name = ${courseInfo.courseName} AND is_active = true
      ` as any[];
      if (existingCourse.length === 0) {
        console.log(`   - ${courseInfo.courseName}`);
      }
    }
  }
  
  console.log('\n✨ Course information update complete!');
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateCourseInformation()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { updateCourseInformation };