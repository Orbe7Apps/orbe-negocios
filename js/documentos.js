// Documentos formales en PDF que no son órdenes ni cotizaciones: acuerdo de cuotas o apartado, Cierre Z y reporte.
// Todos usan el papel de js/papel.js (membrete, tablas, totales en $ y Bs, firmas y páginas).
import { numeroPlan, FRECUENCIAS, ACUERDOS_APARTADO, resumen, gastosEntre, inicioDia, deudores, abonosDePlan, pagosDeAbono } from './datos.js';
import { nuevoPapel, membreteDe, montoEnLetras, textoTasa, papelDe, fechaDoc, fechaHoraDoc } from './papel.js';

const hora = t => new Date(t).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });
const docCli = (cli, P) => ({ doc: cli.doc || '', tipo: P.id === 'VE' ? (/^[JGCE]/i.test(cli.doc || '') ? 'RIF' : 'Cédula') : (P.fiscal[0] || 'Documento') });

// ---------- acuerdo de pago en cuotas o de apartado ----------
export async function pdfAcuerdo(p, c, { S, P, D }) {
  const apartado = p.tipo === 'apartado', cli = S.clientes.find(x => x.id === p.cli) || { n: 'Cliente' }, dc = docCli(cli, P), tasa = textoTasa(S, P, D);
  const tipo = apartado ? 'ACUERDO DE APARTADO' : 'ACUERDO DE PAGO EN CUOTAS', num = numeroPlan(p);
  const pp = await nuevoPapel(papelDe(P));
  const frec = ((FRECUENCIAS.find(f => f.k === p.cada) || {}).n || '').toLowerCase();
  await pp.membrete(membreteDe(S, P), tipo, num, apartado ? [['Fecha', fechaDoc(p.t)], ['Se guarda hasta', fechaDoc(p.vence)]] : [['Fecha', fechaDoc(p.t)], ['Cuotas', p.cuotas.length + (frec ? ' · ' + frec : '')]]);
  pp.partes({ tit: 'Cliente', filas: [[dc.tipo === 'RIF' ? 'Razón social' : 'Nombre', cli.n], [dc.tipo, dc.doc], ['Teléfono', cli.tel || ''], ['Dirección', cli.dir || '']] },
    { tit: 'Resumen', filas: [['Total a pagar', D.m(p.total)], [apartado ? 'Abonado a la fecha' : 'Pagado a la fecha', D.m(c.pagado)], ['Falta', D.m(c.falta)]] });
  pp.tabla([{ t: 'N.º', w: 11, tenue: true }, { t: 'Producto' }, { t: 'Cant.', w: 18, der: true }, { t: 'Precio unit.', w: 28, der: true }, { t: 'Importe', w: 28, der: true }],
    p.items.map((it, i) => [String(i + 1), it.n, String(it.q).replace('.', ','), D.m(it.p), D.m(it.q * it.p)]));
  if (!apartado && c.cuotas.length) {
    pp.y += 2; pp.subtitulo('Calendario de pagos'); pp.y += 1.4;
    const est = { pagada: 'Pagada', atrasada: 'Atrasada', hoy: 'Vence hoy' };
    pp.tabla([{ t: 'Cuota', w: 16, tenue: true }, { t: 'Fecha' }, { t: 'Monto', w: 32, der: true }, { t: 'Estado', w: 34, der: true }],
      c.cuotas.map(q => [String(q.i + 1), fechaDoc(q.f), D.m(q.v), { v: est[q.estado] || (q.aplicado > 0.004 ? 'Abonó ' + D.m(q.aplicado) : 'Pendiente'), b: q.estado === 'pagada' || q.estado === 'atrasada' }]));
  }
  const ab = abonosDePlan(p.id);
  if (ab.length) {
    pp.y += 2; pp.subtitulo(apartado ? 'Abonos' : 'Pagos recibidos'); pp.y += 1.4;
    pp.tabla([{ t: 'Fecha' }, { t: 'Forma de pago' }, { t: 'Monto', w: 32, der: true }], ab.map(a => [fechaDoc(a.t), pagosDeAbono(a).map(x => x.m).join(' + '), D.m(a.v)]));
  }
  const filas = [['Total', D.m(p.total)], [apartado ? 'Abonado' : 'Pagado', '−' + D.m(c.pagado)], ['Falta', D.m(c.falta), 'fuerte']];
  if (D.dual) filas.push(['Falta en ' + (P.id === 'VE' ? 'Bs' : 'US$'), D.s(c.falta), 'bs']);
  const prox = !apartado && c.proxima ? c.proxima.queda : 0;
  const nota = tasa ? (apartado ? 'Los abonos se pueden hacer en Bs a la ' + tasa.nombre.toLowerCase().replace('tasa bcv', 'tasa BCV') + ' del día del pago. Hoy: ' + tasa.valor + '.'
    : 'Cada cuota se puede pagar en Bs a la ' + tasa.nombre.toLowerCase().replace('tasa bcv', 'tasa BCV') + ' del día del pago. Hoy: ' + tasa.valor + (prox ? ' (la próxima cuota = ' + D.s(prox) + ').' : '.')) : '';
  pp.totales(filas, montoEnLetras(p.total, P) + ' (' + D.m(p.total) + ')', nota);
  const acuerdo = (ACUERDOS_APARTADO.find(a => a.k === p.acuerdo) || ACUERDOS_APARTADO[0]).n.toLowerCase();
  pp.parrafo('Acuerdo', apartado
    ? 'El producto queda separado a nombre del cliente hasta el ' + fechaDoc(p.vence) + ' y se entrega cuando el total esté pagado. Si no completa el pago antes de esa fecha, el negocio puede darle más tiempo o liberar el producto; en ese caso lo abonado ' + acuerdo + '.'
    : 'El cliente recibe el producto y se compromete a pagar cada cuota en la fecha indicada.' + (p.recargo > 0 ? ' El total incluye un recargo por financiar de ' + D.m(p.recargo) + ' (' + p.recargoPct + ' %).' : '') + ' Los pagos se pueden adelantar en cualquier momento.');
  pp.firmas(['Firma del cliente', cli.n + (dc.doc ? ' · ' + dc.doc : '')], ['Por ' + S.negocio.nombre, 'Nombre y firma']);
  return pp.cerrar(num + ' · Documento no fiscal');
}

