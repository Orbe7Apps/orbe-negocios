// Orbe Negocios · funciona sin internet. Guarda la app y responde desde la copia si no hay conexión.
const VERSION = 'orbe-negocios-v78';
const ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'css/orbe.css', 'icons/icono.svg', 'icons/icono-192.png',
  'js/lib/preact-htm.js', 'js/app.js', 'js/ctx.js', 'js/paises.js', 'js/datos.js', 'js/graficos.js', 'js/ui.js',
  'js/pantallas/inicio.js', 'js/pantallas/hoy.js', 'js/pantallas/vender.js', 'js/pantallas/clientes.js', 'js/pantallas/inventario.js',
  'js/pantallas/gastos.js', 'js/pantallas/reportes.js', 'js/pantallas/mas.js', 'js/pantallas/hojas.js',
  'js/permisos.js', 'js/pantallas/acceso.js', 'js/pantallas/equipo.js', 'js/pantallas/pagos.js', 'js/recorrido.js', 'js/hash.js', 'js/pantallas/tasas.js', 'js/buscar.js', 'js/pantallas/grupos.js', 'js/pantallas/escaner.js', 'js/lib/zxing.min.js', 'js/pantallas/ordenes.js', 'js/ordenpdf.js', 'js/pantallas/precios.js', 'js/pantallas/caja.js', 'js/impresora.js', 'js/carrito.js', 'js/pantallas/lineas.js', 'js/pantallas/promos.js', 'js/pantallas/factura.js', 'js/pantallas/menuorbe.js', 'js/rubros.js', 'js/pantallas/agenda.js', 'js/pantallas/funciones.js', 'js/pantallas/empezar.js', 'js/ayuda.js', 'js/nube.js', 'js/pantallas/cuenta.js', 'js/pantallas/cotizaciones.js', 'js/recordatorios.js', 'js/horario.js', 'js/pantallas/reservas.js', 'js/lib/supabase.min.js', 'js/lib/jspdf.umd.min.js', 'icons/icono-512.png', 'icons/icono-maskable-512.png'];
// Al instalar una versión, cada archivo se baja fresco de internet (cache: 'reload'), nunca de la memoria del navegador:
// así la versión nueva no queda armada con archivos viejos.
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  // Tasas: siempre de internet (la app guarda la última por su cuenta).
  if (/dolarapi|pydolarve/.test(url.host)) return;
  // La nube (Supabase) y el panel de administración: siempre directo, nunca de la copia.
  if (/supabase\.co$/.test(url.host) || /admin(\.html)?$|admin\.js$|reservar(\.html)?$|reservar\.js$/.test(url.pathname)) return;
  // La app: cada versión se guarda completa al instalarse y se abre siempre desde esa copia (rápido y sin mezclar
  // archivos nuevos con viejos). Cuando hay versión nueva, se instala aparte y la página se recarga una vez.
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(c => c.match(r, { ignoreSearch: r.mode === 'navigate' }).then(guardada => guardada || fetch(r, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copia = res.clone(); c.put(r, copia); }
      return res;
    }).catch(() => r.mode === 'navigate' ? c.match('index.html') : Response.error()))));
    return;
  }
  // Fuentes de Google: de la copia si ya están; si no, de internet (y se guardan).
  const red = fetch(r).then(res => {
    if (res.ok && /fonts\.(googleapis|gstatic)\.com/.test(url.host)) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(r, copia)); }
    return res;
  });
  e.respondWith(caches.match(r).then(guardada => guardada || red));
  e.waitUntil(red.then(() => {}, () => {}));
});
