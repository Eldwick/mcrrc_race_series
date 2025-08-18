// GET /api/courses - Get all race courses with statistics
// POST /api/courses - Create a new race course

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from '../../lib/db/connection';

// Enable CORS for API routes
function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getSql();

  try {
    if (req.method === 'GET') {
      // Get all race courses with statistics
      const courses = await sql`
        SELECT 
          rc.id,
          rc.name,
          rc.short_name,
          rc.location,
          rc.typical_distance,
          rc.course_type,
          rc.established_year,
          rc.description,
          rc.is_active,
          rc.created_at,
          rc.updated_at,
          COUNT(DISTINCT r.year) as years_held,
          COUNT(DISTINCT r.id) as total_races,
          MIN(r.year) as first_year,
          MAX(r.year) as last_year,
          COUNT(rr.id) as total_participants
        FROM race_courses rc
        LEFT JOIN races r ON rc.id = r.race_course_id
        LEFT JOIN race_results rr ON r.id = rr.race_id AND rr.is_dnf = false AND rr.is_dq = false
        WHERE rc.is_active = true
        GROUP BY rc.id, rc.name, rc.short_name, rc.location, rc.typical_distance, 
                 rc.course_type, rc.established_year, rc.description, rc.is_active, 
                 rc.created_at, rc.updated_at
        ORDER BY rc.name
      ` as any[];

      // Transform to frontend format
      const transformedCourses = courses.map((course: any) => ({
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
        statistics: {
          yearsHeld: parseInt(course.years_held) || 0,
          totalRaces: parseInt(course.total_races) || 0,
          firstYear: course.first_year,
          lastYear: course.last_year,
          totalParticipants: parseInt(course.total_participants) || 0
        }
      }));

      return res.status(200).json({
        success: true,
        data: transformedCourses,
        count: transformedCourses.length
      });
      
    } else if (req.method === 'POST') {
      // Create a new race course
      const { 
        name, 
        shortName, 
        location, 
        typicalDistance, 
        courseType = 'road', 
        establishedYear, 
        description 
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Course name is required'
        });
      }

      const result = await sql`
        INSERT INTO race_courses (
          name, 
          short_name, 
          location, 
          typical_distance, 
          course_type, 
          established_year, 
          description
        )
        VALUES (
          ${name}, 
          ${shortName || null}, 
          ${location || null}, 
          ${typicalDistance || null}, 
          ${courseType}, 
          ${establishedYear || null}, 
          ${description || null}
        )
        RETURNING *
      ` as any[];

      const newCourse = result[0];

      return res.status(201).json({
        success: true,
        data: {
          id: newCourse.id,
          name: newCourse.name,
          shortName: newCourse.short_name,
          location: newCourse.location,
          typicalDistance: newCourse.typical_distance,
          courseType: newCourse.course_type,
          establishedYear: newCourse.established_year,
          description: newCourse.description,
          isActive: newCourse.is_active,
          createdAt: newCourse.created_at,
          updatedAt: newCourse.updated_at
        },
        message: 'Race course created successfully'
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
