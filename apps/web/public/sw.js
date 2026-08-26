// Minimal app-shell service worker -- lets EventFlow be installed to a
// phone's home screen and keeps opening it snappy on repeat visits. It only
// ever touches same-origin GET requests (HTML/JS/CSS/images from this
// Vercel deployment), so it never intercepts calls to the Railway API,
// Stripe/Paystack/PayPal, or any cross-origin request -- ticket
// availability, checkout, and door-scan data always stay live.
const CACHE_NAME = "eventflow-shell-v1";
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
