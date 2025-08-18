// GET /api/courses/[id] - Get race course details with all years of races
// PUT /api/courses/[id] - Update race course
// DELETE /api/courses/[id] - Delete race course

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from '../../../lib/db/connection';

// Enable CORS for API routes
function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const courseId = req.query.id as string;
  
  if (!courseId) {
    return res.status(400).json({
      success: false,
      error: 'Course ID is required'
    });
  }

  const sql = getSql();

  try {
    if (req.method === 'GET') {
      // Get course details
      const courseResult = await sql`
        SELECT * FROM race_courses WHERE id = ${courseId} AND is_active = true
      ` as any[];

      if (courseResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Race course not found'
        });
      }

      const course = courseResult[0];

      // Get all races for this course
      const races = await sql`
        SELECT 
          r.*,
          COUNT(rr.id) as participant_count,
          MIN(rr.gun_time)::text as fastest_time
        FROM races r
        LEFT JOIN race_results rr ON r.id = rr.race_id 
          AND rr.is_dnf = false AND rr.is_dq = false
        WHERE r.race_course_id = ${courseId}
        GROUP BY r.id, r.series_id, r.name, r.date, r.year, r.distance_miles, 
                 r.location, r.course_type, r.mcrrc_url, r.results_scraped_at, 
                 r.notes, r.created_at, r.updated_at, r.race_course_id, r.planned_race_id
        ORDER BY r.year DESC, r.date DESC
      ` as any[];

      // Get course records
      const records = await sql`
        WITH course_best_times AS (
          SELECT 
            r.year,
            r.name as race_name,
            r.date as race_date,
            runners.first_name,
            runners.last_name,
            runners.gender,
            sr.age_group,
            rr.gun_time::text as gun_time,
            rr.place,
            ROW_NUMBER() OVER (ORDER BY rr.gun_time) as overall_rank,
            ROW_NUMBER() OVER (PARTITION BY runners.gender ORDER BY rr.gun_time) as gender_rank
          FROM races r
          JOIN race_results rr ON r.id = rr.race_id
          JOIN series_registrations sr ON rr.series_registration_id = sr.id
          JOIN runners ON sr.runner_id = runners.id
          WHERE r.race_course_id = ${courseId}
            AND rr.is_dnf = false AND rr.is_dq = false
        )
        SELECT *,
          CASE 
            WHEN overall_rank = 1 THEN 'Course Record'
            WHEN gender_rank = 1 THEN CONCAT(gender, ' Course Record')
            ELSE NULL 
          END as record_type
        FROM course_best_times
        WHERE overall_rank <= 10 OR gender_rank <= 3
        ORDER BY overall_rank
      ` as any[];

      // Transform data
      const transformedCourse = {
        id: course.id,
        name: course.name,
        shortName: course.short_name,
        location: course.location,
        typicalDistance: course.typical_distance,
        courseType: course.course_type,
        establishedYear: course.established_year,
        description: course.description,
        isActive: course.is_active,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
        races: races.map((race: any) => ({
          id: race.id,
          name: race.name,
          date: race.date,
          year: race.year,
          distanceMiles: race.distance_miles,
          location: race.location,
          mcrrcUrl: race.mcrrc_url,
          participantCount: parseInt(race.participant_count) || 0,
          fastestTime: race.fastest_time,
          createdAt: race.created_at,
          updatedAt: race.updated_at
        })),
        records: records.map((record: any) => ({
          year: record.year,
          raceName: record.race_name,
          raceDate: record.race_date,
          firstName: record.first_name,
          lastName: record.last_name,
          gender: record.gender,
          ageGroup: record.age_group,
          gunTime: record.gun_time,
          place: record.place,
          overallRank: record.overall_rank,
          genderRank: record.gender_rank,
          recordType: record.record_type
        })),
        statistics: {
          yearsHeld: races.length > 0 ? new Set(races.map((r: any) => r.year)).size : 0,
          totalRaces: races.length,
          totalParticipants: races.reduce((sum: number, race: any) => sum + (parseInt(race.participant_count) || 0), 0),
          firstYear: races.length > 0 ? Math.min(...races.map((r: any) => r.year)) : null,
          lastYear: races.length > 0 ? Math.max(...races.map((r: any) => r.year)) : null
        }
      };

      return res.status(200).json({
        success: true,
        data: transformedCourse
      });

    } else if (req.method === 'PUT') {
      // Update race course
      const { 
        name, 
        shortName, 
        location, 
        typicalDistance, 
        courseType, 
        establishedYear, 
        description,
        isActive 
      } = req.body;

      const result = await sql`
        UPDATE race_courses SET
          name = ${name},
          short_name = ${shortName || null},
          location = ${location || null},
          typical_distance = ${typicalDistance || null},
          course_type = ${courseType || 'road'},
          established_year = ${establishedYear || null},
          description = ${description || null},
          is_active = ${isActive !== undefined ? isActive : true},
          updated_at = NOW()
        WHERE id = ${courseId}
        RETURNING *
      ` as any[];

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Race course not found'
        });
      }

      const updatedCourse = result[0];

      return res.status(200).json({
        success: true,
        data: {
          id: updatedCourse.id,
          name: updatedCourse.name,
          shortName: updatedCourse.short_name,
          location: updatedCourse.location,
          typicalDistance: updatedCourse.typical_distance,
          courseType: updatedCourse.course_type,
          establishedYear: updatedCourse.established_year,
          description: updatedCourse.description,
          isActive: updatedCourse.is_active,
          createdAt: updatedCourse.created_at,
          updatedAt: updatedCourse.updated_at
        },
        message: 'Race course updated successfully'
      });

    } else if (req.method === 'DELETE') {
      // Soft delete race course (set is_active = false)
      const result = await sql`
        UPDATE race_courses SET 
          is_active = false,
          updated_at = NOW()
        WHERE id = ${courseId}
        RETURNING id
      ` as any[];

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Race course not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Race course deleted successfully'
      });
      
    } else {
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
