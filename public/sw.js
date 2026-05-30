const CACHE_NAME = "michal-tasks-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg"
];

// Install Event — cache structural skeleton
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell assets...");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — cleanup old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Network-First falling back to Cache
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Bypass non-GET requests and Supabase Realtime/Auth endpoints
  if (e.request.method !== "GET" || url.pathname.includes("/rest/v1") || url.pathname.includes("/auth/v1")) {
    return;
  }

  // Bypass chrome-extension files, external developer tools, etc.
  if (!url.protocol.startsWith("http")) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // If successful, cache a copy of the retrieved asset
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable (offline mode)
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a page navigation fails, return the cached root index.html
          if (e.request.mode === "navigate") {
            return caches.match("/index.html") || caches.match("/");
          }
        });
      })
  );
});
