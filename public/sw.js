// Service worker minimal BARBER95 — installabilité PWA + cache runtime léger.
const CACHE = 'barber95-v3'
// Coquille pré-mise en cache : l'app s'ouvre hors-ligne dès la 1re visite.
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  )
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
      .catch(() =>
        caches.match(req).then((r) => {
          if (r) return r
          // navigation hors-ligne sans cache → on sert la coquille de l'app
          if (req.mode === 'navigate') return caches.match('/')
          return new Response('', { status: 504, statusText: 'Hors ligne' })
        })
      )
  )
})
