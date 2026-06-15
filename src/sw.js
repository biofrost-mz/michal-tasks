import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkOnly, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'

clientsClaim()

/* Precache all Vite-hashed build assets */
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

/* Fonts — Fontshare */
registerRoute(
  ({ url }) => url.origin === 'https://api.fontshare.com',
  new StaleWhileRevalidate({
    cacheName: 'cache-fonts-fontshare',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

/* Fonts — Google CSS */
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'cache-fonts-google-css',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

/* Fonts — Google static */
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'cache-fonts-gstatic',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

/* Supabase — always network */
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkOnly(),
)

/* SPA navigation fallback */
registerRoute(
  new NavigationRoute(
    async ({ request }) => {
      try {
        return await fetch(request)
      } catch {
        return caches.match('/index.html')
      }
    },
    {
      denylist: [/^\/rest\//, /^\/auth\//, /^\/storage\//, /^\/realtime\//, /^\/functions\//],
    },
  ),
)

/* Push notifications */
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Zentero', {
      body: data.body ?? 'Máš úkoly ke zpracování.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag ?? 'mt-push',
      data: { url: data.data?.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.focus()
          return
        }
      }
      return self.clients.openWindow(event.notification.data?.url ?? '/')
    }),
  )
})
