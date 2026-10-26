import { SeedStrategy } from '../types';

/**
 * Expands prompt templates with matrix options like:
 * "A {cyberpunk|steampunk} portrait of a {cat|fox} wearing {goggles|a top hat}"
 * -> Produces the cartesian product of combinations.
 */
export function expandPromptMatrix(template: string): string[] {
  if (!template || !template.includes('{')) {
    return [template.trim()].filter(Boolean);
  }

  // Find occurrences of {a|b|c}
  const regex = /\{([^{}]+)\}/;
  const match = template.match(regex);

  if (!match) {
    return [template.trim()].filter(Boolean);
  }

  const fullMatch = match[0];
  const options = match[1].split('|').map(s => s.trim()).filter(Boolean);

  if (options.length === 0) {
    // Empty braces
    const simplified = template.replace(fullMatch, '');
    return expandPromptMatrix(simplified);
  }

  const results: string[] = [];
  for (const option of options) {
    const substituted = template.replace(fullMatch, option);
    const subExpansions = expandPromptMatrix(substituted);
    results.push(...subExpansions);
  }

  return results;
}

/**
 * Calculates deterministic or random seed for a batch item at index.
 */
export function calculateSeed(
  strategy: SeedStrategy,
  baseSeed: number,
  index: number
): number {
  switch (strategy) {
    case 'fixed':
      return Math.max(0, Math.floor(baseSeed));
    case 'sequential':
      return Math.max(0, Math.floor(baseSeed) + index);
    case 'random':
      // Return a random positive integer under 2^31 - 1
      return Math.floor(Math.random() * 2147483647);
  }
}

export interface BulkPromptRow {
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  params?: Record<string, any>;
}

/**
 * Parses multiline or CSV input for bulk prompts.
 */
export function parseBulkPrompts(rawText: string): BulkPromptRow[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) return [];

  // Check if first line looks like a CSV header
  const firstLine = lines[0].toLowerCase();
  const isCsv = firstLine.includes(',') && (firstLine.includes('prompt') || firstLine.includes('seed'));

  if (isCsv) {
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const promptIdx = headers.findIndex(h => h === 'prompt' || h === 'text');
    const negIdx = headers.findIndex(h => h.includes('negative'));
    const seedIdx = headers.findIndex(h => h === 'seed');

    const rows: BulkPromptRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = splitCsvLine(lines[i]);
      const p = promptIdx >= 0 && parts[promptIdx] ? parts[promptIdx].trim() : parts[0]?.trim();
      if (!p) continue;

      const row: BulkPromptRow = { prompt: p };
      if (negIdx >= 0 && parts[negIdx]) {
        row.negativePrompt = parts[negIdx].trim();
      }
      if (seedIdx >= 0 && parts[seedIdx]) {
        const s = parseInt(parts[seedIdx], 10);
        if (!isNaN(s)) row.seed = s;
      }
      rows.push(row);
    }
    return rows;
  }

  // Standard line-by-line text
  return lines.map(line => ({ prompt: line }));
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
