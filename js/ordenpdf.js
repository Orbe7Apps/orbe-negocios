// Orden de trabajo o pedido en papel: PDF (para mandarlo por WhatsApp) e impresión (carta o A4).
// El PDF se arma con jsPDF, que se carga la primera vez que hace falta y después funciona sin internet.
import { numeroOrden, anticipoDe, ESTADOS_ORDEN, numeroCot, estadoCot, ESTADOS_COT } from './datos.js';
import { totales } from './pantallas/vender.js';
import { iniciales } from './ui.js';
import { telInternacional } from './paises.js';
import { esc, imgSegura } from './seguro.js';
import { cargarPDF, nuevoPapel, membreteDe, montoEnLetras, textoTasa, papelDe, fechaHoraDoc } from './papel.js';

export { cargarPDF };

export const COND_COT = 'Precios válidos hasta la fecha indicada y sujetos a disponibilidad. Para confirmar, responda este mensaje o firme y devuelva este documento.';
export const COND_ORDEN = 'Revise su orden al recibirla. Los trabajos y equipos no retirados en 30 días después de avisarle pueden generar cargos por guardarlos. Conserve este documento para retirar.';

// Cédula o RIF del cliente, y cómo se llama ese dato.
const docDe = (cli, P) => ({ cliDoc: cli.doc || '', cliDocTipo: P.id === 'VE' ? (/^[JGCE]-?/i.test(cli.doc || '') && !/^V/i.test(cli.doc || '') ? 'RIF' : 'Cédula') : P.fiscal[0] || 'Documento', cliDir: cli.dir || '' });

