// Service worker minimal BARBER95 — installabilité PWA + cache runtime léger.
const CACHE = 'barber95-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cles) =>
      Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c)))
    )
  )
  self.clients.claim()
})

// Network-first : on privilégie le réseau, on retombe sur le cache hors-ligne.
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  // on ne touche pas aux appels API (Supabase, Cloudinary, etc.)
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copie = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copie)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/')))
  )
})
