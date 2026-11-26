// Pantalla de carga: tema y nombre del negocio desde el primer instante; se va cuando la app está lista.
(function () {
  var d = null; try { d = JSON.parse(localStorage.getItem('orbe-negocios-mini') || 'null'); } catch (e) {}
  var tema = d && d.tema;
  if (tema === 'claro') document.documentElement.setAttribute('data-theme', 'light');
  if (tema === 'oscuro') document.documentElement.setAttribute('data-theme', 'dark');
  if (d && d.nombre) { var n = document.getElementById('sp-negocio'); n.textContent = d.nombre; n.hidden = false; }
  var el = document.getElementById('splash'), t0 = Date.now(), listo = false;
  var rapido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.__listo = function () {
    if (listo) return; listo = true;
    setTimeout(function () { el.classList.add('sale'); setTimeout(function () { el.remove(); }, 500); }, Math.max(0, (rapido ? 250 : 1500) - (Date.now() - t0)));
  };
  // Si la app no arranca (sin internet la primera vez, o un error), se avisa en vez de quedarse cargando para siempre.
  setTimeout(function () { if (!listo) { document.getElementById('sp-error').hidden = false; el.classList.add('con-error'); } }, 9000);
  // “Reparar y abrir”: borra la copia guardada de la app (no los datos del negocio) y la baja de nuevo.
  document.getElementById('sp-reparar').onclick = function () {
    var fin = function () { location.reload(); };
    var p1 = navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }) : Promise.resolve();
    var p2 = window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }) : Promise.resolve();
    Promise.all([p1, p2]).then(fin, fin);
  };
  // Un módulo de la app que no carga (por ejemplo, archivos de dos versiones mezclados) también muestra el aviso.
  window.addEventListener('error', function () { if (!listo) setTimeout(function () { if (!listo) { document.getElementById('sp-error').hidden = false; el.classList.add('con-error'); } }, 1500); });
  window.addEventListener('unhandledrejection', function () { if (!listo) setTimeout(function () { if (!listo) { document.getElementById('sp-error').hidden = false; el.classList.add('con-error'); } }, 1500); });
  window.addEventListener('error', function (e) { if (!listo && e.target && e.target.tagName === 'SCRIPT') { document.getElementById('sp-error').hidden = false; el.classList.add('con-error'); } }, true);
})();
