// Busca cosas descuadradas en la demo completa (celular y computadora): textos cortados, textos pegados al borde
// de su caja y cosas que se salen de su tarjeta o de la pantalla. Recorre las pantallas, cada tema de Ajustes y las hojas
// principales, y guarda una captura de cada una en pruebas/capturas/descuadres/.
// Uso: node pruebas/descuadres.js [tel,pc]
const { chromium, devices } = require('playwright');
const out = __dirname + '/capturas/descuadres/'; require('fs').mkdirSync(out, { recursive: true });
const MODOS = (process.argv[2] || 'tel,pc').split(',');
const SOLO = process.argv[3] || ''; // “ajustes” para revisar solo Ajustes
const SECS = ['hoy', 'vender', 'agenda', 'ordenes', 'cotizaciones', 'cuotas', 'clientes', 'inventario', 'gastos', 'reportes', 'equipo', 'tutoriales', 'mas'];
const HOJAS = ['nuevoCliente', 'gasto', 'producto', 'tasa', 'negocio', 'perfil', 'nuevaCita', 'nuevaOrden', 'caja', 'cierre', 'promos', 'anteriores', 'escaner'];

// Se corre dentro de la página: devuelve una lista de problemas de lo que se ve.
function revisar(donde) {
  const raiz = document.querySelector(donde) || document.body;
  const vw = innerWidth, mal = [];
  const visible = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const nombre = e => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + ' “' + (e.innerText || e.value || e.placeholder || '').trim().slice(0, 30) + '”';
  const desliza = e => { for (let x = e; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (/(auto|scroll)/.test(s.overflowX)) return true; } return false; };
  for (const e of raiz.querySelectorAll('*')) {
    if (!visible(e) || e.closest('svg') || e.closest('.tour, .guia-vivo')) continue;
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    // 1. Se sale de la pantalla.
    if ((r.right > vw + 1 || r.left < -1) && !desliza(e) && s.position !== 'fixed') mal.push('se sale de la pantalla: ' + nombre(e));
    // 2. Texto cortado sin “…”.
    const cortaX = /(hidden|clip)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== 'ellipsis' && e.children.length === 0 && (e.innerText || '').trim();
    if (cortaX && !desliza(e)) mal.push('texto cortado: ' + nombre(e));
    // 3. Texto pegado al borde de una caja con borde o fondo (campos, píldoras, botones).
    const caja = (parseFloat(s.borderLeftWidth) > 0 || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent')) && r.width < vw - 20 && r.height < 120;
    if (caja && /flex|grid|block|inline-flex|inline-block/.test(s.display) && !e.matches('.ic, .logo, .marca, .punto, img, input, i, .barra, .gr, .gr *, .anillo *, .interruptor *, [class*=sw], .t-sw')) {
      for (const h of e.children) {
        if (!visible(h) || !(h.innerText || '').trim() || h.matches('img, svg, .ic')) continue;
        const hr = h.getBoundingClientRect(), hs = getComputedStyle(h);
        const pegadoDer = r.right - hr.right < 3 && parseFloat(s.paddingRight) + parseFloat(hs.paddingRight) < 3;
        const pegadoIzq = hr.left - r.left < 3 && parseFloat(s.paddingLeft) + parseFloat(hs.paddingLeft) < 3;
        if ((pegadoDer || pegadoIzq) && r.width > 30) mal.push('texto pegado al borde: ' + nombre(h) + ' en ' + nombre(e));
      }
    }
    // 4. Algo se sale de su tarjeta.
    if (e.matches('.tarjeta, .hoja-cuerpo, .campo')) {
      for (const h of e.querySelectorAll(':scope > *')) {
        if (!visible(h) || desliza(h)) continue; const hr = h.getBoundingClientRect();
        if (hr.right > r.right + 1 || hr.left < r.left - 1) mal.push('se sale de su tarjeta: ' + nombre(h));
      }
    }
  }
  return [...new Set(mal)];
}

(async () => {
  const b = await chromium.launch(); const todo = [];
  for (const modo of MODOS) {
    const ctx = await b.newContext(modo === 'tel' ? devices['iPhone 13'] : { viewport: { width: 1366, height: 860 } }); const p = await ctx.newPage();
    p.on('pageerror', e => todo.push(modo + ' ERROR: ' + e.message)); p.on('dialog', d => d.dismiss().catch(() => {}));
    await p.goto('http://localhost:8765/?demo&prueba' + (modo === 'pc' ? '&vista=pc' : '')); await p.waitForTimeout(2500);
    const anotar = async (donde, sel) => { console.error(modo + ' ' + donde); const m = await p.evaluate(revisar, sel); m.forEach(x => todo.push(modo + ' · ' + donde + ' · ' + x)); await p.screenshot({ path: out + modo + '-' + donde.replace(/[^\wáéíóúñ-]+/gi, '_') + '.png' }); };
    if (SOLO !== 'ajustes') for (const s of SECS) { await p.evaluate(x => { location.hash = x; }, s); await p.waitForTimeout(900); await anotar(s, 'main, #app'); }
    // Ajustes, tema por tema.
    await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(800);
    const temas = await p.locator('[data-tema]').evaluateAll(xs => xs.map(x => x.dataset.tema));
    for (const k of temas) {
      for (let i = 0; i < 3 && await p.locator('.hoja').count(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(450); }
      await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(300);
      if (modo === 'tel') { const v = p.locator('button.volver'); if (await v.count()) { await v.first().click(); await p.waitForTimeout(350); } }
      const op = p.locator('[data-tema="' + k + '"]').first(); if (!(await op.count())) continue;
      await op.scrollIntoViewIfNeeded(); await op.click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(600);
      await anotar('ajustes-' + k, modo === 'pc' ? '.ajustes-cuerpo, main' : 'main');
    }
    if (modo === 'tel') { const v = p.locator('button.volver'); if (await v.count()) await v.first().click(); }
    if (SOLO !== 'ajustes') for (const k of HOJAS) {
      await p.evaluate(k => { if (window.__abrir) window.__abrir(k, {}); }, k); await p.waitForTimeout(700);
      if (await p.locator('.hoja').count()) { await anotar('hoja-' + k, '.hoja'); await p.keyboard.press('Escape'); await p.waitForTimeout(450); }
    }
    await ctx.close();
  }
  await b.close();
  console.log(todo.length ? todo.join('\n') : 'Sin descuadres');
})();
