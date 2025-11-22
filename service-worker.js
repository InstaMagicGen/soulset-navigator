/* service-worker.js — AUTO-UPDATE VERSION */

const VERSION = Date.now(); // 🔥 Génère une version unique à chaque déploiement

const STATIC_CACHE = `soulset-static-${VERSION}`;
const RUNTIME_CACHE = `soulset-runtime-${VERSION}`;

/** Découvre tous les fichiers via fetch dynamique */
self.addEventListener("install", (event) => {
  self.skipWaiting(); // active immédiatement
});

/** Supprime automatiquement tous les anciens caches */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          // delete tout sauf les caches versionnés de maintenant
          if (!key.includes(VERSION)) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

/** FETCH intelligent : toujours la dernière version */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // HTML = always network-first (pour éviter les anciennes versions)
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Assets (css/js/images…) = cache-first
  event.respondWith(cacheFirst(req));
});

/* STRATÉGIES */
async function networkFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(req, { cache: "no-store" }); // 🔥 prend toujours la dernière version
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    return cache.match(req) || caches.match("/index.html");
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

/* MESSAGE: permet update immédiat si besoin */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
