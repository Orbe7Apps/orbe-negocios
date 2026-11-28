// Prueba de las pantallas vacías (cuenta nueva, sin datos de ejemplo): que cada una enseñe con su escena,
// que no repita la frase y que su “Guíame” termine. Uso: node pruebas/vacias.js "Taller o servicio técnico,Barbería"   (PC=1 para computadora)
const { chromium, devices } = require('playwright');
const out = __dirname + '/capturas/vacias/'; require('fs').mkdirSync(out, { recursive: true });
const RUBROS = (process.argv[2] || 'Taller o servicio técnico,Barbería,Electrodomésticos').split(',');
const PC = process.env.PC === '1';
(async () => { const b = await chromium.launch(); const problemas = [];
  for (const rub of RUBROS) {
    const ctx = await b.newContext(PC ? { viewport: { width: 1366, height: 860 } } : devices['iPhone 13']);
    const p = await ctx.newPage(); const tag = (PC ? 'pc-' : 'tel-') + rub.split(' ')[0];
    const mal = x => { problemas.push(tag + ': ' + x); console.log('  ✗ ' + tag + ': ' + x); };
    p.on('pageerror', e => mal('ERROR ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|dolarapi|pydolar|Failed to load|net::|status of 4|status of 5/.test(m.text())) mal('consola: ' + m.text().slice(0, 160)); });
    const t = async x => { await p.getByText(x).first().click(); await p.waitForTimeout(350); };
    try {
      await p.goto('http://localhost:8765/?demo=elegir&prueba' + (PC ? '&vista=pc' : '')); await p.waitForTimeout(1300);
      await t('Empezar'); await t('Venezuela'); await t('Continuar'); await p.locator('.rubro-op', { hasText: rub }).first().click(); await p.waitForTimeout(300);
      for (let k = 0; k < 6 && !(await p.locator('.tarjeta', { hasText: 'mes de ventas de ejemplo' }).count()); k++) await t('Continuar');
      // Sin el mes de ejemplo: cuenta vacía.
      await p.locator('.tarjeta', { hasText: 'mes de ventas de ejemplo' }).last().locator('[role=switch], .inter, button').first().click(); await p.waitForTimeout(300);
      await p.locator('button', { hasText: /Abrir mi/ }).click(); await p.waitForTimeout(1800);
      for (const sec of ['vender', 'clientes', 'inventario', 'agenda', 'ordenes', 'cotizaciones', 'cuotas', 'reportes']) {
        await p.evaluate(h => { location.hash = '#' + h; }, sec); await p.waitForTimeout(1000);
        if (!(await p.evaluate(h => !!document.querySelector('[data-sec="' + h + '"]'), sec))) continue;
        const esc = await p.locator('.escena').count(), frases = await p.locator('[data-sec] .frase-viva').count();
        await p.screenshot({ path: out + tag + '-' + sec + '.png' });
        console.log(tag + ' · ' + sec + ': escena ' + esc + ', frases ' + frases);
        if (!esc) mal(sec + ' vacía sin escena');
        if (frases > 1) mal(sec + ' con ' + frases + ' frases');
        // “Guíame paso a paso” vive dentro del “?”.
        const q = p.locator('main .boton-ayuda, .barra-sup .boton-ayuda').first(); let g = false;
        if (await q.count()) { await q.click(); await p.waitForTimeout(600); const b = p.locator('.guia-ayuda-btn'); if (await b.count()) { await b.click(); g = true; } else { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } }
        if (g) {
          await p.waitForTimeout(700);
          for (let k = 0; k < 10 && await p.locator('.guia-tarjeta').count(); k++) { const s = p.locator('button.guia-sig:not([disabled])'); if (!(await s.count())) { mal(sec + ': paso sin “Siguiente”'); await p.keyboard.press('Escape'); break; } await s.click(); await p.waitForTimeout(600); }
          if (await p.locator('.guia').count()) mal(sec + ': la guía no terminó');
        }
      }
    } catch (e) { mal('FALLÓ: ' + e.message.split('\n')[0]); await p.screenshot({ path: out + tag + '-fallo.png' }).catch(() => {}); }
    await ctx.close();
  }
  console.log('FIN · ' + (problemas.length ? problemas.length + ' problemas' : 'SIN PROBLEMAS')); await b.close(); })();
