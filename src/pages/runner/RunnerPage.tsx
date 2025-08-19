import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Loader2, 
  Trophy, 
  Target, 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Select } from '../../components/ui';
import { formatRunnerName, formatDate, formatPlace, StyledPlace } from '../../utils';
import { api } from '../../services/api';

// Helper function to format time objects from API
const formatTimeObject = (timeObj: any): string => {
  if (!timeObj) return '-';
  if (typeof timeObj === 'string') return timeObj;
  
  const hours = timeObj.hours || 0;
  const minutes = timeObj.minutes || 0;
  const seconds = timeObj.seconds || 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function RunnerPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useData();
  
  // Local state for runner-specific data
  const [runnerResults, setRunnerResults] = useState<any[]>([]);
  const [runnerDetail, setRunnerDetail] = useState<any | null>(null);
  const [runnerStatistics, setRunnerStatistics] = useState<any | null>(null);
  const [runnerCourseStats, setRunnerCourseStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion state
  const [accordionState, setAccordionState] = useState({
    currentYear: false,
    recentRaces: false,
    courseStats: false
  });

  // Filter state for recent races
  const [recentRacesFilters, setRecentRacesFilters] = useState({
    year: 'all' as string
  });

  // Pagination state for recent races
  const [recentRacesPagination, setRecentRacesPagination] = useState({
    currentPage: 1,
    pageSize: 20
  });

  const runnerFromState = state.runners.find(r => r.id === id);
  const runner = runnerFromState || runnerDetail;
  const isLoading = state.loading || loading;
  
  // Get current year standing specifically for the current year section
  const currentYear = new Date().getFullYear();
  const currentYearStanding = state.standings.find(s => s.runnerId === id && s.year === currentYear) || 
                              runnerStatistics?.currentYearStanding;

  // Accordion toggle function
  const toggleAccordion = (section: 'currentYear' | 'recentRaces' | 'courseStats') => {
    setAccordionState(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load runner data and results
  useEffect(() => {
    const loadRunnerData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load all runner data in parallel
        const [runnerData, statisticsData, courseStatsData, resultsData] = await Promise.all([
          // Load runner details if not in global state
          !runnerFromState ? api.getRunner(id).catch(() => null) : Promise.resolve(null),
          // Load runner lifetime statistics
          api.getRunnerStatistics(id).catch(() => null),
          // Load runner course statistics  
          api.getRunnerCourseStatistics(id).catch(() => []),
          // Load all runner results (no year filter for recent races section)
          api.getRunnerResults(id).catch(() => [])
        ]);

        if (runnerData) {
          setRunnerDetail(runnerData as any);
        }
        
        setRunnerStatistics(statisticsData);
        setRunnerCourseStats(courseStatsData);
        setRunnerResults(resultsData);
        
      } catch (err) {
        console.error('Error loading runner data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load runner data');
      } finally {
        setLoading(false);
      }
    };

    loadRunnerData();
  }, [id]);

  // Loading state (consider both global and local)
  if (isLoading) {
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

  // Not found (only after data finished loading)
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

  // Filter and sort recent races
  const allFilteredRaces = runnerResults
    .filter(result => {
      if (recentRacesFilters.year === 'all') return true;
      return result.race && new Date(result.race.date).getFullYear().toString() === recentRacesFilters.year;
    })
    .sort((a, b) => {
      // Sort by date, most recent first
      if (!a.race || !b.race) return 0;
      return new Date(b.race.date).getTime() - new Date(a.race.date).getTime();
    });

  // Paginated recent races
  const totalRaces = allFilteredRaces.length;
  const totalPages = Math.ceil(totalRaces / recentRacesPagination.pageSize);
  const startIndex = (recentRacesPagination.currentPage - 1) * recentRacesPagination.pageSize;
  const endIndex = startIndex + recentRacesPagination.pageSize;
  const filteredRecentRaces = allFilteredRaces.slice(startIndex, endIndex);

  // Reset pagination when filters change
  const handleYearFilterChange = (year: string) => {
    setRecentRacesFilters(prev => ({ ...prev, year }));
    setRecentRacesPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Pagination handlers
  const goToPreviousPage = () => {
    setRecentRacesPagination(prev => ({
      ...prev,
      currentPage: Math.max(1, prev.currentPage - 1)
    }));
  };

  const goToNextPage = () => {
    setRecentRacesPagination(prev => ({
      ...prev,
      currentPage: Math.min(totalPages, prev.currentPage + 1)
    }));
  };

  // Get available years for recent races filter
  const availableRaceYears = Array.from(new Set(
    runnerResults
      .filter(result => result.race && result.race.date)
      .map(result => new Date(result.race.date).getFullYear().toString())
  )).sort((a, b) => b.localeCompare(a));

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

      {/* Runner Profile - Top Section */}
      <Card>
        <CardContent className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {formatRunnerName(
              runnerStatistics?.runner?.firstName || runner.firstName,
              runnerStatistics?.runner?.lastName || runner.lastName
            )}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Badge variant="secondary">
              {runnerStatistics?.runner?.gender || runner?.gender || 'Unknown'}
            </Badge>
            {(runnerStatistics?.runner?.ageGroup || runner?.ageGroup) && (
              <Badge variant="secondary">
                {runnerStatistics?.runner?.ageGroup || runner?.ageGroup}
              </Badge>
            )}
            {(runnerStatistics?.runner?.club || runner?.club) && (
              <Badge variant="outline">
                {runnerStatistics?.runner?.club || runner?.club}
              </Badge>
            )}
          </div>

          {/* Lifetime Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    ) : (
                      runnerStatistics?.lifetimeStats?.totalRaces || 0
                    )}
              </div>
              <div className="text-sm text-gray-600">Total Races</div>
            </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    ) : (
                      runnerStatistics?.lifetimeStats?.uniqueCourses || 0
                    )}
              </div>
              <div className="text-sm text-gray-600">Unique Courses</div>
            </div>
                {!loading && runnerStatistics?.lifetimeStats?.overallTop3Finishes > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                      🏆 {runnerStatistics.lifetimeStats.overallTop3Finishes}
                    </div>
                    <div className="text-sm text-gray-600">Overall Top 3</div>
                  </div>
                )}
                {!loading && runnerStatistics?.lifetimeStats?.genderTop3Finishes > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600 flex items-center justify-center gap-1">
                      🥈 {runnerStatistics.lifetimeStats.genderTop3Finishes}
                    </div>
                    <div className="text-sm text-gray-600">Gender Top 3</div>
                  </div>
                )}
                {!loading && runnerStatistics?.lifetimeStats?.ageGroupTop3Finishes > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-1">
                      🥇 {runnerStatistics.lifetimeStats.ageGroupTop3Finishes}
                    </div>
                    <div className="text-sm text-gray-600">Age Group Top 3</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    ) : (
                      runnerStatistics?.lifetimeStats?.yearsParticipated || 0
                    )}
              </div>
              <div className="text-sm text-gray-600">Years Active</div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Current Year Race Series - Always Visible */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleAccordion('currentYear')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {new Date().getFullYear()} Championship Series
            </CardTitle>
            {accordionState.currentYear ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {accordionState.currentYear && (
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                <span className="text-gray-600">Loading championship series data...</span>
              </div>
            ) : !currentYearStanding ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No races this year</h3>
                <p className="text-gray-600">
                  This runner has not participated in any {new Date().getFullYear()} championship series races yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current standings */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex justify-center mb-1">
                      <StyledPlace place={currentYearStanding.overallRank || currentYearStanding.overall_rank || 0} formatPlace={formatPlace} />
                </div>
                    <div className="text-sm text-gray-600">Overall Rank</div>
              </div>
                  <div className="text-center">
                    <div className="flex justify-center mb-1">
                      <StyledPlace place={currentYearStanding.ageGroupRank || currentYearStanding.age_group_rank || 0} formatPlace={formatPlace} />
                </div>
                    <div className="text-sm text-gray-600">Age Group Rank</div>
              </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentYearStanding.overallPoints || currentYearStanding.overall_points || 0}
                </div>
                    <div className="text-sm text-gray-600">Overall Points</div>
              </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {currentYearStanding.ageGroupPoints || currentYearStanding.age_group_points || 0}
                </div>
                    <div className="text-sm text-gray-600">Age Group Points</div>
              </div>
            </div>

                {/* Progress bar similar to leaderboard */}
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span className="font-medium">
                      {currentYearStanding.racesParticipated || currentYearStanding.races_participated || 0}/{currentYearStanding.qualifyingRacesNeeded || 6} Races completed
                    </span>
                    <span className={`font-medium ${
                      (currentYearStanding.racesParticipated || currentYearStanding.races_participated || 0) >= (currentYearStanding.qualifyingRacesNeeded || 6) ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {(currentYearStanding.racesParticipated || currentYearStanding.races_participated || 0) >= (currentYearStanding.qualifyingRacesNeeded || 6) ? 'Qualified' : 'In Progress'}
                    </span>
              </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        (currentYearStanding.racesParticipated || currentYearStanding.races_participated || 0) >= (currentYearStanding.qualifyingRacesNeeded || 6)
                          ? 'bg-green-500' 
                          : 'bg-primary-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, ((currentYearStanding.racesParticipated || currentYearStanding.races_participated || 0) / (currentYearStanding.qualifyingRacesNeeded || 6)) * 100)}%` 
                      }}
                    />
              </div>
            </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Recent Races Accordion */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleAccordion('recentRaces')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Recent Races
            </CardTitle>
            {accordionState.recentRaces ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {accordionState.recentRaces && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Year filter */}
              {availableRaceYears.length > 1 && (
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <Select
                    value={recentRacesFilters.year}
                    onChange={(e) => handleYearFilterChange(e.target.value)}
                    className="min-w-32"
                  >
                    <option value="all">All Years</option>
                    {availableRaceYears.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
            </div>
              )}

              {/* Race results */}
              {filteredRecentRaces.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No race results</h3>
                  <p className="text-gray-600">No results found for the selected filters.</p>
            </div>
              ) : (
                <div className="space-y-4">
                  {filteredRecentRaces.map((result) => {
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
                              <div className="flex justify-end mb-1">
                                <StyledPlace place={result.place} formatPlace={formatPlace} />
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
                            <div className="font-medium">
                              <StyledPlace place={result.placeGender} formatPlace={formatPlace} />
                        </div>
                      </div>
                          <div>
                            <div className="text-gray-600">Age Group</div>
                            <div className="font-medium">
                              <StyledPlace place={result.placeAgeGroup} formatPlace={formatPlace} />
                        </div>
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

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Showing {startIndex + 1}-{Math.min(endIndex, totalRaces)} of {totalRaces} races
                  </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
                          disabled={recentRacesPagination.currentPage === 1}
                          className="flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600 px-3">
                          Page {recentRacesPagination.currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={recentRacesPagination.currentPage === totalPages}
                          className="flex items-center gap-1"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                  </div>
                </div>
                  )}
            </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Course Statistics Accordion */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleAccordion('courseStats')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Course Statistics
            </CardTitle>
            {accordionState.courseStats ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {accordionState.courseStats && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {runnerCourseStats.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No course statistics</h3>
                  <p className="text-gray-600">No course data available.</p>
            </div>
              ) : (
                <div className="space-y-4">
                  {runnerCourseStats.map((courseStat, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg">
                      {courseStat.course.id ? (
                        <Link 
                          to={`/course/${courseStat.course.id}`}
                          className="block p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                {courseStat.course.name}
                              </h3>
                              {courseStat.course.location && (
                                <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                  <MapPin className="w-4 h-4" />
                                  {courseStat.course.location}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {courseStat.statistics.timesRun}
                              </div>
                              <div className="text-sm text-gray-600">Times Run</div>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {courseStat.course.name}
                              </h3>
                              {courseStat.course.location && (
                                <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                  <MapPin className="w-4 h-4" />
                                  {courseStat.course.location}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {courseStat.statistics.timesRun}
                              </div>
                              <div className="text-sm text-gray-600">Times Run</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Fastest Time</div>
                          <div className="font-medium text-green-600">
                            {formatTimeObject(courseStat.statistics.fastestTime)}
                      </div>
                    </div>
                        <div>
                          <div className="text-gray-600">Best Overall Place</div>
                          <div className="font-medium">
                            <StyledPlace place={courseStat.statistics.bestOverallPlace} formatPlace={formatPlace} />
                            {courseStat.statistics.bestOverallPlaceYear && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({courseStat.statistics.bestOverallPlaceYear})
                              </span>
                            )}
                      </div>
                    </div>
                        <div>
                          <div className="text-gray-600">Best Gender Place</div>
                          <div className="font-medium">
                            <StyledPlace place={courseStat.statistics.bestGenderPlace} formatPlace={formatPlace} />
                            {courseStat.statistics.bestGenderPlaceYear && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({courseStat.statistics.bestGenderPlaceYear})
                              </span>
                            )}
                      </div>
                    </div>
                        <div>
                          <div className="text-gray-600">Best Age Group Place</div>
                          <div className="font-medium">
                            <StyledPlace place={courseStat.statistics.bestAgeGroupPlace} formatPlace={formatPlace} />
                            {courseStat.statistics.bestAgeGroupPlaceYear && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({courseStat.statistics.bestAgeGroupPlaceYear})
                              </span>
                            )}
                      </div>
                    </div>
                        <div>
                          <div className="text-gray-600">Years</div>
                          <div className="font-medium">
                            {courseStat.statistics.firstYear} - {courseStat.statistics.lastYear}
                      </div>
                    </div>
                        </div>

                        {courseStat.fastestRaceResult && courseStat.fastestRaceResult.raceId && (
                          <div className="mt-3 p-3 bg-green-50 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-green-800">
                                  Fastest Race: {courseStat.fastestRaceResult.year}
                                </div>
                              </div>
                              <Link
                                to={`/race/${courseStat.fastestRaceResult.raceId}`}
                                className="text-green-600 hover:text-green-700 text-sm font-medium"
                              >
                                View Race →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
            </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
