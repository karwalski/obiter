/**
 * Obiter Service Worker — Offline Support
 *
 * Caches all add-in assets on first load so the task pane works
 * without an internet connection. Search and LLM features are
 * disabled when offline.
 */

const CACHE_NAME = "obiter-v1.0.0";
const ASSETS_TO_CACHE = [
  "./taskpane.html",
  "./taskpane.js",
  "./commands.html",
  "./commands.js",
  "./polyfill.js",
  "./assets/icon-16.png",
  "./assets/icon-32.png",
  "./assets/icon-64.png",
  "./assets/icon-80.png",
  "./assets/icon-128.png",
  "./assets/logo-filled.png",
];

// Install — cache all core assets
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);

  // Never cache API or LLM requests
  if (url.pathname.startsWith("/api/") ||
      url.hostname.includes("openai.com") ||
      url.hostname.includes("anthropic.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        // Return cache, update in background
        var fetchPromise = fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(function () { /* offline — cache is fine */ });

        // Return cached immediately, don't wait for network
        return cached;
      }

      // Not in cache — try network, cache the response
      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && event.request.method === "GET") {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
