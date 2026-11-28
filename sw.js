// Orbe Negocios · funciona sin internet. Guarda la app y responde desde la copia si no hay conexión.
const VERSION = 'orbe-negocios-v126';
const ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'css/orbe.css', 'js/enlace.js', 'js/splash.js', 'js/seguro.js', 'icons/icono.svg', 'icons/icono-192.png',
  'js/lib/preact-htm.js', 'js/app.js', 'js/ctx.js', 'js/paises.js', 'js/datos.js', 'js/graficos.js', 'js/ui.js',
  'js/pantallas/inicio.js', 'js/pantallas/hoy.js', 'js/pantallas/vender.js', 'js/pantallas/clientes.js', 'js/pantallas/inventario.js',
  'js/pantallas/gastos.js', 'js/pantallas/reportes.js', 'js/pantallas/mas.js', 'js/pantallas/hojas.js', 'js/pantallas/ventasdia.js',
  'js/permisos.js', 'js/pantallas/acceso.js', 'js/pantallas/equipo.js', 'js/pantallas/pagos.js', 'js/recorrido.js', 'js/tutoriales.js', 'js/guia.js', 'js/elegir.js', 'js/guias.js', 'js/hash.js', 'js/pantallas/tasas.js', 'js/buscar.js', 'js/pantallas/grupos.js', 'js/pantallas/escaner.js', 'js/lib/zxing.min.js', 'js/pantallas/ordenes.js', 'js/pantallas/personalizados.js', 'js/pantallas/anteriores.js', 'js/ordenpdf.js', 'js/pantallas/precios.js', 'js/pantallas/caja.js', 'js/impresora.js', 'js/carrito.js', 'js/pantallas/lineas.js', 'js/pantallas/promos.js', 'js/pantallas/factura.js', 'js/pantallas/menuorbe.js', 'js/rubros.js', 'js/pantallas/agenda.js', 'js/pantallas/funciones.js', 'js/pantallas/empezar.js', 'js/ayuda.js', 'js/nube.js', 'js/pantallas/cuenta.js', 'js/pantallas/cotizaciones.js', 'js/recordatorios.js', 'js/horario.js', 'js/pantallas/reservas.js', 'js/pantallas/cuotas.js', 'js/lib/supabase.min.js', 'js/lib/jspdf.umd.min.js', 'icons/icono-512.png', 'icons/icono-maskable-512.png'];
// Al instalar una versión, cada archivo se baja fresco de internet (cache: 'reload'), nunca de la memoria del navegador:
// así la versión nueva no queda armada con archivos viejos.
// La versión nueva NO se activa sola: espera a que la app se abra otra vez (la app se lo pide mientras se ve la
// pantalla de carga). Así la app nunca se recarga con la persona ya en los perfiles o vendiendo.
// Excepción: si la versión en uso es de antes de la v109, su app no sabe pedir el cambio y se quedaría vieja para
// siempre; en ese caso la nueva se activa sola (esa app vieja ya se recarga sola al cambiar).
const vieja = ks => ks.some(k => { const m = /^orbe-negocios-v(\d+)$/.exec(k); return m && Number(m[1]) < 109; });
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))).then(() => caches.keys()).then(ks => { if (vieja(ks)) return self.skipWaiting(); })); });
self.addEventListener('message', e => { if (e.data === 'activar') self.skipWaiting(); });
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
