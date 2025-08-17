import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { 
  Runner, 
  Race, 
  RaceResult, 
  SeriesStanding, 
  Series, 
  FilterOptions, 
  SortOptions 
} from '../types';
import { api } from '../services/api';

// State interface
interface DataState {
  // Data
  runners: Runner[];
  races: Race[];
  results: RaceResult[];
  standings: SeriesStanding[];
  series: Series[];
  availableYears: number[];
  
  // UI State
  filters: FilterOptions;
  sort: SortOptions;
  loading: boolean;
  error: string | null;
  
  // Selected items
  selectedSeries: string | null;
  selectedYear: number;
}

// Action types
type DataAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_RUNNERS'; payload: Runner[] }
  | { type: 'SET_RACES'; payload: Race[] }
  | { type: 'SET_RESULTS'; payload: RaceResult[] }
  | { type: 'SET_STANDINGS'; payload: SeriesStanding[] }
  | { type: 'SET_SERIES'; payload: Series[] }
  | { type: 'SET_AVAILABLE_YEARS'; payload: number[] }
  | { type: 'SET_FILTERS'; payload: Partial<FilterOptions> }
  | { type: 'SET_SORT'; payload: SortOptions }
  | { type: 'SET_SELECTED_SERIES'; payload: string | null }
  | { type: 'SET_SELECTED_YEAR'; payload: number }
  | { type: 'ADD_RUNNER'; payload: Runner }
  | { type: 'UPDATE_RUNNER'; payload: Runner }
  | { type: 'REMOVE_RUNNER'; payload: string }
  | { type: 'ADD_RACE'; payload: Race }
  | { type: 'UPDATE_RACE'; payload: Race }
  | { type: 'REMOVE_RACE'; payload: string }
  | { type: 'REFRESH_STANDINGS' };

// Initial state
const initialState: DataState = {
  runners: [],
  races: [],
  results: [],
  standings: [],
  series: [],
  availableYears: [],
  filters: {
    gender: 'all',
    ageGroup: undefined,
    searchText: ''
  },
  sort: {
    field: 'rank',
    direction: 'asc'
  },
  loading: false,
  error: null,
  selectedSeries: null,
  selectedYear: new Date().getFullYear()
};

// Reducer
function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
      
    case 'SET_RUNNERS':
      return { ...state, runners: action.payload };
      
    case 'SET_RACES':
      return { ...state, races: action.payload };
      
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
      
    case 'SET_STANDINGS':
      return { ...state, standings: action.payload };
      
    case 'SET_SERIES':
      return { 
        ...state, 
        series: action.payload,
        selectedSeries: action.payload[0]?.id || null
      };
      
    case 'SET_AVAILABLE_YEARS':
      return { ...state, availableYears: action.payload };
      
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload } 
      };
      
    case 'SET_SORT':
      return { ...state, sort: action.payload };
      
    case 'SET_SELECTED_SERIES':
      return { ...state, selectedSeries: action.payload };
      
    case 'SET_SELECTED_YEAR':
      return { ...state, selectedYear: action.payload };
      
    case 'ADD_RUNNER':
      return { 
        ...state, 
        runners: [...state.runners, action.payload] 
      };
      
    case 'UPDATE_RUNNER':
      return {
        ...state,
        runners: state.runners.map(runner => 
          runner.id === action.payload.id ? action.payload : runner
        )
      };
      
    case 'REMOVE_RUNNER':
      return {
        ...state,
        runners: state.runners.filter(runner => runner.id !== action.payload)
      };
      
    case 'ADD_RACE':
      return { 
        ...state, 
        races: [...state.races, action.payload] 
      };
      
    case 'UPDATE_RACE':
      return {
        ...state,
        races: state.races.map(race => 
          race.id === action.payload.id ? action.payload : race
        )
      };
      
    case 'REMOVE_RACE':
      return {
        ...state,
        races: state.races.filter(race => race.id !== action.payload)
      };
      
    case 'REFRESH_STANDINGS':
      // This would trigger a recalculation of standings
      return state;
      
    default:
      return state;
  }
}

// Context
interface DataContextValue {
  state: DataState;
  dispatch: React.Dispatch<DataAction>;
  
  // Computed values
  filteredStandings: SeriesStanding[];
  filteredRunners: Runner[];
  availableAgeGroups: string[];
  
