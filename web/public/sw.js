/* MaizeMeals service worker.
 *
 * Goals (MVP):
 *  - App opens instantly and still works with bad dining-hall signal.
 *  - Menus you've already looked at stay readable offline.
 *  - Never cache auth, analytics, admin, or anything that isn't a GET.
 *
 * Bump VERSION to invalidate every cache on the next deploy.
 */
const VERSION = "v2";
const PREFIX = "mm-";
const CACHES = {
  shell: `${PREFIX}shell-${VERSION}`, // offline page + icons (precached)
  static: `${PREFIX}static-${VERSION}`, // hashed /_next/static assets (immutable)
  pages: `${PREFIX}pages-${VERSION}`, // HTML + RSC payloads (network-first)
  data: `${PREFIX}data-${VERSION}`, // public menu data from Supabase + /recommendations
  images: `${PREFIX}images-${VERSION}`, // photos, hall images, optimized images
};
const LIMITS = { pages: 40, data: 150, images: 120 };
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];
const NETWORK_TIMEOUT_MS = 4500;

// Supabase tables that are public, user-independent menu data.
const CACHEABLE_REST = /\/rest\/v1\/(menu_events|items|dining_halls|operating_hours)(\?|$)/;
// Same-origin paths the worker must never intercept.
const BYPASS = [/^\/auth\//, /^\/nutrition\/export/, /^\/api\//, /^\/ingest/, /^\/monitoring/, /^\/admin/, /^\/sw\.js$/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHES.shell)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set(Object.values(CACHES));
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith(PREFIX) && !keep.has(n)).map((n) => caches.delete(n)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  // Sent on sign-out so personal pages/data don't linger on shared devices.
  if (event.data && event.data.type === "CLEAR_USER_CACHES") {
    event.waitUntil(Promise.all([caches.delete(CACHES.pages), caches.delete(CACHES.data)]));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (BYPASS.some((re) => re.test(url.pathname))) return;

    if (request.mode === "navigate") {
      event.respondWith(handleNavigation(event));
      return;
    }
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(cacheFirst(request, CACHES.static));
      return;
    }
    if (
      url.pathname.startsWith("/_next/image") ||
      url.pathname.startsWith("/images/") ||
      url.pathname.startsWith("/icons/")
    ) {
      event.respondWith(staleWhileRevalidate(request, CACHES.images, LIMITS.images));
      return;
    }
    // Client-side navigations fetch RSC payloads; cache them so in-app links
    // to pages you've visited keep working offline.
    if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
      event.respondWith(networkFirst(request, CACHES.pages, LIMITS.pages));
      return;
    }
    if (url.pathname === "/recommendations" || url.pathname === "/menus/offerings") {
      event.respondWith(networkFirst(request, CACHES.data, LIMITS.data));
      return;
    }
    return;
  }

  if (url.hostname.endsWith(".supabase.co")) {
    if (CACHEABLE_REST.test(url.pathname + url.search)) {
      event.respondWith(networkFirst(request, CACHES.data, LIMITS.data));
      return;
    }
    if (url.pathname.startsWith("/storage/v1/object/public/")) {
      event.respondWith(cacheFirst(request, CACHES.images, LIMITS.images));
    }
  }
});

async function handleNavigation(event) {
  const { request } = event;
  const cache = await caches.open(CACHES.pages);
  try {
    const preload = Promise.resolve(event.preloadResponse).then((r) => r || fetch(request));
    const response = await withTimeout(preload, NETWORK_TIMEOUT_MS);
    if (response && response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      trim(CACHES.pages, LIMITS.pages);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Self-contained page (no Next.js chunks), so it is safe under any URL.
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ||
      new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } })
    );
  }
}

async function networkFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) {
      await cache.put(request, response.clone());
      if (limit) trim(cacheName, limit);
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Opaque (no-cors) responses are never cached: browsers count each as several MB.
  if (response.ok) {
    await cache.put(request, response.clone());
    if (limit) trim(cacheName, limit);
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        if (limit) trim(cacheName, limit);
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Oldest-first eviction (Cache API keys() preserves insertion order).
async function trim(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}
