// Utility functions for MCRRC Race Series

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { type AgeGroup, CHAMPIONSHIP_SERIES_POINTS } from '../types';

/**
 * Utility for merging Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format time string (HH:MM:SS or MM:SS) to display format
 * Drops hours if they are 0 to show cleaner MM:SS format
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '-';
  
  // Ensure it's a string and clean it up
  const cleanTimeStr = String(timeStr).trim();
  
  const parts = cleanTimeStr.split(':');
  if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = parts;
    const hourNum = parseInt(hours, 10);
    // Drop hours if they're 0
    if (hourNum === 0) {
      return `${minutes}:${seconds}`;
    }
    return `${hourNum}:${minutes}:${seconds}`;
  } else if (parts.length === 2) {
    // MM:SS format - return as is
    return cleanTimeStr;
  }
  
  // Fallback - return cleaned string
  return cleanTimeStr;
}

/**
 * Convert time string to seconds for calculations
 */
export function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Convert seconds back to time string
 */
export function secondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate pace per mile from total time and distance
 */
export function calculatePace(timeStr: string, distanceMiles: number): string {
  const totalSeconds = timeToSeconds(timeStr);
  if (totalSeconds === 0 || distanceMiles === 0) return '-';
  
  const paceSeconds = totalSeconds / distanceMiles;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Determine age group from age
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age < 15) return '0-14';
  if (age < 20) return '15-19';
  if (age < 25) return '20-24';
  if (age < 30) return '25-29';
  if (age < 35) return '30-34';
  if (age < 40) return '35-39';
  if (age < 45) return '40-44';
  if (age < 50) return '45-49';
  if (age < 55) return '50-54';
  if (age < 60) return '55-59';
  if (age < 65) return '60-64';
  if (age < 70) return '65-69';
  if (age < 75) return '70-74';
  if (age < 80) return '75-79';
  return '80-99';
}

/**
 * Calculate age from birth date and race date
 */
export function calculateAge(birthDate: string, raceDate: string): number {
  const birth = new Date(birthDate);
  const race = new Date(raceDate);
  
  let age = race.getFullYear() - birth.getFullYear();
  const monthDiff = race.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && race.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Calculate Championship Series points based on place and category
 */
export function calculatePoints(
  place: number,
  category: 'overall' | 'age-group'
): number {
  const pointsArray = category === 'overall' 
    ? CHAMPIONSHIP_SERIES_POINTS.OVERALL 
    : CHAMPIONSHIP_SERIES_POINTS.AGE_GROUP;
  
  if (place <= pointsArray.length) {
    return pointsArray[place - 1];
  }
  return 0;
}

/**
 * Format place with suffix (1st, 2nd, 3rd, etc.)
 */
export function formatPlace(place: number): string {
  if (place <= 0) return '-';
  
  const lastDigit = place % 10;
  const secondToLastDigit = Math.floor((place % 100) / 10);
  
  if (secondToLastDigit === 1) {
    return `${place}th`;
  }
  
  switch (lastDigit) {
    case 1:
      return `${place}st`;
    case 2:
      return `${place}nd`;
    case 3:
      return `${place}rd`;
    default:
      return `${place}th`;
  }
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format runner name
 */
export function formatRunnerName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

/**
 * Generate runner initials
 */
export function getRunnerInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Validate time string format
 */
export function isValidTime(timeStr: string): boolean {
  const timeRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;
  return timeRegex.test(timeStr);
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sort array by multiple criteria
 */
export function sortBy<T>(
  array: T[],
  ...criteria: Array<(item: T) => any>
): T[] {
  return array.slice().sort((a, b) => {
    for (const criterion of criteria) {
      const aVal = criterion(a);
      const bVal = criterion(b);
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

/**
 * Group array by a key function
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Export ranking utilities
export { getRankIcon, getRankBadgeVariant, StyledPlace } from './ranking';
