/**
 * Data validation utilities for race result scraping
 * 
 * This module provides functions to validate scraped data before storing it in the database,
 * helping prevent data corruption and duplicate entries.
 */

export interface ScrapedRunner {
  bibNumber: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  age: number;
  club?: string;
}

export interface ScrapedRaceResult {
  bibNumber: string;
  place: number;
  gunTime: string;
  chipTime?: string;
  genderPlace?: number;
  ageGroupPlace?: number;
  pace?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedData?: any;
}

/**
 * Validate a scraped runner entry
 */
export function validateRunner(runner: Partial<ScrapedRunner>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for required fields
  if (!runner.firstName || typeof runner.firstName !== 'string') {
    errors.push('Missing or invalid firstName');
  }
  
  if (!runner.lastName || typeof runner.lastName !== 'string') {
    errors.push('Missing or invalid lastName');
  }
  
  if (!runner.gender || !['M', 'F'].includes(runner.gender)) {
    errors.push('Missing or invalid gender (must be M or F)');
  }
  
  if (!runner.age || typeof runner.age !== 'number' || runner.age < 1 || runner.age > 120) {
    errors.push('Missing or invalid age (must be 1-120)');
  }
  
  // Check for obviously corrupted data
  if (runner.firstName) {
    // Check if firstName looks like a time (contains colon)
    if (runner.firstName.includes(':')) {
      errors.push('firstName appears to be a time string');
    }
    
    // Check if firstName is a single letter (likely gender)
    if (runner.firstName.length === 1 && /^[MF]$/i.test(runner.firstName)) {
      errors.push('firstName appears to be a gender marker');
    }
    
    // Check if firstName contains numbers (likely bib number or age)
    if (/^\d+$/.test(runner.firstName)) {
      errors.push('firstName appears to be numeric (possibly bib or age)');
    }
    
    // Check for location patterns
    if (runner.firstName.includes(' MD') || runner.firstName.includes(' VA')) {
      errors.push('firstName appears to contain location data');
    }
    
    // Check for unreasonably short names
    if (runner.firstName.length < 2) {
      warnings.push('firstName is very short (less than 2 characters)');
    }
    
    // Check for special characters that suggest data corruption
    if (/[^\w\s\-'.]/.test(runner.firstName)) {
      warnings.push('firstName contains unusual characters');
    }
  }
  
  if (runner.lastName) {
    // Similar checks for lastName
    if (runner.lastName.includes(':')) {
      errors.push('lastName appears to be a time string');
    }
    
    if (runner.lastName.length === 1 && /^[MF]$/i.test(runner.lastName)) {
      errors.push('lastName appears to be a gender marker');
    }
    
    if (/^\d+$/.test(runner.lastName)) {
      errors.push('lastName appears to be numeric');
    }
    
    // Empty lastName is a common corruption
    if (runner.lastName.trim() === '') {
      errors.push('lastName is empty');
    }
  }
  
  // Check bib number
  if (runner.bibNumber) {
    if (!/^\d+$/.test(runner.bibNumber) && runner.bibNumber !== '0') {
      warnings.push('bibNumber contains non-numeric characters');
    }
    
    // Very long bib numbers are suspicious
    if (runner.bibNumber.length > 6) {
      warnings.push('bibNumber is unusually long');
    }
  }
  
  // Check club field for corruption
  if (runner.club) {
    // Club shouldn't be a time
    if (runner.club.includes(':') && /\d+:\d+/.test(runner.club)) {
      warnings.push('club field appears to contain time data');
    }
    
    // Club shouldn't be gender
    if (/^[MF]$/i.test(runner.club)) {
      warnings.push('club field appears to be gender marker');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a scraped race result entry
 */
export function validateRaceResult(result: Partial<ScrapedRaceResult>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check place
  if (!result.place || typeof result.place !== 'number' || result.place < 1) {
    errors.push('Missing or invalid place (must be positive number)');
  }
  
  if (result.place && result.place > 10000) {
    warnings.push('Place is very high (over 10,000)');
  }
  
  // Check gun time
  if (!result.gunTime || typeof result.gunTime !== 'string') {
    errors.push('Missing or invalid gunTime');
  } else {
    if (!isValidTimeFormat(result.gunTime)) {
      errors.push('gunTime is not in valid time format');
    }
  }
  
  // Check chip time if provided
  if (result.chipTime && !isValidTimeFormat(result.chipTime)) {
    warnings.push('chipTime is not in valid time format');
  }
  
  // Check gender place
  if (result.genderPlace && (result.genderPlace < 1 || result.genderPlace > result.place)) {
    warnings.push('genderPlace is invalid (should be <= overall place)');
  }
  
  // Check age group place
  if (result.ageGroupPlace && (result.ageGroupPlace < 1 || result.ageGroupPlace > result.place)) {
    warnings.push('ageGroupPlace is invalid (should be <= overall place)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if a string is a valid time format (H:MM:SS, HH:MM:SS, MM:SS, etc.)
 */
function isValidTimeFormat(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  
  // Common time formats: MM:SS, H:MM:SS, HH:MM:SS, M:SS, etc.
  const timePattern = /^\d{1,2}:\d{2}(:\d{2})?(\.\d+)?$/;
  
  if (!timePattern.test(timeStr)) return false;
  
  const parts = timeStr.split(':');
  
  // Check minutes/seconds are valid ranges
  if (parts.length >= 2) {
    const minutes = parseInt(parts[1]);
    if (minutes > 59) return false;
  }
  
  if (parts.length >= 3) {
    const seconds = parseFloat(parts[2]);
    if (seconds >= 60) return false;
  }
  
  return true;
}

/**
 * Normalize runner name for duplicate detection
 */
export function normalizeRunnerName(firstName: string, lastName: string): string {
  const normalize = (name: string) => name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '') // Remove non-alphabetic characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  return `${normalize(firstName)}|${normalize(lastName)}`;
}

/**
 * Check if two runners are likely the same person
 */
export function areRunnersSimilar(runner1: ScrapedRunner, runner2: ScrapedRunner): boolean {
  const name1 = normalizeRunnerName(runner1.firstName, runner1.lastName);
  const name2 = normalizeRunnerName(runner2.firstName, runner2.lastName);
  
  // Exact name match
  if (name1 === name2) return true;
  
  // Check for common variations
  const firstName1 = runner1.firstName.toLowerCase().trim();
  const firstName2 = runner2.firstName.toLowerCase().trim();
  const lastName1 = runner1.lastName.toLowerCase().trim();
  const lastName2 = runner2.lastName.toLowerCase().trim();
  
  // Same last name and similar first name
  if (lastName1 === lastName2) {
    // Check for nickname variations (Rob/Robert, Liz/Elizabeth, etc.)
    if (firstName1.startsWith(firstName2) || firstName2.startsWith(firstName1)) {
      return true;
    }
    
    // Check for common nickname patterns
    const nicknames = new Map([
      ['rob', 'robert'], ['bob', 'robert'], ['bill', 'william'], ['will', 'william'],
      ['liz', 'elizabeth'], ['beth', 'elizabeth'], ['dick', 'richard'], ['rick', 'richard'],
      ['jim', 'james'], ['jimmy', 'james'], ['mike', 'michael'], ['tom', 'thomas'],
      ['dave', 'david'], ['dan', 'daniel'], ['chris', 'christopher'], ['matt', 'matthew'],
      ['pat', 'patricia'], ['pat', 'patrick'], ['sue', 'susan'], ['nancy', 'anne']
    ]);
    
    if (nicknames.get(firstName1) === firstName2 || nicknames.get(firstName2) === firstName1) {
      return true;
    }
  }
  
  return false;
}

/**
 * Sanitize and clean runner data
 */
export function sanitizeRunner(runner: Partial<ScrapedRunner>): ScrapedRunner | null {
  if (!runner.firstName || !runner.lastName) return null;
  
  // Clean up names
  const firstName = runner.firstName.trim().replace(/\s+/g, ' ');
  const lastName = runner.lastName.trim().replace(/\s+/g, ' ');
  
  // Basic validation
  if (firstName.length < 1 || lastName.length < 1) return null;
  
  // Ensure age is reasonable
  let age = runner.age || 35; // Default fallback
  if (age < 1 || age > 120) age = 35;
  
  // Ensure gender is valid
  let gender: 'M' | 'F' = runner.gender || 'M';
  if (!['M', 'F'].includes(gender)) gender = 'M';
  
  // Clean bib number
  let bibNumber = runner.bibNumber || '0';
  if (!/^\d+$/.test(bibNumber)) bibNumber = '0';
  
  return {
    firstName,
    lastName,
    gender,
    age,
    bibNumber,
    ...(runner.club && { club: runner.club.trim() })
  };
}

/**
 * Batch validate runners and return only valid ones
 */
export function validateRunnerBatch(runners: Partial<ScrapedRunner>[]): {
  valid: ScrapedRunner[];
  invalid: Array<{ runner: Partial<ScrapedRunner>; validation: ValidationResult }>;
  stats: { total: number; valid: number; invalid: number; warnings: number };
} {
  const valid: ScrapedRunner[] = [];
  const invalid: Array<{ runner: Partial<ScrapedRunner>; validation: ValidationResult }> = [];
  let warningCount = 0;
  
  for (const runner of runners) {
    const validation = validateRunner(runner);
    
    if (validation.isValid) {
      const sanitized = sanitizeRunner(runner);
      if (sanitized) {
        valid.push(sanitized);
        if (validation.warnings.length > 0) warningCount++;
      }
    } else {
      invalid.push({ runner, validation });
    }
  }
  
  return {
    valid,
    invalid,
    stats: {
      total: runners.length,
      valid: valid.length,
      invalid: invalid.length,
      warnings: warningCount
    }
  };
}