// ---------- Cierre Z ----------
export async function pdfCierreZ(z, { S, P, D }) {
  const n = z.n || S.cierres.indexOf(z) + 1, quien = (S.perfiles.find(p => p.id === z.por) || {}).n || '', tasa = textoTasa(S, P, D);
  const r = z.resumen || {}, pp_ = r.porPago || {}, total = r.total || 0, dif = r.dif || 0;
  const pp = await nuevoPapel(papelDe(P));
  const dia = new Date(z.t).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '').replace(',', '');
  await pp.membrete(membreteDe(S, P), 'CIERRE Z', 'N.º ' + n, [['Día', dia], ['Cerró', (quien ? quien + ', ' : '') + hora(z.t)]].concat(z.desde ? [['Ventas', '#' + z.desde + ' a #' + z.hasta]] : []));
  const turnos = r.turnos || [];
  pp.cifras([
    ['Vendido', D.m(total), D.dual ? D.s(total) : ''],
    ['Ventas', z.desde ? String(z.hasta - z.desde + 1) : '0', z.anuladas ? z.anuladas + (z.anuladas === 1 ? ' anulada' : ' anuladas') : 'ninguna anulada'],
    [(P.tax[0] || 'Impuesto') + ' cobrado', D.m(z.impuestos || 0), z.igtf ? 'IGTF ' + D.m(z.igtf) : ''],
    ['Caja', Math.abs(dif) < 0.005 ? 'Cuadra' : (dif < 0 ? 'Faltan ' : 'Sobran ') + D.m(Math.abs(dif)), turnos.length ? turnos.length + (turnos.length === 1 ? ' turno' : ' turnos') : '']
  ]);
  const ks = Object.keys(pp_);
  pp.subtitulo('Por forma de pago'); pp.y += 1.4;
  pp.tabla([{ t: 'Forma' }, { t: 'En $', w: 36, der: true }].concat(D.dual && P.id === 'VE' ? [{ t: 'En Bs', w: 44, der: true }] : []),
    ks.map(k => [k, D.m(pp_[k])].concat(D.dual && P.id === 'VE' ? [D.s(pp_[k])] : [])), { vacio: 'Sin ventas' });
  pp.totales([['Total', D.m(total), 'fuerte']].concat(D.dual ? [['Total en ' + (P.id === 'VE' ? 'Bs' : 'US$'), D.s(total), 'bs']] : []), '', tasa ? tasa.nombre + ' del día: ' + tasa.valor + '. Los montos en Bs de esta hoja usan esa tasa.' : '');
  // Efectivo: fondo, entradas, retiros y gastos pagados en efectivo.
  const cj = r.caja || {}, suma = k => Object.keys(cj).reduce((a, m) => a + (cj[m][k] || 0), 0);
  const caja = [['Fondo inicial', suma('fondo')], ['Ingresos de efectivo', suma('ingresos')], ['Retiros de efectivo', -suma('retiros')], ['Gastos pagados en efectivo', -suma('gastos')]].filter(x => Math.abs(x[1]) > 0.004);
  if (caja.length || turnos.length) {
    pp.y += 2;
    const w = (pp.W - 2 * pp.M - 8) / 2, y0 = pp.y;
    let fin = y0;
    if (caja.length) { pp.subtitulo('Efectivo', pp.M); pp.y += 1.4; pp.tabla([{ t: 'Movimiento' }, { t: 'Monto', w: 30, der: true }], caja.map(x => [x[0], D.m(x[1])]), { x: pp.M, w: caja.length && turnos.length ? w : undefined }); fin = pp.y; }
    if (turnos.length) {
      const x = caja.length ? pp.M + w + 8 : pp.M; pp.y = caja.length ? y0 : pp.y;
      pp.subtitulo('Turnos', x); pp.y += 1.4;
      pp.tabla([{ t: 'Turno' }, { t: 'Horario', w: 30 }, { t: 'Resultado', w: 32, der: true }],
        turnos.map(t => [t.n + (t.por ? ' · ' + ((S.perfiles.find(p => p.id === t.por) || {}).n || '').split(' ')[0] : ''), hora(t.desde) + ' a ' + hora(t.hasta), Math.abs(t.dif) < 0.005 ? 'Cuadró' : (t.dif < 0 ? 'Faltó ' : 'Sobró ') + D.m(Math.abs(t.dif))]),
        { x, w: caja.length ? w : undefined });
      fin = Math.max(fin, pp.y);
    }
    pp.y = fin;
  }
  pp.firmas(['Cerró la caja', quien || 'Nombre y firma'], ['Revisó', 'Nombre y firma']);
  return pp.cerrar('Cierre Z N.º ' + n + (z.h ? ' · Firma digital ' + z.h.slice(0, 12) : '') + ' · Documento no fiscal', false);
}

