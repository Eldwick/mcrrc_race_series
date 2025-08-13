// Mock data for development and testing

import type { Runner, Race, RaceResult, SeriesStanding, Series, QualifyingRace } from '../types';
import { calculatePoints, getAgeGroup } from './index';

// Use current year for mock data
const CURRENT_YEAR = new Date().getFullYear();

// Mock Runners
export const mockRunners: Runner[] = [
  {
    id: '1',
    bibNumber: '101',
    firstName: 'John',
    lastName: 'Smith',
    gender: 'M',
    age: 19,
    ageGroup: getAgeGroup(19),
    club: 'MCRRC',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    bibNumber: '102',
    firstName: 'Sarah',
    lastName: 'Johnson',
    gender: 'F',
    age: 23,
    ageGroup: getAgeGroup(23),
    club: 'MCRRC',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    bibNumber: '103',
    firstName: 'Mike',
    lastName: 'Wilson',
    gender: 'M',
    age: 32,
    ageGroup: getAgeGroup(32),
    club: 'MCRRC',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    bibNumber: '104',
    firstName: 'Emily',
    lastName: 'Davis',
    gender: 'F',
    age: 41,
    ageGroup: getAgeGroup(41),
    club: 'MCRRC',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    bibNumber: '105',
    firstName: 'Robert',
    lastName: 'Brown',
    gender: 'M',
    age: 52,
    ageGroup: getAgeGroup(52),
    club: 'MCRRC',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '6',
    bibNumber: '106',
    firstName: 'Lisa',
    lastName: 'Miller',
    gender: 'F',
    age: 67,
    ageGroup: getAgeGroup(67),
    club: 'MCRRC',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '7',
    bibNumber: '107',
    firstName: 'David',
    lastName: 'Garcia',
    gender: 'M',
    age: 29,
    ageGroup: getAgeGroup(29),
    club: 'MCRRC',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '8',
    bibNumber: '108',
    firstName: 'Jennifer',
    lastName: 'Martinez',
    gender: 'F',
    age: 76,
    ageGroup: getAgeGroup(76),
    club: 'MCRRC',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Mock Races
export const mockRaces: Race[] = [
  {
    id: 'race-1',
    name: 'Pike\'s Peek 10K',
    date: '2024-03-15',
    distance: 6.2,
    series: 'Championship Series',
    year: CURRENT_YEAR,
    location: 'Rockville, MD',
    isOfficial: true,
    raceUrl: 'https://mcrrc.org',
    resultsUrl: 'https://results.example.com/race-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-16T00:00:00Z',
  },
  {
    id: 'race-2',
    name: 'Cherry Blossom 5K',
    date: '2024-04-20',
    distance: 3.1,
    series: 'Championship Series',
    year: CURRENT_YEAR,
    location: 'Washington, DC',
    isOfficial: true,
    raceUrl: 'https://mcrrc.org',
    resultsUrl: 'https://results.example.com/race-2',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-04-21T00:00:00Z',
  },
  {
    id: 'race-3',
    name: 'Summer Solstice 15K',
    date: '2024-06-21',
    distance: 9.3,
    series: 'Championship Series',
    year: CURRENT_YEAR,
    location: 'Bethesda, MD',
    isOfficial: true,
    raceUrl: 'https://mcrrc.org',
    resultsUrl: 'https://results.example.com/race-3',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-22T00:00:00Z',
  },
];

// Mock Race Results
export const mockRaceResults: RaceResult[] = [
  // Pike's Peek 10K Results
  {
    id: 'result-1-1',
    raceId: 'race-1',
    runnerId: '1',
    bibNumber: '101',
    place: 1,
    placeGender: 1,
    placeAgeGroup: 1,
    gunTime: '34:25',
    chipTime: '34:23',
    pace: '5:33',
    isDNF: false,
    isDQ: false,
    isManualOverride: false,
    createdAt: '2024-03-16T00:00:00Z',
    updatedAt: '2024-03-16T00:00:00Z',
  },
  {
    id: 'result-1-2',
    raceId: 'race-1',
    runnerId: '2',
    bibNumber: '102',
    place: 3,
    placeGender: 1,
    placeAgeGroup: 1,
    gunTime: '36:42',
    chipTime: '36:40',
    pace: '5:55',
    isDNF: false,
    isDQ: false,
    isManualOverride: false,
    createdAt: '2024-03-16T00:00:00Z',
    updatedAt: '2024-03-16T00:00:00Z',
  },
  {
    id: 'result-1-3',
    raceId: 'race-1',
    runnerId: '3',
    bibNumber: '103',
    place: 5,
    placeGender: 2,
    placeAgeGroup: 1,
    gunTime: '38:15',
    chipTime: '38:12',
    pace: '6:10',
    isDNF: false,
    isDQ: false,
    isManualOverride: false,
    createdAt: '2024-03-16T00:00:00Z',
    updatedAt: '2024-03-16T00:00:00Z',
  },
  {
    id: 'result-1-4',
    raceId: 'race-1',
    runnerId: '4',
    bibNumber: '104',
    place: 8,
    placeGender: 2,
    placeAgeGroup: 1,
    gunTime: '41:30',
    chipTime: '41:28',
    pace: '6:42',
    isDNF: false,
    isDQ: false,
    isManualOverride: false,
    createdAt: '2024-03-16T00:00:00Z',
    updatedAt: '2024-03-16T00:00:00Z',
  },

  // Cherry Blossom 5K Results
  {
    id: 'result-2-1',
    raceId: 'race-2',
    runnerId: '1',
    bibNumber: '101',
    place: 2,
    placeGender: 2,
    placeAgeGroup: 1,
    gunTime: '16:45',
    chipTime: '16:43',
    pace: '5:24',
    isDNF: false,
    isDQ: false,
    isManualOverride: false,
    createdAt: '2024-04-21T00:00:00Z',
    updatedAt: '2024-04-21T00:00:00Z',
  },
  {
    id: 'result-2-2',
    raceId: 'race-2',
    runnerId: '2',
    bibNumber: '102',
    place: 1,
    placeGender: 1,
    placeAgeGroup: 1,
    gunTime: '16:32',
    chipTime: '16:30',
    pace: '5:20',
    isDNF: false,
    isDQ: false,
    isManualOverride: false,
    createdAt: '2024-04-21T00:00:00Z',
    updatedAt: '2024-04-21T00:00:00Z',
  },
  {
    id: 'result-2-3',
    raceId: 'race-2',
    runnerId: '5',
    bibNumber: '105',
    place: 4,
    placeGender: 3,
    placeAgeGroup: 1,
    gunTime: '18:22',
    chipTime: '18:20',
    pace: '5:55',
    isDNF: false,
    isDQ: false,
    isManualOverride: false,
    createdAt: '2024-04-21T00:00:00Z',
    updatedAt: '2024-04-21T00:00:00Z',
  },

  // Summer Solstice 15K Results
  {
    id: 'result-3-1',
    raceId: 'race-3',
    runnerId: '3',
    bibNumber: '103',
    place: 1,
    placeGender: 1,
    placeAgeGroup: 1,
    gunTime: '52:18',
    chipTime: '52:15',
    pace: '5:37',
    isDNF: false,
    isDQ: false,
    isManualOverride: false,
    createdAt: '2024-06-22T00:00:00Z',
    updatedAt: '2024-06-22T00:00:00Z',
  },
  {
    id: 'result-3-2',
    raceId: 'race-3',
    runnerId: '6',
    bibNumber: '106',
    place: 2,
    placeGender: 1,
    placeAgeGroup: 1,
    gunTime: '55:42',
    chipTime: '55:40',
    pace: '5:59',
    isDNF: false,
    isDQ: false,
    isManualOverride: false,
    createdAt: '2024-06-22T00:00:00Z',
    updatedAt: '2024-06-22T00:00:00Z',
  },
];

// Mock Series
export const mockSeries: Series[] = [
  {
    id: 'series-1',
    name: 'MCRRC Championship Series',
    year: CURRENT_YEAR,
    description: 'The premier racing series for MCRRC members',
    rules: {
      minRaces: 5,
      maxRaces: 10,
      scoringMethod: 'championship-series',
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
          type: 'head-to-head',
          description: 'Head-to-head competition in races both runners participated',
        },
        {
          order: 2,
          type: 'next-best-race',
          description: 'Next best Q+1 race performance',
        },
        {
          order: 3,
          type: 'total-distance',
          description: 'Total distance raced in counting races',
        },
        {
          order: 4,
          type: 'total-time',
          description: 'Total time for counting races',
        },
        {
          order: 5,
          type: 'most-recent-race',
          description: 'Performance in most recent race',
        },
      ],
    },
    races: ['race-1', 'race-2', 'race-3'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Calculate mock standings
function calculateMockStandings(): SeriesStanding[] {
  const standings: SeriesStanding[] = [];

  mockRunners.forEach((runner) => {
    const runnerResults = mockRaceResults.filter(result => result.runnerId === runner.id);
    
    if (runnerResults.length === 0) return;

    let totalPoints = 0;
    const qualifyingRaces: QualifyingRace[] = [];

    runnerResults.forEach((result) => {
      const race = mockRaces.find(r => r.id === result.raceId);
      if (!race) return;

      // Calculate overall points
      const overallPoints = calculatePoints(result.place, 'overall');
      // Calculate age group points
      const ageGroupPoints = calculatePoints(result.placeAgeGroup, 'age-group');
      
      const racePoints = Math.max(overallPoints, ageGroupPoints);
      totalPoints += racePoints;

      qualifyingRaces.push({
        raceId: result.raceId,
        points: racePoints,
        place: result.place,
        placeGender: result.placeGender,
        placeAgeGroup: result.placeAgeGroup,
        raceDate: race.date,
        raceName: race.name,
      });
    });

    standings.push({
      id: `standing-${runner.id}`,
      seriesId: 'series-1',
      runnerId: runner.id,
      year: CURRENT_YEAR,
      totalPoints,
      racesParticipated: runnerResults.length,
      qualifyingRaces,
      updatedAt: new Date().toISOString(),
    });
  });

  // Sort by total points and assign ranks
  standings.sort((a, b) => b.totalPoints - a.totalPoints);
  standings.forEach((standing, index) => {
    standing.overallRank = index + 1;
  });

  // Calculate gender ranks
  ['M', 'F'].forEach((gender) => {
    const genderRunners = mockRunners.filter(r => r.gender === gender);
    const genderStandings = standings.filter(s => 
      genderRunners.some(r => r.id === s.runnerId)
    );
    genderStandings.forEach((standing, index) => {
      standing.genderRank = index + 1;
    });
  });

  // Calculate age group ranks
  const ageGroups = [...new Set(mockRunners.map(r => r.ageGroup))];
  ageGroups.forEach((ageGroup) => {
    const ageGroupRunners = mockRunners.filter(r => r.ageGroup === ageGroup);
    const ageGroupStandings = standings.filter(s => 
      ageGroupRunners.some(r => r.id === s.runnerId)
    );
    ageGroupStandings.forEach((standing, index) => {
      standing.ageGroupRank = index + 1;
    });
  });

  return standings;
}

export const mockStandings = calculateMockStandings();

// Export all mock data
export const mockData = {
  runners: mockRunners,
  races: mockRaces,
  results: mockRaceResults,
  standings: mockStandings,
  series: mockSeries,
};
