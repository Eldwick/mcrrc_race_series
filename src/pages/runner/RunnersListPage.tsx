import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Calendar } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardContent, Input, Select, Badge } from '../../components/ui';
import { formatRunnerName, getRunnerInitials, getRankIcon } from '../../utils';

export function RunnersListPage() {
  const { state, filteredRunners, availableAgeGroups } = useData();
  const [searchText, setSearchText] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F'>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('');

  // Filter runners based on local state
  const displayRunners = filteredRunners.filter(runner => {
    const matchesSearch = searchText === '' || 
      `${runner.firstName} ${runner.lastName}`.toLowerCase().includes(searchText.toLowerCase()) ||
      runner.bibNumber.includes(searchText);
    
    const matchesGender = genderFilter === 'all' || runner.gender === genderFilter;
    const matchesAgeGroup = ageGroupFilter === '' || runner.ageGroup === ageGroupFilter;

    return matchesSearch && matchesGender && matchesAgeGroup;
  });

  // Get runner's current standing
  const getRunnerStanding = (runnerId: string) => {
    return state.standings.find(s => s.runnerId === runnerId && s.year === state.selectedYear);
  };

  // Get runner's race count for current year (now from API data)
  const getRunnerRaceCount = (runner: any) => {
    return runner.raceCount || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Runners</h1>
        <p className="text-gray-600 mt-1">
          All active runners in the {state.selectedYear} series
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search runners..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Gender Filter */}
            <Select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'all' | 'M' | 'F')}
              placeholder="All Genders"
            >
              <option value="all">All Genders</option>
              <option value="M">Men</option>
              <option value="F">Women</option>
            </Select>

            {/* Age Group Filter */}
            <Select
              value={ageGroupFilter}
              onChange={(e) => setAgeGroupFilter(e.target.value)}
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
            <button
              onClick={() => {
                setSearchText('');
                setGenderFilter('all');
                setAgeGroupFilter('');
              }}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {displayRunners.length}
              </h3>
              <p className="text-sm text-gray-600">Total Runners</p>
            </div>
            <Users className="w-8 h-8 text-primary-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {displayRunners.filter(r => r.gender === 'M').length}
              </h3>
              <p className="text-sm text-gray-600">Men</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {displayRunners.filter(r => r.gender === 'F').length}
              </h3>
              <p className="text-sm text-gray-600">Women</p>
            </div>
            <Users className="w-8 h-8 text-pink-600" />
          </CardContent>
        </Card>
      </div>

      {/* Runners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayRunners.map((runner) => {
          const standing = getRunnerStanding(runner.id);
          const raceCount = getRunnerRaceCount(runner);
          
          return (
            <Link key={runner.id} to={`/runner/${runner.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-primary-700">
                          {getRunnerInitials(runner.firstName, runner.lastName)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {formatRunnerName(runner.firstName, runner.lastName)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Bib #{runner.bibNumber}
                        </p>
                      </div>
                    </div>
                    
                    {standing?.overallRank && getRankIcon(standing.overallRank)}
                  </div>

                  <div className="space-y-3">
                    {/* Demographics */}
                    <div className="flex gap-2">
                      <Badge variant="outline" size="sm">
                        {runner.gender}
                      </Badge>
                      <Badge variant="secondary" size="sm">
                        {runner.ageGroup}
                      </Badge>
                      {runner.age && (
                        <Badge variant="outline" size="sm">
                          Age {runner.age}
                        </Badge>
                      )}
                    </div>

                    {/* Current Season Stats */}
                    {standing ? (
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary-600">
                            #{standing.overallRank || '-'}
                          </div>
                          <div className="text-xs text-gray-500">Rank</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {standing.totalPoints}
                          </div>
                          <div className="text-xs text-gray-500">Points</div>
                        </div>
                      </div>
                    ) : raceCount > 0 ? (
                      <div className="pt-3 border-t border-gray-100 text-center">
                        <div className="text-lg font-bold text-gray-900 mb-1">
                          {raceCount}
                        </div>
                        <div className="text-xs text-gray-500">
                          Race{raceCount !== 1 ? 's' : ''} Completed
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Standings pending calculation
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-gray-100 text-center text-gray-500">
                        <Calendar className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-xs">No races yet</div>
                      </div>
                    )}

                    {/* Race Count */}
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>{raceCount} race{raceCount !== 1 ? 's' : ''} in {state.selectedYear}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {displayRunners.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No runners found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
