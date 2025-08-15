// API client for MCRRC Race Series
import type { Runner, Race, SeriesStanding, Series } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Production uses relative URLs
  : 'http://localhost:3000/api'; // Development uses full URL

// Generic API error class
export class ApiError extends Error {
  public status?: number;
  public response?: any;

  constructor(message: string, status?: number, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

// Generic API call function
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(
        errorData.error || errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new ApiError(data.error || data.message || 'API request failed', undefined, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      undefined,
      error
    );
  }
}

// API functions
export const api = {
  // Get all active runners
  async getRunners(): Promise<Runner[]> {
    const response = await apiCall<{ data: any[]; count: number }>('/runners');
    
    // Transform API response to frontend types
    return response.data.map((runner: any) => ({
      id: runner.id,
      bibNumber: runner.bibNumber || runner.bib_number,
      firstName: runner.firstName || runner.first_name,
      lastName: runner.lastName || runner.last_name,
      gender: runner.gender,
      age: runner.age,
      ageGroup: runner.ageGroup || runner.age_group,
      club: runner.club || 'MCRRC',
      isActive: runner.isActive ?? runner.is_active ?? true,
      createdAt: runner.createdAt || runner.created_at,
      updatedAt: runner.updatedAt || runner.updated_at,
    }));
  },

  // Get races by year (optional)
  async getRaces(year?: number): Promise<Race[]> {
    const endpoint = year ? `/races?year=${year}` : '/races';
    const response = await apiCall<{ data: any[]; count: number; year: number | string }>(endpoint);
    
    return response.data.map((race: any) => ({
      id: race.id,
      name: race.name,
      date: race.date,
      distance: race.distanceMiles ?? race.distance_miles ?? 0,
      series: race.seriesId || race.series_id || 'default-series',
      year: race.year,
      location: race.location || '',
      isOfficial: true, // Assume all races from API are official
      raceUrl: race.mcrrcUrl || race.mcrrc_url,
      resultsUrl: race.mcrrcUrl || race.mcrrc_url,
      createdAt: race.createdAt || race.created_at,
      updatedAt: race.updatedAt || race.updated_at,
    }));
  },

  // Get series standings
  async getStandings(year: number, seriesId?: string): Promise<SeriesStanding[]> {
    const params = new URLSearchParams({ year: year.toString() });
    if (seriesId) {
      params.append('seriesId', seriesId);
    }
    
    const response = await apiCall<{ data: any[]; count: number; year: number; seriesId: string | null }>(
      `/standings?${params.toString()}`
    );
    
    return response.data.map((standing: any, index: number) => ({
      id: standing.id,
      seriesId: standing.seriesId || standing.series_id,
      runnerId: standing.runnerId || standing.runner_id,
      year: standing.year,
      totalPoints: standing.totalPoints ?? standing.total_points ?? 0,
      racesParticipated: standing.racesParticipated ?? standing.races_participated ?? 0,
      overallRank: standing.overallRank ?? standing.overall_rank ?? (index + 1),
      genderRank: standing.genderRank ?? standing.gender_rank,
      ageGroupRank: standing.ageGroupRank ?? standing.age_group_rank,
      qualifyingRaces: standing.qualifyingRaces ?? standing.qualifying_races ?? [],
      updatedAt: standing.updatedAt || standing.updated_at || standing.last_calculated_at,
      
      // Include runner information if present
      runner: standing.runner ? {
        id: standing.runner.id || standing.runnerId || standing.runner_id,
        bibNumber: standing.runner.bibNumber || standing.runner.bib_number,
        firstName: standing.runner.firstName || standing.runner.first_name,
        lastName: standing.runner.lastName || standing.runner.last_name,
        gender: standing.runner.gender,
        ageGroup: standing.runner.ageGroup || standing.runner.age_group,
      } : undefined,
    }));
  },

  // Get series information
  async getSeries(): Promise<Series[]> {
    // For now, return a default series since we don't have a dedicated endpoint
    // This can be expanded when you add a /api/series endpoint
    return [
      {
        id: 'default-series-' + new Date().getFullYear(),
        name: `MCRRC Championship Series ${new Date().getFullYear()}`,
        year: new Date().getFullYear(),
        description: `Montgomery County Road Runners Club Championship Series for ${new Date().getFullYear()}`,
        rules: {
          minRaces: 5,
          maxRaces: 10,
          scoringMethod: 'championship-series' as const,
          overallScoring: {
            enabled: true,
            topN: 10,
          },
          ageGroupScoring: {
            enabled: true,
            topN: 10,
          },
          tiebreakers: [
            {
              order: 1,
              type: 'head-to-head' as const,
              description: 'Head-to-head comparison in common races',
            },
            {
              order: 2,
              type: 'next-best-race' as const,
              description: 'Next best (Q+1) race performance',
            },
            {
              order: 3,
              type: 'total-distance' as const,
              description: 'Total distance of qualifying races',
            },
            {
              order: 4,
              type: 'total-time' as const,
              description: 'Total time of qualifying races',
            },
            {
              order: 5,
              type: 'most-recent-race' as const,
              description: 'Most recent race performance',
            },
          ],
        },
        races: [], // Will be populated when races are loaded
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
  },

  // Health check
  async healthCheck(): Promise<{ status: string; database: string; timestamp: string }> {
    const response = await apiCall<{ data: any }>('/health');
    return response.data;
  },
};
