// Database utility functions for common operations
import { getSql } from './connection';

export interface DbRunner {
  id: string;
  bib_number: string;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F';
  age: number;
  age_group: string;
  club: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbRace {
  id: string;
  series_id: string;
  name: string;
  date: string;
  year: number;
  distance_miles: number;
  location: string;
  course_type: string;
  mcrrc_url: string;
  created_at: string;
  updated_at: string;
}

export interface DbRaceResult {
  id: string;
  race_id: string;
  runner_id: string;
  bib_number: string;
  place: number;
  place_gender: number;
  place_age_group: number;
  gun_time: string; // interval as string
  chip_time?: string;
  pace_per_mile: string;
  is_dnf: boolean;
  is_dq: boolean;
  override_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface DbSeriesStanding {
  id: string;
  series_id: string;
  runner_id: string;
  year: number;
  total_points: number;
  races_participated: number;
  overall_rank?: number;
  gender_rank?: number;
  age_group_rank?: number;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

// Runner operations
export async function getAllRunners(): Promise<any[]> {
  const sql = getSql();
  const result = await sql`
    SELECT DISTINCT ON (r.id)
      r.*,
      sr.bib_number,
      sr.age,
      sr.age_group,
      s.year,
      s.name as series_name,
      COALESCE(race_counts.race_count, 0) as race_count
    FROM runners r
    LEFT JOIN series_registrations sr ON r.id = sr.runner_id
    LEFT JOIN series s ON sr.series_id = s.id
    LEFT JOIN (
      SELECT 
        sr2.runner_id,
        COUNT(DISTINCT rr.race_id) as race_count
      FROM series_registrations sr2
      JOIN race_results rr ON sr2.id = rr.series_registration_id
      JOIN races ra ON rr.race_id = ra.id
      WHERE ra.year = EXTRACT(year FROM CURRENT_DATE)
      GROUP BY sr2.runner_id
    ) race_counts ON r.id = race_counts.runner_id
    WHERE r.is_active = true 
    ORDER BY r.id, s.year DESC, sr.created_at DESC
  `;
  return result as any[];
}

export async function getRunnerById(id: string): Promise<any | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT 
      r.*,
      sr.bib_number,
      sr.age,
      sr.age_group,
      s.year,
      s.name as series_name,
      COALESCE(race_counts.race_count, 0) as race_count
    FROM runners r
    LEFT JOIN series_registrations sr ON r.id = sr.runner_id
    LEFT JOIN series s ON sr.series_id = s.id
    LEFT JOIN (
      SELECT 
        sr2.runner_id,
        COUNT(DISTINCT rr.race_id) as race_count
      FROM series_registrations sr2
      JOIN race_results rr ON sr2.id = rr.series_registration_id
      JOIN races ra ON rr.race_id = ra.id
      WHERE ra.year = EXTRACT(year FROM CURRENT_DATE)
      GROUP BY sr2.runner_id
    ) race_counts ON r.id = race_counts.runner_id
    WHERE r.id = ${id} AND r.is_active = true
    ORDER BY s.year DESC, sr.created_at DESC
    LIMIT 1
  ` as any[];
  return rows[0] ?? null;
}

export async function getRunnerByBibNumber(bibNumber: string, seriesId?: string): Promise<any | null> {
  const sql = getSql();
  let query;
  
  if (seriesId) {
    query = sql`
      SELECT 
        r.*,
        sr.bib_number,
        sr.age,
        sr.age_group,
        s.year,
        s.name as series_name
      FROM runners r
      JOIN series_registrations sr ON r.id = sr.runner_id
      JOIN series s ON sr.series_id = s.id
      WHERE sr.bib_number = ${bibNumber} AND sr.series_id = ${seriesId} AND r.is_active = true
      LIMIT 1
    `;
  } else {
    // Get most recent registration for this bib number
    query = sql`
      SELECT 
        r.*,
        sr.bib_number,
        sr.age,
        sr.age_group,
        s.year,
        s.name as series_name
      FROM runners r
      JOIN series_registrations sr ON r.id = sr.runner_id
      JOIN series s ON sr.series_id = s.id
      WHERE sr.bib_number = ${bibNumber} AND r.is_active = true
      ORDER BY s.year DESC, sr.created_at DESC
      LIMIT 1
    `;
  }
  
  const rows = await query as any[];
  return rows[0] ?? null;
}

// Race operations
export async function getAllRaces(year?: number): Promise<DbRace[]> {
  const sql = getSql();
  if (year) {
    const result = await sql`
      SELECT * FROM races 
      WHERE year = ${year}
      ORDER BY date DESC
    `;
    return result as DbRace[];
  } else {
    const result = await sql`
      SELECT * FROM races 
      ORDER BY date DESC
    `;
    return result as DbRace[];
  }
}

export async function getRaceById(id: string): Promise<DbRace | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM races 
    WHERE id = ${id}
  ` as DbRace[];
  return rows[0] ?? null;
}

// Race results operations
export async function getRaceResults(raceId: string): Promise<any[]> {
  const sql = getSql();
  const result = await sql`
    SELECT 
      rr.*,
      r.first_name, 
      r.last_name, 
      r.gender, 
      sr.age_group,
      sr.age,
      sr.bib_number
    FROM race_results rr
    JOIN series_registrations sr ON rr.series_registration_id = sr.id
    JOIN runners r ON sr.runner_id = r.id
    WHERE rr.race_id = ${raceId}
    ORDER BY rr.place ASC
  `;
  return result as any[];
}

export async function getRunnerResults(runnerId: string, year?: number): Promise<any[]> {
  const sql = getSql();
  let query;
  if (year) {
    query = sql`
      SELECT 
        rr.*, 
        ra.name as race_name, 
        ra.date as race_date, 
        ra.distance_miles,
        sr.bib_number,
        sr.age,
        sr.age_group
      FROM race_results rr
      JOIN races ra ON rr.race_id = ra.id
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      WHERE sr.runner_id = ${runnerId} AND ra.year = ${year}
      ORDER BY ra.date DESC
    `;
  } else {
    query = sql`
      SELECT 
        rr.*, 
        ra.name as race_name, 
        ra.date as race_date, 
        ra.distance_miles,
        sr.bib_number,
        sr.age,
        sr.age_group
      FROM race_results rr
      JOIN races ra ON rr.race_id = ra.id
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      WHERE sr.runner_id = ${runnerId}
      ORDER BY ra.date DESC
    `;
  }
  
  const result = await query;
  return result as any[];
}

// Series standings operations
export async function getSeriesStandings(year: number, seriesId?: string): Promise<any[]> {
  const sql = getSql();
  let query;
  if (seriesId) {
    query = sql`
      SELECT 
        ss.*,
        r.first_name,
        r.last_name,
        r.gender,
        sr.age_group,
        sr.bib_number,
        sr.age
      FROM series_standings ss
      JOIN series_registrations sr ON ss.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE sr.series_id = ${seriesId}
      ORDER BY ss.total_points DESC, ss.races_participated DESC
    `;
  } else {
    query = sql`
      SELECT 
        ss.*,
        r.first_name,
        r.last_name,
        r.gender,
        sr.age_group,
        sr.bib_number,
        sr.age,
        s.name as series_name,
        s.year
      FROM series_standings ss
      JOIN series_registrations sr ON ss.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      JOIN series s ON sr.series_id = s.id
      WHERE s.year = ${year}
      ORDER BY ss.total_points DESC, ss.races_participated DESC
    `;
  }
  
  const result = await query;
  return result as any[];
}

// Get top race results (top 3 men and women) for a race
export async function getTopRaceResults(raceId: string): Promise<any[]> {
  const sql = getSql();
  const result = await sql`
    WITH ranked_results AS (
      SELECT 
        rr.*,
        r.first_name,
        r.last_name,
        r.gender,
        sr.age_group,
        sr.age,
        sr.bib_number,
        ROW_NUMBER() OVER (
          PARTITION BY r.gender 
          ORDER BY rr.place ASC
        ) as gender_rank
      FROM race_results rr
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE rr.race_id = ${raceId} 
        AND rr.is_dnf = false 
        AND rr.is_dq = false
    )
    SELECT * FROM ranked_results 
    WHERE gender_rank <= 3
    ORDER BY gender DESC, place ASC
  `;
  return result as any[];
}

// Get race results summary (participant counts, top performers)
export async function getRaceSummary(raceId: string): Promise<any> {
  const sql = getSql();
  
  // Get basic stats
  const statsResult = await sql`
    SELECT 
      COUNT(*) as total_participants,
      COUNT(*) FILTER (WHERE is_dnf = false AND is_dq = false) as completed,
      COUNT(*) FILTER (WHERE is_dnf = true OR is_dq = true) as dnf_dq
    FROM race_results 
    WHERE race_id = ${raceId}
  `;
  
  // Get top performers
  const topResults = await getTopRaceResults(raceId);
  
  const stats = statsResult[0] || { total_participants: 0, completed: 0, dnf_dq: 0 };
  
  return {
    totalParticipants: parseInt(stats.total_participants) || 0,
    completed: parseInt(stats.completed) || 0,
    dnfDq: parseInt(stats.dnf_dq) || 0,
    topResults: topResults
  };
}

// Utility functions for time conversion
export function intervalToSeconds(interval: string): number {
  // Convert PostgreSQL interval to seconds
  // Expected format: "00:25:30" or "01:05:45"
  const parts = interval.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

export function secondsToInterval(seconds: number): string {
  // Convert seconds to PostgreSQL interval format
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// MCRRC Championship Series Standings Calculation
export async function calculateMCRRCStandings(seriesId: string, year: number): Promise<void> {
  const sql = getSql();
  
  // First, get all races in the series for the year
  const races = await sql`
    SELECT id, name, date, distance_miles 
    FROM races 
    WHERE series_id = ${seriesId} AND year = ${year}
    ORDER BY date
  `;

  const totalSeriesRaces = (races as any[]).length;
  if (totalSeriesRaces === 0) return;

  const qualifyingRaces = Math.ceil(totalSeriesRaces / 2); // Q from MCRRC R1

  // Get all runners who participated in any race this year  
  const participants = await sql`
    SELECT DISTINCT 
      sr.runner_id,
      r.first_name,
      r.last_name, 
      r.gender,
      sr.age,
      sr.age_group,
      sr.series_id
    FROM series_registrations sr
    JOIN runners r ON sr.runner_id = r.id
    JOIN race_results rr ON sr.id = rr.series_registration_id
    JOIN races ra ON rr.race_id = ra.id
    WHERE sr.series_id = ${seriesId} AND ra.year = ${year}
  `;

  // Calculate standings for each participant
  for (const participant of participants as any[]) {
    // Get all race results for this runner
    const raceResults = await sql`
      SELECT 
        rr.*,
        ra.name as race_name,
        ra.distance_miles,
        ra.date as race_date
      FROM race_results rr
      JOIN races ra ON rr.race_id = ra.id  
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      WHERE sr.runner_id = ${participant.runner_id} 
        AND sr.series_id = ${seriesId}
        AND ra.year = ${year}
      ORDER BY ra.date
    `;

    // Calculate points for each race
    const racePointsArray: Array<{ overallPoints: number; ageGroupPoints: number; totalPoints: number }> = [];
    let totalDistance = 0;
    let totalTimeSeconds = 0;

    for (const result of raceResults as any[]) {
      // Calculate race-specific points based on placements
      const racePoints = await calculateRacePointsForResult(
        result.race_id,
        result.series_registration_id,
        participant.gender,
        participant.age_group
      );

      racePointsArray.push(racePoints);
      totalDistance += parseFloat(result.distance_miles) || 0;
      
      // Convert interval to seconds for total time
      if (result.gun_time) {
        totalTimeSeconds += intervalToSecondsFromDb(result.gun_time);
      }
    }

    // Calculate separate series standings for Overall and Age Group categories
    // MCRRC R5: Series score = sum of Q highest scores in EACH category separately
    
    // Overall category standings (based on overall points only)
    const overallRaces = [...racePointsArray].sort((a, b) => b.overallPoints - a.overallPoints);
    const topOverallRaces = overallRaces.slice(0, qualifyingRaces);
    const totalOverallPoints = topOverallRaces.reduce((sum, race) => sum + race.overallPoints, 0);
    
    // Age group category standings (based on age group points only) 
    const ageGroupRaces = [...racePointsArray].sort((a, b) => b.ageGroupPoints - a.ageGroupPoints);
    const topAgeGroupRaces = ageGroupRaces.slice(0, qualifyingRaces);
    const totalAgeGroupPoints = topAgeGroupRaces.reduce((sum, race) => sum + race.ageGroupPoints, 0);

    // Format total time back to interval format
    const totalTimeFormatted = secondsToInterval(totalTimeSeconds);

    // Get the series registration ID
    const seriesRegistrationResult = await sql`
      SELECT id FROM series_registrations 
      WHERE runner_id = ${participant.runner_id} AND series_id = ${seriesId} 
      LIMIT 1
    `;
    
    if ((seriesRegistrationResult as any[]).length === 0) continue; // Skip if no registration found
    
    const seriesRegistrationId = seriesRegistrationResult[0].id;

    // Update or insert series standings with separate overall and age group points
    await sql`
      INSERT INTO series_standings (
        series_registration_id,
        total_points,
        overall_points,
        age_group_points,
        races_participated,
        total_time,
        total_distance,
        last_calculated_at
      ) VALUES (
        ${seriesRegistrationId},
        ${totalOverallPoints}, -- Use overall points for backwards compatibility
        ${totalOverallPoints},
        ${totalAgeGroupPoints}, 
        ${(raceResults as any[]).length},
        ${totalTimeFormatted}::INTERVAL,
        ${totalDistance},
        NOW()
      )
      ON CONFLICT (series_registration_id) 
      DO UPDATE SET
        total_points = EXCLUDED.total_points,
        overall_points = EXCLUDED.overall_points,
        age_group_points = EXCLUDED.age_group_points,
        races_participated = EXCLUDED.races_participated,
        total_time = EXCLUDED.total_time,
        total_distance = EXCLUDED.total_distance,
        last_calculated_at = EXCLUDED.last_calculated_at
    `;
  }

  // Now calculate rankings within each category
  await calculateSeriesRankings(seriesId, year);
}

// Helper function to calculate points for a specific race result
async function calculateRacePointsForResult(
  raceId: string,
  seriesRegistrationId: string,
  gender: string,
  ageGroup: string
): Promise<{ overallPoints: number; ageGroupPoints: number; totalPoints: number }> {
  const sql = getSql();

  // Get overall gender placement (rank among all M or F in this race)
  const overallResult = await sql`
    WITH gender_rankings AS (
      SELECT 
        rr.series_registration_id,
        ROW_NUMBER() OVER (ORDER BY rr.place) as gender_place
      FROM race_results rr
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE rr.race_id = ${raceId} 
        AND r.gender = ${gender}
        AND rr.is_dnf = false 
        AND rr.is_dq = false
    )
    SELECT gender_place 
    FROM gender_rankings 
    WHERE series_registration_id = ${seriesRegistrationId}
  `;

  // Get age group gender placement (rank among M or F in same age group in this race)  
  const ageGroupResult = await sql`
    WITH age_group_rankings AS (
      SELECT 
        rr.series_registration_id,
        ROW_NUMBER() OVER (ORDER BY rr.place) as age_group_gender_place
      FROM race_results rr
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE rr.race_id = ${raceId}
        AND r.gender = ${gender}
        AND sr.age_group = ${ageGroup}
        AND rr.is_dnf = false
        AND rr.is_dq = false
    )
    SELECT age_group_gender_place 
    FROM age_group_rankings 
    WHERE series_registration_id = ${seriesRegistrationId}
  `;

  const overallPlace = overallResult[0]?.gender_place || 999;
  const ageGroupPlace = ageGroupResult[0]?.age_group_gender_place || 999;

  // MCRRC points: 10-9-8-7-6-5-4-3-2-1 for top 10
  const getPoints = (place: number): number => {
    return place <= 10 ? (11 - place) : 0;
  };

  const overallPoints = getPoints(overallPlace);
  const ageGroupPoints = getPoints(ageGroupPlace);

  return {
    overallPoints,
    ageGroupPoints,
    totalPoints: overallPoints + ageGroupPoints
  };
}

// Calculate rankings after all points are computed
// MCRRC has 2 separate categories:
// 1. Overall Category: Rankings within gender based on overall_points
// 2. Age Group Category: Rankings within age group + gender based on age_group_points
async function calculateSeriesRankings(seriesId: string, year: number): Promise<void> {
  const sql = getSql();

  // OVERALL CATEGORY: Rankings within gender based on overall_points
  // Uses MCRRC tiebreakers: T1=races_participated, T4=total_time (faster time wins)
  await sql`
    WITH ranked_overall_by_gender AS (
      SELECT 
        ss.series_registration_id,
        ROW_NUMBER() OVER (
          PARTITION BY r.gender 
          ORDER BY 
            ss.overall_points DESC, 
            ss.races_participated DESC,
            ss.total_time ASC  -- T4: Faster total time wins tiebreaker
        ) as overall_gender_rank
      FROM series_standings ss
      JOIN series_registrations sr ON ss.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      JOIN series s ON sr.series_id = s.id
      WHERE sr.series_id = ${seriesId} AND s.year = ${year}
    )
    UPDATE series_standings ss
    SET overall_gender_rank = robg.overall_gender_rank  
    FROM ranked_overall_by_gender robg
    WHERE ss.series_registration_id = robg.series_registration_id
  `;

  // AGE GROUP CATEGORY: Rankings within age group + gender based on age_group_points
  // Uses MCRRC tiebreakers: T1=races_participated, T4=total_time (faster time wins)
  await sql`
    WITH ranked_age_group_by_gender AS (
      SELECT 
        ss.series_registration_id,
        ROW_NUMBER() OVER (
          PARTITION BY r.gender, sr.age_group
          ORDER BY 
            ss.age_group_points DESC, 
            ss.races_participated DESC,
            ss.total_time ASC  -- T4: Faster total time wins tiebreaker
        ) as age_group_gender_rank
      FROM series_standings ss
      JOIN series_registrations sr ON ss.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      JOIN series s ON sr.series_id = s.id
      WHERE sr.series_id = ${seriesId} AND s.year = ${year}
    )
    UPDATE series_standings ss
    SET age_group_gender_rank = ragbg.age_group_gender_rank
    FROM ranked_age_group_by_gender ragbg  
    WHERE ss.series_registration_id = ragbg.series_registration_id
  `;

  // For backwards compatibility, also update the old columns
  // Use overall category rankings as the main "rank" 
  await sql`
    UPDATE series_standings ss
    SET 
      overall_rank = ss.overall_gender_rank,
      gender_rank = ss.overall_gender_rank,
      age_group_rank = ss.age_group_gender_rank
    FROM series_registrations sr
    JOIN series s ON sr.series_id = s.id
    WHERE ss.series_registration_id = sr.id 
      AND sr.series_id = ${seriesId} 
      AND s.year = ${year}
  `;
}

// Helper function to convert PostgreSQL interval to seconds
function intervalToSecondsFromDb(interval: any): number {
  if (typeof interval === 'object' && interval.minutes !== undefined) {
    const hours = interval.hours || 0;
    const minutes = interval.minutes || 0; 
    const seconds = interval.seconds || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

export function formatTimeFromInterval(interval: any): string {
  // Convert interval to display format (MM:SS or HH:MM:SS)
  if (!interval) return '-';
  
  // Handle PostgresInterval objects
  if (typeof interval === 'object' && interval.minutes !== undefined) {
    const hours = interval.hours || 0;
    const minutes = interval.minutes || 0;
    const seconds = interval.seconds || 0;
    
    // Format with leading zeros
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    
    if (hours > 0) {
      const hh = hours.toString().padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    } else {
      return `${mm}:${ss}`;
    }
  }
  
  // Handle string intervals (fallback)
  if (typeof interval === 'string') {
    const timeMatch = interval.match(/(\d{1,2}:\d{2}:\d{2})/);
    if (timeMatch) {
      const parts = timeMatch[1].split(':');
      const hours = parseInt(parts[0]);
      const minutes = parts[1];
      const seconds = parts[2];
      
      if (hours > 0) {
        return `${hours}:${minutes}:${seconds}`;
      } else {
        return `${minutes}:${seconds}`;
      }
    }
    return interval;
  }
  
  return '-';
}
