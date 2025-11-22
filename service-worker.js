/* service-worker.js — FINAL SAFE AUTO */

const STATIC_CACHE = "soulset-static";
const RUNTIME_CACHE = "soulset-runtime";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k))) // 🔥 delete TOUT
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return cache.match(req);
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req, { cache: "no-store" });
  cache.put(req, fresh.clone());
  return fresh;
}

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
