// BUG #35: In-memory cache with no TTL, no size limit, no eviction policy
// Once a cache entry is set, it lives forever. This is a memory leak.
// Additionally, the cache stores `any` type with no serialization boundary.

const cache = new Map<string, any>();

// BUG #33: Cache key missing teamId/projectId — data leakage between teams
// Team A's analytics response can be served to Team B if they request
// the same metric name and date range
export function getCacheKey(metricName: string, startDate: string, endDate: string): string {
  return `analytics:${metricName}:${startDate}:${endDate}`;
}

export function getFromCache(key: string): any | null {
  // BUG #37: console.log instead of structured logger
  if (cache.has(key)) {
    console.log('Cache hit for', key);
    return cache.get(key);
  }
  return null;
}

export function setInCache(key: string, value: any): void {
  // No TTL — entries live forever
  // No size check — cache grows unbounded
  cache.set(key, value);
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheSize(): number {
  return cache.size;
}