  // Actions
  updateFilters: (filters: Partial<FilterOptions>) => void;
  updateSort: (sort: SortOptions) => void;
  selectSeries: (seriesId: string | null) => void;
  selectYear: (year: number) => void;
  refreshData: () => Promise<void>;
  loadAvailableYears: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

// Provider component
interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  // Computed values
  const filteredStandings = React.useMemo(() => {
    let filtered = state.standings.filter(standing => 
      standing.year === state.selectedYear
    );

    // Apply filters
    if (state.filters.gender && state.filters.gender !== 'all') {
      const runnerIds = state.runners
        .filter(runner => runner.gender === state.filters.gender)
        .map(runner => runner.id);
      filtered = filtered.filter(standing => 
        runnerIds.includes(standing.runnerId)
      );
    }

    if (state.filters.ageGroup) {
      const runnerIds = state.runners
        .filter(runner => runner.ageGroup === state.filters.ageGroup)
        .map(runner => runner.id);
      filtered = filtered.filter(standing => 
        runnerIds.includes(standing.runnerId)
      );
    }

    if (state.filters.searchText) {
      const searchLower = state.filters.searchText.toLowerCase();
      const runnerIds = state.runners
        .filter(runner => 
          `${runner.firstName} ${runner.lastName}`.toLowerCase().includes(searchLower) ||
          runner.bibNumber.includes(searchLower)
        )
        .map(runner => runner.id);
      filtered = filtered.filter(standing => 
        runnerIds.includes(standing.runnerId)
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (state.sort.field) {
        case 'name':
          const aRunner = state.runners.find(r => r.id === a.runnerId);
          const bRunner = state.runners.find(r => r.id === b.runnerId);
          aVal = aRunner ? `${aRunner.firstName} ${aRunner.lastName}` : '';
          bVal = bRunner ? `${bRunner.firstName} ${bRunner.lastName}` : '';
          break;
        case 'points':
          aVal = a.totalPoints;
          bVal = b.totalPoints;
          break;
        case 'rank':
          aVal = a.overallRank || 999999;
          bVal = b.overallRank || 999999;
          break;
        case 'races':
          aVal = a.racesParticipated;
          bVal = b.racesParticipated;
          break;
        default:
          aVal = a.totalPoints;
          bVal = b.totalPoints;
      }

      if (state.sort.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [state.standings, state.runners, state.filters, state.sort, state.selectedYear]);

  const filteredRunners = React.useMemo(() => {
    return state.runners.filter(runner => runner.isActive);
  }, [state.runners]);

  const availableAgeGroups = React.useMemo(() => {
    const ageGroups = new Set(state.runners.map(runner => runner.ageGroup));
    return Array.from(ageGroups).sort();
  }, [state.runners]);

  // Actions
  const updateFilters = (filters: Partial<FilterOptions>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const updateSort = (sort: SortOptions) => {
    dispatch({ type: 'SET_SORT', payload: sort });
  };

  const selectSeries = (seriesId: string | null) => {
    dispatch({ type: 'SET_SELECTED_SERIES', payload: seriesId });
  };

  const selectYear = (year: number) => {
    dispatch({ type: 'SET_SELECTED_YEAR', payload: year });
  };

  const loadAvailableYears = async () => {
    try {
      const years = await api.getAvailableYears();
      dispatch({ type: 'SET_AVAILABLE_YEARS', payload: years });
    } catch (error) {
      console.error('Failed to load available years:', error);
      // Fallback to current year if API fails
      dispatch({ type: 'SET_AVAILABLE_YEARS', payload: [new Date().getFullYear()] });
    }
  };

  const refreshData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      // Load data from API endpoints (races now filtered by year)
      const [runners, races, standings, series] = await Promise.all([
        api.getRunners(),
        api.getRaces(state.selectedYear), // Only fetch races for selected year
        api.getStandings(state.selectedYear, state.selectedSeries || undefined),
        api.getSeries(),
      ]);
      
      dispatch({ type: 'SET_RUNNERS', payload: runners });
      dispatch({ type: 'SET_RACES', payload: races });
      dispatch({ type: 'SET_STANDINGS', payload: standings });
      dispatch({ type: 'SET_SERIES', payload: series });
      dispatch({ type: 'SET_LOADING', payload: false });
      
    } catch (error) {
      console.error('Failed to load data:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load data from server' 
      });
      
      // Fallback to mock data if API fails in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock data...');
        loadMockDataFallback();
      }
    }
  };

  // Fallback to mock data in development
  const loadMockDataFallback = () => {
    import('../utils/mockData').then(({ mockData }) => {
      dispatch({ type: 'SET_RUNNERS', payload: mockData.runners });
      dispatch({ type: 'SET_RACES', payload: mockData.races });
      dispatch({ type: 'SET_RESULTS', payload: mockData.results });
      dispatch({ type: 'SET_STANDINGS', payload: mockData.standings });
      dispatch({ type: 'SET_SERIES', payload: mockData.series });
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Using offline data - check API connection' });
    });
  };

  // Load initial data and available years
  useEffect(() => {
    // Load available years first (they don't change often and needed for year selector)
    loadAvailableYears();
    // Then load the main data
    refreshData();
  }, []);

  // Refresh data when year changes (but not available years)
  useEffect(() => {
    if (state.selectedYear) {
      refreshData();
    }
  }, [state.selectedYear]);

  const value: DataContextValue = {
    state,
    dispatch,
    filteredStandings,
    filteredRunners,
    availableAgeGroups,
    updateFilters,
    updateSort,
    selectSeries,
    selectYear,
    refreshData,
    loadAvailableYears
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// Hook to use the context
export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
