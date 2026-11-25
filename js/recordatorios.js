// Recordatorios por WhatsApp: Orbe arma sola la lista de lo que hay que recordarle a cada cliente
// (citas de mañana y de la próxima hora, fiados atrasados, órdenes listas, cotizaciones por vencer)
// con el mensaje escrito. Se envían con un toque desde el WhatsApp del negocio y quedan marcados en todos los aparatos.
import { html, useState } from './lib/preact-htm.js';
import { useApp } from './ctx.js';
import { deudores, listaProductos, cambiarNegocio, avisadoOrden, numeroOrden, numeroCot, cotVencida, leer } from './datos.js';
import { Hoja, Icono, Interruptor, Chips, avisar, hora, tonoZona } from './ui.js';
import { enlaceWA, mensajeOrden } from './ordenpdf.js';
import { totales } from './pantallas/vender.js';

const H = 3600000, DIA = 24 * H;
// Qué se recuerda (todo encendido salvo que el dueño lo apague) y cada cuántos días se insiste con el fiado.
export const TIPOS_REC = [
  { k: 'cita1d', n: 'Citas de mañana', d: 'Un día antes de la cita', mod: 'agenda', i: 'calendario' },
  { k: 'cita1h', n: 'Citas en una hora', d: 'Una hora antes de la cita', mod: 'agenda', i: 'reloj' },
  { k: 'fiado', n: 'Fiado atrasado', d: 'A quien te debe hace varios días', mod: 'fiado', i: 'tarjeta' },
  { k: 'orden', n: 'Órdenes listas', d: 'Avisar que ya puede retirar', mod: 'ordenes', i: 'orden' },
  { k: 'cot', n: 'Cotizaciones por vencer', d: 'Preguntar si la revisó, dos días antes de que venza', mod: 'cotizaciones', i: 'doc' }
];
export const ajustesRec = n => Object.assign({ cita1d: true, cita1h: true, fiado: true, orden: true, cot: true, fiadoDias: 7 }, (n && n.rec) || {});
const primero = s => String(s || '').trim().split(' ')[0];
const dia = t => new Date(t).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

