/**
 * imageCache.ts
 *
 * Lightweight in-memory avatar image cache.
 * Prevents React Native from firing redundant network requests every time
 * a MapMarker mounts/unmounts during location updates.
 *
 * The cache stores remote URLs as keys and resolved URIs as values.
 * On native, React Native's own image cache handles disk persistence,
 * so we only need to ensure the URI reference stays stable across renders.
 *
 * Usage:
 *   const uri = ImageCache.resolve(remoteUrl); // synchronous, instant
 *   await ImageCache.prefetch(urlArray);        // warm multiple URLs
 */

const MAX_SIZE = 150;

// URI cache — maps remote URL → stable local/remote URI reference
const _cache = new Map<string, string>();

/**
 * Synchronously return the cached URI for a URL, or the URL itself
 * if it hasn't been prefetched yet.
 */
function resolve(url: string): string {
  if (!url) return url;
  return _cache.get(url) ?? url;
}

/**
 * Register a URL in the cache. Called automatically by prefetch().
 * The cache stores the URL as its own value until a native prefetch
 * gives us a stable reference.
 */
function _register(url: string): void {
  if (_cache.has(url)) return;
  if (_cache.size >= MAX_SIZE) {
    // LRU eviction: remove oldest entry
    const oldest = _cache.keys().next().value;
    if (oldest) _cache.delete(oldest);
  }
  _cache.set(url, url);
}

/**
 * Pre-warm the cache for a list of avatar URLs.
 * Uses React Native's Image.prefetch on native, no-op on web
 * (browser HTTP cache handles it).
 */
async function prefetch(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))].filter((u) => !_cache.has(u));
  if (unique.length === 0) return;

  // Register synchronously so resolve() works immediately
  unique.forEach(_register);

  // Fire native prefetch in parallel (capped at 6 concurrent)
  try {
    const { Image } = await import("react-native");
    if (typeof Image?.prefetch === "function") {
      const CONCURRENCY = 6;
      for (let i = 0; i < unique.length; i += CONCURRENCY) {
        await Promise.allSettled(
          unique.slice(i, i + CONCURRENCY).map((url) =>
            (Image.prefetch as (url: string) => Promise<boolean>)(url)
          )
        );
      }
    }
  } catch {
    // prefetch not available in this environment — silent fallback
  }
}

/** Clear cache on sign-out to prevent stale avatar URLs between sessions */
function clear(): void {
  _cache.clear();
}

export const ImageCache = { resolve, prefetch, clear };
