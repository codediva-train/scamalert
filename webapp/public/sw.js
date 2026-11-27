// service worker ขั้นต่ำ: เก็บหน้าแรกไว้ เปิดแอปตอนไม่มีเน็ตจะเห็นหน้าจอแทนหน้า error ของเบราว์เซอร์
// การเช็กข้อความ (/api/check) ต้องใช้เน็ตเสมอ และไม่ถูกเก็บลง cache
const CACHE = 'scam-check-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/')))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(fetch(event.request).catch(() => caches.match('/')))
})
