/**
 * Caches the app shell (HTML/CSS/JS/icons) so the app opens instantly
 * and works offline for its UI, while wallpaper data and images always
 * go to the network — those change constantly and caching them here
 * would show stale/wrong content and silently eat storage.
 *
 * Bump CACHE_VERSION whenever any cached file changes, so returning
 * users get the update instead of a stale cached shell forever.
 */

const CACHE_VERSION = "jtech-shell-v3";

const SHELL_FILES = [
  "index.html",
  "manifest.webmanifest",
  "css/tokens.css",
  "css/base.css",
  "css/components.css",
  "css/screens.css",
  "js/config.js",
  "js/icons.js",
  "js/toast.js",
  "js/media-actions.js",
  "js/router.js",
  "js/api.js",
  "js/auth.js",
  "js/app.js",
  "js/screens/home.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// Files where being fast offline matters more than always being the
// absolute latest byte — served cache-first, same as before.
const CACHE_FIRST_EXTENSIONS = [".png", ".jpg", ".jpeg", ".ico", ".webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only manage GET requests for our own origin's app-shell files.
  // Everything else (the backend API, provider-hosted wallpaper
  // images, Supabase, Google auth) passes straight through to the
  // network untouched — this service worker never intercepts or
  // caches any of that.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  const isCacheFirst = CACHE_FIRST_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

  if (isCacheFirst) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) cacheResponse(event.request, response.clone());
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML/CSS/JS: a code update on GitHub must show up
  // the next time someone opens the app, not be silently masked by a
  // stale cached copy. The cache here exists purely as an offline
  // fallback, never as the default source of truth.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) cacheResponse(event.request, response.clone());
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

function cacheResponse(request, response) {
  caches.open(CACHE_VERSION).then((cache) => cache.put(request, response));
}
