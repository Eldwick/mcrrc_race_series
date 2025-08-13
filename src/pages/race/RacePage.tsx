import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Trophy, Users } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../../components/ui';
import { formatDate, formatTime, formatPlace, formatRunnerName, getRunnerInitials } from '../../utils';

export function RacePage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useData();

  const race = state.races.find(r => r.id === id);
  const raceResults = state.results.filter(r => r.raceId === id);

  if (!race) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/leaderboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leaderboard
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Race Not Found</h2>
            <p className="text-gray-600">The race you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRunnerInfo = (runnerId: string) => {
    return state.runners.find(runner => runner.id === runnerId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/leaderboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </Link>
      </div>

      {/* Race Information */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{race.name}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{formatDate(race.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{race.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{race.distance} miles</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary">{race.series}</Badge>
              <Badge variant="outline">{race.year}</Badge>
              {race.isOfficial && <Badge variant="success">Official</Badge>}
            </div>
          </div>

          {/* Race Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{raceResults.length}</div>
              <div className="text-sm text-gray-600">Total Finishers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {raceResults.filter(r => !r.isDNF && !r.isDQ).length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {raceResults.filter(r => r.isDNF || r.isDQ).length}
              </div>
              <div className="text-sm text-gray-600">DNF/DQ</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Race Results</CardTitle>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">{raceResults.length} participants</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {raceResults.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results available</h3>
              <p className="text-gray-600">Results for this race haven't been uploaded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Place</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Runner</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Bib</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Gender</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Age Group</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-900">Time</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-900">Pace</th>
                  </tr>
                </thead>
                <tbody>
                  {raceResults.map((result) => {
                    const runner = getRunnerInfo(result.runnerId);
                    if (!runner) return null;

                    return (
                      <tr key={result.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-2">
                          {result.isDNF ? (
                            <Badge variant="destructive" size="sm">DNF</Badge>
                          ) : result.isDQ ? (
                            <Badge variant="destructive" size="sm">DQ</Badge>
                          ) : (
                            <Badge variant="outline" size="sm">
                              {formatPlace(result.place)}
                            </Badge>
                          )}
                        </td>
                        
                        <td className="py-4 px-2">
                          <Link
                            to={`/runner/${runner.id}`}
                            className="flex items-center gap-3 hover:text-primary-600 transition-colors"
                          >
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary-700">
                                {getRunnerInitials(runner.firstName, runner.lastName)}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {formatRunnerName(runner.firstName, runner.lastName)}
                            </span>
                          </Link>
                        </td>
                        
                        <td className="py-4 px-2">
                          <Badge variant="outline" size="sm">
                            {result.bibNumber}
                          </Badge>
                        </td>
                        
                        <td className="py-4 px-2">
                          <div className="text-center">
                            <Badge variant="secondary" size="sm">
                              {runner.gender}
                            </Badge>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatPlace(result.placeGender)}
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-4 px-2">
                          <div className="text-center">
                            <Badge variant="secondary" size="sm">
                              {runner.ageGroup}
                            </Badge>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatPlace(result.placeAgeGroup)}
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-4 px-2 text-right">
                          <span className="font-medium text-gray-900">
                            {result.isDNF || result.isDQ ? '-' : formatTime(result.gunTime)}
                          </span>
                        </td>
                        
                        <td className="py-4 px-2 text-right">
                          <span className="text-sm text-gray-600">
                            {result.isDNF || result.isDQ ? '-' : `${result.pace}/mi`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