// Todo lo que sale en el papel, igual para el PDF y para la impresión.
export function datosOrden(o, ctx) {
  if (o.cot) return datosCot(o, ctx);
  const { S, P, D } = ctx;
  const cli = S.clientes.find(c => c.id === o.cli) || { n: o.cliN || 'Cliente', tel: '' };
  const resp = (S.perfiles.find(p => p.id === o.resp) || {}).n || '';
  const tt = totales(o.items, S.negocio, P), total = tt.total, ant = anticipoDe(o.id), saldo = Math.max(0, total - ant);
  const fecha = t => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  const fechaHora = t => new Date(t).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const n = S.negocio;
  return {
    numero: numeroOrden(o), titulo: o.tipo === 'pedido' ? 'PEDIDO' : 'ORDEN DE TRABAJO',
    negocio: n.nombre, logo: n.logo || '', inic: iniciales(n.nombre),
    datosNeg: [n.razon && n.razon !== n.nombre ? n.razon : '', n.fiscal ? P.fiscal[0] + ' ' + n.fiscal : '', n.dir || '', n.tel || ''].filter(Boolean).join(' · '),
    recibida: fecha(o.t), cliente: cli.n, telCli: cli.tel || '', entrega: o.entrega ? fechaHora(o.entrega) : 'Por confirmar', resp,
    estado: o.estado === 'cancelada' ? 'Cancelada' : (ESTADOS_ORDEN.find(e => e.k === o.estado) || {}).n || '',
    que: o.que, det: o.det || '',
    items: o.items.map(it => ({ n: it.n, q: it.q, p: D.m(it.p), t: D.m(it.q * it.p) })),
    impTxt: tt.txt ? tt.txt + ': ' + D.m(tt.imp) : '', total: D.m(total), totalOtra: D.dual ? D.s(total) : '', tasa: D.dual ? (P.id === 'VE' ? 'Bs' : 'US$') : '',
    anticipo: ant > 0 ? D.m(ant) : '', saldo: D.m(saldo), saldoN: saldo,
    cond: n.condOrden != null ? n.condOrden : COND_ORDEN, papel: papelDe(P),
    recibidaHora: fechaHoraDoc(o.t), respN: resp, totalN: total, imp: tt.imp, taxIncl: !!n.taxIncl, desglose: tt.desglose || [], ...docDe(cli, P),
    etqFecha: 'Recibida', cajaDer: 'ENTREGA ESTIMADA', queTit: o.tipo === 'pedido' ? 'PEDIDO' : 'EQUIPO O TRABAJO', firmaDer: 'Recibido por', colItem: 'TRABAJO O PRODUCTO'
  };
}
// Cotización: los mismos datos con sus propias palabras (válida hasta, sin anticipo).
function datosCot(o, { S, P, D }) {
  const cli = S.clientes.find(c => c.id === o.cli) || { n: o.cliN || 'Cliente', tel: o.tel || '' };
  const tt = totales(o.items, S.negocio, P), n = S.negocio;
  const fecha = t => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  const resp = (S.perfiles.find(p => p.id === o.por) || {}).n || '';
  return {
    numero: numeroCot(o), titulo: 'COTIZACIÓN', negocio: n.nombre, logo: n.logo || '', inic: iniciales(n.nombre),
    datosNeg: [n.razon && n.razon !== n.nombre ? n.razon : '', n.fiscal ? P.fiscal[0] + ' ' + n.fiscal : '', n.dir || '', n.tel || ''].filter(Boolean).join(' · '),
    recibida: fecha(o.t), cliente: cli.n, telCli: cli.tel || o.tel || '', entrega: fecha(o.vence), resp: resp ? 'Atendió: ' + resp : '',
    estado: (ESTADOS_COT[estadoCot(o)] || [''])[0], que: '', det: o.nota || '',
    items: o.items.map(it => ({ n: it.n, q: it.u ? String(it.q).replace('.', ',') + ' ' + it.u : it.q, p: D.m(it.p), t: D.m(it.q * it.p) })),
    impTxt: tt.txt ? tt.txt + ': ' + D.m(tt.imp) : '', total: D.m(tt.total), totalOtra: D.dual ? D.s(tt.total) : '', tasa: D.dual ? (P.id === 'VE' ? 'Bs' : 'US$') : '',
    anticipo: '', saldo: D.m(tt.total), saldoN: tt.total,
    cond: n.condCot != null ? n.condCot : COND_COT, papel: papelDe(P),
    recibidaHora: fechaHoraDoc(o.t), respN: resp, totalN: tt.total, imp: tt.imp, taxIncl: !!n.taxIncl, desglose: tt.desglose || [], ...docDe(cli, P),
    etqFecha: 'Emitida', cajaDer: 'VÁLIDA HASTA', queTit: 'NOTA', firmaDer: 'Por el negocio', colItem: 'PRODUCTO O SERVICIO'
  };
}
export const numeroDoc = o => o.cot ? numeroCot(o) : numeroOrden(o);

// Texto para WhatsApp junto con el PDF.
export function mensajeOrden(o, ctx) {
  const x = datosOrden(o, ctx), nombre = x.cliente.split(' ')[0];
  if (o.cot) return 'Hola ' + nombre + ', te escribe ' + x.negocio + '. Te envío la cotización ' + x.numero + ' por ' + x.total + (x.totalOtra ? ' (' + x.totalOtra + ')' : '') + '. Es válida hasta el ' + x.entrega + '. Si estás de acuerdo, respóndeme y la preparamos.';
  if (o.estado === 'lista') return 'Hola ' + nombre + ', te escribe ' + x.negocio + '. Tu ' + (o.tipo === 'pedido' ? 'pedido' : 'orden') + ' ' + x.numero + ' (' + x.que + ') ya está lista para retirar.' + (x.saldoN > 0 ? ' Saldo pendiente: ' + x.saldo + (x.totalOtra ? '' : '') + '.' : '') + ' ¡Te esperamos!';
  return 'Hola ' + nombre + ', te escribe ' + x.negocio + '. Te envío tu ' + (o.tipo === 'pedido' ? 'pedido' : 'orden de trabajo') + ' ' + x.numero + ': ' + x.que + '. Entrega: ' + x.entrega + '. Total ' + x.total + (x.anticipo ? ', anticipo ' + x.anticipo + ', saldo ' + x.saldo : '') + '.';
}
export const enlaceWA = (tel, texto, pid) => 'https://wa.me/' + telInternacional(tel, pid) + '?text=' + encodeURIComponent(texto);

