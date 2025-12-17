// Game utilities for JSON Snake easter egg

export interface JsonMetrics {
  totalKeys: number;
  maxDepth: number;
  topLevelKeys: number;
  arrayCount: number;
  totalSize: number;
}

export type ValueType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export interface JsonKeyInfo {
  key: string;
  displayKey: string;
  valueType: ValueType;
}

export interface GameParams {
  initialSpeed: number;      // ms per tick (lower = faster)
  startLength: number;       // initial snake length
  speedAcceleration: number; // ms to subtract per food eaten
  bonusFoodChance: number;   // 0-1 probability
  minSpeed: number;          // fastest allowed speed
}

// Fixed, balanced game parameters for consistent gameplay
export const DEFAULT_GAME_PARAMS: GameParams = {
  initialSpeed: 120,        // Comfortable starting speed
  startLength: 3,           // Classic snake starting length
  speedAcceleration: 1,     // Gradual speed increase
  bonusFoodChance: 0.15,    // 15% chance for bonus food
  minSpeed: 60,             // Cap at reasonably fast speed
};

// Color mapping for value types
export const VALUE_TYPE_COLORS: Record<ValueType, string> = {
  string: '#22c55e',   // green
  number: '#3b82f6',   // blue
  boolean: '#eab308',  // yellow
  object: '#a855f7',   // purple
  array: '#06b6d4',    // cyan
  null: '#6b7280',     // gray
};

/**
 * Get the type of a JSON value
 */
function getValueType(value: unknown): ValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'null';
}

/**
 * Extract metrics from JSON data for game parameter calculation
 */
export function extractJsonMetrics(data: unknown, maxNodes = 10000): JsonMetrics {
  let totalKeys = 0;
  let maxDepth = 0;
  let arrayCount = 0;
  let nodeCount = 0;

  function traverse(value: unknown, depth: number) {
    if (nodeCount >= maxNodes) return;
    nodeCount++;

    if (depth > maxDepth) maxDepth = depth;

    if (Array.isArray(value)) {
      arrayCount++;
      for (const item of value) {
        traverse(item, depth + 1);
      }
    } else if (value !== null && typeof value === 'object') {
      const keys = Object.keys(value);
      totalKeys += keys.length;
      for (const key of keys) {
        traverse((value as Record<string, unknown>)[key], depth + 1);
      }
    }
  }

  traverse(data, 0);

  const topLevelKeys = data !== null && typeof data === 'object' && !Array.isArray(data)
    ? Object.keys(data).length
    : 0;

  return {
    totalKeys,
    maxDepth,
    topLevelKeys,
    arrayCount,
    totalSize: JSON.stringify(data).length,
  };
}

/**
 * Extract keys from JSON data with their value types (depth-first)
 */
export function extractJsonKeys(data: unknown, maxKeys = 1000): JsonKeyInfo[] {
  const keys: JsonKeyInfo[] = [];

  function traverse(value: unknown) {
    if (keys.length >= maxKeys) return;

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length && keys.length < maxKeys; i++) {
        traverse(value[i]);
      }
    } else if (value !== null && typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        if (keys.length >= maxKeys) break;
        keys.push({
          key,
          displayKey: key.slice(0, 3),
          valueType: getValueType(val),
        });
        traverse(val);
      }
    }
  }

  traverse(data);
  return keys;
}

/**
 * Calculate game parameters based on JSON metrics
 */
export function calculateGameParams(metrics: JsonMetrics): GameParams {
  // Logarithmic scaling for speed: more keys = faster game
  // Range: 80-150ms per tick
  const logKeys = metrics.totalKeys > 0 ? Math.log10(metrics.totalKeys) : 0;
  const initialSpeed = Math.max(80, Math.min(150, 150 - logKeys * 20));

  // Snake start length based on top-level keys, clamped 3-7
  const startLength = Math.max(3, Math.min(7, metrics.topLevelKeys || 3));

  // Speed acceleration based on depth
  const speedAcceleration = Math.min(5, Math.max(0.5, metrics.maxDepth * 0.5));

  // Bonus food more likely if JSON has arrays
  const bonusFoodChance = metrics.arrayCount > 0 ? 0.2 : 0.05;

  return {
    initialSpeed: Math.round(initialSpeed),
    startLength,
    speedAcceleration,
    bonusFoodChance,
    minSpeed: 60, // Never faster than 60ms per tick
  };
}

/**
 * Get the first letter found in JSON string (for trigger calculation)
 */
export function getFirstLetter(json: string): string | null {
  const match = json.match(/[a-zA-Z]/);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Get required clicks for game trigger based on first letter
 */
export function getRequiredClicks(json: string): number {
  const letter = getFirstLetter(json);
  if (!letter) return 10; // Fallback to 'j' for "json"
  return letter.charCodeAt(0) - 96; // 'a' = 1, 'b' = 2, etc.
}

/**
 * Generate a simple hash signature for JSON (for high score tracking)
 */
export function hashJsonSignature(json: string): string {
  const sample = json.slice(0, 100);
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
