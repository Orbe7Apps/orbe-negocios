// Prueba de la tasa BCV euro por forma de pago: sin “Aceptar euros”, se elige la ficha “BCV €” de Pago Móvil
// en la hoja de tasas, se guarda y se revisa que al cobrar Pago Móvil use esa tasa. PC=1 para computadora.
// Uso: node pruebas/tasa-euro.js   (capturas en pruebas/capturas/tasa-euro/)
const { chromium, devices } = require('playwright');
const out = __dirname + '/capturas/tasa-euro/'; require('fs').mkdirSync(out, { recursive: true });
const PC = process.env.PC === '1';
(async () => { const b = await chromium.launch(); const problemas = [];
  const ctx = await b.newContext(PC ? { viewport: { width: 1366, height: 860 } } : Object.assign({}, devices['iPhone 13']));
  const p = await ctx.newPage(); const tag = PC ? 'pc' : 'tel';
  const mal = x => { problemas.push(tag + ': ' + x); console.log('  ✗ ' + x); };
  p.on('pageerror', e => mal('ERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|dolarapi|pydolar|Failed to load|net::|status of 4|status of 5/.test(m.text())) mal('consola: ' + m.text().slice(0, 160)); });
  let n = 0; const foto = async nom => p.screenshot({ path: out + tag + '-' + String(++n).padStart(2, '0') + '-' + nom + '.png' });
  await p.goto('http://localhost:8765/?demo&prueba' + (PC ? '&vista=pc' : '')); await p.waitForTimeout(2500);
  // Sin aceptar euros, para probar que la tasa del euro se puede usar igual.
  await p.evaluate(() => window.__abrir('tasa', {})); await p.waitForTimeout(900);
  const hoja = p.locator('.hoja').first();
  await foto('hoja-tasas');
  // Hoja nueva: cada forma en Bs tiene fichas “BCV $ / BCV € / Otra”.
  const ficha = hoja.locator('button[aria-label="BCV € para Pago Móvil"]');
  if (!(await ficha.count())) { mal('no sale la ficha “BCV €” de Pago Móvil'); await foto('sin-ficha'); await b.close(); process.exit(1); }
  await ficha.click(); await p.waitForTimeout(600);
  if ((await ficha.getAttribute('aria-pressed')) !== 'true') mal('la ficha “BCV €” no quedó elegida');
  // La tarjeta “Euro BCV” aparece arriba (en uso) y al tocarla se escribe a mano.
  await hoja.locator('.tasa-uso-t', { hasText: 'Euro BCV' }).click(); await p.waitForTimeout(400);
  await hoja.locator('input[aria-label="Tasa Euro BCV"]').fill('600'); await p.waitForTimeout(200);
  await foto('elegida');
  await p.locator('.hoja-pie button', { hasText: 'Guardar' }).click(); await p.waitForTimeout(1200);
  // Cobrar: Pago Móvil debe decir “tasa BCV euro” y el monto en Bs con 600.
  await p.evaluate(() => { location.hash = 'vender'; }); await p.waitForTimeout(800);
  await p.locator('.prod:not(.agotado)').first().click(); await p.waitForTimeout(500);
  if (await p.locator('.hoja').count()) { const inp = p.locator('.hoja input[inputmode=decimal], .hoja input.num').first(); if (await inp.count()) { await inp.fill('1'); await p.locator('.hoja button', { hasText: 'Agregar' }).first().click(); } else await p.locator('.hoja .hoja-cuerpo button').first().click(); await p.waitForTimeout(500); }
  await p.locator('.btn', { hasText: /^Cobrar/ }).first().click(); await p.waitForTimeout(900);
  const pm = p.locator('.hoja').getByText('Pago Móvil').first();
  if (await pm.count()) { await pm.click(); await p.waitForTimeout(600); }
  const txt = await p.locator('.hoja').first().innerText().catch(() => '');
  await foto('cobrar');
  if (!/tasa BCV euro/.test(txt)) mal('al cobrar no dice “tasa BCV euro”'); else console.log('cobrar: ' + (txt.match(/Con Pago Móvil[^\n]*/) || [''])[0]);
  if (/undefined|NaN/.test(txt)) mal('texto raro al cobrar');
  console.log(problemas.length ? problemas.length + ' problemas' : 'Sin problemas');
  await b.close(); process.exit(problemas.length ? 1 : 0);
})();