export async function pdfOrden(o, ctx) {
  const x = datosOrden(o, ctx), { S, P, D } = ctx, tasa = textoTasa(S, P, D);
  const pp = await nuevoPapel(x.papel);
  const meta = o.cot ? [['Emitida', x.recibida], ['Válida hasta', x.entrega]].concat(x.estado ? [['Estado', x.estado]] : [])
    : [['Recibida', x.recibidaHora], ['Entrega estimada', x.entrega], ['Estado', x.estado]];
  await pp.membrete(membreteDe(S, P), x.titulo, x.numero, meta.filter(r => r[1]));
  const cliente = { tit: 'Cliente', filas: [[x.cliDocTipo === 'RIF' ? 'Razón social' : 'Nombre', x.cliente], [x.cliDocTipo, x.cliDoc], ['Teléfono', x.telCli], ['Dirección', x.cliDir]] };
  const der = o.cot ? { tit: 'Datos de la oferta', filas: [['Moneda', P.id === 'VE' ? 'Dólares (USD)' : ''], [tasa ? tasa.nombre : '', tasa ? tasa.valor + ' · ' + tasa.fecha : ''], ['Atendió', x.respN]] }
    : { tit: o.tipo === 'pedido' ? 'Pedido' : 'Equipo o trabajo', filas: [[o.tipo === 'pedido' ? 'Qué pide' : 'Equipo o trabajo', x.que], ['Responsable', x.respN]] };
  pp.partes(cliente, der);
  if (x.det) pp.parrafo(o.cot ? 'Nota' : 'Detalles', x.det, { pt: 8.6 });
  pp.tabla([{ t: 'N.º', w: 11, tenue: true }, { t: o.cot ? 'Descripción' : 'Trabajo o producto' }, { t: 'Cant.', w: 18, der: true }, { t: 'Precio unit.', w: 28, der: true }, { t: 'Importe', w: 28, der: true }],
    x.items.map((it, i) => [String(i + 1), it.n, String(it.q), it.p, it.t]), { vacio: o.cot ? 'Sin productos' : 'Sin trabajos anotados todavía' });
  const filas = [];
  if (x.imp > 0.004) { filas.push([x.taxIncl ? 'Base imponible' : 'Subtotal', D.m(x.totalN - x.imp)]); x.desglose.filter(d => d.r).forEach(d => filas.push([P.tax[0] + ' (' + String(d.r).replace('.', ',') + ' %)', D.m(d.imp)])); }
  if (x.anticipo) { if (!filas.length) filas.push(['Total', x.total]); else filas.push(['Total', x.total]); filas.push(['Anticipo recibido', '−' + x.anticipo]); filas.push(['Saldo', x.saldo, 'fuerte']); if (x.totalOtra) filas.push(['Saldo en ' + x.tasa, D.s(x.saldoN), 'bs']); }
  else { filas.push([o.cot ? 'Total' : 'Total a pagar', x.total, 'fuerte']); if (x.totalOtra) filas.push(['Total en ' + x.tasa, x.totalOtra, 'bs']); }
  const montoL = x.anticipo ? x.saldoN : x.totalN;
  const nota = tasa ? (o.cot ? 'Equivalente en bolívares calculado a la ' + tasa.nombre.toLowerCase().replace('tasa bcv', 'tasa oficial del BCV') + ' del ' + tasa.fecha + ' (' + tasa.valor + '). El monto en Bs se ajusta a la tasa del día del pago.'
    : tasa.nombre + ' del ' + tasa.fecha + ': ' + tasa.valor + '. El ' + (x.anticipo ? 'saldo' : 'total') + ' en Bs se calcula a la tasa del día del pago.') : '';
  pp.totales(filas, montoEnLetras(montoL, P) + ' (' + D.m(montoL) + ')', nota);
  pp.parrafo('Condiciones', x.cond);
  const cli = x.cliente + (x.cliDoc ? ' · ' + x.cliDoc : '');
  pp.firmas(o.cot ? ['Aceptado por el cliente', 'Nombre, C.I. y fecha'] : ['Firma del cliente', cli], [o.cot ? 'Por ' + x.negocio : x.firmaDer, x.respN || 'Nombre y firma']);
  return pp.cerrar(x.numero + ' · Documento no fiscal');
}

