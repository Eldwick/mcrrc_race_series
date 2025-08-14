// Database utility functions for common operations
import { sql } from './connection';

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
export async function getAllRunners(): Promise<DbRunner[]> {
  const result = await sql`
    SELECT * FROM runners 
    WHERE is_active = true 
    ORDER BY last_name, first_name
  `;
  return result as DbRunner[];
}

export async function getRunnerById(id: string): Promise<DbRunner | null> {
  const result = await sql`
    SELECT * FROM runners 
    WHERE id = ${id} AND is_active = true
  `;
  return result.length > 0 ? result[0] as DbRunner : null;
}

export async function getRunnerByBibNumber(bibNumber: string): Promise<DbRunner | null> {
  const result = await sql`
    SELECT * FROM runners 
    WHERE bib_number = ${bibNumber} AND is_active = true
  `;
  return result.length > 0 ? result[0] as DbRunner : null;
}

// Race operations
export async function getAllRaces(year?: number): Promise<DbRace[]> {
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
  const result = await sql`
    SELECT * FROM races 
    WHERE id = ${id}
  `;
  return result.length > 0 ? result[0] as DbRace : null;
}

// Race results operations
export async function getRaceResults(raceId: string): Promise<DbRaceResult[]> {
  const result = await sql`
    SELECT rr.*, r.first_name, r.last_name, r.gender, r.age_group
    FROM race_results rr
    JOIN runners r ON rr.runner_id = r.id
    WHERE rr.race_id = ${raceId}
    ORDER BY rr.place ASC
  `;
  return result as any[];
}

export async function getRunnerResults(runnerId: string, year?: number): Promise<DbRaceResult[]> {
  let query;
  if (year) {
    query = sql`
      SELECT rr.*, ra.name as race_name, ra.date as race_date, ra.distance_miles
      FROM race_results rr
      JOIN races ra ON rr.race_id = ra.id
      WHERE rr.runner_id = ${runnerId} AND ra.year = ${year}
      ORDER BY ra.date DESC
    `;
  } else {
    query = sql`
      SELECT rr.*, ra.name as race_name, ra.date as race_date, ra.distance_miles
      FROM race_results rr
      JOIN races ra ON rr.race_id = ra.id
      WHERE rr.runner_id = ${runnerId}
      ORDER BY ra.date DESC
    `;
  }
  
  const result = await query;
  return result as any[];
}

// Series standings operations
export async function getSeriesStandings(year: number, seriesId?: string): Promise<any[]> {
  let query;
  if (seriesId) {
    query = sql`
      SELECT 
        ss.*,
        r.first_name,
        r.last_name,
        r.gender,
        r.age_group,
        r.bib_number
      FROM series_standings ss
      JOIN runners r ON ss.runner_id = r.id
      WHERE ss.year = ${year} AND ss.series_id = ${seriesId}
      ORDER BY ss.total_points DESC, ss.races_participated DESC
    `;
  } else {
    query = sql`
      SELECT 
        ss.*,
        r.first_name,
        r.last_name,
        r.gender,
        r.age_group,
        r.bib_number,
        s.name as series_name
      FROM series_standings ss
      JOIN runners r ON ss.runner_id = r.id
      JOIN series s ON ss.series_id = s.id
      WHERE ss.year = ${year}
      ORDER BY ss.total_points DESC, ss.races_participated DESC
    `;
  }
  
  const result = await query;
  return result as any[];
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

export function formatTimeFromInterval(interval: string): string {
  // Convert interval to display format (MM:SS or HH:MM:SS)
  if (!interval) return '-';
  
  const parts = interval.split(':');
  if (parts.length === 3) {
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
