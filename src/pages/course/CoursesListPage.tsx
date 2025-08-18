import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Trophy, 
  Users, 
  Calendar, 
  Loader2,
  Target,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, Badge } from '../../components/ui';
import type { RaceCourse } from '../../types';

export function CoursesListPage() {
  const [courses, setCourses] = useState<RaceCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/courses');
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        
        const data = await response.json();
        setCourses(data.data || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const getCourseTypeIcon = (courseType: string) => {
    switch (courseType) {
      case 'trail': return '🌲';
      case 'track': return '🏃‍♂️';
      case 'cross-country': return '🏞️';
      default: return '🛣️';
    }
  };

  const getCourseTypeColor = (courseType: string) => {
    switch (courseType) {
      case 'trail': return 'bg-green-100 text-green-800';
      case 'track': return 'bg-purple-100 text-purple-800';
      case 'cross-country': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Race Courses</h1>
          <p className="text-gray-600 mt-1">
            Explore MCRRC race courses and their multi-year history
          </p>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Courses</h2>
            <p className="text-gray-600">Please wait while we fetch the course data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Race Courses</h1>
          <p className="text-gray-600 mt-1">
            Explore MCRRC race courses and their multi-year history
          </p>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Courses</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Race Courses</h1>
        <p className="text-gray-600 mt-1">
          Explore MCRRC race courses and their multi-year history
        </p>
      </div>

      {/* Course Summary Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {courses.length}
              </div>
              <div className="text-sm text-gray-600">Total Courses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {courses.reduce((sum, course) => sum + (course.statistics?.totalRaces || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Races</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {courses.reduce((sum, course) => sum + (course.statistics?.totalParticipants || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Participants</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses List */}
      <div className="space-y-4">
        {courses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-600">
                No race courses have been set up yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {courses.map((course) => (
              <Link key={course.id} to={`/course/${course.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">{getCourseTypeIcon(course.courseType)}</span>
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                            {course.name}
                          </h3>
                        </div>
                        {course.shortName && (
                          <p className="text-sm text-gray-600 mb-2">{course.shortName}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          {course.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span className="line-clamp-1">{course.location}</span>
                            </div>
                          )}
                          {course.typicalDistance && (
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {course.typicalDistance} miles
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          className={getCourseTypeColor(course.courseType)}
                          size="sm"
                        >
                          {course.courseType}
                        </Badge>
                        {course.establishedYear && (
                          <span className="text-xs text-gray-500">
                            Est. {course.establishedYear}
                          </span>
                        )}
                      </div>
                    </div>

                    {course.description && (
                      <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    {/* Course Statistics */}
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Calendar className="w-4 h-4 text-primary-600" />
                            <span className="text-lg font-bold text-primary-600">
                              {course.statistics?.yearsHeld || 0}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">Years</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Trophy className="w-4 h-4 text-green-600" />
                            <span className="text-lg font-bold text-green-600">
                              {course.statistics?.totalRaces || 0}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">Races</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-lg font-bold text-blue-600">
                              {course.statistics?.totalParticipants || 0}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">Runners</div>
                        </div>
                      </div>

                      {/* Year Range */}
                      {course.statistics?.firstYear && course.statistics?.lastYear && (
                        <div className="mt-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                            <TrendingUp className="w-4 h-4" />
                            <span>
                              {course.statistics.firstYear === course.statistics.lastYear 
                                ? course.statistics.firstYear 
                                : `${course.statistics.firstYear} - ${course.statistics.lastYear}`
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
