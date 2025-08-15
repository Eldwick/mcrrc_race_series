// MCRRC Championship Series Scoring Logic

import type { 
  Runner, 
  Race, 
  RaceResult, 
  SeriesStanding, 
  QualifyingRace
} from '../types';
import { CHAMPIONSHIP_SERIES_POINTS } from '../types';

/**
 * Calculate Championship Series points for a race result
 */
export function calculateRacePoints(
  result: RaceResult,
  isOverallCategory: boolean = false
): number {
  if (result.isDNF || result.isDQ) {
    return 0;
  }

  const place = isOverallCategory ? result.place : result.placeAgeGroup;
  const pointsArray = isOverallCategory 
    ? CHAMPIONSHIP_SERIES_POINTS.OVERALL 
    : CHAMPIONSHIP_SERIES_POINTS.AGE_GROUP;

  if (place > 0 && place <= pointsArray.length) {
    return pointsArray[place - 1];
  }

  return 0;
}

/**
 * Calculate the best points for a runner from overall or age group placement
 */
export function calculateBestPoints(result: RaceResult): number {
  const overallPoints = calculateRacePoints(result, true);
  const ageGroupPoints = calculateRacePoints(result, false);
  
  // Return the higher of the two
  return Math.max(overallPoints, ageGroupPoints);
}

/**
 * Calculate series standings for all runners
 */
export function calculateSeriesStandings(
  runners: Runner[],
  races: Race[],
  results: RaceResult[],
  seriesId: string,
  year: number,
  _minRaces: number = 5,
  maxRaces: number = 10
): SeriesStanding[] {
  const standings: SeriesStanding[] = [];

  runners.forEach(runner => {
    // Get all results for this runner in the specified year
    const runnerResults = results.filter(result => 
      result.runnerId === runner.id &&
      races.some(race => race.id === result.raceId && race.year === year)
    );

    if (runnerResults.length === 0) {
      return; // Skip runners with no results
    }

    // Calculate points for each race
    const qualifyingRaces: QualifyingRace[] = runnerResults.map(result => {
      const race = races.find(r => r.id === result.raceId)!;
      const points = calculateBestPoints(result);

      return {
        raceId: result.raceId,
        points,
        place: result.place,
        placeGender: result.placeGender,
        placeAgeGroup: result.placeAgeGroup,
        raceDate: race.date,
        raceName: race.name
      };
    });

    // Sort by points (highest first) and take top maxRaces
    qualifyingRaces.sort((a, b) => b.points - a.points);
    const countingRaces = qualifyingRaces.slice(0, maxRaces);

    // Calculate total points
    const totalPoints = countingRaces.reduce((sum, race) => sum + race.points, 0);

    // Only include in standings if minimum race requirement is met
    // Note: For development, we're including all runners regardless of minRaces
    standings.push({
      id: `standing-${runner.id}-${year}`,
      seriesId,
      runnerId: runner.id,
      year,
      totalPoints,
      racesParticipated: runnerResults.length,
      qualifyingRacesNeeded: Math.ceil(runnerResults.length / 2), // Q = half of races, rounded up
      qualifyingRaces: countingRaces,
      raceScores: [],
      updatedAt: new Date().toISOString(),
      lastCalculatedAt: new Date().toISOString()
    });
  });

  // Sort by total points (highest first)
  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // If points are tied, apply tiebreakers
    return applyTiebreakers(a, b, runners, races, results);
  });

  // Assign overall ranks
  standings.forEach((standing, index) => {
    standing.overallRank = index + 1;
  });

  // Calculate gender-specific rankings
  calculateGenderRankings(standings, runners);

  // Calculate age group rankings
  calculateAgeGroupRankings(standings, runners);

  return standings;
}

/**
 * Apply MCRRC Championship Series tiebreaker rules
 */
function applyTiebreakers(
  standingA: SeriesStanding,
  standingB: SeriesStanding,
  _runners: Runner[],
  races: Race[],
  results: RaceResult[]
): number {
  // T1: Head-to-head in races where both participated
  const headToHead = compareHeadToHead(standingA, standingB, races, results);
  if (headToHead !== 0) return headToHead;

  // T2: Next best Q+1 race
  const nextBestRace = compareNextBestRace(standingA, standingB, results, races);
  if (nextBestRace !== 0) return nextBestRace;

  // T3: Total distance in counting races
  const totalDistance = compareTotalDistance(standingA, standingB, races);
  if (totalDistance !== 0) return totalDistance;

  // T4: Total time in counting races
  const totalTime = compareTotalTime(standingA, standingB, results);
  if (totalTime !== 0) return totalTime;

  // T5: Most recent race performance
  const mostRecentRace = compareMostRecentRace(standingA, standingB, results, races);
  if (mostRecentRace !== 0) return mostRecentRace;

  return 0; // Still tied
}

/**
 * T1: Head-to-head comparison in races where both runners participated
 */
