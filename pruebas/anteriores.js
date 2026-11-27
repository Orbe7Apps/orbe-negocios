// Prueba: “Registrar días anteriores”. Se registra una venta (en Bs, con productos), un gasto, un abono y un fiado
// del día de antier: quedan con esa fecha, la tasa de ese día y la marca “ant”; la caja y las ventas de hoy no cambian;
// los números de venta no se repiten y la cadena de integridad sigue bien. PC=1 para computadora.
// Uso: node pruebas/anteriores.js   (capturas en pruebas/capturas/anteriores/)
const { chromium, devices } = require('playwright');
const out = __dirname + '/capturas/anteriores/'; require('fs').mkdirSync(out, { recursive: true });
const PC = process.env.PC === '1';
(async () => { const b = await chromium.launch(); const problemas = [];
  const ctx = await b.newContext(PC ? { viewport: { width: 1366, height: 860 } } : Object.assign({}, devices['iPhone 13']));
  const p = await ctx.newPage(); const tag = PC ? 'pc' : 'tel';
  const mal = x => { problemas.push(tag + ': ' + x); console.log('  ✗ ' + x); };
  const bien = x => console.log('  ✓ ' + x);
  p.on('pageerror', e => mal('ERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|dolarapi|pydolar|Failed to load|net::|status of 4|status of 5/.test(m.text())) mal('consola: ' + m.text().slice(0, 160)); });
  let n = 0; const foto = async nom => p.screenshot({ path: out + tag + '-' + String(++n).padStart(2, '0') + '-' + nom + '.png' });
  await p.goto('http://localhost:8765/?demo&prueba' + (PC ? '&vista=pc' : '')); await p.waitForTimeout(2500);
  const hoja = () => p.locator('.hoja').last();
  const texto = async () => (await hoja().innerText().catch(() => ''));
  const chip = async t => { await hoja().locator('.chip', { hasText: t }).first().click(); await p.waitForTimeout(350); };
  const boton = async t => { await hoja().locator('button', { hasText: t }).first().click(); await p.waitForTimeout(600); };
  const estado = () => p.evaluate(async () => {
    const d = await import('/js/datos.js'), S = d.leer(), hoy0 = d.inicioDia(Date.now());
    const caja = d.cajaEntre(hoy0, Date.now() + 1).esperado, nums = S.ventas.map(v => v.n);
    return { caja: Object.keys(caja).map(k => k + ':' + caja[k].toFixed(2)).sort().join('|'), hoyN: S.ventas.filter(v => v.t >= hoy0).length,
      repetidos: nums.length - new Set(nums).size, integridad: !d.revisarIntegridad().ventas, ventas: S.ventas.length, gastos: S.gastos.length, abonos: S.abonos.length };
  });
  const antes = await estado();

  // ---- Entrada en Caja ----
  await p.evaluate(() => window.__abrir('caja', {})); await p.waitForTimeout(900);
  if (!/Registrar días anteriores/.test(await texto())) mal('Caja no muestra “Registrar días anteriores”'); else bien('entrada en Caja');
  await boton('Registrar días anteriores'); await p.waitForTimeout(500);
  if (await p.evaluate(() => document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) mal('se abrió el teclado solo');
  if (!/¿De qué día es\?/.test(await texto())) mal('no pregunta el día'); else bien('pregunta el día');
  await foto('dia');
  await chip('Antier');
  const t1 = await texto();
  if (!/Tasa BCV del/.test(t1)) mal('no muestra la tasa de ese día'); else bien('tasa de ese día: ' + (t1.match(/Bs [\d.,]+/) || [''])[0]);
  await foto('dia-elegido');
  await hoja().locator('.hoja-pie .btn').click(); await p.waitForTimeout(600);
  if (!/¿Qué vas a registrar\?/.test(await texto())) mal('no llegó al menú'); else bien('menú del día');
  await foto('menu');

  // ---- Venta en Bs con productos ----
  await hoja().locator('[data-guia=ant-venta]').click(); await p.waitForTimeout(600);
  await chip('Pago Móvil');
  const mon = (await hoja().locator('.monto-forma .pago-moneda').first().innerText().catch(() => '')).trim();
  if (mon !== 'Bs') mal('la venta con Pago Móvil no pide Bs (' + mon + ')'); else bien('venta con Pago Móvil en Bs');
  await hoja().locator('.monto-forma input').first().fill('9724'); await p.waitForTimeout(300);
  await foto('venta');
  await boton('Qué se vendió');
  await hoja().locator('.lista .item').first().locator('button').last().click(); await p.waitForTimeout(200);
  await hoja().locator('.lista .item').first().locator('button').last().click(); await p.waitForTimeout(200);
  await foto('productos');
  await hoja().locator('.hoja-pie .btn', { hasText: 'Listo' }).click(); await p.waitForTimeout(500);
  await hoja().locator('.hoja-pie .btn', { hasText: 'Registrar venta' }).click(); await p.waitForTimeout(900);

  // ---- Gasto ----
  await hoja().locator('[data-guia=ant-gasto]').click(); await p.waitForTimeout(600);
  await chip('Efectivo $');
  await hoja().locator('.monto-forma input').first().fill('35'); await p.waitForTimeout(200);
  await chip('Transporte');
  await hoja().locator('.hoja-pie .btn', { hasText: 'Registrar gasto' }).click(); await p.waitForTimeout(900);

  // ---- Abono ----
  const hayAbono = await hoja().locator('[data-guia=ant-abono]').count();
  if (hayAbono) {
    await hoja().locator('[data-guia=ant-abono]').click(); await p.waitForTimeout(600);
    const quien = hoja().locator('.lista .item').first();
    if (await quien.count()) {
      await quien.click(); await p.waitForTimeout(400);
      await chip('Efectivo $');
      await hoja().locator('.monto-forma input').first().fill('5'); await p.waitForTimeout(200);
      await hoja().locator('.hoja-pie .btn', { hasText: 'Registrar abono' }).click(); await p.waitForTimeout(900);
    } else { await boton('Volver'); }
  }
  // ---- Fiado ----
  const hayFiado = await hoja().locator('[data-guia=ant-fiado]').count();
  if (hayFiado) {
    await hoja().locator('[data-guia=ant-fiado]').click(); await p.waitForTimeout(600);
    await hoja().locator('.lista .item').first().click(); await p.waitForTimeout(400);
    await hoja().locator('.monto-forma input').first().fill('10'); await p.waitForTimeout(200);
    await foto('fiado');
    await hoja().locator('.hoja-pie .btn', { hasText: 'Registrar fiado' }).click(); await p.waitForTimeout(900);
  }
  const tm = await texto();
  if (!/registrado después/.test(tm)) mal('el menú no muestra lo registrado'); else bien('el día muestra lo registrado (' + (tm.match(/registrado después/g) || []).length + ')');
  await foto('dia-con-registros');

  // ---- Lo guardado ----
  const despues = await estado();
  const det = await p.evaluate(async () => {
    const d = await import('/js/datos.js'), S = d.leer(), antier = d.inicioDia(Date.now()) - 2 * 86400000;
    const en = x => x.t >= antier && x.t < antier + 86400000;
    const v = S.ventas.filter(x => x.ant && !x.fiado).slice(-1)[0], f = S.ventas.filter(x => x.ant && x.fiado).slice(-1)[0];
    const g = S.gastos.filter(x => x.ant).slice(-1)[0], a = S.abonos.filter(x => x.ant).slice(-1)[0];
    const t = d.tasasDelDia(antier);
    return { v: v && { en: en(v), tasa: v.tasa, tasaDia: t.prin, total: v.total, bs: v.pagos.map(p => p.m).join(','), items: v.items.map(i => i.q + 'x' + i.n).join(', ') },
      f: f && { en: en(f), m: f.pagos[0].m, cli: !!f.cli }, g: g && { en: en(g), v: g.v }, a: a && { en: en(a), v: a.v }, reg: S.registro.slice(-4).map(r => r.que) };
  });
  console.log('  · ', JSON.stringify(det));
  if (!det.v || !det.v.en) mal('la venta no quedó en antier'); else bien('venta en antier · ' + det.v.items);
  if (det.v && Math.abs(det.v.tasa - det.v.tasaDia) > 0.001) mal('la venta no usa la tasa de ese día'); else if (det.v) bien('venta con la tasa de ese día (' + det.v.tasa + ')');
  if (det.v && Math.abs(det.v.total - 9724 / det.v.tasaDia) > 0.02) mal('Bs 9.724 no se pasaron con la tasa de ese día (' + det.v.total + ')'); else if (det.v) bien('Bs 9.724 = $ ' + det.v.total.toFixed(2));
  if (!det.g || !det.g.en || Math.abs(det.g.v - 35) > 0.01) mal('el gasto no quedó en antier por $ 35'); else bien('gasto en antier');
  if (hayAbono && (!det.a || !det.a.en)) mal('el abono no quedó en antier'); else if (det.a) bien('abono en antier');
  if (hayFiado && (!det.f || !det.f.en || det.f.m !== 'Fiado' || !det.f.cli)) mal('el fiado no quedó bien'); else if (det.f) bien('fiado en antier');
  if (despues.caja !== antes.caja) mal('¡la caja de hoy cambió! ' + antes.caja + ' → ' + despues.caja); else bien('la caja de hoy no cambió');
  if (despues.hoyN !== antes.hoyN) mal('cambiaron las ventas de hoy'); else bien('las ventas de hoy no cambiaron');
  if (despues.repetidos) mal('hay números de venta repetidos'); else bien('números de venta sin repetir');
  if (!despues.integridad) mal('la cadena de integridad se rompió'); else bien('cadena de integridad bien');
  if (!det.reg.some(r => /día anterior/.test(r))) mal('no quedó en el registro de cambios'); else bien('queda en el registro de cambios');

  // ---- Hoy: últimas ventas no muestran la de antier ----
  await p.keyboard.press('Escape'); await p.waitForTimeout(700);
  await p.evaluate(() => { location.hash = 'hoy'; }); await p.waitForTimeout(900);
  // ---- Buscador de Ajustes ----
  await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(1000);
  await p.locator('[data-guia=buscar-ajuste] input').first().fill('cuaderno'); await p.waitForTimeout(500);
  if (!/Registrar días anteriores/.test(await p.locator('body').innerText())) mal('el buscador de Ajustes no lo encuentra'); else bien('Ajustes lo encuentra con “cuaderno”');
  await foto('ajustes');

  await b.close();
  console.log(problemas.length ? '\n' + problemas.length + ' problema(s)' : '\nTodo bien');
  process.exit(problemas.length ? 1 : 0);
})();
