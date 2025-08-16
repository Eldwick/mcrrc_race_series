// API client for MCRRC Race Series
import type { Runner, Race, SeriesStanding, Series } from '../types';

const API_BASE_URL = '/api'; // Use relative URLs for both dev and production (Vite proxies to backend)

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
      bibNumber: runner.bibNumber || runner.bib_number || '',
      firstName: runner.firstName || runner.first_name,
      lastName: runner.lastName || runner.last_name,
      gender: runner.gender,
      age: runner.age,
      ageGroup: runner.ageGroup || runner.age_group || '',
      club: runner.club,
      isActive: runner.isActive ?? runner.is_active ?? true,
      createdAt: runner.createdAt || runner.created_at,
      updatedAt: runner.updatedAt || runner.updated_at,
      raceCount: runner.raceCount || 0, // Race participation count
    }));
  },

  // Get a specific runner by ID
  async getRunner(id: string): Promise<Runner> {
    const response = await apiCall<{ data: any }>(`/runners/${id}`);
    const runner = response.data;
    
    return {
      id: runner.id,
      bibNumber: runner.bibNumber || runner.bib_number || '',
      firstName: runner.firstName || runner.first_name,
      lastName: runner.lastName || runner.last_name,
      gender: runner.gender,
      age: runner.age,
      ageGroup: runner.ageGroup || runner.age_group || '',
      club: runner.club,
      isActive: runner.isActive ?? runner.is_active ?? true,
      createdAt: runner.createdAt || runner.created_at,
      updatedAt: runner.updatedAt || runner.updated_at,
      raceCount: runner.raceCount || 0, // Race participation count
    };
  },

  // Get race results for a specific runner
  async getRunnerResults(runnerId: string, year?: number): Promise<any[]> {
    const endpoint = year ? `/runners/${runnerId}/results?year=${year}` : `/runners/${runnerId}/results`;
    const response = await apiCall<{ data: any[]; count: number; runnerId: string }>(endpoint);
    
    return response.data.map((result: any) => ({
      id: result.id,
      raceId: result.raceId,
      runnerId: result.runnerId,
      place: result.place,
      placeGender: result.placeGender,
      placeAgeGroup: result.placeAgeGroup,
      bibNumber: result.bibNumber,
      gunTime: result.gunTime,
      chipTime: result.chipTime,
      pacePerMile: result.pacePerMile,
      isDNF: result.isDNF,
      isDQ: result.isDQ,
      overrideReason: result.overrideReason,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      // Race information
      race: {
        id: result.race.id,
        name: result.race.name,
        date: result.race.date,
        distanceMiles: result.race.distanceMiles,
      },
      // Runner info from series registration
      age: result.age,
      ageGroup: result.ageGroup,
    }));
  },

  // Get races by year (optional)
  async getRaces(year?: number): Promise<any[]> {
    const endpoint = year ? `/races?year=${year}` : '/races';
    const response = await apiCall<{ data: any[]; count: number; year: number | string }>(endpoint);
    
    return response.data.map((race: any) => ({
      id: race.id,
      name: race.name,
      date: race.date,
      distance: race.distanceMiles ?? race.distance_miles ?? 0,
      distanceMiles: race.distanceMiles ?? race.distance_miles ?? 0,
      series: race.seriesId || race.series_id || 'default-series',
      year: race.year,
      location: race.location || '',
      isOfficial: true, // Assume all races from API are official
      raceUrl: race.mcrrcUrl || race.mcrrc_url,
      resultsUrl: race.mcrrcUrl || race.mcrrc_url,
      mcrrcUrl: race.mcrrcUrl || race.mcrrc_url, // Also map this for RacesListPage
      raceStatus: race.raceStatus || 'scraped', // Map race status field
      resultsScrapedAt: race.resultsScrapedAt,
      notes: race.notes,
      plannedRaceId: race.plannedRaceId,
      createdAt: race.createdAt || race.created_at,
      updatedAt: race.updatedAt || race.updated_at,
      // Include summary data for races list page
      summary: race.summary,
    }));
  },

  // Get a specific race by ID
  async getRace(id: string): Promise<Race> {
    const response = await apiCall<{ data: any }>(`/races/${id}`);
    const race = response.data;
    
    return {
      id: race.id,
      name: race.name,
      date: race.date,
      distance: race.distanceMiles ?? race.distance_miles ?? 0,
      series: race.seriesId || race.series_id || 'default-series',
      year: race.year,
      location: race.location || '',
      isOfficial: true,
      raceUrl: race.mcrrcUrl || race.mcrrc_url,
      resultsUrl: race.mcrrcUrl || race.mcrrc_url,
      createdAt: race.createdAt || race.created_at,
      updatedAt: race.updatedAt || race.updated_at,
    };
  },

  // Get race results for a specific race
  async getRaceResults(raceId: string): Promise<any[]> {
    const response = await apiCall<{ data: any[]; count: number }>(`/races/${raceId}/results`);
    
    return response.data.map((result: any) => ({
      id: result.id,
      raceId: result.raceId,
      place: result.place,
      placeGender: result.placeGender,
      placeAgeGroup: result.placeAgeGroup,
      bibNumber: result.bibNumber,
      gunTime: result.gunTime,
      chipTime: result.chipTime,
      pacePerMile: result.pacePerMile,
      isDNF: result.isDNF,
      isDQ: result.isDQ,
      overrideReason: result.overrideReason,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      // Runner information embedded in the result
      runner: {
        id: result.runner.id,
        firstName: result.runner.firstName,
        lastName: result.runner.lastName,
        gender: result.runner.gender,
        age: result.runner.age,
        ageGroup: result.runner.ageGroup,
        bibNumber: result.runner.bibNumber,
      }
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
      overallPoints: standing.overallPoints ?? standing.overall_points ?? 0,
      ageGroupPoints: standing.ageGroupPoints ?? standing.age_group_points ?? 0,
      racesParticipated: standing.racesParticipated ?? standing.races_participated ?? 0,
      overallRank: standing.overallRank ?? standing.overall_rank ?? (index + 1),
      genderRank: standing.genderRank ?? standing.gender_rank,
      ageGroupRank: standing.ageGroupRank ?? standing.age_group_rank,
      qualifyingRacesNeeded: standing.qualifyingRaces ?? standing.qualifying_races ?? 0,
      qualifyingRaces: [], // TODO: Load actual qualifying races data
      raceScores: standing.raceScores ?? [],
      lastCalculatedAt: standing.lastCalculatedAt || standing.last_calculated_at || new Date().toISOString(),
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

  // Scraping status
  async scrapingStatus(): Promise<{ success: boolean; data: any }> {
    return await apiCall('/scrape/status');
  },

  // Scrape races
  async scrapeRaces(params: {
    secret: string;
    action: 'discover' | 'scrape-race' | 'scrape-all';
    year?: number;
    url?: string;
    seriesId?: string;
  }): Promise<any> {
    return await apiCall('/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
  },
};
