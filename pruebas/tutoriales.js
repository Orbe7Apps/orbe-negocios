// Prueba de Tutoriales y del recorrido que se hace tocando.
// Con la demo (todo encendido): abre Tutoriales, corre cada tutorial como lo haría una persona (toca lo iluminado o “Siguiente”)
// y revisa que termine, que la tarjeta quede en pantalla, que la venta de práctica no quede y que salga el ✓.
// Después cambia el perfil a cajero y revisa que vea menos tutoriales.
// Uso: node pruebas/tutoriales.js            (PC=1 para computadora; SOLO=venta,abono para correr algunos)
const { chromium, devices } = require('playwright');
const out = __dirname + '/capturas/tutoriales/'; require('fs').mkdirSync(out, { recursive: true });
const PC = process.env.PC === '1', SOLO = (process.env.SOLO || '').split(',').filter(Boolean);
(async () => {
  const b = await chromium.launch(); const problemas = [];
  const ctx = await b.newContext(PC ? { viewport: { width: 1366, height: 860 } } : devices['iPhone 13']);
  const p = await ctx.newPage(); const tag = PC ? 'pc' : 'tel';
  const mal = x => { problemas.push(tag + ': ' + x); console.log('  ✗ ' + x); };
  p.on('pageerror', e => mal('ERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|dolarapi|pydolar|Failed to load|net::|status of 4|status of 5/.test(m.text())) mal('consola: ' + m.text().slice(0, 160)); });
  let n = 0; const foto = nom => p.screenshot({ path: out + tag + '-' + String(++n).padStart(3, '0') + '-' + nom.replace(/[^\wáéíóúñ]+/gi, '-').toLowerCase().slice(0, 50) + '.png' });
  const seguir = async nombre => {
    const pasos = [];
    for (let k = 0; k < 16; k++) {
      await p.waitForTimeout(500);
      if (!(await p.locator('.guia-tarjeta').count())) break;
      const tit = (await p.locator('.guia-tarjeta h3').innerText()).trim(); pasos.push(tit);
      // “Agregar un producto” entrega a la guía de la hoja (la prueba de esa guía es pruebas/producto.js).
      if (nombre === 'producto' && pasos.includes('Sigo contigo en la hoja') && tit !== 'Sigo contigo en la hoja') { await foto(nombre + '-' + tit); await p.locator('.guia-salir').click(); await p.waitForTimeout(400); await p.keyboard.press('Escape'); break; }
      await foto(nombre + '-' + tit);
      const geo = await p.evaluate(() => { const c = document.querySelector('.guia-tarjeta').getBoundingClientRect(); return { c: [c.top, c.bottom, c.left, c.right], vh: innerHeight, vw: innerWidth }; });
      if (geo.c[0] < 0 || geo.c[1] > geo.vh + 1 || geo.c[2] < 0 || geo.c[3] > geo.vw + 1) mal(nombre + ': tarjeta fuera de pantalla en “' + tit + '”');
      const sig = p.locator('button.guia-sig:not([disabled])');
      if (await sig.count()) { await sig.click(); await p.waitForTimeout(600); continue; }
      const l = await p.locator('.guia-luz').boundingBox();
      if (!l || l.width < 2) { await p.waitForTimeout(1500); continue; }
      await p.mouse.click(l.x + Math.min(l.width / 2, 60), l.y + Math.min(l.height / 2, 40)); await p.waitForTimeout(900);
    }
    if (await p.locator('.guia').count()) mal(nombre + ': no terminó (' + pasos.join(' → ') + ')');
    console.log(nombre + ': ' + pasos.join(' → '));
    return pasos;
  };
  const lista = () => p.locator('[data-tut]').evaluateAll(xs => xs.map(x => x.dataset.tut));
  const irTutoriales = () => p.evaluate(() => { location.hash = '#tutoriales'; });
  try {
    await p.goto('http://localhost:8765/?demo&prueba' + (PC ? '&vista=pc' : '')); await p.waitForTimeout(2500);
    // El recorrido por la app, desde Tutoriales (la tarjeta “¿Primera vez?” ya no sale en Hoy).
    if (await p.locator('[data-tour-oferta]').count()) mal('la tarjeta “¿Primera vez?” sigue saliendo en Hoy');
    await irTutoriales(); await p.waitForTimeout(900);
    const rec = p.locator('[data-tut=recorrido]').first();
    if (await rec.count()) { await rec.click(); const ps = await seguir('recorrido'); if (ps.length < 6) mal('recorrido corto: ' + ps.join(' → ')); }
    else mal('no sale el recorrido en Tutoriales');
    await p.waitForTimeout(800);
    if (!(await p.locator('[data-guia=tut-lista]').count())) mal('al terminar el recorrido no quedó en Tutoriales');
    if (!PC) { await p.evaluate(() => { location.hash = '#mas'; }); await p.waitForTimeout(800); if (!(await p.locator('.menu-lista [data-tema=tutoriales]').count())) mal('no sale Tutoriales en Más'); else { const orden = await p.locator('.menu-lista [data-tema]').evaluateAll(xs => xs.map(x => x.dataset.tema)); if (orden.indexOf('tutoriales') !== orden.indexOf('equipo') + 1) mal('Tutoriales no va debajo de Equipo: ' + orden.join(',')); } await foto('mas'); }
    else if (!(await p.locator('.lateral [data-nav=tutoriales]').count())) mal('no sale Tutoriales en el menú');
    await irTutoriales(); await p.waitForTimeout(900); await foto('lista-dueno');
    const todos = await lista(); console.log('Dueño ve ' + todos.length + ': ' + todos.join(', '));
    for (const id of todos.filter(x => x !== 'recorrido' && (!SOLO.length || SOLO.includes(x)))) {
      await irTutoriales(); await p.waitForTimeout(700);
      await p.locator('[data-tut="' + id + '"]').first().click(); await p.waitForTimeout(500);
      await seguir(id);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      const venta = await p.evaluate(async () => { const v = await import('/js/pantallas/vender.js'); return Object.keys(v.tomarCarrito().cart.q).length; });
      if (venta) mal(id + ': quedó la venta de práctica');
    }
    await irTutoriales(); await p.waitForTimeout(800); await foto('lista-dueno-hechos');
    const hechos = await p.locator('.tut-hecho').count(); console.log('Con ✓: ' + hechos);
    if (!SOLO.length && hechos < todos.length - 2) mal('pocos tutoriales con ✓: ' + hechos + ' de ' + todos.length);
    // Cajero: menos tutoriales
    await p.evaluate(async () => { const d = await import('/js/datos.js'); const yo = d.perfilActual(); d.guardarPerfil({ id: yo.id, rol: 'cajero' }); });
    await p.waitForTimeout(800); await irTutoriales(); await p.waitForTimeout(900); await foto('lista-cajero');
    const caj = await lista(); console.log('Cajero ve ' + caj.length + ': ' + caj.join(', '));
    if (caj.length >= todos.length || caj.includes('empleado') || caj.includes('gasto')) mal('el cajero ve tutoriales que no le tocan');
    await p.locator('[data-tut=recorrido]').first().click(); await seguir('recorrido-cajero');
  } catch (e) { mal('falló: ' + e.message.split('\n')[0]); await foto('fallo'); }
  console.log(problemas.length ? '\n' + problemas.length + ' problemas' : '\nSin problemas');
  await b.close();
})();
