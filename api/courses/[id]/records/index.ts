// GET /api/courses/[id]/records - Get course records for a specific race course

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from '../../../../lib/db/connection.js';

// Enable CORS for API routes
function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
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
    // Verify course exists
    const courseExists = await sql`
      SELECT id FROM race_courses WHERE id = ${courseId} AND is_active = true
    ` as any[];

    if (courseExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Race course not found'
      });
    }

    // Get course records with detailed information
    const records = await sql`
      WITH course_best_times AS (
        SELECT 
          r.year,
          r.name as race_name,
          r.date as race_date,
          r.distance_miles,
          runners.id as runner_id,
          runners.first_name,
          runners.last_name,
          runners.gender,
          sr.age_group,
          sr.age,
          rr.gun_time::text as gun_time,
          rr.chip_time::text as chip_time,
          rr.place,
          rr.place_gender,
          rr.place_age_group,
          sr.bib_number
        FROM races r
        JOIN race_results rr ON r.id = rr.race_id
        JOIN series_registrations sr ON rr.series_registration_id = sr.id
        JOIN runners ON sr.runner_id = runners.id
        WHERE r.race_course_id = ${courseId}
          AND rr.is_dnf = false AND rr.is_dq = false
      ),
      ranked_records AS (
        SELECT *,
          ROW_NUMBER() OVER (ORDER BY gun_time) as overall_rank,
          ROW_NUMBER() OVER (PARTITION BY gender ORDER BY gun_time) as gender_rank,
          ROW_NUMBER() OVER (PARTITION BY age_group, gender ORDER BY gun_time) as age_group_rank
        FROM course_best_times
      )
      SELECT *,
        CASE 
          WHEN overall_rank = 1 THEN 'Overall Course Record'
          WHEN gender_rank = 1 THEN CONCAT(
            CASE WHEN gender = 'M' THEN 'Men''s' ELSE 'Women''s' END, 
            ' Course Record'
          )
          WHEN age_group_rank = 1 THEN CONCAT(
            CASE WHEN gender = 'M' THEN 'Men''s' ELSE 'Women''s' END,
            ' ', age_group, ' Course Record'
          )
          ELSE NULL 
        END as record_type
      FROM ranked_records
      WHERE overall_rank <= 20 OR gender_rank <= 10 OR age_group_rank <= 3
      ORDER BY overall_rank, gender, age_group
    ` as any[];

    // Also get personal records (PRs) summary
    const personalRecords = await sql`
      WITH runner_course_prs AS (
        SELECT 
          runners.id as runner_id,
          runners.first_name,
          runners.last_name,
          runners.gender,
          COUNT(*) as times_run,
          MIN(rr.gun_time) as personal_best,
          MAX(rr.gun_time) as personal_worst,
          AVG(EXTRACT(EPOCH FROM rr.gun_time)) as avg_time_seconds,
          MIN(r.year) as first_year,
          MAX(r.year) as last_year
        FROM races r
        JOIN race_results rr ON r.id = rr.race_id
        JOIN series_registrations sr ON rr.series_registration_id = sr.id
        JOIN runners ON sr.runner_id = runners.id
        WHERE r.race_course_id = ${courseId}
          AND rr.is_dnf = false AND rr.is_dq = false
        GROUP BY runners.id, runners.first_name, runners.last_name, runners.gender
        HAVING COUNT(*) >= 2  -- Only runners who have run the course multiple times
      )
      SELECT *,
        personal_best::text as personal_best_text,
        personal_worst::text as personal_worst_text,
        EXTRACT(EPOCH FROM personal_best) as pb_seconds,
        EXTRACT(EPOCH FROM personal_worst) as pw_seconds
      FROM runner_course_prs
      ORDER BY personal_best
      LIMIT 50
    ` as any[];

    const transformedRecords = records.map((record: any) => ({
      year: record.year,
      raceName: record.race_name,
      raceDate: record.race_date,
      distanceMiles: record.distance_miles,
      runner: {
        id: record.runner_id,
        firstName: record.first_name,
        lastName: record.last_name,
        gender: record.gender,
        age: record.age,
        ageGroup: record.age_group,
        bibNumber: record.bib_number
      },
      results: {
        gunTime: record.gun_time,
        chipTime: record.chip_time,
        place: record.place,
        placeGender: record.place_gender,
        placeAgeGroup: record.place_age_group
      },
      rankings: {
        overallRank: record.overall_rank,
        genderRank: record.gender_rank,
        ageGroupRank: record.age_group_rank
      },
      recordType: record.record_type
    }));

    const transformedPersonalRecords = personalRecords.map((pr: any) => ({
      runner: {
        id: pr.runner_id,
        firstName: pr.first_name,
        lastName: pr.last_name,
        gender: pr.gender
      },
      statistics: {
        timesRun: pr.times_run,
        personalBest: pr.personal_best_text,
        personalWorst: pr.personal_worst_text,
        averageTime: Math.round(pr.avg_time_seconds),
        firstYear: pr.first_year,
        lastYear: pr.last_year,
        improvement: pr.pw_seconds - pr.pb_seconds  // Seconds improved from worst to best
      }
    }));

    return res.status(200).json({
      success: true,
      data: {
        courseRecords: transformedRecords,
        personalRecords: transformedPersonalRecords,
        summary: {
          totalRecords: transformedRecords.length,
          totalRunnersWithMultipleAttempts: transformedPersonalRecords.length
        }
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
