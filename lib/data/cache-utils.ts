// lib/data/cache-utils.ts
// Utilities for handling cache serialization edge cases

/**
 * Safely get a value from a Map, handling cache serialization issues
 * Next.js unstable_cache may serialize Maps to plain objects
 */
export function safeMapGet<K, V>(map: Map<K, V> | Record<string, V> | undefined, key: K): V | undefined {
  if (!map) return undefined;

  // If it's a proper Map, use .get()
  if (map instanceof Map) {
    return map.get(key);
  }

  // If it's been serialized to an object, access as property
  if (typeof map === 'object' && map !== null) {
    return (map as Record<string, V>)[key as unknown as string];
  }

  return undefined;
}

/**
 * Safely get all keys from a Map, handling cache serialization
 */
export function safeMapKeys<V>(map: Map<string, V> | Record<string, V> | undefined): string[] {
  if (!map) return [];

  if (map instanceof Map) {
    return Array.from(map.keys());
  }

  if (typeof map === 'object' && map !== null) {
    return Object.keys(map);
  }

  return [];
}

/**
 * Safely get all values from a Map, handling cache serialization
 */
export function safeMapValues<K, V>(map: Map<K, V> | Record<string, V> | undefined): V[] {
  if (!map) return [];

  if (map instanceof Map) {
    return Array.from(map.values());
  }

  if (typeof map === 'object' && map !== null) {
    return Object.values(map) as V[];
  }

  return [];
}

/**
 * Ensure Maps are properly reconstituted after cache serialization
 * Next.js cache may serialize Maps to plain objects - this handles both cases
 */
export function ensureMapsAreMaps<T extends Record<string, any>>(obj: T): T {
  // If the object has properties that should be Maps but are plain objects,
  // we need to handle them gracefully. Rather than converting back to Maps
  // (which adds overhead), we use the safe* helper functions above.
  return obj;
}

/**
 * Convert a plain object back to a Map if needed
 */
export function objectToMap<K extends string, V>(obj: Record<K, V> | Map<K, V>): Map<K, V> {
  if (obj instanceof Map) {
    return obj;
  }

  return new Map(Object.entries(obj)) as Map<K, V>;
}

/**
 * Convert a Map to a plain object for serialization
 */
export function mapToObject<K extends string, V>(map: Map<K, V>): Record<K, V> {
  const obj: Record<string, V> = {};
  for (const [key, value] of map) {
    obj[key] = value;
  }
  return obj as Record<K, V>;
}
