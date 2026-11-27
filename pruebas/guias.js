// Prueba de las guías en vivo de cada pantalla (“Guíame”) y la frase de arriba.
// Para cada rubro: abre Hoy, revisa la frase, sigue la guía de Hoy y la de Vender como lo haría una persona
// (tocando lo iluminado), hasta el recibo. Uso: node pruebas/guias.js "Ferretería,Barbería"   (PC=1 para computadora)
const { chromium, devices } = require('playwright');
const out = __dirname + '/capturas/guias/'; require('fs').mkdirSync(out, { recursive: true });
const RUBROS = (process.argv[2] || 'Bodega o minimarket,Ferretería,Barbería,Taller o servicio técnico').split(',');
const PC = process.env.PC === '1';
(async () => { const b = await chromium.launch(); const problemas = [];
  for (const rub of RUBROS) {
    const ctx = await b.newContext(PC ? { viewport: { width: 1366, height: 860 } } : devices['iPhone 13']);
    const p = await ctx.newPage(); const tag = (PC ? 'pc-' : 'tel-') + rub.split(' ')[0];
    const mal = x => { problemas.push(tag + ': ' + x); console.log('  ✗ ' + tag + ': ' + x); };
    p.on('pageerror', e => mal('ERROR ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|dolarapi|pydolar|Failed to load|net::|status of 4|status of 5/.test(m.text())) mal('consola: ' + m.text().slice(0, 160)); });
    const t = async x => { await p.getByText(x).first().click(); await p.waitForTimeout(350); };
    let n = 0; const foto = async nom => p.screenshot({ path: out + tag + '-' + String(++n).padStart(2, '0') + '-' + nom + '.png' });
    // Sigue una guía: toca “Siguiente” o, si hay que tocar algo, el centro de lo iluminado.
    const seguir = async nombre => {
      const pasos = [];
      for (let k = 0; k < 12; k++) {
        if (!(await p.locator('.guia-tarjeta').count())) break;
        const tit = (await p.locator('.guia-tarjeta h3').innerText()).trim(); pasos.push(tit);
        await foto(nombre + '-' + tit.replace(/[^\wáéíóúñ]+/gi, '-').toLowerCase());
        const geo = await p.evaluate(() => { const c = document.querySelector('.guia-tarjeta').getBoundingClientRect(); return { c: [c.top, c.bottom, c.left, c.right], vh: innerHeight, vw: innerWidth }; });
        if (geo.c[0] < 0 || geo.c[1] > geo.vh + 1 || geo.c[2] < 0 || geo.c[3] > geo.vw + 1) mal('tarjeta fuera de pantalla en “' + tit + '”');
        const sig = p.locator('button.guia-sig:not([disabled])');
        if (await sig.count()) { await sig.click(); await p.waitForTimeout(700); continue; }
        const l = await p.locator('.guia-luz').boundingBox();
        if (!l || l.width < 2) { mal('nada iluminado y sin “Siguiente” en “' + tit + '”'); break; }
        await p.mouse.click(l.x + l.width / 2, l.y + Math.min(l.height / 2, 40)); await p.waitForTimeout(1300);
      }
      console.log(tag + ' · ' + nombre + ': ' + pasos.join(' → '));
      if (await p.locator('.guia').count()) mal('la guía de ' + nombre + ' no terminó');
      return pasos;
    };
    try {
      await p.goto('http://localhost:8765/?demo=elegir&prueba' + (PC ? '&vista=pc' : '')); await p.waitForTimeout(1300);
      await t('Empezar'); await t('Venezuela'); await t('Continuar'); await p.locator('.rubro-op', { hasText: rub }).first().click(); await p.waitForTimeout(300); await t('Continuar'); await t('Continuar'); await t('Continuar');
      await p.locator('button', { hasText: /Abrir mi/ }).click(); await p.waitForTimeout(1800);
      const frase = await p.locator('.frase-viva').first().innerText().catch(() => '');
      console.log(tag + ' · frase de Hoy: ' + frase);
      if (!frase || /undefined|NaN|\[object/.test(frase)) mal('frase de Hoy rara: ' + frase);
      if (!(await p.locator('.guiame').count())) mal('no sale “Guíame” en Hoy');
      await p.locator('.guiame').first().click(); await p.waitForTimeout(800);
      await seguir('hoy');
      // Vender
      await p.evaluate(() => { location.hash = '#vender'; }); await p.waitForTimeout(1200);
      const fv = await p.locator('.frase-viva').first().innerText().catch(() => '');
      console.log(tag + ' · frase de Vender: ' + fv);
      if (!fv || /undefined|NaN|\[object/.test(fv)) mal('frase de Vender rara: ' + fv);
      // Desde el “?”: “Guíame paso a paso”
      await p.locator('.boton-ayuda').first().click(); await p.waitForTimeout(700);
      if (!(await p.locator('.guia-ayuda-btn').count())) mal('el “?” no ofrece “Guíame paso a paso”');
      else { await p.locator('.guia-ayuda-btn').click(); await p.waitForTimeout(900); const ps = await seguir('vender'); if (!ps.includes('El recibo') && !ps.some(x => /primer/.test(x))) mal('la guía de Vender no llegó al recibo'); }
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      // Clientes: frase, “Guíame” y su guía (sin tocar nada que mueva dinero).
      await p.evaluate(() => { location.hash = '#clientes'; }); await p.waitForTimeout(1200);
      const fc = await p.locator('.frase-viva').first().innerText().catch(() => '');
      console.log(tag + ' · frase de Clientes: ' + fc);
      if (/undefined|NaN|\[object/.test(fc)) mal('frase de Clientes rara: ' + fc);
      if (!(await p.locator('.guiame').count())) mal('no sale “Guíame” en Clientes');
      else { await p.locator('.guiame').first().click(); await p.waitForTimeout(800); await seguir('clientes'); }
      // Inventario (o Servicios) y Gastos.
      for (const sec of ['inventario', 'gastos', 'agenda', 'ordenes', 'cotizaciones', 'cuotas']) {
        await p.evaluate(h => { location.hash = '#' + h; }, sec); await p.waitForTimeout(1200);
        if (!(await p.evaluate(h => !!document.querySelector('[data-sec="' + h + '"]'), sec))) { console.log(tag + ' · ' + sec + ': no está en este perfil'); continue; }
        const fs = await p.locator('.frase-viva').first().innerText().catch(() => '');
        console.log(tag + ' · frase de ' + sec + ': ' + fs);
        if (!fs || /undefined|NaN|\[object/.test(fs)) mal('frase de ' + sec + ' rara: ' + fs);
        if (!(await p.locator('.guiame').count())) mal('no sale “Guíame” en ' + sec);
        else { await p.locator('.guiame').first().click(); await p.waitForTimeout(800); await seguir(sec); }
      }
      // Caja y cierre del día (si el negocio usa caja).
      if (await p.evaluate(() => !!window.__abrir)) {
        await p.evaluate(() => window.__abrir('caja')); await p.waitForTimeout(900);
        if (await p.locator('.hoja .frase-viva').count()) {
          const fk = await p.locator('.hoja .frase-viva').innerText(); console.log(tag + ' · frase de Caja: ' + fk);
          if (/undefined|NaN|\[object/.test(fk)) mal('frase de Caja rara: ' + fk);
          if (!(await p.locator('.hoja .guiame').count())) mal('no sale “Guíame” en Caja');
          else { await p.locator('.hoja .guiame').click(); await p.waitForTimeout(800); await seguir('caja'); }
          const dia = p.locator('[data-guia=caja-dia]');
          if (await dia.count()) {
            await dia.click(); await p.waitForTimeout(1500); await foto('cierre');
            await p.locator('.hoja .boton-ayuda').last().click(); await p.waitForTimeout(700); await foto('cierre-ayuda');
            if (!(await p.locator('.guia-ayuda-btn').count())) mal('el “?” del cierre no ofrece “Guíame paso a paso”');
            else { await p.locator('.guia-ayuda-btn').click(); await p.waitForTimeout(900); await seguir('cierre'); }
          }
          await p.keyboard.press('Escape'); await p.waitForTimeout(400);
        }
      }
      const ancho = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ancho > 4) mal('se sale de lado ' + ancho + 'px');
    } catch (e) { mal('FALLÓ: ' + e.message.split('\n')[0]); await p.screenshot({ path: out + tag + '-fallo.png' }).catch(() => {}); }
    await ctx.close();
  }
  console.log('FIN · ' + (problemas.length ? problemas.length + ' problemas' : 'SIN PROBLEMAS')); await b.close(); })();
