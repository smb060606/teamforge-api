// Simple in-memory cache for analytics results
const cache = new Map<string, any>();

export function getCacheKey(metricName: string, startDate: string, endDate: string): string {
  return `analytics:${metricName}:${startDate}:${endDate}`;
}

export function getFromCache(key: string): any | null {
  if (cache.has(key)) {
    console.log('Cache hit for', key);
    return cache.get(key);
  }
  return null;
}

export function setInCache(key: string, value: any): void {
  cache.set(key, value);
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheSize(): number {
  return cache.size;
}
