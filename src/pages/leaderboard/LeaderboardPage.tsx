import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, Filter, Search, Calendar, Loader2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent, Input, Select, Badge, Button } from '../../components/ui';
import { formatPlace, formatRunnerName, getRunnerInitials } from '../../utils';

interface MCRRCStanding {
  id: string;
  runnerId: string;
  totalPoints: number;
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
  
  // MCRRC-specific filters
  const [filters, setFilters] = useState({
    category: 'overall' as 'overall' | 'age-group', // MCRRC has 2 categories
    gender: 'M' as 'M' | 'F', // Default to Men's standings
    ageGroup: '', // Only used when category = 'age-group'
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

  // Filter and sort standings based on MCRRC category and gender
  const filteredStandings = standings
    .filter(standing => {
      // Filter by selected gender
      const matchesGender = standing.runner.gender === filters.gender;
      
      // Filter by age group if in age group category
      const matchesAgeGroup = filters.category === 'overall' || 
                              filters.ageGroup === '' || 
                              standing.runner.ageGroup === filters.ageGroup;
      
      // Filter by search text
      const matchesSearch = filters.searchText === '' || 
        `${standing.runner.firstName} ${standing.runner.lastName}`.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        standing.runner.bibNumber.toLowerCase().includes(filters.searchText.toLowerCase());
        
      return matchesGender && matchesAgeGroup && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by the appropriate rank for the selected category
      if (filters.category === 'overall') {
        return a.genderRank - b.genderRank; // Use gender rank within overall category
      } else {
        return a.ageGroupRank - b.ageGroupRank; // Use age group rank within age group category
      }
    });

  const handleCategoryChange = (category: 'overall' | 'age-group') => {
    setFilters(prev => ({ ...prev, category, ageGroup: category === 'overall' ? '' : prev.ageGroup }));
  };

  const handleGenderChange = (gender: 'M' | 'F') => {
    setFilters(prev => ({ ...prev, gender }));
  };

  const handleAgeGroupFilter = (ageGroup: string) => {
    setFilters(prev => ({ ...prev, ageGroup }));
  };

  const handleSearchChange = (searchText: string) => {
    setFilters(prev => ({ ...prev, searchText }));
  };

  const handleYearChange = (year: number) => {
    setFilters(prev => ({ ...prev, year }));
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getRankBadgeVariant = (rank: number) => {
    if (rank <= 3) return 'success';
    if (rank <= 10) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MCRRC Championship Series</h1>
          <div className="mt-2">
            <h2 className="text-xl font-semibold text-primary-600">
              {filters.gender === 'M' ? "Men's" : "Women's"} {" "}
              {filters.category === 'overall' ? 'Overall Category' : 'Age Group Category'}
              {filters.category === 'age-group' && filters.ageGroup && ` - ${filters.ageGroup}`}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {filters.year} standings • {filters.category === 'overall' 
                ? 'Points from overall M/F placement' 
                : 'Points from age group M/F placement'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          {/* Quick Category/Gender Toggles */}
          <div className="flex flex-wrap gap-2">
            {/* Category Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <Button
                variant={filters.category === 'overall' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleCategoryChange('overall')}
                className="rounded-none border-r"
              >
                Overall
              </Button>
              <Button
                variant={filters.category === 'age-group' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleCategoryChange('age-group')}
                className="rounded-none"
              >
                Age Group
              </Button>
            </div>

            {/* Gender Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <Button
                variant={filters.gender === 'M' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleGenderChange('M')}
                className="rounded-none border-r"
              >
                Men
              </Button>
              <Button
                variant={filters.gender === 'F' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleGenderChange('F')}
                className="rounded-none"
              >
                Women
              </Button>
            </div>
          </div>

          {/* Traditional Controls */}
          <div className="flex items-center gap-4">
            {/* Year Selector */}
            <Select
              value={filters.year.toString()}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="w-24"
            >
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </Select>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Category Selection */}
          <Select
            value={filters.category}
            onChange={(e) => handleCategoryChange(e.target.value as 'overall' | 'age-group')}
          >
            <option value="overall">Overall Category</option>
            <option value="age-group">Age Group Category</option>
          </Select>

          {/* Gender Selection */}
          <Select
            value={filters.gender}
            onChange={(e) => handleGenderChange(e.target.value as 'M' | 'F')}
          >
            <option value="M">Men</option>
            <option value="F">Women</option>
          </Select>

          {/* Age Group Filter - Only shown for Age Group category */}
          {filters.category === 'age-group' && (
            <Select
              value={filters.ageGroup}
              onChange={(e) => handleAgeGroupFilter(e.target.value)}
              placeholder="Select Age Group"
            >
              <option value="">All Age Groups</option>
              {availableAgeGroups.map(ageGroup => (
                <option key={ageGroup} value={ageGroup}>
                  {ageGroup}
                </option>
              ))}
            </Select>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search runners..."
              value={filters.searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Clear Search */}
          <Button
            variant="outline"
            onClick={() => setFilters(prev => ({ ...prev, searchText: '' }))}
            disabled={!filters.searchText}
          >
            Clear Search
          </Button>
        </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {filteredStandings.length}
              </h3>
              <p className="text-sm text-gray-600">Total Runners</p>
            </div>
            <Trophy className="w-8 h-8 text-primary-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {standings.length > 0 ? Math.ceil(standings[0]?.racesParticipated || 1) : 1}
              </h3>
              <p className="text-sm text-gray-600">Series Races</p>
            </div>
            <Calendar className="w-8 h-8 text-primary-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {filteredStandings.reduce((total, standing) => total + standing.racesParticipated, 0)}
              </h3>
              <p className="text-sm text-gray-600">Total Participations</p>
            </div>
            <Medal className="w-8 h-8 text-primary-600" />
          </CardContent>
        </Card>
      </div>

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
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Rank</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Runner</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-900">Bib</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-900">Age Group</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-900">
                      {filters.category === 'overall' ? 'Overall Points' : 'Age Group Points'}
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-900">Races</th>
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
                    
                    return (
                      <tr key={standing.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-2">
                            {getRankIcon(finalRank)}
                            <Badge variant={getRankBadgeVariant(finalRank)}>
                              {formatPlace(finalRank)}
                            </Badge>
                          </div>
                        </td>
                        
                        <td className="py-4 px-2">
                          <Link
                            to={`/runner/${runner.id}`}
                            className="flex items-center gap-3 hover:text-primary-600 transition-colors"
                          >
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-700">
                                {getRunnerInitials(runner.firstName, runner.lastName)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {formatRunnerName(runner.firstName, runner.lastName)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Bib #{runner.bibNumber}
                              </p>
                            </div>
                          </Link>
                        </td>
                        
                        <td className="py-4 px-2 text-center">
                          <Badge variant="outline" size="sm">
                            #{runner.bibNumber}
                          </Badge>
                        </td>
                        
                        <td className="py-4 px-2 text-center">
                          <Badge variant="secondary" size="sm">
                            {runner.ageGroup}
                          </Badge>
                        </td>
                        
                        <td className="py-4 px-2 text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {standing.totalPoints}
                          </div>
                          <div className="text-xs text-gray-500">
                            {filters.category === 'overall' ? 'Overall Points' : 'Age Group Points'}
                          </div>
                        </td>
                        
                        <td className="py-4 px-2 text-right">
                          <span className="text-sm text-gray-600">
                            {standing.racesParticipated}
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
