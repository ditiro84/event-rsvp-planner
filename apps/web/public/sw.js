// Minimal app-shell service worker -- lets Gadaova be installed to a
// phone's home screen and keeps opening it snappy on repeat visits. It only
// ever touches same-origin GET requests (HTML/JS/CSS/images from this
// Vercel deployment), so it never intercepts calls to the Railway API,
// Stripe/Paystack/PayPal, or any cross-origin request -- ticket
// availability, checkout, and door-scan data always stay live.
//
// IMPORTANT: the fetch handler below serves a cached response instead of
// the network response whenever one exists (cache-first), so anything in
// APP_SHELL -- including the favicon/app icons -- can keep showing stale
// content indefinitely for an already-installed user, even after a new
// deploy ships updated files at the same URL. The activate handler already
// deletes any cache whose name isn't CACHE_NAME, so bumping the version
// suffix below is what actually forces already-installed clients to drop
// stale assets and re-fetch. Bump it whenever a file listed in APP_SHELL
// changes (e.g. the brand refresh that replaced favicon.svg/icon-192.png/
// icon-512.png landed in the app but installed clients kept the old art
// cached under "v1" until this was bumped).
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
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
