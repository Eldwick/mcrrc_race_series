import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Trophy, Users, Loader2, ExternalLink, Search, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Select, Input } from '../../components/ui';
import { formatDate, formatTime, formatPlace, formatRunnerName, StyledPlace } from '../../utils';
import { api, ApiError } from '../../services/api';
import { useData } from '../../contexts/DataContext';
import type { Race } from '../../types';

interface RaceResult {
  id: string;
  raceId: string;
  place: number;
  placeGender: number;
  placeAgeGroup: number;
  bibNumber: string;
  gunTime: string;
  chipTime: string;
  pacePerMile: string;
  isDNF: boolean;
  isDQ: boolean;
  overrideReason?: string;
  runner: {
    id: string;
    firstName: string;
    lastName: string;
    gender: string;
    age: number;
    ageGroup: string;
    bibNumber: string;
    club?: string;
  };
}

export function RacePage() {
  const { id } = useParams<{ id: string }>();
  const { availableAgeGroups } = useData();
  const [race, setRace] = useState<Race | null>(null);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    gender: 'all' as 'all' | 'M' | 'F',
    ageGroup: 'overall' as string,
    searchText: ''
  });

  useEffect(() => {
    const fetchRaceData = async () => {
      if (!id) {
        setError('Race ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch race details and results in parallel
        const [raceData, resultsData] = await Promise.all([
          api.getRace(id),
          api.getRaceResults(id)
        ]);

        setRace(raceData);
        setRaceResults(resultsData);
      } catch (err) {
        console.error('Error fetching race data:', err);
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load race data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRaceData();
  }, [id]);

  // Filter race results based on current filters
  const filteredResults = raceResults.filter(result => {
    // Gender filter
    const matchesGender = filters.gender === 'all' || result.runner.gender === filters.gender;
    
    // Age group filter
    const matchesAgeGroup = filters.ageGroup === 'overall' || result.runner.ageGroup === filters.ageGroup;
    
    // Search filter
    const matchesSearch = filters.searchText === '' ||
      `${result.runner.firstName} ${result.runner.lastName}`.toLowerCase().includes(filters.searchText.toLowerCase()) ||
      result.runner.bibNumber.toLowerCase().includes(filters.searchText.toLowerCase());
    
    return matchesGender && matchesAgeGroup && matchesSearch;
  });

  // Filter handlers
  const handleGenderChange = (gender: 'all' | 'M' | 'F') => {
    setFilters(prev => ({ ...prev, gender }));
  };

  const handleAgeGroupChange = (ageGroup: string) => {
    setFilters(prev => ({ ...prev, ageGroup }));
  };

  const handleSearchChange = (searchText: string) => {
    setFilters(prev => ({ ...prev, searchText }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Race Data</h2>
            <p className="text-gray-600">Please wait while we fetch the race details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !race) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/races">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Races
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error ? 'Error Loading Race' : 'Race Not Found'}
            </h2>
            <p className="text-gray-600">
              {error || "The race you're looking for doesn't exist or has been removed."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/races">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Races
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
              <Badge variant="secondary">MCRRC Championship Series</Badge>
              <Badge variant="outline">{race.year}</Badge>
              {race.isOfficial && <Badge variant="success">Official</Badge>}
            </div>

            {/* Official Race Results Link */}
            {race.raceUrl && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <a
                  href={race.raceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg text-primary-700 hover:text-primary-800 transition-colors font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Official Results on MCRRC.org
                </a>
                <p className="text-sm text-gray-500 mt-2">
                  Access the original race results page for additional details and timing information.
                </p>
                {race.raceCourseId && (
                  <div className="mt-4">
                    <Link
                      to={`/course/${race.raceCourseId}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 hover:text-gray-900 transition-colors font-medium"
                    >
                      <MapPin className="w-4 h-4" />
                      View Course{race.raceCourseName ? `: ${race.raceCourseName}` : ''}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>


        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Race Results</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {filters.gender === 'all' ? 'All Participants' : 
                   filters.gender === 'M' ? "Men's Results" : "Women's Results"}
                  {filters.ageGroup !== 'overall' && ` • ${filters.ageGroup} Age Group`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {filteredResults.length} of {raceResults.length} participants
                  </span>
                </div>
                {race.raceUrl && (
                  <a
                    href={race.raceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Source
                  </a>
                )}
              </div>
            </div>

            {/* Filter Controls - Mobile Friendly */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Gender Filter */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <Button
                    variant={filters.gender === 'all' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleGenderChange('all')}
                    className="rounded-none border-r flex-1"
                  >
                    All
                  </Button>
                  <Button
                    variant={filters.gender === 'M' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleGenderChange('M')}
                    className="rounded-none border-r flex-1"
                  >
                    Men
                  </Button>
                  <Button
                    variant={filters.gender === 'F' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleGenderChange('F')}
                    className="rounded-none flex-1"
                  >
                    Women
                  </Button>
                </div>

                {/* Age Group Filter */}
                <Select
                  value={filters.ageGroup}
                  onChange={(e) => handleAgeGroupChange(e.target.value)}
                  className="flex-1 min-w-32"
                >
                  <option value="overall">Overall</option>
                  {availableAgeGroups.filter(ageGroup => ageGroup && ageGroup.trim() !== '').map(ageGroup => (
                    <option key={ageGroup} value={ageGroup}>
                      {ageGroup}
                    </option>
                  ))}
                </Select>
              </div>
              
              {/* Search Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search runners by name or bib number..."
                  value={filters.searchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
                {filters.searchText && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, searchText: '' }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-primary-600 hover:text-primary-700"
                  >
                    Clear
                  </button>
                )}
              </div>
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
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching results</h3>
              <p className="text-gray-600">
                No runners match the current filters. Try adjusting your filters to see more results.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Place</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Runner</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Bib</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-900">Club?</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Gender</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Age Group</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-900">Time</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-900">Pace</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((result) => {
                    const { runner } = result;
                    
                    return (
                      <tr key={result.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-2">
                          {result.isDNF ? (
                            <Badge variant="destructive" size="sm">DNF</Badge>
                          ) : result.isDQ ? (
                            <Badge variant="destructive" size="sm">DQ</Badge>
                          ) : (
                            <StyledPlace place={result.place} formatPlace={formatPlace} />
                          )}
                        </td>
                        
                        <td className="py-4 px-2">
                          <Link
                            to={`/runner/${runner.id}`}
                            className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
                          >
                            {formatRunnerName(runner.firstName, runner.lastName)}
                          </Link>
                        </td>
                        
                        <td className="py-4 px-2">
                          <Badge variant="outline" size="sm">
                            {result.bibNumber}
                          </Badge>
                        </td>
                        
                        <td className="py-4 px-2 text-center">
                          {(runner.club === 'MCRRC' || (runner.club && runner.club.includes('MCRRC'))) && (
                            <Check className="w-4 h-4 text-green-600 mx-auto" />
                          )}
                        </td>
                        
                        <td className="py-4 px-2">
                          <div className="text-center">
                            <Badge variant="secondary" size="sm">
                              {runner.gender}
                            </Badge>
                            <div className="mt-1 flex justify-center">
                              <StyledPlace place={result.placeGender} formatPlace={formatPlace} />
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-4 px-2">
                          <div className="text-center">
                            <Badge variant="secondary" size="sm">
                              {runner.ageGroup}
                            </Badge>
                            <div className="mt-1 flex justify-center">
                              <StyledPlace place={result.placeAgeGroup} formatPlace={formatPlace} />
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
                            {result.isDNF || result.isDQ ? '-' : `${result.pacePerMile}/mi`}
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
