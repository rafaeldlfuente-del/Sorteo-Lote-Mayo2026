// Basic Service Worker for PWA installation
const CACHE_NAME = 'sorteo-v1.3.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple fetch pass-through
  event.respondWith(fetch(event.request));
});
