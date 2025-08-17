import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Filter, Search, Calendar, Loader2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent, Input, Select, Badge, Button } from '../../components/ui';
import { formatPlace, formatRunnerName, StyledPlace } from '../../utils';

interface MCRRCStanding {
  id: string;
  runnerId: string;
  totalPoints: number;
  overallPoints: number;
  ageGroupPoints: number;
  racesParticipated: number;
  overallRank: number;
  genderRank: number;
  ageGroupRank: number;
  runner: {
    id: string;
    bibNumber: string;
    firstName: string;
    lastName: string;
    gender: 'M' | 'F';
    ageGroup: string;
  };
}

export function LeaderboardPage() {
  const { availableYears, availableAgeGroups } = useData();
  const [standings, setStandings] = useState<MCRRCStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [raceProgress, setRaceProgress] = useState({ completed: 0, total: 0 });
  
  // MCRRC-specific filters
  const [filters, setFilters] = useState({
    category: 'overall' as string, // 'overall' or specific age group like '30-34'
    gender: 'M' as 'M' | 'F', // Default to Men's standings
    searchText: '',
    year: new Date().getFullYear()
  });
  
  // Fetch MCRRC standings from API
  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/standings?year=${filters.year}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch standings');
        }
        
        setStandings(data.data || []);
      } catch (err) {
        console.error('Error fetching MCRRC standings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load standings');
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [filters.year]);

  // Fetch race progress (completed vs total races)
  useEffect(() => {
    const fetchRaceProgress = async () => {
      try {
        const response = await fetch(`/api/series/races?year=${filters.year}`);
        if (!response.ok) {
          console.warn('Failed to fetch race progress');
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          setRaceProgress({
            completed: data.scrapedRaces || 0,
            total: data.totalRaces || 0
          });
        }
      } catch (err) {
        console.warn('Error fetching race progress:', err);
      }
    };

    fetchRaceProgress();
  }, [filters.year]);

  // Filter and sort standings based on MCRRC category and gender
  const filteredStandings = standings
    .filter(standing => {
      // Filter by selected gender
      const matchesGender = standing.runner.gender === filters.gender;
      
      // Filter by specific age group if not 'overall'
      const matchesCategory = filters.category === 'overall' || 
                              standing.runner.ageGroup === filters.category;
      
      // Filter by search text
      const matchesSearch = filters.searchText === '' || 
        `${standing.runner.firstName} ${standing.runner.lastName}`.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        standing.runner.bibNumber.toLowerCase().includes(filters.searchText.toLowerCase());
        
      return matchesGender && matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by the appropriate rank for the selected category
      if (filters.category === 'overall') {
        return a.genderRank - b.genderRank; // Use gender rank within overall category
      } else {
        return a.ageGroupRank - b.ageGroupRank; // Use age group rank within age group category
      }
    });

  const handleCategoryChange = (category: string) => {
    setFilters(prev => ({ ...prev, category }));
  };

  const handleGenderChange = (gender: 'M' | 'F') => {
    setFilters(prev => ({ ...prev, gender }));
  };

  const handleSearchChange = (searchText: string) => {
    setFilters(prev => ({ ...prev, searchText }));
  };

  const handleYearChange = (year: number) => {
    setFilters(prev => ({ ...prev, year }));
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Championship Series</h1>
          <div className="mt-2">
            <h2 className="text-xl font-semibold text-primary-600">
              {filters.gender === 'M' ? "Men's" : "Women's"} {" "}
              {filters.category === 'overall' ? 'Overall Category' : `${filters.category} Age Group`}
            </h2>
            {raceProgress.total > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>{raceProgress.completed}/{raceProgress.total} races completed</span>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-primary-600 h-1.5 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, (raceProgress.completed / raceProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          {/* Main Filters - Mobile Friendly */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Gender Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
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

            {/* Category Dropdown */}
            <Select
              value={filters.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="flex-1 min-w-32"
            >
              <option value="overall">Overall</option>
              {availableAgeGroups.filter(ageGroup => ageGroup && ageGroup.trim() !== '').map(ageGroup => (
                <option key={ageGroup} value={ageGroup}>
                  {ageGroup}
                </option>
              ))}
            </Select>

            {/* More Filters Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-3"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">More</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Additional Filters</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Year Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Year</label>
                  <Select
                    value={filters.year.toString()}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Search Runner</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Name or bib number..."
                      value={filters.searchText}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {filters.searchText && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, searchText: '' }))}
                      className="text-xs text-primary-600 hover:text-primary-700 mt-1"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading MCRRC standings...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Standings</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => setFilters(prev => ({ ...prev }))} // Trigger re-fetch
              >
                Try Again
              </Button>
            </div>
          ) : filteredStandings.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">
                Try adjusting your filters or check back after races are completed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-center py-3 px-2 font-medium text-gray-900">Rank</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Runner</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-900">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStandings.map((standing, index) => {
                    const { runner } = standing;
                    // Use the appropriate rank based on category
                    const displayRank = filters.category === 'overall' 
                      ? standing.genderRank 
                      : standing.ageGroupRank;
                    // For display purposes, use index + 1 if rank is missing
                    const finalRank = displayRank || (index + 1);
                    
                    // Calculate progress bar percentage and status
                    const qualifyingRaces = 6; // MCRRC requirement for Q value
                    const completedRaces = standing.racesParticipated;
                    const progressPercentage = Math.min((completedRaces / qualifyingRaces) * 100, 100);
                    const isQualified = completedRaces >= qualifyingRaces;
                    
                    return (
                      <>
                        <tr key={standing.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-2 text-center">
                            <StyledPlace place={finalRank} formatPlace={formatPlace} />
                          </td>
                          
                          <td className="py-4 px-2">
                            <Link
                              to={`/runner/${runner.id}`}
                              className="flex items-center gap-3 hover:text-primary-600 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {formatRunnerName(runner.firstName, runner.lastName)}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Badge variant="secondary" size="sm" className="text-xs">
                                    {runner.ageGroup}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          </td>
                          
                          <td className="py-4 px-2 text-center">
                            <div className="text-lg font-semibold text-gray-900">
                              {filters.category === 'overall' ? standing.overallPoints : standing.ageGroupPoints}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Progress bar row */}
                        <tr key={`${standing.id}-progress`} className="border-b border-gray-100">
                          <td colSpan={3} className="px-2 pb-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span className="font-medium">
                                {completedRaces}/{qualifyingRaces} Races completed
                              </span>
                              <span className={`font-medium ${
                                isQualified ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {isQualified ? 'Qualified' : 'In Progress'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isQualified 
                                    ? 'bg-green-500' 
                                    : 'bg-primary-500'
                                }`}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      </>
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
