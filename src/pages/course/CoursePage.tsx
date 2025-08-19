import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Loader2, 
  Award,
  TrendingUp,
  ExternalLink,
  Target,
  Mountain,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, CourseMap, ElevationProfile } from '../../components/ui';
import { formatDate, formatRunnerName, formatTime } from '../../utils';
import { loadGPXFile, type GPXData } from '../../utils/gpx';
import { getGpxFilename, hasGpxData } from '../../utils/courseGpxMapping';
import type { CourseDetails, CourseRecord, PersonalRecord } from '../../types';

interface CourseRecordsData {
  courseRecords: CourseRecord[];
  personalRecords: PersonalRecord[];
  summary: {
    totalRecords: number;
    totalRunnersWithMultipleAttempts: number;
  };
}

export function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [records, setRecords] = useState<CourseRecordsData | null>(null);
  const [gpxData, setGpxData] = useState<GPXData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accordionState, setAccordionState] = useState({
    map: false,
    records: false,
    history: false,
    participations: false
  });
  
  // Filter state for course records
  const [recordFilters, setRecordFilters] = useState({
    gender: 'all' as 'all' | 'M' | 'F',
    ageGroup: 'overall' as string
  });

  // Accordion toggle function
  const toggleAccordion = (section: 'map' | 'records' | 'history' | 'participations') => {
    setAccordionState(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch course details
        const courseResponse = await fetch(`/api/courses/${id}`);
        if (!courseResponse.ok) {
          throw new Error('Failed to fetch course details');
        }
        const courseData = await courseResponse.json();
        setCourse(courseData.data);

        // Try to load GPX data if available
        const courseName = courseData.data.name;
        
        if (hasGpxData(courseName)) {
          const gpxFilename = getGpxFilename(courseName);
          
          if (gpxFilename) {
            try {
              const gpxResult = await loadGPXFile(gpxFilename);
              setGpxData(gpxResult);
            } catch (gpxError) {
              console.error('Failed to load GPX data:', gpxError);
              // Don't fail the whole page if GPX loading fails
            }
          }
        }

        // Fetch course records
        const recordsResponse = await fetch(`/api/courses/${id}/records`);
        if (!recordsResponse.ok) {
          throw new Error('Failed to fetch course records');
        }
        const recordsData = await recordsResponse.json();
        setRecords(recordsData.data);

      } catch (err) {
        console.error('Error fetching course data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id]);





  // Filter handlers for course records
  const handleRecordGenderChange = (gender: 'all' | 'M' | 'F') => {
    setRecordFilters(prev => ({ ...prev, gender }));
  };

  const handleRecordAgeGroupChange = (ageGroup: string) => {
    setRecordFilters(prev => ({ ...prev, ageGroup }));
  };

  // Filter course records based on current filters
  const filteredCourseRecords = records?.courseRecords.filter(record => {
    // Gender filter
    const matchesGender = recordFilters.gender === 'all' || record.runner.gender === recordFilters.gender;
    
    // Age group filter
    const matchesAgeGroup = recordFilters.ageGroup === 'overall' || record.runner.ageGroup === recordFilters.ageGroup;
    
    return matchesGender && matchesAgeGroup;
  }) || [];

  // Determine rank label and which rank to display based on filters
  const rankColumnLabel = (() => {
    if (recordFilters.ageGroup !== 'overall') {
      return 'AG Rank';
    }
    if (recordFilters.gender === 'all') {
      return 'Overall Rank';
    }
    return 'Gender Rank';
  })();

  const getDisplayRank = (record: CourseRecord) => {
    if (recordFilters.ageGroup !== 'overall') {
      return record.rankings.ageGroupRank;
    }
    if (recordFilters.gender === 'all') {
      return record.rankings.overallRank;
    }
    return record.rankings.genderRank;
  };

  // Post-filter sorting and trimming to avoid rank gaps per selected view
  const displayedCourseRecords = (() => {
    const base = [...filteredCourseRecords];
    // Apply additional constraints to avoid mixing categories that cause gaps
    if (recordFilters.ageGroup !== 'overall') {
      // Top 20 per gender for the selected age group
      const byAg = base
        .filter(r => r.rankings.ageGroupRank <= 20)
        .sort((a, b) => {
          // Sort by gender then age group rank
          if (a.runner.gender !== b.runner.gender) {
            return a.runner.gender.localeCompare(b.runner.gender);
          }
          return a.rankings.ageGroupRank - b.rankings.ageGroupRank;
        });
      return byAg;
    }

    if (recordFilters.gender === 'all') {
      // Only show overall top N to avoid gaps caused by gender/AG-only entries
      return base
        .filter(r => r.rankings.overallRank <= 30)
        .sort((a, b) => a.rankings.overallRank - b.rankings.overallRank);
    }

    // Gender-specific view: top 10 by gender
    return base
      .filter(r => r.rankings.genderRank <= 10)
      .sort((a, b) => a.rankings.genderRank - b.rankings.genderRank);
  })();

  // Get unique age groups from records for filter dropdown
  const availableAgeGroups = Array.from(new Set(
    records?.courseRecords.map(record => record.runner.ageGroup).filter(Boolean)
  )).sort();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Course</h2>
            <p className="text-gray-600">Please wait while we fetch the course data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Course</h2>
            <p className="text-gray-600">{error || 'Course not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallRecord = records?.courseRecords.find(record => record.recordType === 'Overall Course Record');
  const menRecord = records?.courseRecords.find(record => record.recordType === "Men's Course Record");
  const womenRecord = records?.courseRecords.find(record => record.recordType === "Women's Course Record");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1">
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
          </div>
          {course.shortName && (
            <p className="text-lg text-gray-600 mb-2">{course.shortName}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {course.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {course.location}
              </div>
            )}
            {course.typicalDistance && (
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                {course.typicalDistance} miles
              </div>
            )}
          </div>
          {course.description && (
            <p className="text-gray-700 mt-3">{course.description}</p>
          )}
        </div>

        {/* Course Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:min-w-[200px]">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">
                {course.statistics?.yearsHeld || 0}
              </div>
              <div className="text-sm text-gray-600">Years Held</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {course.statistics?.totalParticipants || 0}
              </div>
              <div className="text-sm text-gray-600">Total Runners</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Course Records Summary */}
      {overallRecord && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Course Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Record */}
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 mb-1">Overall Record</div>
                <div className="text-2xl font-bold text-yellow-600 mb-2">
                  {formatTime(overallRecord.results.gunTime)}
                </div>
                <div className="text-sm text-gray-600">
                  {formatRunnerName(overallRecord.runner.firstName, overallRecord.runner.lastName)}
                </div>
                <div className="text-xs text-gray-500">{overallRecord.year}</div>
              </div>

              {/* Men's Record */}
              {menRecord && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900 mb-1">Men's Record</div>
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {formatTime(menRecord.results.gunTime)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatRunnerName(menRecord.runner.firstName, menRecord.runner.lastName)}
                  </div>
                  <div className="text-xs text-gray-500">{menRecord.year}</div>
                </div>
              )}

              {/* Women's Record */}
              {womenRecord && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900 mb-1">Women's Record</div>
                  <div className="text-2xl font-bold text-pink-600 mb-2">
                    {formatTime(womenRecord.results.gunTime)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatRunnerName(womenRecord.runner.firstName, womenRecord.runner.lastName)}
                  </div>
                  <div className="text-xs text-gray-500">{womenRecord.year}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}



      {/* Accordion Sections */}
      
      {/* Course Map Accordion */}
      {gpxData && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleAccordion('map')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mountain className="w-5 h-5 text-green-500" />
                Course Map & Elevation
              </CardTitle>
              {accordionState.map ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </CardHeader>
          {accordionState.map && (
            <CardContent className="pt-0">
              <div className="space-y-6">
                {/* Course Map */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Course Map
                  </h3>
                  <CourseMap 
                    gpxData={gpxData} 
                    height="500px"
                    className="mb-4"
                  />
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        <span>Start</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                        <span>Finish</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-1 bg-red-500"></div>
                        <span>Course Route</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Elevation Profile */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Mountain className="w-5 h-5" />
                    Elevation Profile
                  </h3>
                  <ElevationProfile 
                    elevationData={gpxData.elevationProfile}
                  />
                </div>


              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Course Records Accordion */}
      {records && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleAccordion('records')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Course Records
              </CardTitle>
              {accordionState.records ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </CardHeader>
          {accordionState.records && (
            <CardContent className="pt-0">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Gender Filter */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                      <Button
                        variant={recordFilters.gender === 'all' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => handleRecordGenderChange('all')}
                        className="rounded-none border-r flex-1"
                      >
                        Overall
                      </Button>
                      <Button
                        variant={recordFilters.gender === 'M' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => handleRecordGenderChange('M')}
                        className="rounded-none border-r flex-1"
                      >
                        Men
                      </Button>
                      <Button
                        variant={recordFilters.gender === 'F' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => handleRecordGenderChange('F')}
                        className="rounded-none flex-1"
                      >
                        Women
                      </Button>
                    </div>

                    {/* Age Group Filter */}
                    <Select
                      value={recordFilters.ageGroup}
                      onChange={(e) => handleRecordAgeGroupChange(e.target.value)}
                      className="min-w-32"
                    >
                      <option value="overall">All Ages</option>
                      {availableAgeGroups.map(ageGroup => (
                        <option key={ageGroup} value={ageGroup}>
                          {ageGroup}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">{rankColumnLabel}</th>
                        <th className="text-left py-2">Runner</th>
                        <th className="text-left py-2">Time</th>
                        <th className="text-left py-2">Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedCourseRecords.map((record, index) => (
                        <tr
                          key={index}
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            if (record.raceId) {
                              window.location.href = `/race/${record.raceId}`;
                            }
                          }}
                        >
                          <td className="py-3">{getDisplayRank(record)}</td>
                          <td className="py-3">
                            <div>
                              <div className="font-medium">
                                {formatRunnerName(record.runner.firstName, record.runner.lastName)}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" size="sm">
                                  {record.runner.gender}
                                </Badge>
                                <Badge variant="outline" size="sm">
                                  Age {record.runner.age}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <div>
                              <span className="font-mono font-medium text-gray-900">
                                {formatTime(record.results.gunTime)}
                              </span>
                              {record.recordType && (
                                <div className="mt-1">
                                  <Badge variant="success" size="sm">{record.recordType}</Badge>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3">{record.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {displayedCourseRecords.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No records found for the selected filters.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Race History Accordion */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleAccordion('history')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Race History
            </CardTitle>
            {accordionState.history ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {accordionState.history && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {course.races.map((race) => (
                <Link 
                  key={race.id} 
                  to={`/race/${race.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer block"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{race.name}</h3>
                      <Badge variant="outline" size="sm">{race.year}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(race.date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {race.participantCount} participants
                      </div>
                      {race.distanceMiles && (
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {race.distanceMiles} miles
                        </div>
                      )}
                      {race.fastestTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Fastest: {formatTime(race.fastestTime)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-primary-600 text-sm font-medium">
                      View Results
                    </span>
                    {race.mcrrcUrl && (
                      <a
                        href={race.mcrrcUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Most Participations Accordion */}
      {records && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleAccordion('participations')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Most Participations
              </CardTitle>
              {accordionState.participations ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </CardHeader>
          {accordionState.participations && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                {records.personalRecords
                  .sort((a, b) => b.statistics.timesRun - a.statistics.timesRun)
                  .slice(0, 10)
                  .map((pr, index) => (
                  <div key={`${pr.runner.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">
                        {formatRunnerName(pr.runner.firstName, pr.runner.lastName)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {pr.statistics.timesRun} races • {pr.statistics.firstYear}-{pr.statistics.lastYear}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        PR: {formatTime(pr.statistics.personalBest)}
                      </div>
                      {pr.statistics.improvement > 0 && (
                        <div className="text-xs text-green-600">
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                          Improved {Math.round(pr.statistics.improvement)}s
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
