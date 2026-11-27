// Prueba de “Nuevo producto” con la guía en vivo: cada rubro, celular (y PC con PC=1).
// Abre la hoja, toca “Guíame”, sigue cada paso como lo haría una persona, guarda y revisa “¡Listo!” y “Ver dónde se vende”.
// Uso: node pruebas/producto.js "Panadería o cafetería,Electrodomésticos"   (capturas en pruebas/capturas/producto/)
const { chromium, devices } = require('playwright');
const out = __dirname + '/capturas/producto/'; require('fs').mkdirSync(out, { recursive: true });
const RUBROS = (process.argv[2] || 'Bodega o minimarket,Ferretería,Electrodomésticos,Ropa y calzado,Panadería o cafetería,Barbería').split(',');
const PC = process.env.PC === '1', FOTOS = process.env.FOTOS === '1';
(async () => { const b = await chromium.launch(); const problemas = [];
  for (const rub of RUBROS) {
    const ctx = await b.newContext(PC ? { viewport: { width: 1366, height: 860 } } : Object.assign({}, devices['iPhone 13'], FOTOS ? { deviceScaleFactor: 2 } : {}));
    const p = await ctx.newPage(); const tag = (PC ? 'pc-' : 'tel-') + rub.split(' ')[0];
    const mal = x => { problemas.push(tag + ': ' + x); console.log('  ✗ ' + tag + ': ' + x); };
    p.on('pageerror', e => mal('ERROR ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|dolarapi|pydolar|Failed to load|net::|status of 4|status of 5/.test(m.text())) mal('consola: ' + m.text().slice(0, 160)); });
    const t = async x => { await p.getByText(x).first().click(); await p.waitForTimeout(350); };
    let n = 0; const foto = async nom => { if (FOTOS || n < 99) await p.screenshot({ path: out + tag + '-' + String(++n).padStart(2, '0') + '-' + nom + '.png' }); };
    try {
      await p.goto('http://localhost:8765/?demo=elegir&prueba' + (PC ? '&vista=pc' : '')); await p.waitForTimeout(1300);
      await t('Empezar'); await t('Venezuela'); await t('Continuar'); await p.locator('.rubro-op', { hasText: rub }).first().click(); await p.waitForTimeout(300); await t('Continuar'); await t('Continuar'); await t('Continuar');
      await p.locator('button', { hasText: /Abrir mi/ }).click(); await p.waitForTimeout(1800);
      await p.evaluate(() => window.__abrir('producto', {})); await p.waitForTimeout(900);
      await foto('abre');
      const txt = await p.locator('.hoja').first().innerText();
      if (/undefined|NaN|\[object Object\]/.test(txt)) mal('texto raro: ' + txt.slice(0, 80));
      const tipos = await p.locator('.tipo-prod').count();
      console.log(tag + ' · tipos: ' + tipos + ' · ' + (await p.locator('.tipo-prod b').allInnerTexts()).join(' / '));
      if (!(await p.locator('.guia-invita-btn').count())) { mal('no sale “Guíame”'); continue; }
      await p.locator('.guia-invita-btn').click(); await p.waitForTimeout(700);
      const pasos = [];
      for (let k = 0; k < 14; k++) {
        if (!(await p.locator('.guia-tarjeta').count())) break;
        const tit = (await p.locator('.guia-tarjeta h3').innerText()).trim(); pasos.push(tit);
        const paso = await p.locator('.guia-paso').innerText();
        await foto('guia-' + tit.replace(/[^\wáéíóúñ]+/gi, '-').toLowerCase());
        // La luz debe quedar sobre algo visible y la tarjeta dentro de la pantalla.
        const geo = await p.evaluate(() => { const c = document.querySelector('.guia-tarjeta').getBoundingClientRect(), l = document.querySelector('.guia-luz').getBoundingClientRect(); return { c: [c.top, c.bottom, c.left, c.right], l: [l.top, l.bottom, l.width], vh: innerHeight, vw: innerWidth }; });
        if (geo.c[0] < 0 || geo.c[1] > geo.vh + 1 || geo.c[2] < 0 || geo.c[3] > geo.vw + 1) mal('tarjeta fuera de pantalla en “' + tit + '”');
        if (geo.l[2] > 0 && (geo.c[0] < geo.l[1] - 2 && geo.c[1] > geo.l[0] + 2)) mal('la tarjeta tapa lo iluminado en “' + tit + '”');
        if (tit === '¿Qué vas a agregar?') { await p.locator('.tipo-prod').first().click(); await p.waitForTimeout(800); continue; }
        if (tit === 'El nombre') { await p.locator('[data-guia=nombre] input[type=text]').click(); await p.keyboard.type('Producto de prueba'); await p.waitForTimeout(300); }
        if (/^Precio/.test(tit)) { const ins = p.locator('[data-guia=precio] input'); await ins.nth(0).click(); await p.keyboard.type('2,5'); if (await ins.count() > 1) { await ins.nth(1).click(); await p.keyboard.type('1,2'); } await p.waitForTimeout(300); }
        if (tit === 'Cantidad y aviso') { const ins = p.locator('[data-guia=cantidad] input'); await ins.nth(0).click(); await p.keyboard.type('40'); await ins.nth(1).click(); await p.keyboard.type('10'); await p.waitForTimeout(300); }
        if (tit === 'Guardar') { await p.locator('[data-guia=guardar]').click(); await p.waitForTimeout(1200); break; }
        // Con el teclado abierto en el celular, la persona lo cierra tocando “Siguiente”.
        const sig = p.locator('.guia-sig:not(.apagado)');
        if (!(await sig.count())) { mal('“Siguiente” apagado en “' + tit + '” (' + paso + ')'); break; }
        await sig.click(); await p.waitForTimeout(700);
      }
      console.log(tag + ' · pasos: ' + pasos.join(' → '));
      if (!(await p.getByText('Ya sabes agregar productos').count())) { mal('no salió “¡Listo!”'); await foto('sin-listo'); }
      else {
        await foto('listo');
        await p.locator('.hoja-pie button', { hasText: 'Ver dónde se vende' }).click(); await p.waitForTimeout(1500);
        if (await p.locator('.guia-tarjeta').count()) { await foto('donde-se-vende'); await p.locator('.guia-sig').click(); await p.waitForTimeout(400); }
        else console.log('  · ' + tag + ': sin luz en Vender (lo avisa con un mensaje)');
        if (await p.locator('.guia').count()) mal('la guía no se cerró');
      }
      // Más opciones: cada fila se abre sola.
      await p.evaluate(() => window.__abrir('producto', {})); await p.waitForTimeout(800);
      if (await p.locator('.tipo-prod').count()) { await p.locator('.tipo-prod').first().click(); await p.waitForTimeout(500); }
      await p.locator('.mas-opciones').click(); await p.waitForTimeout(500);
      const filas = await p.locator('.op-cab').count();
      for (let k = 0; k < filas; k++) { await p.locator('.op-cab').nth(k).click(); await p.waitForTimeout(350); if ((await p.locator('.op-cuerpo').count()) !== 1) mal('se abrió más de una fila'); }
      await foto('mas-opciones');
      const ancho = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ancho > 4) mal('se sale de lado ' + ancho + 'px');
    } catch (e) { mal('FALLÓ: ' + e.message.split('\n')[0]); await p.screenshot({ path: out + tag + '-fallo.png' }).catch(() => {}); }
    await ctx.close();
  }
  console.log('FIN · ' + (problemas.length ? problemas.length + ' problemas' : 'SIN PROBLEMAS')); await b.close(); })();
