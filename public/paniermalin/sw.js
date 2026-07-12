// PanierMalin — service worker : l'app s'ouvre même sans réseau
// (les données produits, elles, nécessitent le réseau).
const CACHE = 'paniermalin-v14'
const SHELL = ['index.html', 'landing.html', 'logic.mjs', 'listes.mjs', 'manifest.webmanifest', 'icon.svg']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (url.origin !== location.origin) return // API Open Food Facts : toujours le réseau
  e.respondWith(caches.match(e.request).then(hit => hit ?? fetch(e.request)))
})