// Compartir el PDF: en el teléfono se abre el menú para elegir WhatsApp con el archivo puesto.
// Si el aparato no deja compartir archivos, se descarga y se abre WhatsApp con el mensaje.
export async function compartirPDF(blob, o, ctx) {
  const nombre = numeroDoc(o) + '.pdf', archivo = new File([blob], nombre, { type: 'application/pdf' });
  const texto = mensajeOrden(o, ctx), cli = ctx.S.clientes.find(c => c.id === o.cli) || { tel: o.tel || '' };
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: nombre, text: texto }); return 'compartido'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelado'; }
  }
  descargar(blob, nombre);
  if (cli.tel) window.open(enlaceWA(cli.tel, texto + ' (te adjunto el PDF)', ctx.P.id), '_blank', 'noopener');
  return 'descargado';
}
export function descargar(blob, nombre) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

// Imprimir: se arma la hoja en la página y se abre el diálogo de impresión del aparato.
export function imprimirOrden(o, ctx) {
  const x = datosOrden(o, ctx), logo = imgSegura(x.logo);
  const z = document.createElement('div'); z.className = 'zona-imprimir';
  const { S, P, D } = ctx, m = membreteDe(S, P), tasa = textoTasa(S, P, D);
  const fila = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>` : '';
  const meta = o.cot ? fila('Emitida', x.recibida) + fila('Válida hasta', x.entrega) : fila('Recibida', x.recibidaHora) + fila('Entrega estimada', x.entrega) + fila('Estado', x.estado);
  const der = o.cot ? fila('Moneda', P.id === 'VE' ? 'Dólares (USD)' : '') + (tasa ? fila(tasa.nombre, tasa.valor + ' · ' + tasa.fecha) : '') + fila('Atendió', x.respN)
    : fila(o.tipo === 'pedido' ? 'Qué pide' : 'Equipo o trabajo', x.que) + fila('Responsable', x.respN);
  const tot = [];
  if (x.imp > 0.004) { tot.push([x.taxIncl ? 'Base imponible' : 'Subtotal', D.m(x.totalN - x.imp)]); x.desglose.filter(d => d.r).forEach(d => tot.push([P.tax[0] + ' (' + String(d.r).replace('.', ',') + ' %)', D.m(d.imp)])); }
  if (x.anticipo) tot.push(['Total', x.total], ['Anticipo recibido', '−' + x.anticipo], ['Saldo', x.saldo, 'f']);
  else tot.push([o.cot ? 'Total' : 'Total a pagar', x.total, 'f']);
  if (x.totalOtra) tot.push([(x.anticipo ? 'Saldo en ' : 'Total en ') + x.tasa, x.anticipo ? D.s(x.saldoN) : x.totalOtra, 'b']);
  const montoL = x.anticipo ? x.saldoN : x.totalN;
  z.innerHTML = `<style>@page { size: ${x.papel === 'letter' ? 'letter' : 'A4'}; margin: 14mm 16mm; }</style>
    <div class="imp-cab">${logo ? `<img src="${esc(logo)}" alt="" class="imp-logo">` : `<span class="imp-logo imp-inic">${esc(x.inic)}</span>`}
      <div class="imp-neg"><b>${esc(x.negocio)}</b>${m.razon || m.fiscal ? `<span>${m.razon ? `<em>${esc(m.razon)}</em>` : ''}${m.razon && m.fiscal ? ' · ' : ''}${esc(m.fiscal)}</span>` : ''}${m.lineas.map(l => `<span>${esc(l)}</span>`).join('')}</div>
      <div class="imp-num"><small>${esc(x.titulo)}</small><strong>${esc(x.numero)}</strong><dl>${meta}</dl></div></div>
    <div class="imp-regla"></div>
    <div class="imp-dos"><div><small>CLIENTE</small><dl>${fila(x.cliDocTipo === 'RIF' ? 'Razón social' : 'Nombre', x.cliente)}${fila(x.cliDocTipo, x.cliDoc)}${fila('Teléfono', x.telCli)}${fila('Dirección', x.cliDir)}</dl></div>
      <div><small>${o.cot ? 'DATOS DE LA OFERTA' : o.tipo === 'pedido' ? 'PEDIDO' : 'EQUIPO O TRABAJO'}</small><dl>${der}</dl></div></div>
    ${x.det ? `<div class="imp-que"><small>${o.cot ? 'NOTA' : 'DETALLES'}</small><span>${esc(x.det)}</span></div>` : ''}
    <table><thead><tr><th class="imp-i">N.º</th><th>${o.cot ? 'Descripción' : 'Trabajo o producto'}</th><th>Cant.</th><th>Precio unit.</th><th>Importe</th></tr></thead><tbody>
      ${x.items.map((it, i) => `<tr><td class="imp-i">${i + 1}</td><td>${esc(it.n)}</td><td>${esc(it.q)}</td><td>${esc(it.p)}</td><td>${esc(it.t)}</td></tr>`).join('') || '<tr><td colspan="5">Sin trabajos anotados todavía</td></tr>'}</tbody></table>
    <div class="imp-cierre"><div class="imp-letras"><b>Son:</b> ${esc(montoEnLetras(montoL, P) + ' (' + D.m(montoL) + ')')}${tasa ? `<p>${esc(tasa.nombre + ' del ' + tasa.fecha + ': ' + tasa.valor + '. El monto en Bs se calcula a la tasa del día del pago.')}</p>` : ''}</div>
      <div class="imp-tot">${tot.map(r => `<div class="${r[2] === 'f' ? 'imp-saldo' : r[2] === 'b' ? 'imp-bs' : ''}"><span>${esc(r[0])}</span><span>${esc(r[1])}</span></div>`).join('')}</div></div>
    ${x.cond ? `<div class="imp-que"><small>CONDICIONES</small><p class="imp-cond">${esc(x.cond)}</p></div>` : ''}
    <div class="imp-firmas"><span><b>${o.cot ? 'Aceptado por el cliente' : 'Firma del cliente'}</b>${esc(o.cot ? 'Nombre, C.I. y fecha' : x.cliente + (x.cliDoc ? ' · ' + x.cliDoc : ''))}</span><span><b>${esc(o.cot ? 'Por ' + x.negocio : x.firmaDer)}</b>${esc(x.respN || 'Nombre y firma')}</span></div>
    <p class="imp-pie">${esc(x.numero)} · Documento no fiscal</p>`;
  // La hoja solo se ve al imprimir; si el aparato no avisa que terminó, se quita en la próxima impresión.
  document.querySelectorAll('.zona-imprimir').forEach(v => v.remove());
  document.body.appendChild(z); document.documentElement.classList.add('imprimiendo');
  const fin = () => { document.documentElement.classList.remove('imprimiendo'); z.remove(); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  // Por si el aparato no avisa que terminó (pasa en algunos iPhone): al volver a tocar la pantalla, la app reaparece.
  setTimeout(() => document.addEventListener('pointerdown', fin, { once: true }), 1500);
  // Se espera a que cargue el logo antes de imprimir.
  const img = z.querySelector('img');
  const ya = () => window.print();
  if (img && !img.complete) { img.onload = ya; img.onerror = ya; } else setTimeout(ya, 60);
}
