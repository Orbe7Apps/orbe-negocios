// Barrido: cada rubro (demo), celular y computadora; todas las pantallas, temas de Ajustes y hojas principales. Anota errores.
const { chromium, devices } = require('playwright');
const ahora = () => new Date().toISOString().slice(11, 19);
const out = __dirname + '/capturas/'; require('fs').mkdirSync(out, { recursive: true });
const RUBROS = (process.argv[2] || 'Bodega o minimarket,Ferretería,Electrodomésticos,Ropa y calzado,Farmacia,Restaurante o comida rápida,Panadería o cafetería,Barbería,Salón de belleza,Taller o servicio técnico,Venta en línea,Independiente').split(',');
const MODOS = (process.argv[3] || 'tel,pc').split(',');
(async () => { const b = await chromium.launch(); const problemas = []; const push0 = problemas.push.bind(problemas); problemas.push = x => { console.log('  ✗ ' + x); return push0(x); };
  for (const modo of MODOS) for (const rub of RUBROS) {
    const ctx = await b.newContext(modo === 'tel' ? devices['iPhone 13'] : { viewport: { width: 1366, height: 860 } }); const p = await ctx.newPage();
    const tag = modo + '/' + rub.split(' ')[0]; console.log(ahora() + ' → ' + tag);
    p.on('pageerror', e => problemas.push(tag + ' ERROR: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|dolarapi|pydolar|Failed to load|net::|status of 4|status of 5/.test(m.text())) problemas.push(tag + ' consola: ' + m.text().slice(0, 160)); });
    p.on('popup', x => x.close().catch(() => {})); p.on('dialog', d => d.dismiss().catch(() => {}));
    const t = async x => { await p.getByText(x).first().click(); await p.waitForTimeout(350); };
    try {
      await p.goto('http://localhost:8765/?demo=elegir&prueba' + (modo === 'pc' ? '&vista=pc' : '')); await p.waitForTimeout(1300);
      await t('Empezar'); await t('Venezuela'); await t('Continuar'); await p.locator('.rubro-op', { hasText: rub }).first().click(); await p.waitForTimeout(300); await t('Continuar'); await t('Continuar'); await t('Continuar');
      await p.locator('button', { hasText: /Abrir mi/ }).click(); await p.waitForTimeout(1800);
      const secs = ['hoy', 'vender', 'agenda', 'ordenes', 'cotizaciones', 'cuotas', 'clientes', 'inventario', 'gastos', 'reportes', 'equipo', 'mas'];
      for (const s of secs) {
        await p.evaluate(x => { location.hash = x; }, s); await p.waitForTimeout(700);
        const h = await p.evaluate(() => location.hash.slice(1));
        if (h !== s) continue;
        const txt = (await p.locator('.principal, main, #app').first().innerText().catch(() => '')).trim();
        if (txt.length < 20) problemas.push(tag + ' pantalla vacía: ' + s);
        if (/undefined|NaN|\[object Object\]/.test(txt)) problemas.push(tag + ' texto raro en ' + s + ': ' + (txt.match(/.{0,30}(undefined|NaN|\[object Object\]).{0,30}/) || [''])[0]);
        // Desborde horizontal (algo se sale de la pantalla).
        const ancho = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (ancho > 4) problemas.push(tag + ' se sale de lado ' + ancho + 'px en ' + s);
      }
      // Temas de Ajustes uno por uno.
      await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(700);
      const nombres = modo === 'pc' ? await p.locator('.ajustes-temas button').allInnerTexts() : await p.locator('.menu-lista .fila-menu, .menu-lista button').allInnerTexts();
      for (const nRaw of nombres.map(x => x.split('\n')[0].trim()).filter(Boolean)) {
        if (/Empezar de nuevo/.test(nRaw)) continue;
        try {
          if (modo === 'pc') { if (await p.locator('.hoja').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(450); } await p.locator('.ajustes-temas button', { hasText: nRaw }).first().click({ timeout: 5000 }); }
          else { if (await p.locator('.hoja').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(450); } await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(300); const v0 = p.locator('button.volver'); if (await v0.count()) { await v0.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300); } const btn = p.locator('.menu-lista button', { hasText: nRaw }).first(); if (!(await btn.count())) continue; await btn.click({ timeout: 5000 }); }
          await p.waitForTimeout(450);
          const txt = await p.locator('body').innerText();
          if (/undefined|NaN|\[object Object\]/.test(txt)) problemas.push(tag + ' texto raro en Ajustes/' + nRaw + ': ' + (txt.match(/.{0,30}(undefined|NaN|\[object Object\]).{0,30}/) || [''])[0]);
          if (modo === 'tel') { const v = p.locator('button.volver'); if (await v.count()) await v.click({ timeout: 5000 }); }
        } catch (e) { problemas.push(tag + ' no abre Ajustes/' + nRaw + ': ' + e.message.split('\n')[0]); }
      }
      // Hojas principales.
      const hojas = [['nuevoCliente', {}], ['gasto', undefined], ['producto', {}], ['tasa', undefined], ['negocio', undefined], ['perfil', {}], ['nuevaCita', {}], ['nuevaOrden', {}], ['caja', undefined], ['cierre', undefined], ['promos', undefined], ['grupos', undefined], ['locales', undefined], ['copias', undefined], ['registro', undefined], ['sugerencias', undefined], ['ventasDia', undefined]];
      for (const [k, d] of hojas) {
        await p.evaluate(([k, d]) => { if (window.__abrir) window.__abrir(k, d); }, [k, d]).catch(() => {});
        await p.waitForTimeout(500);
        const abierta = await p.locator('.hoja').count();
        if (abierta) { const txt = await p.locator('.hoja').first().innerText(); if (/undefined|NaN|\[object Object\]/.test(txt)) problemas.push(tag + ' texto raro en hoja ' + k + ': ' + (txt.match(/.{0,30}(undefined|NaN|\[object Object\]).{0,30}/) || [''])[0]); await p.keyboard.press('Escape'); await p.waitForTimeout(450); }
      }
      // Venta completa.
      await p.evaluate(() => { location.hash = 'vender'; }); await p.waitForTimeout(700);
      const prod = p.locator('.prod:not(.agotado)').first();
      if (await prod.count()) { await prod.click(); await p.waitForTimeout(500);
        // Talla o variante: se elige la primera. Por peso o medida: 1.
        if (await p.locator('.hoja').count()) { const inp = p.locator('.hoja input[inputmode=decimal], .hoja input.num').first(); if (await inp.count()) { await inp.fill('1'); await p.locator('.hoja button', { hasText: 'Agregar' }).first().click(); } else await p.locator('.hoja .hoja-cuerpo button').first().click(); await p.waitForTimeout(500); }
        await p.locator('.btn', { hasText: /^Cobrar/ }).first().click(); await p.waitForTimeout(700); await p.locator('.hoja-pie .btn').first().click(); await p.waitForTimeout(900); const ok = await p.getByText(/Venta guardada|Cobro guardado|Listo/).count(); if (!ok) problemas.push(tag + ' la venta no muestra el recibo'); await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
      else problemas.push(tag + ' sin productos para vender');
    } catch (e) { problemas.push(tag + ' FALLÓ EL RECORRIDO: ' + e.message.split('\n')[0]); await p.screenshot({ path: out + tag.replace('/', '-') + '-fallo.png' }).catch(() => {}); }
    await ctx.close();
  }
  console.log(ahora() + ' FIN · ' + (problemas.length ? problemas.length + ' problemas' : 'SIN PROBLEMAS')); await b.close(); })();
