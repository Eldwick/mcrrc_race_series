import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Users, Clock, Loader2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardContent, Badge } from '../../components/ui';
import { formatDate, formatRunnerName, getRunnerInitials } from '../../utils';
import { api } from '../../services/api';

interface RaceWithSummary {
  id: string;
  name: string;
  date: string;
  year: number;
  distanceMiles: number;
  location: string;
  mcrrcUrl: string;
  summary?: {
    totalParticipants: number;
    completed: number;
    dnfDq: number;
    topResults: Array<{
      place: number;
      firstName: string;
      lastName: string;
      gender: string;
      ageGroup: string;
      bibNumber: string;
      gunTime: string;
      genderRank: number;
    }>;
  };
}

export function RacesListPage() {
  const { state } = useData();
  const [races, setRaces] = useState<RaceWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchRaces = async () => {
      try {
        setLoading(true);
        setError(null);
        const racesData = await api.getRaces(state.selectedYear);
        setRaces(racesData as RaceWithSummary[]);
      } catch (err) {
        console.error('Error fetching races:', err);
        setError('Failed to load races data');
      } finally {
        setLoading(false);
      }
    };

    fetchRaces();
  }, [state.selectedYear]);

  // Check if race has passed
  const isRacePast = (raceDate: string) => {
    return new Date(raceDate) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Races</h1>
          <p className="text-gray-600 mt-1">
            {state.selectedYear} Championship Series races
          </p>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Races</h2>
            <p className="text-gray-600">Please wait while we fetch the races data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Races</h1>
          <p className="text-gray-600 mt-1">
            {state.selectedYear} Championship Series races
          </p>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Races</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter and sort races
  const currentYearRaces = races
    .filter(race => race.year === state.selectedYear)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Races</h1>
        <p className="text-gray-600 mt-1">
          {state.selectedYear} Championship Series races
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {currentYearRaces.length}
              </h3>
              <p className="text-sm text-gray-600">Total Races</p>
            </div>
            <Calendar className="w-8 h-8 text-primary-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {currentYearRaces.filter(r => isRacePast(r.date)).length}
              </h3>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <Trophy className="w-8 h-8 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {currentYearRaces.filter(r => !isRacePast(r.date)).length}
              </h3>
              <p className="text-sm text-gray-600">Upcoming</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {currentYearRaces.reduce((total, race) => total + (race.summary?.totalParticipants || 0), 0)}
              </h3>
              <p className="text-sm text-gray-600">Total Results</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </CardContent>
        </Card>
      </div>

      {/* Races List */}
      <div className="space-y-4">
        {currentYearRaces.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No races scheduled</h3>
              <p className="text-gray-600">
                No races found for {state.selectedYear}.
              </p>
            </CardContent>
          </Card>
        ) : (
          currentYearRaces.map((race) => {
            const isPast = isRacePast(race.date);
            const summary = race.summary || { totalParticipants: 0, completed: 0, dnfDq: 0, topResults: [] };
            const hasResults = summary.totalParticipants > 0;
            
            return (
              <Link key={race.id} to={`/race/${race.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {race.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(race.date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {race.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="w-4 h-4" />
                            {race.distanceMiles} miles
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant={isPast ? "secondary" : "outline"}
                          size="sm"
                        >
                          {isPast ? "Completed" : "Upcoming"}
                        </Badge>
                        <Badge variant="success" size="sm">
                          Official
                        </Badge>
                      </div>
                    </div>

                    {/* Race Results */}
                    {isPast && hasResults ? (
                      <div className="pt-4 border-t border-gray-200">
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">
                              {summary.totalParticipants}
                            </div>
                            <div className="text-xs text-gray-500">Participants</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {summary.completed}
                            </div>
                            <div className="text-xs text-gray-500">Finished</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {summary.dnfDq}
                            </div>
                            <div className="text-xs text-gray-500">DNF/DQ</div>
                          </div>
                        </div>

                        {/* Top Performers */}
                        {summary.topResults.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Top Finishers</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Top 3 Men */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Trophy className="w-4 h-4 text-blue-600" />
                                  <span className="text-xs font-medium text-blue-700">Men</span>
                                </div>
                                <div className="space-y-1">
                                  {summary.topResults
                                    .filter(result => result.gender === 'M')
                                    .map((result) => (
                                      <div key={`${result.gender}-${result.genderRank}`} 
                                           className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-[10px] font-medium text-blue-700">
                                              {getRunnerInitials(result.firstName, result.lastName)}
                                            </span>
                                          </div>
                                          <span className="text-gray-900">
                                            {formatRunnerName(result.firstName, result.lastName)}
                                          </span>
                                        </div>
                                        <span className="text-gray-600 font-medium">
                                          {result.gunTime}
                                        </span>
                                      </div>
                                    ))
                                  }
                                </div>
                              </div>

                              {/* Top 3 Women */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Trophy className="w-4 h-4 text-pink-600" />
                                  <span className="text-xs font-medium text-pink-700">Women</span>
                                </div>
                                <div className="space-y-1">
                                  {summary.topResults
                                    .filter(result => result.gender === 'F')
                                    .map((result) => (
                                      <div key={`${result.gender}-${result.genderRank}`} 
                                           className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center">
                                            <span className="text-[10px] font-medium text-pink-700">
                                              {getRunnerInitials(result.firstName, result.lastName)}
                                            </span>
                                          </div>
                                          <span className="text-gray-900">
                                            {formatRunnerName(result.firstName, result.lastName)}
                                          </span>
                                        </div>
                                        <span className="text-gray-600 font-medium">
                                          {result.gunTime}
                                        </span>
                                      </div>
                                    ))
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : !isPast ? (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-center text-gray-500">
                          <Clock className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            {Math.ceil((new Date(race.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days until race
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-center text-gray-500">
                          <span className="text-sm">No results available yet</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