function compareHeadToHead(
  standingA: SeriesStanding,
  standingB: SeriesStanding,
  _races: Race[],
  results: RaceResult[]
): number {
  const resultsA = results.filter(r => r.runnerId === standingA.runnerId);
  const resultsB = results.filter(r => r.runnerId === standingB.runnerId);

  const commonRaces = resultsA.filter(resultA => 
    resultsB.some(resultB => resultB.raceId === resultA.raceId)
  );

  if (commonRaces.length === 0) return 0;

  let aWins = 0;
  let bWins = 0;

  commonRaces.forEach(resultA => {
    const resultB = resultsB.find(r => r.raceId === resultA.raceId)!;
    
    if (resultA.place < resultB.place) {
      aWins++;
    } else if (resultB.place < resultA.place) {
      bWins++;
    }
  });

  if (aWins > bWins) return -1; // A wins
  if (bWins > aWins) return 1;  // B wins
  return 0; // Still tied
}

/**
 * T2: Compare next best (Q+1) race performance
 */
function compareNextBestRace(
  standingA: SeriesStanding,
  standingB: SeriesStanding,
  results: RaceResult[],
  _races: Race[]
): number {
  // Get all race results for both runners, sorted by points
  const getAllRacePoints = (runnerId: string) => {
    return results
      .filter(r => r.runnerId === runnerId)
      .map(result => calculateBestPoints(result))
      .sort((a, b) => b - a);
  };

  const pointsA = getAllRacePoints(standingA.runnerId);
  const pointsB = getAllRacePoints(standingB.runnerId);

  const maxRaces = Math.max(standingA.racesParticipated, standingB.racesParticipated);
  
  // Compare the next best race after the counting races
  for (let i = maxRaces; i < Math.max(pointsA.length, pointsB.length); i++) {
    const pointA = pointsA[i] || 0;
    const pointB = pointsB[i] || 0;
    
    if (pointA !== pointB) {
      return pointB - pointA; // Higher points wins
    }
  }

  return 0;
}

/**
 * T3: Compare total distance in counting races
 */
function compareTotalDistance(
  standingA: SeriesStanding,
  standingB: SeriesStanding,
  _races: Race[]
): number {
  const getDistance = (_standing: SeriesStanding) => {
    // TODO: Implement distance calculation with new data structure
    return 0;
  };

  const distanceA = getDistance(standingA);
  const distanceB = getDistance(standingB);

  return distanceB - distanceA; // Higher distance wins
}

/**
 * T4: Compare total time in counting races
 */
function compareTotalTime(
  standingA: SeriesStanding,
  standingB: SeriesStanding,
  _results: RaceResult[]
): number {
  const getTotalSeconds = (_standing: SeriesStanding) => {
    // TODO: Implement total time calculation with new data structure
    return 0;
  };

  const timeA = getTotalSeconds(standingA);
  const timeB = getTotalSeconds(standingB);

  return timeA - timeB; // Lower time wins
}

/**
 * T5: Compare performance in most recent race
 */
function compareMostRecentRace(
  standingA: SeriesStanding,
  standingB: SeriesStanding,
  results: RaceResult[],
  races: Race[]
): number {
  const getMostRecentRacePoints = (standing: SeriesStanding) => {
    const runnerResults = results.filter(r => r.runnerId === standing.runnerId);
    const sortedByDate = runnerResults.sort((a, b) => {
      const raceA = races.find(r => r.id === a.raceId);
      const raceB = races.find(r => r.id === b.raceId);
      return new Date(raceB?.date || 0).getTime() - new Date(raceA?.date || 0).getTime();
    });

    if (sortedByDate.length === 0) return 0;
    return calculateBestPoints(sortedByDate[0]);
  };

  const pointsA = getMostRecentRacePoints(standingA);
  const pointsB = getMostRecentRacePoints(standingB);

  return pointsB - pointsA; // Higher points wins
}

/**
 * Calculate gender-specific rankings
 */
function calculateGenderRankings(standings: SeriesStanding[], runners: Runner[]) {
  ['M', 'F'].forEach(gender => {
    const genderRunners = runners.filter(r => r.gender === gender);
    const genderStandings = standings
      .filter(s => genderRunners.some(r => r.id === s.runnerId))
      .sort((a, b) => (a.overallRank || 0) - (b.overallRank || 0));

    genderStandings.forEach((standing, index) => {
      standing.genderRank = index + 1;
    });
  });
}

/**
 * Calculate age group rankings
 */
function calculateAgeGroupRankings(standings: SeriesStanding[], runners: Runner[]) {
  const ageGroups = [...new Set(runners.map(r => r.ageGroup))];
  
  ageGroups.forEach(ageGroup => {
    const ageGroupRunners = runners.filter(r => r.ageGroup === ageGroup);
    const ageGroupStandings = standings
      .filter(s => ageGroupRunners.some(r => r.id === s.runnerId))
      .sort((a, b) => (a.overallRank || 0) - (b.overallRank || 0));

    ageGroupStandings.forEach((standing, index) => {
      standing.ageGroupRank = index + 1;
    });
  });
}