// La lista de hoy: lo que toca recordar y todavía no se mandó.
export function recordatorios(S, T, P, D, ahora = Date.now()) {
  const n = S.negocio, aj = ajustesRec(n), env = n.recEnviados || {}, out = [];
  const usa = t => aj[t.k] && (!t.mod || T.mod(t.mod));
  const tipo = k => TIPOS_REC.find(t => t.k === k);
  const prods = listaProductos();
  const add = r => { if (!env[r.k] && r.tel) out.push(r); };
  // Citas: un día antes (de 2 a 30 horas antes) y una hora antes (en los próximos 90 minutos).
  (S.citas || []).filter(c => c.estado === 'pendiente' && c.t > ahora).forEach(c => {
    const falta = c.t - ahora, srv = (c.srv || []).map(id => (prods.find(p => p.id === id) || {}).n).filter(Boolean).join(' + ');
    const cli = S.clientes.find(x => x.id === c.cli) || {}, tel = c.tel || cli.tel || '', nom = c.nom || cli.n || '';
    if (usa(tipo('cita1h')) && falta <= 1.5 * H) add({ k: 'c1h:' + c.id, tipo: 'cita1h', quien: nom, tel, cuando: c.t, sub: 'Cita hoy a las ' + hora(c.t),
      texto: 'Hola ' + primero(nom) + ', te esperamos hoy a las ' + hora(c.t) + ' en ' + n.nombre + (srv ? ' para tu cita (' + srv + ')' : ' para tu cita') + '. ¡Nos vemos!' });
    else if (usa(tipo('cita1d')) && falta > 2 * H && falta <= 30 * H) add({ k: 'c1d:' + c.id, tipo: 'cita1d', quien: nom, tel, cuando: c.t, sub: 'Cita ' + (new Date(c.t).getDate() === new Date(ahora).getDate() ? 'hoy' : 'mañana') + ' a las ' + hora(c.t),
      texto: 'Hola ' + primero(nom) + ', te recordamos tu cita en ' + n.nombre + ' el ' + dia(c.t) + ' a las ' + hora(c.t) + (srv ? ' (' + srv + ')' : '') + '. Si no puedes venir, avísanos. ¡Te esperamos!' });
  });
  // Fiado: deuda con más de N días; se vuelve a recordar cada N días.
  if (usa(tipo('fiado'))) deudores().filter(c => c.deuda > 0.004 && c.desde && ahora - c.desde >= aj.fiadoDias * DIA).forEach(c => {
    const vuelta = Math.floor(ahora / (aj.fiadoDias * DIA));
    add({ k: 'f:' + c.id + ':' + vuelta, tipo: 'fiado', quien: c.n, tel: c.tel, cuando: c.desde, sub: 'Debe ' + D.m(c.deuda) + ' desde hace ' + Math.floor((ahora - c.desde) / DIA) + ' días',
      texto: 'Hola ' + primero(c.n) + ', te escribe ' + n.nombre + '. Te recuerdo que tienes pendiente ' + D.m(c.deuda) + (D.dual ? ' (' + D.s(c.deuda) + ')' : '') + '. Puedes pagar por ' + n.pays.slice(0, 2).join(' o ') + '. ¡Gracias!' });
  });
  // Órdenes listas que todavía no se avisaron.
  if (usa(tipo('orden'))) (S.ordenes || []).filter(o => o.estado === 'lista' && !o.avisado).forEach(o => {
    const cli = S.clientes.find(x => x.id === o.cli) || {};
    add({ k: 'o:' + o.id, tipo: 'orden', quien: cli.n || o.cliN || '', tel: cli.tel || '', cuando: o.lista || o.t, sub: numeroOrden(o) + ' lista para retirar', oid: o.id, texto: mensajeOrden(o, { S, P, D }) });
  });
  // Cotizaciones que vencen en los próximos dos días.
  if (usa(tipo('cot'))) (S.cotizaciones || []).filter(c => c.estado === 'pendiente' && !cotVencida(c, ahora) && c.vence - ahora <= 2 * DIA).forEach(c => {
    const cli = S.clientes.find(x => x.id === c.cli) || {}, total = totales(c.items, n, P).total;
    add({ k: 'q:' + c.id, tipo: 'cot', quien: cli.n || c.cliN || '', tel: cli.tel || c.tel || '', cuando: c.vence, sub: numeroCot(c) + ' vence el ' + new Date(c.vence).toLocaleDateString('es', { day: 'numeric', month: 'short' }),
      texto: 'Hola ' + primero(cli.n || c.cliN) + ', te escribe ' + n.nombre + '. ¿Pudiste revisar la cotización ' + numeroCot(c) + ' por ' + D.m(total) + '? Los precios valen hasta el ' + dia(c.vence) + '. Si quieres, te la preparamos.' });
  });
  return out.sort((a, b) => (a.tipo === 'cita1h' ? -1 : 0) - (b.tipo === 'cita1h' ? -1 : 0) || a.cuando - b.cuando);
}
// Marcar como enviado (o “no hace falta”). Se guarda en el negocio para que los demás aparatos no lo repitan.
export function marcarEnviado(r) {
  const n = leer().negocio, ahora = Date.now(), env = Object.assign({}, n.recEnviados || {});
  Object.keys(env).forEach(k => { if (ahora - env[k] > 60 * DIA) delete env[k]; });
  env[r.k] = ahora;
  cambiarNegocio({ recEnviados: env });
  if (r.oid) avisadoOrden(r.oid);
}
export function enviar(r, P) { window.open(enlaceWA(r.tel, r.texto, P.id), '_blank', 'noopener'); marcarEnviado(r); }

