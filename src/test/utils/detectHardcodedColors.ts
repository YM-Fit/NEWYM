/**
 * Hardcoded Color Detector
 * 
 * Tools for detecting hardcoded colors in code files.
 * Helps identify colors that should be replaced with theme variables.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface ColorMatch {
  type: 'hex' | 'rgb' | 'rgba' | 'named';
  value: string;
  line: number;
  column: number;
  context: string;
}

export interface FileColorReport {
  filePath: string;
  matches: ColorMatch[];
  totalMatches: number;
}

export interface ColorReport {
  files: FileColorReport[];
  totalFiles: number;
  totalMatches: number;
}

/**
 * Finds all hex color codes in a string
 * Matches: #fff, #ffffff, #FFF, #FFFFFF
 */
export function findHardcodedHexColors(code: string, filePath?: string): ColorMatch[] {
  const matches: ColorMatch[] = [];
  const lines = code.split('\n');

  // Regex for hex colors: # followed by 3 or 6 hex digits
  const hexRegex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

  lines.forEach((line, lineIndex) => {
    let match;
    while ((match = hexRegex.exec(line)) !== null) {
      matches.push({
        type: 'hex',
        value: match[0],
        line: lineIndex + 1,
        column: match.index + 1,
        context: line.trim().substring(Math.max(0, match.index - 30), match.index + match[0].length + 30),
      });
    }
  });

  return matches;
}

/**
 * Finds all rgb/rgba color codes in a string
 * Matches: rgb(255, 255, 255), rgba(255, 255, 255, 0.5)
 */
export function findHardcodedRgbColors(code: string, filePath?: string): ColorMatch[] {
  const matches: ColorMatch[] = [];
  const lines = code.split('\n');

  // Regex for rgb/rgba colors
  const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+\s*)?\)/g;

  lines.forEach((line, lineIndex) => {
    let match;
    while ((match = rgbRegex.exec(line)) !== null) {
      matches.push({
        type: match[0].startsWith('rgba') ? 'rgba' : 'rgb',
        value: match[0],
        line: lineIndex + 1,
        column: match.index + 1,
        context: line.trim().substring(Math.max(0, match.index - 30), match.index + match[0].length + 30),
      });
    }
  });

  return matches;
}

/**
 * Finds common named color strings
 * Matches: 'white', 'black', 'red', etc.
 */
export function findHardcodedColorStrings(code: string, filePath?: string): ColorMatch[] {
  const matches: ColorMatch[] = [];
  const lines = code.split('\n');

  // Common CSS color names that should use theme variables
  const colorNames = [
    'white', 'black', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
    'gray', 'grey', 'orange', 'purple', 'pink', 'brown', 'silver', 'gold',
  ];

  const colorNamesRegex = new RegExp(
    `(['"\`])(${colorNames.join('|')})\\1`,
    'gi'
  );

  lines.forEach((line, lineIndex) => {
    let match;
    while ((match = colorNamesRegex.exec(line)) !== null) {
      // Skip if it's part of a CSS variable or theme reference
      if (line.includes('--') || line.includes('var(') || line.includes('theme')) {
        continue;
      }

      matches.push({
        type: 'named',
        value: match[2],
        line: lineIndex + 1,
        column: match.index + 1,
        context: line.trim().substring(Math.max(0, match.index - 30), match.index + match[0].length + 30),
      });
    }
  });

  return matches;
}

/**
 * Scans a file for all hardcoded colors
 */
export function scanFileForHardcodedColors(filePath: string): FileColorReport {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const hexMatches = findHardcodedHexColors(content, filePath);
    const rgbMatches = findHardcodedRgbColors(content, filePath);
    const namedMatches = findHardcodedColorStrings(content, filePath);

    const allMatches = [...hexMatches, ...rgbMatches, ...namedMatches];

    // Sort by line number
    allMatches.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.column - b.column;
    });

    return {
      filePath,
      matches: allMatches,
      totalMatches: allMatches.length,
    };
  } catch (error) {
    return {
      filePath,
      matches: [],
      totalMatches: 0,
    };
  }
}

/**
 * Scans multiple files for hardcoded colors
 */
export function scanFilesForHardcodedColors(filePaths: string[]): ColorReport {
  const files: FileColorReport[] = filePaths.map(scanFileForHardcodedColors);

  const totalMatches = files.reduce((sum, file) => sum + file.totalMatches, 0);

  return {
    files: files.filter(f => f.totalMatches > 0),
    totalFiles: files.length,
    totalMatches,
  };
}

/**
 * Generates a human-readable report
 */
export function generateReport(report: ColorReport): string {
  if (report.totalMatches === 0) {
    return '✅ No hardcoded colors found!';
  }

  let output = `\n📊 Hardcoded Colors Report\n`;
  output += `═══════════════════════════════════════\n\n`;
  output += `Total files scanned: ${report.totalFiles}\n`;
  output += `Total hardcoded colors found: ${report.totalMatches}\n\n`;

  report.files.forEach(file => {
    output += `\n📄 ${file.filePath}\n`;
    output += `   Found ${file.totalMatches} hardcoded color(s):\n\n`;

    file.matches.forEach(match => {
      output += `   Line ${match.line}:${match.column} [${match.type.toUpperCase()}]\n`;
      output += `   Color: ${match.value}\n`;
      output += `   Context: ...${match.context}...\n\n`;
    });
  });

  output += `\n💡 Recommendation: Replace hardcoded colors with theme variables from theme.css\n`;

  return output;
}

/**
 * Filters out false positives (colors that are part of theme definitions or comments)
 */
export function filterFalsePositives(matches: ColorMatch[], filePath: string): ColorMatch[] {
  return matches.filter(match => {
    const context = match.context.toLowerCase();

    // Skip if in comment
    if (context.includes('//') || context.includes('/*') || context.includes('*')) {
      return false;
    }

    // Skip if in CSS variable definition
    if (context.includes('--color-') || context.includes('var(--')) {
      return false;
    }

    // Skip if in theme.css (these are the definitions themselves)
    if (filePath.includes('theme.css')) {
      return false;
    }

    // Skip common test/example colors that are intentional
    if (context.includes('test') || context.includes('example') || context.includes('demo')) {
      // Only skip if it's clearly a test file
      if (filePath.includes('.test.') || filePath.includes('.spec.')) {
        return false;
      }
    }

    return true;
  });
}
