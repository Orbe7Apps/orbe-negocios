// Prueba: con una forma de pago en bolívares (Pago Móvil, Punto de venta, Efectivo Bs) el monto se escribe en Bs.
// Gasto: Bs 1.000 por Pago Móvil se guarda y sale como Bs 1.000,00; al cambiar a Efectivo $ lo escrito pasa a dólares.
// Abono, abono a orden, anticipo y pago de cuotas usan el mismo campo. PC=1 para computadora.
// Uso: node pruebas/montos-bs.js   (capturas en pruebas/capturas/montos-bs/)
const { chromium, devices } = require('playwright');
const out = __dirname + '/capturas/montos-bs/'; require('fs').mkdirSync(out, { recursive: true });
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
  const moneda = async () => (await hoja().locator('.monto-forma .pago-moneda').first().innerText().catch(() => '')).trim();
  const chip = async t => { await hoja().locator('.chip', { hasText: t }).first().click(); await p.waitForTimeout(350); };
  const cerrar = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(700); };

  // ---- Gasto ----
  await p.evaluate(() => window.__abrir('gasto', {})); await p.waitForTimeout(900);
  await chip('Pago Móvil');
  if (await moneda() !== 'Bs') mal('gasto con Pago Móvil no está en Bs (' + await moneda() + ')'); else bien('gasto con Pago Móvil pide Bs');
  const inp = hoja().locator('.monto-forma input').first();
  if (await p.evaluate(() => document.activeElement && document.activeElement.tagName === 'INPUT')) mal('se abrió el teclado solo');
  await inp.fill('1000'); await p.waitForTimeout(300);
  let t = await texto();
  if (!/= \$ ?[\d.,]+ · tasa/.test(t)) mal('no dice cuánto es en $'); else bien('muestra ' + t.match(/= \$[^\n]*/)[0]);
  await foto('gasto-bs');
  await chip('Efectivo $');
  const enUsd = await inp.inputValue();
  if (await moneda() !== '$' || !(parseFloat(enUsd.replace(',', '.')) > 0 && parseFloat(enUsd.replace(',', '.')) < 100)) mal('al pasar a Efectivo $ no convirtió (' + enUsd + ')'); else bien('Efectivo $ → ' + enUsd + ' $');
  await foto('gasto-usd');
  await chip('Pago Móvil');
  const deVuelta = await inp.inputValue();
  if (Math.abs(parseFloat(deVuelta.replace(/\./g, '').replace(',', '.')) - 1000) > 3) mal('al volver a Pago Móvil no da ~1000 (' + deVuelta + ')'); else bien('de vuelta: Bs ' + deVuelta);
  await inp.fill('1000'); await p.waitForTimeout(200);
  // Botón $/Bs cambia la moneda a mano sin tocar el número.
  await hoja().locator('.monto-forma .pago-moneda').click(); await p.waitForTimeout(200);
  if (await moneda() !== '$' || await inp.inputValue() !== '1000') mal('el botón de moneda no cambió a $'); else bien('botón de moneda → $');
  await hoja().locator('.monto-forma .pago-moneda').click(); await p.waitForTimeout(200);
  await hoja().locator('.hoja-pie button', { hasText: 'Guardar gasto' }).click(); await p.waitForTimeout(1200);
  await p.evaluate(() => { location.hash = 'gastos'; }); await p.waitForTimeout(1200);
  const tg = await p.locator('main, .pantalla, body').first().innerText();
  if (!/Bs 1\.000,00/.test(tg)) mal('el gasto no sale como Bs 1.000,00'); else bien('gasto guardado: Bs 1.000,00');
  await foto('gastos');

  // ---- Abono de un cliente (otro monto) ----
  await p.evaluate(() => { location.hash = 'clientes'; }); await p.waitForTimeout(1000);
  const deudor = p.locator('button', { hasText: /^(Anotar abono|Abono)$/ }).first();
  if (await deudor.count()) {
    await deudor.click(); await p.waitForTimeout(900);
    if (/Anotar abono/.test(await texto())) {
      await hoja().locator('button', { hasText: 'Otro monto' }).click(); await p.waitForTimeout(400);
      await chip('Pago Móvil');
      if (await moneda() !== 'Bs') mal('abono con Pago Móvil no está en Bs'); else bien('abono con Pago Móvil pide Bs');
      await hoja().locator('.monto-forma input').fill('500'); await p.waitForTimeout(300);
      if (!/Anotar abono de \$ ?\d/.test(await texto())) mal('el botón del abono no muestra $'); else bien((await texto()).match(/Anotar abono de[^\n]*/)[0]);
      await foto('abono'); await cerrar();
    } else bien('(no se abrió la hoja de abono; se salta)');
  } else bien('(sin deudores en la demo; se salta el abono)');

  // ---- Nueva orden: anticipo ----
  await p.evaluate(() => window.__abrir('nuevaOrden', {})); await p.waitForTimeout(900);
  if (await hoja().locator('.monto-forma').count()) {
    await hoja().locator('.monto-forma input').fill('20'); await p.waitForTimeout(400);
    await chip('Pago Móvil');
    if (await moneda() !== 'Bs') mal('anticipo con Pago Móvil no está en Bs'); else bien('anticipo con Pago Móvil → Bs ' + await hoja().locator('.monto-forma input').inputValue());
    await foto('anticipo');
  } else mal('no sale el campo del anticipo');
  await cerrar();

  const t2 = await p.locator('body').innerText();
  if (/undefined|NaN/.test(t2)) mal('texto raro');
  console.log(problemas.length ? problemas.length + ' problemas' : 'Sin problemas');
  await b.close(); process.exit(problemas.length ? 1 : 0);
})();