const tonoDe = () => tonoZona('recordatorios');
const Fila = ({ r, P, i }) => html`<div class="rec-fila entra" style=${{ '--i': i }}>
  <span class=${'ic ' + tonoDe(r.tipo)}><${Icono} n=${(TIPOS_REC.find(t => t.k === r.tipo) || {}).i || 'campana'} t=${16} /></span>
  <span class="crece" style="display:flex;flex-direction:column;gap:1px;min-width:0"><b class="corta" style="font-size:14px">${r.quien || 'Cliente'}</b><span class="sub corta" style=${r.tipo === 'cita1h' ? { color: 'var(--out-text)', fontWeight: 600 } : null}>${r.sub}</span></span>
  <button type="button" class="icono-btn chico toca" aria-label=${'No enviar a ' + (r.quien || 'cliente')} title="Ya no hace falta" onClick=${() => { marcarEnviado(r); avisar('Listo, no se envía'); }}><${Icono} n="cerrar" t=${14} /></button>
  <button type="button" class="btn2 chico verde toca" onClick=${() => enviar(r, P)}><${Icono} n="movil" t=${14} />Enviar</button>
</div>`;

// Tarjeta de Hoy: los primeros recordatorios con su botón de enviar.
export function RecordatoriosHoy() {
  const { S, T, P, D, abrir, puede } = useApp();
  if (!puede('vender') && !puede('clientes')) return null;
  const lista = recordatorios(S, T, P, D);
  if (!lista.length) return null;
  return html`<section class="tarjeta entra rec-tarjeta" data-tour="recordatorios">
    <div class="fila" style="gap:10px;margin-bottom:4px"><span class="ic t-ver"><${Icono} n="movil" t=${18} /></span>
      <span class="crece" style="display:flex;flex-direction:column"><b style="font-size:16px">Recordatorios por enviar</b><span class="sub">Mensaje listo: tócalo y se abre WhatsApp</span></span>
      <span class="pildora t-ver">${lista.length}</span></div>
    <div class="pila" style="gap:2px">${lista.slice(0, 3).map((r, i) => html`<${Fila} key=${r.k} r=${r} P=${P} i=${i} />`)}</div>
    ${lista.length > 3 && html`<button type="button" class="ver-mas toca" onClick=${() => abrir('recordatorios')}>Ver los ${lista.length}</button>`}
  </section>`;
}

// Hoja con todos.
export function Recordatorios({ cerrar }) {
  const { S, T, P, D, abrir } = useApp();
  const lista = recordatorios(S, T, P, D);
  return html`<${Hoja} titulo="Recordatorios por enviar" onCerrar=${cerrar} contenido=${c => ({
    cuerpo: lista.length ? html`<span class="sub" style="line-height:1.45">Cada mensaje ya está escrito. Toca “Enviar” y se abre WhatsApp; queda marcado en todos tus aparatos.</span>
      <div class="pila" style="gap:2px">${lista.map((r, i) => html`<${Fila} key=${r.k} r=${r} P=${P} i=${i} />`)}</div>`
      : html`<p class="vacio">No hay recordatorios pendientes. ¡Todo al día!</p>`,
    pie: html`<button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => c(() => abrir('ajustesRec'))}>Elegir qué recordar</button>`
  })} />`;
}

// Ajustes: qué se recuerda.
export function AjustesRecordatorios() {
  const { S, T } = useApp();
  const aj = ajustesRec(S.negocio);
  const pon = o => cambiarNegocio({ rec: Object.assign({}, aj, o) });
  const tipos = TIPOS_REC.filter(t => !t.mod || T.mod(t.mod));
  return html`<p class="sub" style="margin:0 0 6px;line-height:1.45">Orbe arma la lista y escribe cada mensaje; tú lo envías con un toque desde Hoy.</p>
    ${tipos.map(t => html`<${Interruptor} key=${t.k} on=${!!aj[t.k]} onCambio=${v => pon({ [t.k]: v })} titulo=${t.n} sub=${t.d} />`)}
    ${aj.fiado && T.mod('fiado') && html`<div class="campo" style="margin-top:8px"><span>Recordar el fiado cada</span><${Chips} opciones=${[3, 7, 15, 30].map(v => ({ v, n: v + ' días' }))} valor=${aj.fiadoDias} onCambio=${v => pon({ fiadoDias: v })} chico /></div>`}`;
}
export function AjustesRecHoja({ cerrar }) {
  return html`<${Hoja} titulo="Qué recordar por WhatsApp" onCerrar=${cerrar} contenido=${c => ({ cuerpo: html`<${AjustesRecordatorios} />`, pie: html`<button type="button" class="btn toca" onClick=${() => c()}>Listo</button>` })} />`;
}
