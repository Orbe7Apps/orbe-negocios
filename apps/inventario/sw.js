// Orbe Apps · funciona sin internet: guarda la app en el teléfono y la actualiza cuando hay conexión
const CACHE = 'inventario-v1';
const ARCHIVOS = ["./", "index.html", "inventario.js", "../base/app.css", "../base/app.js", "manifest.webmanifest", "icono.svg", "icono-192.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('inventario-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const fuente = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (u.origin !== location.origin && !fuente) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const guardado = await c.match(r, { ignoreSearch: u.origin === location.origin });
    const red = fetch(r).then(resp => { if (resp.ok || resp.type === 'opaque') c.put(r, resp.clone()); return resp; }).catch(() => guardado);
    return guardado || red;
  }));
});
