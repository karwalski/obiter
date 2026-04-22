/**
 * Obiter Service Worker — Offline Support
 *
 * Caches all add-in assets on first load so the task pane works
 * without an internet connection. Search and LLM features are
 * disabled when offline.
 */

const CACHE_NAME = "obiter-v1.8.5";

// Install — skip waiting, no precache (hashed filenames handle cache busting)
self.addEventListener("install", function () {
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

// Fetch — network-first for HTML/JS, cache-first for images
self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);

  // Never cache API or LLM requests
  if (url.pathname.startsWith("/api/") ||
      url.hostname.includes("openai.com") ||
      url.hostname.includes("anthropic.com")) {
    return;
  }

  // Never intercept Office.js or Word internal requests (UX-005).
  // The service worker fetch handler can delay or break Office.js API
  // responses, causing Word's native footnote rendering to lose numbering.
  if (url.hostname.includes("appsforoffice.microsoft.com") ||
      url.hostname.includes("officeapps.live.com") ||
      url.hostname.includes("office.net") ||
      url.hostname.includes("microsoft.com") ||
      url.hostname.includes("officeppe.com") ||
      url.hostname.includes("office365.com")) {
    return;
  }

  // Network-first for HTML and JS (always get fresh, cache as fallback)
  if (url.pathname.endsWith(".html") || url.pathname.endsWith(".js")) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache-first for images and other static assets
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

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
