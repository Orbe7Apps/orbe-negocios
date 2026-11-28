// Teclado del teléfono: simula el teclado de iPhone y Android (tapa la pantalla sin achicarla) y revisa,
// campo por campo, en hojas y pantallas: que el campo quede a la vista (ni bajo el teclado ni bajo lo pegado arriba),
// que ninguna barra flotante quede encima, y que la hoja quede justo sobre el teclado.
// Uso: node pruebas/teclado.js [rubro] [aparatos]   (aparatos: iphone,android,chico)
const { chromium, devices } = require('playwright');
const RUBRO = process.argv[2] || 'Ferretería';
const APARATOS = (process.argv[3] || 'iphone,android,chico').split(',');
const PERFIL = {
  iphone: { ...devices['iPhone 13'], teclado: 336 },
  android: { ...devices['Pixel 7'], teclado: 320 },
  chico: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: devices['Pixel 5'].userAgent, teclado: 290 },
};
// Teclado de mentira: al enfocar un campo de texto, el visualViewport se achica (como en iPhone y Android 108+).
const falso = alto => {
  const real = window.visualViewport; const vv = new EventTarget(); let h = null, sube = null;
  Object.defineProperty(window, 'visualViewport', { value: vv });
  ['width', 'offsetLeft', 'pageLeft', 'pageTop', 'scale'].forEach(k => Object.defineProperty(vv, k, { get: () => real ? real[k] : (k === 'width' ? innerWidth : k === 'scale' ? 1 : 0) }));
  Object.defineProperty(vv, 'offsetTop', { get: () => 0 });
  Object.defineProperty(vv, 'height', { get: () => h == null ? innerHeight : h });
  const escribe = el => el && el.matches && el.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([readonly]), textarea, [contenteditable=true]');
  const poner = x => { h = x; vv.dispatchEvent(new Event('resize')); };
  document.addEventListener('focusin', e => { clearTimeout(sube); if (escribe(e.target)) { if (h == null) { poner(innerHeight - alto * 0.5); sube = setTimeout(() => poner(innerHeight - alto), 120); } } else if (h != null) poner(null); });
  document.addEventListener('focusout', () => { clearTimeout(sube); setTimeout(() => { if (!escribe(document.activeElement) && h != null) poner(null); }, 30); });
  window.__tecladoAlto = () => h == null ? 0 : innerHeight - h;
};

