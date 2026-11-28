// PDF formales: arma cada documento con los datos de la demo, revisa que salga con texto de verdad y lo guarda en pruebas/capturas/pdf/.
const { chromium } = require('playwright');
const fs = require('fs'), out = __dirname + '/capturas/pdf/'; fs.mkdirSync(out, { recursive: true });
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const problemas = [];
  p.on('pageerror', e => problemas.push('ERROR: ' + e.message));
  await p.goto('http://localhost:8765/?demo&prueba'); await p.waitForTimeout(2500);
  const docs = await p.evaluate(async () => {
    const d = await import('/js/datos.js'), { pais, dinero } = await import('/js/paises.js');
    const S = d.leer(), P = pais(S.negocio.pais), D = dinero(P, S.tasa.valor), ctx = { S, P, D };
    const aB64 = async bl => { const u = new Uint8Array(await bl.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    const r = {}, mods = await Promise.all(['/js/ordenpdf.js', '/js/documentos.js'].map(m => import(m).catch(() => ({}))));
    const [op, dc] = mods;
    if (S.ordenes[0]) r['orden'] = await aB64(await op.pdfOrden(S.ordenes[0], ctx));
    const ped = S.ordenes.find(o => o.tipo === 'pedido'); if (ped) r['pedido'] = await aB64(await op.pdfOrden(ped, ctx));
    // Cotización: la de la demo o una armada con los productos de una orden (con varias líneas, para ver la tabla).
    const cot = S.cotizaciones[0] || { id: 'prueba', n: 12, t: Date.now(), vence: Date.now() + 7 * 864e5, cli: S.ordenes[0].cli, estado: 'enviada', nota: 'Entrega en obra incluida.',
      items: S.productos.slice(0, 7).map((x, i) => ({ id: x.id, n: x.n, q: i + 2, p: x.p })) };
    r['cotizacion'] = await aB64(await op.pdfOrden(Object.assign({ cot: true }, cot), ctx));
    // Una cotización larga, para ver el salto de página.
    r['cotizacion-larga'] = await aB64(await op.pdfOrden(Object.assign({ cot: true }, cot, { items: Array.from({ length: 45 }, (_, i) => { const x = S.productos[i % S.productos.length]; return { id: x.id, n: x.n + (i % 3 ? '' : ' (presentación grande, con entrega a domicilio incluida en la zona)'), q: i + 1, p: x.p }; }) }), ctx));
    if (dc.pdfAcuerdo) { const pl = S.planes.find(x => x.tipo !== 'apartado'), ap = S.planes.find(x => x.tipo === 'apartado');
      if (pl) r['cuotas'] = await aB64(await dc.pdfAcuerdo(pl, d.cuentaPlan(pl), ctx)); if (ap) r['apartado'] = await aB64(await dc.pdfAcuerdo(ap, d.cuentaPlan(ap), ctx)); }
    if (dc.pdfCierreZ) {
      // Si la demo no tiene cierres, uno armado con las ventas de hoy.
      const hoy = d.resumen(d.inicioDia(Date.now()), Date.now() + 1, ''), ya = Date.now(), pr = S.perfiles[0].id;
      const z = S.cierres[S.cierres.length - 1] || { n: 128, t: ya, por: pr, desde: 3411, hasta: 3497, anuladas: 1, impuestos: 94.12, igtf: 6.3, h: '7f3a9c01e2b4d5e6f7',
        resumen: { total: hoy.total || 1284.6, porPago: Object.keys(hoy.porPago).length ? hoy.porPago : { 'Pago Móvil': 612.4, 'Punto de venta': 301.75, 'Efectivo $': 210, 'Efectivo Bs': 125.45, Zelle: 35 }, dif: 0,
          caja: { 'Efectivo $': { fondo: 20, ingresos: 210, retiros: 50, gastos: 12 } }, turnos: [{ n: 1, por: pr, desde: ya - 9 * 36e5, hasta: ya - 4 * 36e5, dif: 0 }, { n: 2, por: pr, desde: ya - 4 * 36e5, hasta: ya, dif: -2.5 }] } };
      r['cierre-z'] = await aB64(await dc.pdfCierreZ(z, ctx));
    }
    if (dc.pdfReporte) r['reporte'] = await aB64(await dc.pdfReporte(30, '', ctx));
    return r;
  });
  for (const k of Object.keys(docs)) {
    const f = out + k + '.pdf'; fs.writeFileSync(f, Buffer.from(docs[k], 'base64'));
    const txt = require('child_process').execSync('pdftotext -layout ' + f + ' -').toString();
    if (!/Documento no fiscal|Página 1/.test(txt)) problemas.push(k + ': sin pie');
    if (/undefined|NaN|\[object/.test(txt)) problemas.push(k + ': texto raro ' + (txt.match(/.{0,30}(undefined|NaN|\[object).{0,20}/) || [''])[0]);
    if (!/Inter/.test(require('child_process').execSync('pdffonts ' + f).toString())) problemas.push(k + ': sin letra Inter');
    console.log('✓ ' + k + ' (' + Math.round(fs.statSync(f).size / 1024) + ' KB)');
  }
  console.log(problemas.length ? problemas.join('\n') : 'Sin problemas'); await b.close(); process.exit(problemas.length ? 1 : 0); })();
