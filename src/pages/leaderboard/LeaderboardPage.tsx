import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, Filter, Search, Calendar } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent, Input, Select, Badge, Button } from '../../components/ui';
import { formatPlace, formatRunnerName, getRunnerInitials } from '../../utils';
import type { Runner } from '../../types';

export function LeaderboardPage() {
  const { 
    state, 
    filteredStandings, 
    availableYears, 
    availableAgeGroups,
    updateFilters,
    selectYear
  } = useData();
  
  const [showFilters, setShowFilters] = useState(false);

  const handleGenderFilter = (gender: 'all' | 'M' | 'F') => {
    updateFilters({ gender });
  };

  const handleAgeGroupFilter = (ageGroup: string) => {
    updateFilters({ ageGroup: ageGroup || undefined });
  };

  const handleSearchChange = (searchText: string) => {
    updateFilters({ searchText });
  };

  const getRunnerInfo = (runnerId: string): Runner | undefined => {
    return state.runners.find(runner => runner.id === runnerId);
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
          <h1 className="text-3xl font-bold text-gray-900">Championship Series Leaderboard</h1>
          <p className="text-gray-600 mt-1">
            Current standings for {state.selectedYear}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Year Selector */}
          <Select
            value={state.selectedYear.toString()}
            onChange={(e) => selectYear(parseInt(e.target.value))}
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
            Filters
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search runners..."
                  value={state.filters.searchText || ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Gender Filter */}
              <Select
                value={state.filters.gender || 'all'}
                onChange={(e) => handleGenderFilter(e.target.value as 'all' | 'M' | 'F')}
                placeholder="All Genders"
              >
                <option value="all">All Genders</option>
                <option value="M">Men</option>
                <option value="F">Women</option>
              </Select>

              {/* Age Group Filter */}
              <Select
                value={state.filters.ageGroup || ''}
                onChange={(e) => handleAgeGroupFilter(e.target.value)}
                placeholder="All Age Groups"
              >
                <option value="">All Age Groups</option>
                {availableAgeGroups.map(ageGroup => (
                  <option key={ageGroup} value={ageGroup}>
                    {ageGroup}
                  </option>
                ))}
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => updateFilters({ 
                  gender: 'all', 
                  ageGroup: undefined, 
                  searchText: '' 
                })}
              >
                Clear
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
                {state.races.filter(race => race.year === state.selectedYear).length}
              </h3>
              <p className="text-sm text-gray-600">Races This Year</p>
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
          {state.loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredStandings.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">
                Try adjusting your filters or check back later for updated standings.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Rank</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Runner</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Gender</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Age Group</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-900">Points</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-900">Races</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStandings.map((standing, index) => {
                    const runner = getRunnerInfo(standing.runnerId);
                    if (!runner) return null;
                    
                    const displayRank = standing.overallRank || (index + 1);
                    
                    return (
                      <tr key={standing.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-2">
                            {getRankIcon(displayRank)}
                            <Badge variant={getRankBadgeVariant(displayRank)}>
                              {formatPlace(displayRank)}
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
                        
                        <td className="py-4 px-2">
                          <Badge variant="outline">
                            {runner.gender}
                          </Badge>
                        </td>
                        
                        <td className="py-4 px-2">
                          <Badge variant="secondary">
                            {runner.ageGroup}
                          </Badge>
                        </td>
                        
                        <td className="py-4 px-2 text-right">
                          <span className="text-lg font-semibold text-gray-900">
                            {standing.totalPoints}
                          </span>
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