(async () => {
  const b = await chromium.launch(); const problemas = []; let revisados = 0;
  for (const ap of APARATOS) {
    const { teclado, ...perfil } = PERFIL[ap];
    const ctx = await b.newContext(perfil); const p = await ctx.newPage();
    await p.addInitScript(falso, teclado);
    p.on('pageerror', e => problemas.push(ap + ' ERROR: ' + e.message));
    const t = async x => { await p.getByText(x).first().click(); await p.waitForTimeout(350); };
    await p.goto('http://localhost:8765/?demo=elegir&prueba'); await p.waitForTimeout(1300);
    await t('Empezar'); await t('Venezuela'); await t('Continuar'); await p.locator('.rubro-op', { hasText: RUBRO }).first().click(); await p.waitForTimeout(300); await t('Continuar'); await t('Continuar'); await t('Continuar');
    await p.locator('button', { hasText: /Abrir mi/ }).click(); await p.waitForTimeout(1800);
    // Revisa cada campo visible de la zona: lo enfoca (sin desplazar, como el peor caso), espera al teclado y mide.
    const revisar = async (donde, sel) => {
      const n = await p.locator(sel).count();
      for (let i = 0; i < n; i++) {
        const r = await p.evaluate(async ([sel, i]) => {
          const el = document.querySelectorAll(sel)[i]; if (!el || !el.offsetParent || el.disabled) return null;
          const sc = el.closest('.hoja-cuerpo, .app-fondo'); if (sc) sc.scrollTop = 0;
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          await new Promise(r => setTimeout(r, 120));
          el.focus({ preventScroll: true });
          // Se anota cuadro a cuadro cómo se mueve la lista: si va y vuelve, es un salto.
          const marcas = []; const t0 = performance.now();
          await new Promise(r => { const f = () => { marcas.push(sc ? sc.scrollTop : 0); if (performance.now() - t0 < 900) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
          let vueltas = 0, dir = 0; for (let k = 1; k < marcas.length; k++) { const d = Math.sign(marcas[k] - marcas[k - 1]); if (d && dir && d !== dir) vueltas++; if (d) dir = d; }
          const kb = window.__tecladoAlto(), limite = innerHeight - kb;
          const b = el.getBoundingClientRect();
          // Lo que está pegado arriba (encabezado de hoja o buscador pegado) y las barras flotantes visibles.
          let arriba = 0; const hoja = el.closest('.hoja');
          if (hoja) arriba = hoja.querySelector('.hoja-cab').getBoundingClientRect().bottom;
          else { const cp = document.querySelector('.cabeza-pegada.pegada'); if (cp) arriba = cp.getBoundingClientRect().bottom; }
          const tapan = [...document.querySelectorAll('.nav-tel, .boton-orbe, .carro-flota.on, .aviso-toast, .hoja-pie')].filter(x => !(hoja && hoja.contains(x) && x.classList.contains('hoja-pie')) || true).filter(x => {
            if (hoja && x.classList.contains('hoja-pie') && !hoja.contains(x)) return false;
            const cs = getComputedStyle(x); if (cs.visibility === 'hidden' || +cs.opacity < 0.1 || cs.display === 'none') return false;
            const q = x.getBoundingClientRect(); if (q.height < 2) return false;
            return q.top < b.bottom - 2 && q.bottom > b.top + 2 && q.left < b.right && q.right > b.left;
          }).map(x => x.className.split(' ')[0]);
          const sobreTeclado = [...document.querySelectorAll('.nav-tel, .boton-orbe, .carro-flota.on')].filter(x => { const cs = getComputedStyle(x); if (+cs.opacity < 0.1 || cs.visibility === 'hidden') return false; const q = x.getBoundingClientRect(); return kb && q.top < limite && q.bottom > 0; }).map(x => x.className.split(' ')[0]);
          let hojaMal = '';
          if (hoja && kb) { const hb = hoja.getBoundingClientRect(); if (Math.abs(hb.bottom - limite) > 3) hojaMal = 'hoja termina en ' + Math.round(hb.bottom) + ' y el teclado empieza en ' + Math.round(limite); if (hb.top < 0) hojaMal += ' · hoja se sale por arriba'; }
          const nombre = (el.getAttribute('placeholder') || el.getAttribute('aria-label') || (el.closest('label') && el.closest('label').innerText.split('\n')[0]) || el.type || '').slice(0, 30);
          return { nombre, vueltas, kb, top: Math.round(b.top), bottom: Math.round(b.bottom), limite: Math.round(limite), arriba: Math.round(arriba), tapan, sobreTeclado, hojaMal };
        }, [sel, i]);
        if (!r) continue; revisados++;
        const tag = ap + ' · ' + donde + ' · “' + r.nombre + '”';
        if (!r.kb) { problemas.push(tag + ': no salió el teclado'); continue; }
        if (r.bottom > r.limite - 4) problemas.push(tag + ': queda bajo el teclado (' + r.bottom + ' > ' + r.limite + ')');
        if (r.top < r.arriba - 2) problemas.push(tag + ': queda bajo lo de arriba (' + r.top + ' < ' + r.arriba + ')');
        if (r.tapan.length) problemas.push(tag + ': lo tapa ' + r.tapan.join(', '));
        if (r.sobreTeclado.length) problemas.push(tag + ': barra encima del teclado: ' + r.sobreTeclado.join(', '));
        if (r.vueltas) problemas.push(tag + ': la lista va y vuelve (salto)');
        if (r.hojaMal) problemas.push(tag + ': ' + r.hojaMal);
      }
      await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await p.waitForTimeout(300);
    };
    const CAMPOS = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([readonly]), textarea';
    // Pantallas con campos.
    for (const s of ['vender', 'inventario', 'clientes', 'gastos', 'ordenes', 'cotizaciones', 'agenda', 'reportes']) {
      await p.evaluate(x => { location.hash = x; }, s); await p.waitForTimeout(800);
      if (await p.evaluate(() => location.hash.slice(1)) !== s) continue;
      await revisar('pantalla ' + s, '.app-fondo ' + CAMPOS.split(', ').join(', .app-fondo '));
    }
    // Vender con algo en el carrito: la barra flotante no debe tapar el buscador.
    await p.evaluate(() => { location.hash = 'vender'; }); await p.waitForTimeout(700);
    const prod = p.locator('.prod:not(.agotado)').first();
    if (await prod.count()) { await prod.click(); await p.waitForTimeout(500); if (await p.locator('.hoja').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(450); } await revisar('vender con carrito', '.app-fondo ' + CAMPOS.split(', ').join(', .app-fondo ')); }
    // Hojas.
    const hojas = [['nuevoCliente', {}], ['gasto', undefined], ['producto', {}], ['tasa', undefined], ['negocio', undefined], ['perfil', {}], ['nuevaCita', {}], ['nuevaOrden', {}], ['caja', undefined], ['cierre', undefined], ['promos', undefined], ['grupos', undefined], ['locales', undefined]];
    for (const [k, d] of hojas) {
      await p.evaluate(([k, d]) => { if (window.__abrir) window.__abrir(k, d); }, [k, d]).catch(() => {});
      await p.waitForTimeout(650);
      if (!(await p.locator('.hoja').count())) continue;
      await revisar('hoja ' + k, '.hoja ' + CAMPOS.split(', ').join(', .hoja '));
      await p.keyboard.press('Escape'); await p.waitForTimeout(450);
    }
    // Cobrar (desde el carrito).
    await p.evaluate(() => { location.hash = 'vender'; }); await p.waitForTimeout(600);
    const cob = p.locator('.btn', { hasText: /^Cobrar/ }).first();
    if (await cob.count()) { await cob.click({ force: true }).catch(() => {}); await p.waitForTimeout(800); if (await p.locator('.hoja').count()) { await revisar('hoja cobrar', '.hoja ' + CAMPOS.split(', ').join(', .hoja ')); await p.keyboard.press('Escape'); await p.waitForTimeout(450); } }
    // Ajustes: cada tema con campos.
    await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(700);
    const nombres = (await p.locator('.menu-lista button').allInnerTexts()).map(x => x.split('\n')[0].trim()).filter(x => x && !/Empezar de nuevo|Salir|Cerrar/.test(x));
    for (const nm of nombres) {
      await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(300);
      const v0 = p.locator('button.volver'); if (await v0.count()) { await v0.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300); }
      const btn = p.locator('.menu-lista button', { hasText: nm }).first(); if (!(await btn.count())) continue;
      await btn.click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(500);
      if (await p.locator('.hoja').count()) { await revisar('Ajustes/' + nm + ' (hoja)', '.hoja ' + CAMPOS.split(', ').join(', .hoja ')); await p.keyboard.press('Escape'); await p.waitForTimeout(450); }
      else await revisar('Ajustes/' + nm, '.app-fondo ' + CAMPOS.split(', ').join(', .app-fondo '));
    }
    await ctx.close();
  }
  console.log('Campos revisados: ' + revisados);
  const unicos = [...new Set(problemas)];
  unicos.forEach(x => console.log('  ✗ ' + x));
  console.log(unicos.length ? unicos.length + ' problemas' : 'SIN PROBLEMAS');
  await b.close();
})();
