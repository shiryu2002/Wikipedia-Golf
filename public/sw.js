/* Wikipedia Golf service worker.
 *
 * Hand-written (no workbox) so the behaviour stays easy to audit:
 *  - navigations: network first, fall back to the cached page, then /offline
 *  - /_next/static (content-hashed): cache first
 *  - daily-pool.json and other same-origin assets: stale-while-revalidate
 *  - cross-origin (Wikipedia API etc.): untouched — the game needs live data
 *
 * Bump VERSION whenever the caching rules change so old caches get dropped.
 */
const VERSION = "v1";
const PAGE_CACHE = `wg-pages-${VERSION}`;
const STATIC_CACHE = `wg-static-${VERSION}`;
const ASSET_CACHE = `wg-assets-${VERSION}`;
const KNOWN_CACHES = new Set([PAGE_CACHE, STATIC_CACHE, ASSET_CACHE]);

const OFFLINE_URL = "/offline";
const PRECACHE_PAGES = ["/", OFFLINE_URL];
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

// Keep the hashed-chunk cache from growing forever across deploys.
const STATIC_CACHE_LIMIT = 200;

/**
 * Cache a page together with the /_next/static scripts and styles its HTML
 * references, so it can hydrate offline. Without this the offline page would
 * render as static HTML with dead buttons the first time it is needed.
 */
const precachePage = async (pages, statics, url) => {
  const response = await fetch(new Request(url, { cache: "reload" }));
  if (!isCacheable(response)) return;
  await pages.put(url, response.clone());
  const html = await response.text();
  const assetUrls = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
    assetUrls.add(match[1]);
  }
  await Promise.allSettled([...assetUrls].map((asset) => statics.add(asset)));
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const [pages, statics, assets] = await Promise.all([
        caches.open(PAGE_CACHE),
        caches.open(STATIC_CACHE),
        caches.open(ASSET_CACHE),
      ]);
      // Precache best-effort: a single 404 must not block installation.
      await Promise.allSettled([
        ...PRECACHE_PAGES.map((url) => precachePage(pages, statics, url)),
        ...PRECACHE_ASSETS.map((url) => assets.add(new Request(url, { cache: "reload" }))),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !KNOWN_CACHES.has(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

const isCacheable = (response) => response && response.ok && response.type === "basic";

const putSafe = async (cacheName, request, response) => {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch {
    // Quota errors etc. are not fatal.
  }
};

const trimCache = async (cacheName, limit) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
};

const networkFirstPage = async (request) => {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      void putSafe(PAGE_CACHE, request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(PAGE_CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    const url = new URL(request.url);
    if (url.pathname !== OFFLINE_URL) {
      // Redirect instead of serving the offline HTML under a foreign URL:
      // Next.js re-routes on hydration when __NEXT_DATA__.page and the
      // location disagree, which would drop the user onto a half-broken page.
      const target = new URL(OFFLINE_URL, self.location.origin);
      target.searchParams.set("from", url.pathname + url.search);
      return Response.redirect(target.href, 302);
    }

    const offline = await cache.match(OFFLINE_URL, { ignoreSearch: true });
    if (offline) return offline;
    return new Response("オフラインです", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
};

const cacheFirst = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) {
    await putSafe(STATIC_CACHE, request, response.clone());
    void trimCache(STATIC_CACHE, STATIC_CACHE_LIMIT);
  }
  return response;
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (isCacheable(response)) {
        void putSafe(ASSET_CACHE, request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  if (cached) return cached;
  const response = await network;
  if (response) return response;
  return new Response("", { status: 504 });
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    // Dev/HMR, data routes, image optimizer: leave to the network.
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
