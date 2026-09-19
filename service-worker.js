/**
 * Caches the app shell (HTML/CSS/JS/icons) so the app opens instantly
 * and works offline for its UI, while wallpaper data and images always
 * go to the network — those change constantly and caching them here
 * would show stale/wrong content and silently eat storage.
 *
 * Bump CACHE_VERSION whenever any cached file changes, so returning
 * users get the update instead of a stale cached shell forever.
 */

const CACHE_VERSION = "jtech-shell-v2";

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

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Cache newly-seen same-origin shell files (e.g. a new
          // screen's JS added in a later phase) as they're first
          // requested, without needing a SHELL_FILES update every time.
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
