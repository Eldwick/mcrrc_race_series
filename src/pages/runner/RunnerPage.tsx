import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../../components/ui';
import { formatRunnerName, formatDate, formatPlace, getRunnerInitials } from '../../utils';
import { api } from '../../services/api';

// Helper function to format time objects from API
const formatTimeObject = (timeObj: any): string => {
  if (!timeObj) return '-';
  if (typeof timeObj === 'string') return timeObj;
  
  const minutes = timeObj.minutes || 0;
  const seconds = timeObj.seconds || 0;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function RunnerPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useData();
  
  // Local state for runner-specific data
  const [runnerResults, setRunnerResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runner = state.runners.find(r => r.id === id);
  const runnerStanding = state.standings.find(s => s.runnerId === id && s.year === state.selectedYear);

  // Load runner data and results
  useEffect(() => {
    const loadRunnerData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load runner results
        const resultsResponse = await api.getRunnerResults(id, state.selectedYear);
        
        setRunnerResults(resultsResponse);
      } catch (err) {
        console.error('Error loading runner data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load runner data');
      } finally {
        setLoading(false);
      }
    };

    loadRunnerData();
  }, [id, state.selectedYear]);

  if (!runner) {
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Runner Not Found</h2>
            <p className="text-gray-600">The runner you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
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
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Runner</h2>
            <p className="text-gray-600">Please wait while we load the runner's data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
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
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Runner</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {/* Runner Profile */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-700">
                {getRunnerInitials(runner.firstName, runner.lastName)}
              </span>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {formatRunnerName(runner.firstName, runner.lastName)}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <Badge variant="outline">Bib #{runner.bibNumber}</Badge>
                <Badge variant="secondary">{runner.gender}</Badge>
                <Badge variant="secondary">{runner.ageGroup}</Badge>
                {runner.club && <Badge variant="outline">{runner.club}</Badge>}
              </div>

              {runnerStanding && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-600">
                        {formatPlace(runnerStanding.overallRank || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Overall Rank</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {runnerStanding.overallPoints || 0}
                      </div>
                      <div className="text-sm text-gray-600">Overall Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {runnerStanding.ageGroupPoints || 0}
                      </div>
                      <div className="text-sm text-gray-600">Age Group Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {runnerStanding.racesParticipated}
                      </div>
                      <div className="text-sm text-gray-600">Races</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {runnerStanding.qualifyingRaces.length}
                      </div>
                      <div className="text-sm text-gray-600">Qualifying</div>
                    </div>
                  </div>
                  
                  {/* MCRRC Scoring Explanation */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>MCRRC Championship Series Scoring:</strong> Overall points from top-10 M/F finish &bull; Age Group points from top-10 M/F in age group &bull; Series ranking uses Overall points
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Race Results */}
      <Card>
        <CardHeader>
          <CardTitle>Race Results ({state.selectedYear})</CardTitle>
        </CardHeader>
        <CardContent>
          {runnerResults.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No race results</h3>
              <p className="text-gray-600">No results found for {state.selectedYear}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {runnerResults.map((result) => {
                const race = result.race;
                if (!race) return null;

                return (
                  <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Link
                          to={`/race/${race.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                        >
                          {race.name}
                        </Link>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(race.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {race.distanceMiles} miles
                          </span>
                        </div>
                      </div>
                      
                      {result.isDNF ? (
                        <Badge variant="destructive">DNF</Badge>
                      ) : result.isDQ ? (
                        <Badge variant="destructive">DQ</Badge>
                      ) : (
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {formatPlace(result.place)}
                          </div>
                          <div className="text-sm text-gray-600">Overall</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Time</div>
                        <div className="font-medium flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTimeObject(result.gunTime)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Pace</div>
                        <div className="font-medium">{formatTimeObject(result.pacePerMile)}/mile</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Gender Place</div>
                        <div className="font-medium">{formatPlace(result.placeGender)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Age Group</div>
                        <div className="font-medium">{formatPlace(result.placeAgeGroup)}</div>
                      </div>
                    </div>

                    {result.isManualOverride && result.overrideReason && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <Badge variant="warning" size="sm">Manual Override</Badge>
                          <span className="text-sm text-gray-600">{result.overrideReason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
