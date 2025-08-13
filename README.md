# MCRRC Race Series Frontend

A modern web application for tracking and displaying MCRRC Championship Series standings, built with React, TypeScript, and Tailwind CSS.

## Features

### Core Features
- **Series Leaderboard**: Real-time standings with overall, gender, and age group rankings
- **Individual Runner Profiles**: Detailed race history and performance metrics
- **Race Results**: Complete results for each race with multiple sorting options
- **Admin Dashboard**: Data management and manual override capabilities
- **Responsive Design**: Mobile-first design that works on all devices

### Scoring Features
- **MCRRC Championship Series Rules**: Full implementation of official scoring rules
- **Dual Point System**: Best of overall top-10 or age group top-10 points
- **Complete Tiebreaker System**: All 5 tiebreaker rules (T1-T5) implemented
- **Live Calculations**: Real-time recalculation of standings
- **Manual Overrides**: Admin capability to handle DNF, DQ, and corrections

### Data Features
- **Web Scraping Ready**: Built to integrate with MCRRC.org data scraping
- **Multiple Series Support**: Can handle multiple years and series
- **Export Capabilities**: CSV export of standings and results
- **Data Validation**: Input validation and error handling

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite (fast development and builds)
- **Styling**: Tailwind CSS with custom components
- **Routing**: React Router DOM
- **State Management**: React Context + useReducer
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Development**: Hot reload, TypeScript checking

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Card, Input, etc.)
│   ├── layout/         # Layout components (Header, Navigation)
│   └── forms/          # Form components
├── pages/              # Page components
│   ├── leaderboard/    # Series standings page
│   ├── runner/         # Individual runner profile page
│   ├── race/          # Race results page
│   └── admin/         # Admin dashboard page
├── contexts/          # React context providers
├── types/             # TypeScript type definitions
├── utils/             # Utility functions and helpers
├── hooks/             # Custom React hooks
├── services/          # API services and data fetching
└── assets/           # Static assets
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern web browser

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd /path/to/mcrrc_race_series/apps/fe
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## MCRRC Championship Series Rules

The application implements the complete MCRRC Championship Series scoring system:

### Point System
- **Overall Top 10 M/F**: 100, 90, 80, 75, 70, 65, 60, 55, 50, 45 points
- **Age Group Top 10**: 50, 45, 40, 38, 36, 34, 32, 30, 28, 26 points
- **Best Points Rule**: Runner gets the higher of overall or age group points

### Tiebreaker Rules (T1-T5)
1. **T1**: Head-to-head in races where both participated
2. **T2**: Next best Q+1 race performance
3. **T3**: Total distance raced in counting races
4. **T4**: Total time in counting races (lower wins)
5. **T5**: Performance in most recent race

### Series Requirements
- **Minimum Races**: 5 races to qualify for awards
- **Maximum Counting**: Up to 10 best races count toward total
- **Gun Time**: Official time used for all calculations

## Data Model

### Key Entities

**Runner**
```typescript
interface Runner {
  id: string;
  bibNumber: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  ageGroup: string;
  age?: number;
  club?: string;
  isActive: boolean;
}
```

**Race**
```typescript
interface Race {
  id: string;
  name: string;
  date: string;
  distance: number; // in miles
  series: string;
  year: number;
  location: string;
  isOfficial: boolean;
}
```

**Race Result**
```typescript
interface RaceResult {
  id: string;
  raceId: string;
  runnerId: string;
  place: number;
  placeGender: number;
  placeAgeGroup: number;
  gunTime: string; // HH:MM:SS format
  pace: string; // MM:SS per mile
  isDNF: boolean;
  isDQ: boolean;
}
```

**Series Standing**
```typescript
interface SeriesStanding {
  id: string;
  seriesId: string;
  runnerId: string;
  year: number;
  totalPoints: number;
  racesParticipated: number;
  overallRank?: number;
  genderRank?: number;
  ageGroupRank?: number;
  qualifyingRaces: QualifyingRace[];
}
```

## Features by Page

### Leaderboard (`/leaderboard`)
- Current series standings with multiple views
- Filters: Gender, age group, search by name/bib
- Sorting: Rank, points, races participated
- Real-time statistics and runner count

### Runner Profile (`/runner/:id`)
- Complete race history for the selected year
- Individual statistics and achievements
- Race-by-race performance details
- Points breakdown and ranking progression

### Race Results (`/race/:id`)
- Complete results for individual races
- Overall, gender, and age group placements
- Race information and statistics
- Links to runner profiles

### Admin Dashboard (`/admin`)
- System statistics and health monitoring
- Data import/export capabilities
- Manual override functionality for corrections
- Series configuration and management

## Development

### Mock Data
The application includes comprehensive mock data for development:
- 8 sample runners across different age groups
- 3 sample races with realistic times and placements
- Complete standings calculations with proper rankings
- Realistic race results with proper point calculations

### Customization
Key areas for customization:
- **Scoring Rules**: Modify `src/utils/scoring.ts`
- **UI Theme**: Update `tailwind.config.js` and `src/index.css`
- **Data Sources**: Modify `src/services/` for different APIs
- **Age Groups**: Update `AGE_GROUPS` constant in `src/types/index.ts`

## Next Steps

### Backend Integration
- Replace mock data with actual API calls
- Implement data scraping service for MCRRC.org
- Add authentication and user management
- Set up database schema and migrations

### Enhanced Features
- Real-time notifications for new results
- Advanced analytics and trends
- Runner comparison tools
- Historical data visualization
- Mobile app companion

### Performance Optimizations
- Virtual scrolling for large result sets
- Data caching and offline support
- Image optimization and lazy loading
- Bundle size optimization

## Contributing

1. Follow the existing code style and TypeScript patterns
2. Add proper type definitions for new features
3. Include unit tests for utility functions
4. Update documentation for any API changes
5. Test responsive design on multiple screen sizes

## License

This project is created for MCRRC and follows their guidelines and rules for the Championship Series.