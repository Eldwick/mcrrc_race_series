// Core data types for MCRRC Race Series

export interface Runner {
  id: string;
  bibNumber: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  ageGroup: string;
  age?: number;
  club?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  raceCount?: number; // Number of races participated in current year
}

export interface Race {
  id: string;
  name: string;
  date: string;
  distance: number; // in miles
  series: string;
  year: number;
  location: string;
  isOfficial: boolean;
  raceUrl?: string;
  resultsUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RaceResult {
  id: string;
  raceId: string;
  runnerId: string;
  bibNumber: string;
  place: number; // overall place
  placeGender: number; // gender place
  placeAgeGroup: number; // age group place
  gunTime: string; // HH:MM:SS format
  chipTime?: string; // HH:MM:SS format
  pace: string; // MM:SS per mile
  isDNF: boolean;
  isDQ: boolean;
  isManualOverride: boolean;
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesStanding {
  id: string;
  seriesId: string;
  runnerId: string;
  year: number;
  totalPoints: number;
  racesParticipated: number;
  overallRank?: number;
  genderRank?: number;
  ageGroupRank?: number;
  qualifyingRaces: QualifyingRace[];
  updatedAt: string;
}

export interface QualifyingRace {
  raceId: string;
  points: number;
  place: number;
  placeGender: number;
  placeAgeGroup: number;
  raceDate: string;
  raceName: string;
}

export interface Series {
  id: string;
  name: string;
  year: number;
  description: string;
  rules: SeriesRules;
  races: string[]; // race IDs
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesRules {
  minRaces: number; // minimum races to qualify
  maxRaces: number; // maximum races that count toward scoring
  scoringMethod: 'championship-series';
  overallScoring: {
    enabled: boolean;
    topN: number; // top N M/F overall get points
  };
  ageGroupScoring: {
    enabled: boolean;
    topN: number; // top N in each age group get points
  };
  tiebreakers: TiebreakerRule[];
}

export interface TiebreakerRule {
  order: number;
  type: 'head-to-head' | 'next-best-race' | 'total-distance' | 'total-time' | 'most-recent-race';
  description: string;
}

// UI and Filter types
export interface FilterOptions {
  gender?: 'M' | 'F' | 'all';
  ageGroup?: string;
  series?: string;
  year?: number;
  searchText?: string;
}

export interface SortOptions {
  field: 'name' | 'points' | 'rank' | 'races' | 'lastRace';
  direction: 'asc' | 'desc';
}

// Age Group definitions based on MCRRC rules
export const AGE_GROUPS = [
  '0-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', 
  '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80-99'
] as const;

export type AgeGroup = typeof AGE_GROUPS[number];

// MCRRC Championship Series Scoring (R4)
export const CHAMPIONSHIP_SERIES_POINTS = {
  // Points for top 10 M/F overall: 1st=10pts, 2nd=9pts, ..., 10th=1pt
  OVERALL: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  // Points for top 10 M/F in each age group: 1st=10pts, 2nd=9pts, ..., 10th=1pt  
  AGE_GROUP: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
} as const;

// MCRRC Championship Series Types
export interface RacePoints {
  overallPoints: number;      // Points from overall M/F placement (0-10)
  ageGroupPoints: number;     // Points from age group M/F placement (0-10) 
  totalPoints: number;        // overallPoints + ageGroupPoints
  overallPlace?: number;      // Overall M/F place (if top 10)
  ageGroupPlace?: number;     // Age group M/F place (if top 10)
}

export interface SeriesStanding {
  id: string;
  runnerId: string;
  seriesId: string;
  year: number;
  // Race participation and scoring
  racesParticipated: number;
  qualifyingRaces: number;    // Q = half of total series races, rounded up
  raceScores: RacePoints[];   // Individual race point scores
  // Final standing calculation  
  totalPoints: number;        // Sum of Q highest race scores
  overallRank?: number;       // Overall series placement
  genderRank?: number;        // Gender series placement  
  ageGroupRank?: number;      // Age group series placement
  // Tiebreaker data
  totalDistance?: number;     // T3: sum of distances of all completed races
  totalTime?: string;         // T4: sum of times of all completed races
  lastCalculatedAt: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Utility types
export type CreateRunnerInput = Omit<Runner, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateRunnerInput = Partial<CreateRunnerInput> & { id: string };
export type CreateRaceInput = Omit<Race, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateRaceInput = Partial<CreateRaceInput> & { id: string };
