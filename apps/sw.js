// Minimal app-shell service worker -- lets Gadaova be installed to a
// phone's home screen and keeps opening it snappy on repeat visits.
//
// Network-first, not cache-first: every request tries the network first,
// and the cache is only used as a fallback when the network is unavailable
// (offline). The previous version did the opposite -- served whatever was
// already cached, then fetched the new version in the background for NEXT
// time -- which meant every deploy looked "not live" until a second reload
// caught up (the exact "I pushed but nothing changed" pattern this app hit
// repeatedly). Bumping CACHE_NAME also purges that old stale cache on
// activate, so this fix applies itself on the next load without anyone
// needing to manually clear site data.
//
// It only ever touches same-origin GET requests (HTML/JS/CSS/images from
// this Vercel deployment), so it never intercepts calls to the Railway
// API, Stripe/Paystack/PayPal, or any cross-origin request -- ticket
// availability, checkout, and door-scan data always stay live.
const CACHE_NAME = "gadaova-shell-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API calls, even if they were ever same-origin (e.g. local
  // dev proxy) -- ticket counts and order status must always be fresh.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
