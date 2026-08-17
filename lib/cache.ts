/**
 * Server-side Hybrid Cache (In-Memory + Upstash Redis REST API ready)
 * Reduces Supabase database reads to nearly zero for frequent requests.
 */

// In-Memory cache map fallback
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function getCachedData<T>(key: string, ttlSeconds = 600): Promise<T | null> {
  // 1. Try Upstash Redis if configured
  if (upstashUrl && upstashToken) {
    try {
      const res = await fetch(`${upstashUrl}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          return JSON.parse(json.result) as T;
        }
      }
    } catch (e) {
      console.warn('Redis read error, falling back to memory cache:', e);
    }
  }

  // 2. Memory Cache fallback
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as T;
  }

  return null;
}

export async function setCachedData(key: string, data: any, ttlSeconds = 600): Promise<void> {
  // 1. Save to Upstash Redis if configured
  if (upstashUrl && upstashToken) {
    try {
      await fetch(`${upstashUrl}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(data)),
        cache: 'no-store',
      });
    } catch (e) {
      console.warn('Redis write notice:', e);
    }
  }

  // 2. Memory Cache fallback
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function invalidateCacheKey(keyPattern: string): Promise<void> {
  // Invalidate memory cache
  const keys = Array.from(memoryCache.keys());
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k.includes(keyPattern)) {
      memoryCache.delete(k);
    }
  }

  // Invalidate Upstash Redis if configured
  if (upstashUrl && upstashToken) {
    try {
      await fetch(`${upstashUrl}/del/${encodeURIComponent(keyPattern)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: 'no-store',
      });
    } catch (_) {}
  }
}