// ---------- reporte de ventas ----------
const DIA = 86400000;
export async function pdfReporte(per, suc, { S, P, D, E }) {
  const hoy0 = inicioDia(Date.now());
  const ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
  const dias = per === 'mes' ? Math.round((hoy0 - ini.getTime()) / DIA) + 1 : per;
  const desde = hoy0 - (dias - 1) * DIA, hasta = Date.now() + 1;
  const r = resumen(desde, hasta, suc), ant = resumen(desde - dias * DIA, desde, suc);
  const gs = gastosEntre(desde, hasta).filter(g => !suc || g.suc === suc), gastos = gs.reduce((a, g) => a + g.v, 0), real = r.ganancia - gastos;
  const tasa = textoTasa(S, P, D);
  // Lo de cada día en la otra moneda va con la tasa de ese día (si no, la inflación engaña).
  const nfB = new Intl.NumberFormat(P.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), enOtra = v => (P.id === 'VE' ? 'Bs ' : 'US$ ') + nfB.format(v || 0);
  const pp = await nuevoPapel(papelDe(P));
  const titulo = per === 'mes' ? new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' }).replace(/^./, x => x.toUpperCase()) : 'Últimos ' + dias + ' días';
  await pp.membrete(membreteDe(S, P), 'REPORTE DE VENTAS', titulo, [['Período', fechaDoc(desde) + ' al ' + fechaDoc(hoy0)]].concat(E ? [['Sucursal', suc || 'Todas']] : []).concat([['Hecho', fechaHoraDoc(Date.now())]]));
  const cambio = ant.total ? Math.round((r.total / ant.total - 1) * 100) : null;
  pp.cifras([
    ['Vendido', D.m(r.total), cambio == null ? r.n + (r.n === 1 ? ' venta' : ' ventas') : (cambio > 0 ? '+' : cambio < 0 ? '−' : '') + Math.abs(cambio) + ' % que antes'],
    ['Ganancia bruta', D.m(r.ganancia), r.total ? Math.round(r.ganancia / r.total * 100) + ' % de lo vendido' : ''],
    ['Gastos', D.m(gastos), gs.length + (gs.length === 1 ? ' gasto' : ' gastos')],
    ['Te queda', D.m(real), D.dual ? 'Hoy: ' + D.s(real) : '']
  ]);
  const W2 = (pp.W - 2 * pp.M - 8) / 2, x2 = pp.M + W2 + 8;
  // Dos tablas lado a lado; la fila siguiente empieza debajo de la más larga.
  const par = (a, b) => {
    const filasMax = Math.max(a ? a.filas.length || 1 : 0, b ? b.filas.length || 1 : 0);
    pp.cabe(20 + filasMax * 7);
    const y0 = pp.y; let fin = y0;
    if (a) { pp.subtitulo(a.tit, pp.M); pp.y += 1.4; pp.tabla(a.cols, a.filas, { x: pp.M, w: b ? W2 : undefined, vacio: a.vacio }); fin = pp.y; }
    if (b) { pp.y = a ? y0 : pp.y; pp.subtitulo(b.tit, a ? x2 : pp.M); pp.y += 1.4; pp.tabla(b.cols, b.filas, { x: a ? x2 : pp.M, w: a ? W2 : undefined, vacio: b.vacio }); fin = Math.max(fin, pp.y); }
    pp.y = fin + 3;
  };
  const prods = Object.keys(r.porProd).map(k => r.porProd[k]).sort((a, b) => b.v - a.v).slice(0, 10);
  const pagos = Object.keys(r.porPago).sort((a, b) => r.porPago[b] - r.porPago[a]), totPag = pagos.reduce((a, k) => a + r.porPago[k], 0);
  const qtxt = q => Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100).replace('.', ',');
  par({ tit: 'Lo que más vendiste', cols: [{ t: '#', w: 8, tenue: true }, { t: 'Producto' }, { t: 'Cant.', w: 14, der: true }, { t: 'Vendido', w: 24, der: true }], filas: prods.map((x, i) => [String(i + 1), x.n, qtxt(x.q), D.m(x.v)]), vacio: 'Sin ventas' },
    { tit: 'Por forma de pago', cols: [{ t: 'Forma' }, { t: '%', w: 13, der: true }, { t: 'Monto', w: 26, der: true }], filas: pagos.filter(k => r.porPago[k] > 0.004).map(k => [k, Math.round(r.porPago[k] / (totPag || 1) * 100) + ' %', D.m(r.porPago[k])]), vacio: 'Sin ventas' });
  const cats = {}; gs.forEach(g => { cats[g.cat || 'Otros'] = (cats[g.cat || 'Otros'] || 0) + g.v; });
  const deben = deudores().filter(c => c.deuda > 0.004).sort((a, b) => b.deuda - a.deuda).slice(0, 10);
  par({ tit: 'Gastos por tipo', cols: [{ t: 'Tipo' }, { t: 'Monto', w: 26, der: true }], filas: Object.keys(cats).sort((a, b) => cats[b] - cats[a]).map(k => [k, D.m(cats[k])]), vacio: 'Sin gastos' },
    deben.length ? { tit: 'Te deben', cols: [{ t: 'Cliente' }, { t: 'Desde', w: 18, der: true }, { t: 'Monto', w: 24, der: true }], filas: deben.map(c => [c.n, c.desde ? new Date(c.desde).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '') : '', D.m(c.deuda)]) } : null);
  if (E && !suc && S.negocio.sucursales.length > 1) par({ tit: 'Por sucursal', cols: [{ t: 'Sucursal' }, { t: 'Vendido', w: 30, der: true }], filas: S.negocio.sucursales.map(s => [s, D.m(r.porSuc[s] || 0)]) }, null);
  // Ventas día por día (las más recientes primero).
  const porDia = {}; for (let i = 0; i < dias; i++) porDia[desde + i * DIA] = { n: 0, v: 0 };
  Object.keys(porDia).forEach(k => { const x = resumen(+k, +k + DIA, suc); porDia[k] = { n: x.n, v: x.total, alt: x.totalAlt }; });
  const filasDia = Object.keys(porDia).map(Number).sort((a, b) => b - a).filter(k => porDia[k].n).map(k => [new Date(k).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''), String(porDia[k].n), D.m(porDia[k].v)].concat(D.dual ? [enOtra(porDia[k].alt)] : []));
  if (filasDia.length) { pp.subtitulo('Ventas por día'); pp.y += 1.4; pp.tabla([{ t: 'Día' }, { t: 'Ventas', w: 22, der: true }, { t: 'Vendido', w: 32, der: true }].concat(D.dual ? [{ t: 'En ' + (P.id === 'VE' ? 'Bs' : 'US$'), w: 40, der: true }] : []), filasDia); }
  return pp.cerrar('Reporte de ventas · ' + fechaDoc(desde) + ' al ' + fechaDoc(hoy0) + (tasa ? ' · ' + tasa.nombre + ' ' + tasa.valor : '') + ' · Hecho con Orbe Negocios', false);
}
