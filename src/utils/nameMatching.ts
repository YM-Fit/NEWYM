/**
 * Name Matching Utilities for Calendar-Trainee Sync
 * 
 * Provides functions to match names from Google Calendar events
 * to trainees in the system.
 */

import type { Trainee } from '../types';

export interface MatchResult {
  trainee: Trainee;
  score: number;
  matchType: 'exact' | 'close' | 'partial';
}

export interface EventWithName {
  id: string;
  summary: string;
  extractedName: string | null;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export interface MatchedEvent {
  event: EventWithName;
  matches: MatchResult[];
  status: 'matched' | 'pending' | 'unmatched' | 'new';
  selectedTraineeId?: string;
}

/**
 * Normalize a name for comparison
 * - Converts to lowercase
 * - Removes extra whitespace
 * - Removes common prefixes/suffixes
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Remove common Hebrew prefixes
    .replace(/^(אימון|פגישה|טיפול|מפגש)\s*[-–:]\s*/i, '')
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create distance matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate similarity score between two names (0-100)
 * Uses multiple methods:
 * 1. Exact match (100)
 * 2. Levenshtein similarity
 * 3. Partial match (first/last name)
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Exact match
  if (n1 === n2) {
    return 100;
  }
  
  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length >= n2.length ? n1 : n2;
    return Math.round(85 * (shorter.length / longer.length) + 10);
  }
  
  // Split into parts (first name, last name)
  const parts1 = n1.split(' ').filter(p => p.length > 1);
  const parts2 = n2.split(' ').filter(p => p.length > 1);
  
  // Check if any part matches exactly
  const matchingParts = parts1.filter(p1 => parts2.some(p2 => p1 === p2));
  if (matchingParts.length > 0) {
    const totalParts = Math.max(parts1.length, parts2.length);
    return Math.round(70 + (30 * matchingParts.length / totalParts));
  }
  
  // Calculate Levenshtein-based similarity
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 0;
  
  const distance = levenshteinDistance(n1, n2);
  const similarity = Math.round((1 - distance / maxLen) * 100);
  
  return Math.max(0, similarity);
}

/**
 * Find best matches for an event name among trainees
 * Returns matches sorted by score (highest first)
 */
export function findBestMatches(
  eventName: string,
  trainees: Trainee[],
  minScore: number = 60
): MatchResult[] {
  const matches: MatchResult[] = [];
  
  for (const trainee of trainees) {
    // Check main name
    const mainScore = calculateNameSimilarity(eventName, trainee.full_name);
    
    if (mainScore >= minScore) {
      matches.push({
        trainee,
        score: mainScore,
        matchType: mainScore === 100 ? 'exact' : mainScore >= 80 ? 'close' : 'partial'
      });
      continue;
    }
    
    // For pairs, check individual names
    if (trainee.is_pair) {
      let bestPairScore = mainScore;
      
      if (trainee.pair_name_1) {
        const score1 = calculateNameSimilarity(eventName, trainee.pair_name_1);
        bestPairScore = Math.max(bestPairScore, score1);
      }
      
      if (trainee.pair_name_2) {
        const score2 = calculateNameSimilarity(eventName, trainee.pair_name_2);
        bestPairScore = Math.max(bestPairScore, score2);
      }
      
      if (bestPairScore >= minScore) {
        matches.push({
          trainee,
          score: bestPairScore,
          matchType: bestPairScore === 100 ? 'exact' : bestPairScore >= 80 ? 'close' : 'partial'
        });
      }
    }
  }
  
  // Sort by score (highest first)
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Extract name from calendar event summary
 * Handles various formats:
 * - "אימון - שם"
 * - "שם - אימון"
 * - "אימון עם שם"
 * - Just the name
 */
export function extractNameFromEvent(summary: string): string | null {
  if (!summary || summary.trim().length === 0) {
    return null;
  }
  
  const trimmed = summary.trim();
  
  // Pattern: "אימון - שם" or "אימון – שם"
  let match = trimmed.match(/^(?:אימון|פגישה|טיפול|מפגש)\s*[-–:]\s*(.+)$/i);
  if (match) return match[1].trim();
  
  // Pattern: "שם - אימון"
  match = trimmed.match(/^(.+?)\s*[-–:]\s*(?:אימון|פגישה|טיפול|מפגש)$/i);
  if (match) return match[1].trim();
  
  // Pattern: "אימון עם שם"
  match = trimmed.match(/^(?:אימון|פגישה|טיפול|מפגש)\s+(?:עם|ל)\s+(.+)$/i);
  if (match) return match[1].trim();
  
  // If no pattern matched but it doesn't look like a generic event, return as-is
  const genericWords = ['אימון', 'פגישה', 'טיפול', 'מפגש', 'הפסקה', 'פנוי', 'תפוס'];
  const isGeneric = genericWords.some(word => 
    trimmed.toLowerCase() === word.toLowerCase()
  );
  
  if (!isGeneric && trimmed.length > 1) {
    return trimmed;
  }
  
  return null;
}

/**
 * Process calendar events and find matches for each
 */
export function matchEventsToTrainees(
  events: Array<{
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
  }>,
  trainees: Trainee[]
): MatchedEvent[] {
  const results: MatchedEvent[] = [];
  
  for (const event of events) {
    const extractedName = extractNameFromEvent(event.summary);
    
    const eventWithName: EventWithName = {
      id: event.id,
      summary: event.summary,
      extractedName,
      start: event.start,
      end: event.end
    };
    
    if (!extractedName) {
      results.push({
        event: eventWithName,
        matches: [],
        status: 'unmatched'
      });
      continue;
    }
    
    const matches = findBestMatches(extractedName, trainees);
    
    if (matches.length === 0) {
      results.push({
        event: eventWithName,
        matches: [],
        status: 'new' // New person not in system
      });
    } else if (matches.length === 1 && matches[0].matchType === 'exact') {
      // Auto-match for exact matches
      results.push({
        event: eventWithName,
        matches,
        status: 'matched',
        selectedTraineeId: matches[0].trainee.id
      });
    } else {
      // Needs user confirmation
      results.push({
        event: eventWithName,
        matches,
        status: 'pending'
      });
    }
  }
  
  return results;
}

/**
 * Group matched events by unique name for easier display
 */
export function groupEventsByName(
  matchedEvents: MatchedEvent[]
): Map<string, MatchedEvent[]> {
  const groups = new Map<string, MatchedEvent[]>();
  
  for (const event of matchedEvents) {
    const key = event.event.extractedName?.toLowerCase() || event.event.summary.toLowerCase();
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(event);
  }
  
  return groups;
}
