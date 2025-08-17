# Race Courses Concept Implementation

## Overview
Implemented a comprehensive "Race Course" system that links races across multiple years, enabling course records tracking, personal records (PRs), and multi-year course analysis.

## Database Architecture

### New Tables

#### `race_courses`
- **Core Information**: name, short_name, location, typical_distance, course_type
- **Metadata**: established_year, description, is_active
- **Relationships**: Links to races via `race_course_id` foreign key

#### Updated `races` Table
- **Added**: `race_course_id` column linking to race_courses
- **Maintains**: All existing race data (date, year, distance, etc.)

### Database Views

#### `course_statistics`
- Aggregated statistics per course
- Years held, total races, total participants
- First/last year, average distance

#### `course_records` 
- Overall course records (fastest times ever)
- Gender-specific records
- Age group records with rankings

## API Endpoints

### Core Endpoints

#### `GET /api/courses`
- List all race courses with statistics
- Includes: years held, total races, participant counts

#### `GET /api/courses/:id`
- Detailed course information
- All races for the course across years
- Course records and top performances

#### `GET /api/courses/:id/records`
- Comprehensive course records
- Personal records for repeat participants
- Performance rankings and improvements

#### Management Endpoints
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course details
- `DELETE /api/courses/:id` - Soft delete course

## Frontend Implementation

### Pages Created

#### `CoursesListPage.tsx`
- Grid layout showing all race courses
- Course type icons and badges
- Statistics summary (years, races, participants)
- Quick course information and navigation

#### `CoursePage.tsx`
- Detailed course view with tabbed interface
- **Overview Tab**: Recent races, top repeat participants
- **Records Tab**: All-time course records with rankings
- **History Tab**: Complete race history across years

### Key Features

#### Course Records Display
- Overall course record holder
- Men's and women's records
- Age group records
- Historical context and year achieved

#### Personal Records (PRs)
- Runners who've participated multiple times
- Personal best times on the course
- Improvement tracking (seconds improved)
- Participation span (first year to last year)

#### Multi-Year Analysis
- Race history across all years
- Participation trends
- Performance comparisons
- Course evolution over time

## Data Models

### Course Statistics
```typescript
interface RaceCourse {
  id: string;
  name: string;
  shortName?: string;
  location?: string;
  typicalDistance?: number;
  courseType: 'road' | 'trail' | 'track' | 'cross-country';
  statistics: {
    yearsHeld: number;
    totalRaces: number;
    totalParticipants: number;
    firstYear: number;
    lastYear: number;
  };
}
```

### Course Records
```typescript
interface CourseRecord {
  runner: {
    firstName: string;
    lastName: string;
    gender: 'M' | 'F';
    ageGroup: string;
  };
  results: {
    gunTime: string;
    place: number;
  };
  rankings: {
    overallRank: number;
    genderRank: number;
    ageGroupRank: number;
  };
  recordType?: string; // "Overall Course Record", "Men's Course Record", etc.
}
```

### Personal Records
```typescript
interface PersonalRecord {
  runner: RunnerInfo;
  statistics: {
    timesRun: number;
    personalBest: string;
    personalWorst: string;
    firstYear: number;
    lastYear: number;
    improvement: number; // Seconds improved from worst to best
  };
}
```

## Business Value

### For Race Directors
- **Course Performance**: Track how courses perform over time
- **Participation Trends**: See which courses are most popular
- **Historical Data**: Access complete course history and records

### For Runners
- **Personal Goals**: See personal bests and improvement on specific courses
- **Course Selection**: Compare courses and their characteristics
- **Competition**: View course records and compare performance

### For Club Management
- **Course Planning**: Data-driven decisions on which courses to continue
- **Record Keeping**: Official course records and achievements
- **Member Engagement**: Showcase member accomplishments and PRs

## Key Features Implemented

### ✅ Multi-Year Course Tracking
- Same course across different years linked together
- Complete historical view of course usage

### ✅ Course Records System
- Overall, gender, and age group records
- Automatic ranking and record type identification
- Historical context (year achieved, race name)

### ✅ Personal Records (PRs)
- Individual runner PRs on each course
- Improvement tracking over time
- Multiple participation analysis

### ✅ Course Statistics
- Years held, total races, participation counts
- Performance trends and course characteristics
- Course type categorization (road, trail, track, cross-country)

### ✅ Responsive UI
- Mobile-friendly course browsing
- Tabbed interface for detailed course views
- Visual course type indicators and statistics

## Usage Examples

### View Course Records
```
/courses → Browse all courses
/course/123 → Detailed view of specific course
/course/123 → Records tab shows all-time course records
```

### Track Personal Progress
- See your PR on "MCRRC Winter 5K" across multiple years
- View improvement from first race to most recent
- Compare performance against course records

### Course Management
- Add new courses through API
- Link existing races to courses
- Track course evolution and changes

## Future Enhancements

### Planned Features
- **Course Comparisons**: Side-by-side course statistics
- **Elevation Profiles**: Course difficulty indicators
- **Weather Correlation**: Performance vs. weather conditions
- **Pace Analysis**: Sector-by-sector course analysis

### Integration Opportunities
- **Training Plans**: Course-specific training recommendations
- **Goal Setting**: Target times based on course difficulty
- **Social Features**: Course challenges and group goals

This race course concept provides a comprehensive framework for understanding race performance across time, enabling both individual goal tracking and club-wide course management.
