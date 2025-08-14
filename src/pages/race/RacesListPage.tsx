import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Users, Clock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardContent, Badge } from '../../components/ui';
import { formatDate } from '../../utils';

export function RacesListPage() {
  const { state } = useData();
  
  // Filter races for current year and sort by date
  const currentYearRaces = state.races
    .filter(race => race.year === state.selectedYear)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get race statistics
  const getRaceStats = (raceId: string) => {
    const raceResults = state.results.filter(r => r.raceId === raceId);
    return {
      totalParticipants: raceResults.length,
      completedRaces: raceResults.filter(r => !r.isDNF && !r.isDQ).length,
      dnfDq: raceResults.filter(r => r.isDNF || r.isDQ).length
    };
  };

  // Check if race has passed
  const isRacePast = (raceDate: string) => {
    return new Date(raceDate) < new Date();
  };

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
                {state.results.length}
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
            const stats = getRaceStats(race.id);
            const isPast = isRacePast(race.date);
            
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
                            {race.distance} miles
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
                        {race.isOfficial && (
                          <Badge variant="success" size="sm">
                            Official
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Race Stats */}
                    {isPast && stats.totalParticipants > 0 ? (
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {stats.totalParticipants}
                          </div>
                          <div className="text-xs text-gray-500">Participants</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">
                            {stats.completedRaces}
                          </div>
                          <div className="text-xs text-gray-500">Finished</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600">
                            {stats.dnfDq}
                          </div>
                          <div className="text-xs text-gray-500">DNF/DQ</div>
                        </div>
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
