// MCRRC Championship Series Scoring Logic
// Based on official rules: https://mcrrc.org/club-race-series/championship-series-cs/

import { CHAMPIONSHIP_SERIES_POINTS } from '../types';
import type { RacePoints, AgeGroup } from '../types';

/**
 * Calculate points for a race result based on MCRRC R4 rules
 * Awards points to top 10 M/F overall AND top 10 M/F in age group
 */
export function calculateRacePoints(
  overallGenderPlace: number,    // Overall place among all M or F
  ageGroupGenderPlace: number   // Place within age group among M or F
): RacePoints {
  let overallPoints = 0;
  let ageGroupPoints = 0;
  let overallPlace: number | undefined;
  let ageGroupPlace: number | undefined;

  // Overall M/F points (top 10 get points: 10, 9, 8, ..., 1)
  if (overallGenderPlace <= 10) {
    overallPoints = CHAMPIONSHIP_SERIES_POINTS.OVERALL[overallGenderPlace - 1];
    overallPlace = overallGenderPlace;
  }

  // Age group M/F points (top 10 get points: 10, 9, 8, ..., 1)  
  if (ageGroupGenderPlace <= 10) {
    ageGroupPoints = CHAMPIONSHIP_SERIES_POINTS.AGE_GROUP[ageGroupGenderPlace - 1];
    ageGroupPlace = ageGroupGenderPlace;
  }

  return {
    overallPoints,
    ageGroupPoints, 
    totalPoints: overallPoints + ageGroupPoints,
    overallPlace,
    ageGroupPlace
  };
}

/**
 * Calculate qualifying races needed (Q) per MCRRC R1 rule
 * Q = half the number of series races actually conducted, rounded up
 */
export function calculateQualifyingRaces(totalSeriesRaces: number): number {
  return Math.ceil(totalSeriesRaces / 2);
}

/**
 * Calculate series standing for a runner per MCRRC R5 rule
 * Series score = sum of Q highest individual race point scores
 */
export function calculateSeriesStanding(
  raceScores: RacePoints[],
  totalSeriesRaces: number
): { totalPoints: number; qualifyingRaces: number; topScores: RacePoints[] } {
  const qualifyingRaces = calculateQualifyingRaces(totalSeriesRaces);
  
  // Sort race scores by total points (descending) and take top Q
  const sortedScores = [...raceScores].sort((a, b) => b.totalPoints - a.totalPoints);
  const topScores = sortedScores.slice(0, qualifyingRaces);
  
  // Sum the Q highest scores
  const totalPoints = topScores.reduce((sum, score) => sum + score.totalPoints, 0);
  
  return {
    totalPoints,
    qualifyingRaces,
    topScores
  };
}

/**
 * Check if a race qualifies for age group based on distance restrictions (R1)
 * - Age 1-14: Only races of 10K or less
 * - Age 15-19: Only races of 10 miles or less  
 * - Age 20+: All races qualify
 */
export function doesRaceQualifyForAgeGroup(
  ageGroup: AgeGroup,
  distanceMiles: number
): boolean {
  // Convert 10K to miles (approximately 6.21 miles)
  const TEN_KM_IN_MILES = 6.21;
  
  if (ageGroup === '0-14') {
    return distanceMiles <= TEN_KM_IN_MILES;
  } else if (ageGroup === '15-19') {
    return distanceMiles <= 10;
  }
  
  // Age 20+ can participate in all races
  return true;
}

/**
 * Compare two runners for tiebreaker per MCRRC T1-T5 rules
 * Returns: -1 if runner1 wins, 1 if runner2 wins, 0 if still tied
 */
export function compareRunnersForTiebreak(
  runner1: {
    raceScores: RacePoints[];
    totalDistance?: number;
    totalTime?: string; // in "HH:MM:SS" format
  },
  runner2: {
    raceScores: RacePoints[];
    totalDistance?: number; 
    totalTime?: string;
  },
  qualifyingRaces: number
): number {
  // T2: Next best scores (Q+1, Q+2, etc.)
  // Calculate extended scores for tiebreaking
  const getExtendedScore = (scores: RacePoints[], raceCount: number) => {
    const sorted = [...scores].sort((a, b) => b.totalPoints - a.totalPoints);
    const topRaces = sorted.slice(0, raceCount);
    // Missing races count as -1 points  
    const missingRaces = Math.max(0, raceCount - topRaces.length);
    return topRaces.reduce((sum, s) => sum + s.totalPoints, 0) + (missingRaces * -1);
  };

  // Try T2 with increasing race counts until tie is broken
  let raceCount = qualifyingRaces + 1;
  const maxRaces = Math.max(runner1.raceScores.length, runner2.raceScores.length);
  
  while (raceCount <= maxRaces + 2) { // +2 to account for potential missing races
    const score1 = getExtendedScore(runner1.raceScores, raceCount);
    const score2 = getExtendedScore(runner2.raceScores, raceCount);
    
    if (score1 !== score2) {
      return score2 - score1; // Higher score wins (negative means runner1 wins)
    }
    raceCount++;
  }

  // T3: Total distance (higher wins)
  if (runner1.totalDistance && runner2.totalDistance) {
    if (runner1.totalDistance !== runner2.totalDistance) {
      return runner2.totalDistance - runner1.totalDistance;
    }
  }

  // T4: Total time (lower wins) 
  if (runner1.totalTime && runner2.totalTime) {
    // Convert time strings to seconds for comparison
    const timeToSeconds = (time: string): number => {
      const parts = time.split(':').map(Number);
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    };
    
    const time1 = timeToSeconds(runner1.totalTime);
    const time2 = timeToSeconds(runner2.totalTime);
    
    if (time1 !== time2) {
      return time1 - time2; // Lower time wins
    }
  }

  // Still tied
  return 0;
}

/**
 * Validate if a runner is eligible for series participation
 * Must be MCRRC member on race day (R2)
 * Age group determined by age on first race day (R3)
 */
export function validateSeriesEligibility(
  isMemberOnRaceDay: boolean,
  ageOnFirstRaceDay: number
): { isEligible: boolean; ageGroup: AgeGroup } {
  // Determine age group based on MCRRC brackets
  let ageGroup: AgeGroup = '0-14';
  
  if (ageOnFirstRaceDay >= 80) ageGroup = '80-99';
  else if (ageOnFirstRaceDay >= 75) ageGroup = '75-79';
  else if (ageOnFirstRaceDay >= 70) ageGroup = '70-74';
  else if (ageOnFirstRaceDay >= 65) ageGroup = '65-69';
  else if (ageOnFirstRaceDay >= 60) ageGroup = '60-64';
  else if (ageOnFirstRaceDay >= 55) ageGroup = '55-59';
  else if (ageOnFirstRaceDay >= 50) ageGroup = '50-54';
  else if (ageOnFirstRaceDay >= 45) ageGroup = '45-49';
  else if (ageOnFirstRaceDay >= 40) ageGroup = '40-44';
  else if (ageOnFirstRaceDay >= 35) ageGroup = '35-39';
  else if (ageOnFirstRaceDay >= 30) ageGroup = '30-34';
  else if (ageOnFirstRaceDay >= 25) ageGroup = '25-29';
  else if (ageOnFirstRaceDay >= 20) ageGroup = '20-24';
  else if (ageOnFirstRaceDay >= 15) ageGroup = '15-19';
  else ageGroup = '0-14';

  return {
    isEligible: isMemberOnRaceDay,
    ageGroup
  };
}
