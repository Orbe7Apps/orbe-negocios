// Cotizaciones y presupuestos: una lista con precios para el cliente (PDF por WhatsApp) que se convierte en venta
// cuando la acepta. Se arma en Vender con “Cotizar”; aquí se ven todas, se reenvían y se venden.
import { html, useState, useEffect, useRef } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { BotonAyuda } from '../ayuda.js';
import { nuevaCotizacion, marcarCotizacion, borrarCotizacion, numeroCot, estadoCot, ESTADOS_COT, nuevoCliente } from '../datos.js';
import { Hoja, Icono, Chips, avisar, fechaCorta } from '../ui.js';
import { buscar } from '../buscar.js';
import { totales, cargarCotizacion } from './vender.js';
import { verQ } from '../carrito.js';
import { pdfOrden, compartirPDF, imprimirOrden } from '../ordenpdf.js';

const DIAS = [{ v: 3, n: '3 días' }, { v: 7, n: '7 días' }, { v: 15, n: '15 días' }, { v: 30, n: '30 días' }];
const cliDe = (S, c) => S.clientes.find(x => x.id === c.cli) || { n: c.cliN || 'Sin nombre', tel: c.tel || '' };

// ---------- hoja: guardar la lista del carrito como cotización ----------
export function Cotizar({ d, cerrar }) {
  const { S, P, D, abrir } = useApp();
  const tt = d.tt || totales(d.items, S.negocio, P);
  const [f, setF] = useState({ nom: '', tel: '', dias: 7, nota: '' });
  const pon = o => setF(x => Object.assign({}, x, o));
  const lista = S.clientes.filter(c => !c.borrado);
  const elegido = lista.find(c => c.n.trim().toLowerCase() === f.nom.trim().toLowerCase());
  const guardar = c => {
    if (!f.nom.trim()) { avisar('Escribe el nombre del cliente'); return; }
    let cli = elegido;
    // Cliente nuevo con teléfono: queda guardado en Clientes para la próxima.
    if (!cli && f.tel.trim()) cli = nuevoCliente({ n: f.nom.trim(), tel: f.tel.trim() });
    const cot = nuevaCotizacion({ items: d.items, cart: d.cart, cli: cli ? cli.id : '', cliN: f.nom.trim(), tel: cli ? cli.tel || f.tel.trim() : f.tel.trim(), dias: f.dias, nota: f.nota.trim() });
    if (d.onListo) d.onListo();
    c(() => { avisar('Cotización ' + numeroCot(cot) + ' guardada'); abrir('cotizacion', { cid: cot.id }); });
  };
  return html`<${Hoja} titulo="Nueva cotización" onCerrar=${cerrar} contenido=${c => ({
    cuerpo: html`
      <div class="tarjeta pila" style="box-shadow:none;background:var(--fill2);gap:6px">
        ${d.items.slice(0, 6).map(it => html`<div class="fila" style="gap:8px;font-size:14px"><span class="crece corta">${verQ(it.q, it.u)} × ${it.n}</span><b class="num">${D.m(it.q * it.p)}</b></div>`)}
        ${d.items.length > 6 && html`<span class="sub">y ${d.items.length - 6} más</span>`}
        <div class="fila" style="gap:8px;padding-top:6px"><b class="crece">Total</b><b class="num" style="font-size:18px">${D.m(tt.total)}</b></div>
        ${D.dual && html`<span class="sub num" style="text-align:right">${D.s(tt.total)}</span>`}
      </div>
      <label class="campo"><span>Cliente</span><input type="text" list="cot-clientes" value=${f.nom} placeholder="Nombre del cliente" autocomplete="off" onInput=${e => pon({ nom: e.target.value })} />
        <datalist id="cot-clientes">${lista.map(x => html`<option value=${x.n}></option>`)}</datalist></label>
      ${elegido ? html`<span class="sub" style="margin-top:-6px">Cliente guardado${elegido.tel ? ' · ' + elegido.tel : ''}</span>`
        : html`<label class="campo"><span>WhatsApp del cliente (opcional)</span><input type="tel" inputmode="tel" value=${f.tel} placeholder="0414-0000000" autocomplete="off" onInput=${e => pon({ tel: e.target.value })} /></label>`}
      <div class="campo"><span>¿Hasta cuándo valen estos precios?</span><${Chips} opciones=${DIAS} valor=${f.dias} onCambio=${v => pon({ dias: v })} chico /></div>
      <label class="campo"><span>Nota (opcional)</span><input type="text" value=${f.nota} placeholder="Ej.: incluye instalación, entrega en 3 días" autocomplete="off" onInput=${e => pon({ nota: e.target.value })} /></label>`,
    pie: html`<button type="button" class="btn toca" onClick=${() => guardar(c)}>Guardar cotización</button>`
  })} />`;
}

// ---------- hoja: una cotización ----------
export function Cotizacion({ d, cerrar }) {
  const { S, P, D, ir, abrir, puede } = useApp();
  const ct = (S.cotizaciones || []).find(x => x.id === d.cid);
  const ctx = { S, P, D };
  const pdf = useRef(null);
  useEffect(() => { if (ct) pdfOrden(Object.assign({ cot: true }, ct), ctx).then(b => { pdf.current = b; }).catch(() => {}); }, [ct && ct.estado]);
  if (!ct) return null;
  const doc = Object.assign({ cot: true }, ct), cli = cliDe(S, ct), est = estadoCot(ct), tt = totales(ct.items, S.negocio, P);
  const enviar = async () => {
    try { const b = pdf.current || await pdfOrden(doc, ctx); await compartirPDF(b, doc, ctx); }
    catch (er) { avisar('No pude preparar el PDF. Prueba otra vez.'); }
  };
  const vender = c => {
    if (!puede('vender')) { avisar('Tu perfil no puede cobrar'); return; }
    cargarCotizacion(ct); c(() => { ir('vender'); avisar('La lista quedó en Vender: revisa y cobra'); });
  };
  return html`<${Hoja} titulo=${numeroCot(ct)} onCerrar=${cerrar} contenido=${c => ({
    cuerpo: html`
      <div class="fila" style="gap:10px"><span class="crece" style="display:flex;flex-direction:column;gap:2px"><b style="font-size:17px">${cli.n}</b><span class="sub">${cli.tel || 'Sin teléfono'}</span></span>
        <span class=${'pildora ' + ESTADOS_COT[est][1]}>${ESTADOS_COT[est][0]}</span></div>
      <div class="rejilla-2" style="gap:10px">
        <div class="tarjeta cifra" style="box-shadow:none;background:var(--fill2)"><span class="sub">Hecha</span><b>${fechaCorta(ct.t)}</b></div>
        <div class="tarjeta cifra" style="box-shadow:none;background:var(--fill2)"><span class="sub">Válida hasta</span><b class=${est === 'vencida' ? 'out' : ''}>${fechaCorta(ct.vence)}</b></div>
      </div>
      <div class="tarjeta pila" style="box-shadow:none;background:var(--fill2);gap:8px">
        ${ct.items.map(it => html`<div class="fila" style="gap:8px;font-size:14px"><span class="crece">${verQ(it.q, it.u)} × ${it.n}</span><b class="num">${D.m(it.q * it.p)}</b></div>`)}
        <div class="fila" style="gap:8px;padding-top:6px"><b class="crece">Total</b><b class="num" style="font-size:20px">${D.m(tt.total)}</b></div>
        ${D.dual && html`<span class="sub num" style="text-align:right">${D.s(tt.total)}</span>`}
      </div>
      ${ct.nota && html`<span class="sub" style="line-height:1.45">Nota: ${ct.nota}</span>`}
      <div class="chips">
        <button type="button" class="btn2 verde toca" onClick=${enviar}><${Icono} n="doc" t=${15} />Enviar PDF por WhatsApp</button>
        <button type="button" class="btn2 toca" onClick=${() => imprimirOrden(doc, ctx)}><${Icono} n="doc" t=${15} />Imprimir</button>
      </div>
      ${est === 'pendiente' || est === 'vencida' ? html`<div class="chips">
          <button type="button" class="btn2 chico toca" onClick=${() => { marcarCotizacion(ct.id, 'rechazada'); avisar('Anotado: no la aceptó'); }}>No la aceptó</button>
          <button type="button" class="btn2 chico rojo toca" onClick=${() => c(() => abrir('confirmar', { deshacer: 'Cotización borrada', titulo: '¿Borrar ' + numeroCot(ct) + '?', texto: 'Se quita de la lista. No afecta ventas ni inventario.', boton: 'Borrar', si: () => { borrarCotizacion(ct.id); avisar('Cotización borrada'); } }))}>Borrar</button></div>`
        : est === 'rechazada' ? html`<div class="chips"><button type="button" class="btn2 chico toca" onClick=${() => { marcarCotizacion(ct.id, 'pendiente'); avisar('Cotización reabierta'); }}>Reabrir</button></div>` : null}`,
    pie: est === 'pendiente' || est === 'vencida'
      ? html`<button type="button" class="btn toca" onClick=${() => vender(c)}>${est === 'vencida' ? 'Vender igual (venció)' : 'El cliente aceptó: vender'}</button>`
      : html`<button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => c()}>Listo</button>`
  })} />`;
}

// ---------- pantalla: todas las cotizaciones ----------
export function Cotizaciones() {
  const { S, D, P, tel, abrir, ir } = useApp();
  const [filtro, setFiltro] = useState('pendiente');
  const [q, setQ] = useState('');
  const todas = (S.cotizaciones || []).slice().reverse();
  const cuenta = k => todas.filter(c => estadoCot(c) === k).length;
  const textos = c => { const cl = cliDe(S, c); return [numeroCot(c), cl.n, cl.tel, c.nota, c.items.map(it => it.n).join(' ')]; };
  const buscadas = q.trim() ? buscar(todas, q, textos, true) : todas;
  const lista = buscadas.filter(c => estadoCot(c) === filtro);
  const totalDe = c => totales(c.items, S.negocio, P).total;
  const pendientes = todas.filter(c => estadoCot(c) === 'pendiente'), aceptadas = todas.filter(c => c.estado === 'aceptada');
  const hechas = todas.filter(c => c.estado !== 'pendiente' || estadoCot(c) === 'vencida').length;
  const opciones = [['pendiente', 'Esperando'], ['aceptada', 'Vendidas'], ['vencida', 'Vencidas'], ['rechazada', 'No aceptadas']].map(o => ({ v: o[0], n: o[1] + ' ' + cuenta(o[0]) }));
  const Nueva = html`<button type="button" class="btn2 chico lleno toca" onClick=${() => { ir('vender'); avisar('Agrega los productos y toca “Cotizar”'); }}>+ Nueva cotización</button>`;
  return html`
    <div class="fila entra"><h1 class="titulo crece">Cotizaciones</h1><${BotonAyuda} />${Nueva}</div>
    <div class="rejilla-2" style="gap:10px">
      <div class="tarjeta cifra entra"><span class="sub">Esperando respuesta</span><span class="v num" style="font-size:22px">${D.m(pendientes.reduce((a, c) => a + totalDe(c), 0))}</span><span class="sub faint">${pendientes.length} ${pendientes.length === 1 ? 'cotización' : 'cotizaciones'}</span></div>
      <div class="tarjeta cifra entra" style="--i:1"><span class="sub">Se vendieron</span><span class="v num" style="font-size:22px">${hechas ? Math.round(aceptadas.length / hechas * 100) + ' %' : '—'}</span><span class="sub faint">${aceptadas.length} de ${hechas} respondidas</span></div>
    </div>
    <label class="buscador entra" style=${{ width: '100%', background: 'var(--surface)', maxWidth: tel ? 'none' : '380px' }}><${Icono} n="buscar" t=${16} c="var(--muted)" /><input type="search" value=${q} onInput=${e => setQ(e.target.value)} placeholder="Buscar cliente, número o producto" aria-label="Buscar cotización" /></label>
    <${Chips} opciones=${opciones} valor=${filtro} onCambio=${setFiltro} desliza chico />
    <div class="pila">${lista.length ? lista.map((c, i) => { const cl = cliDe(S, c), est = estadoCot(c); return html`
      <button type="button" key=${c.id} class="tarjeta fila toca entra" style=${{ '--i': i, gap: '12px', textAlign: 'left', color: 'var(--ink)', border: 0, font: 'inherit', width: '100%' }} onClick=${() => abrir('cotizacion', { cid: c.id })}>
        <span class="ic t-azu"><${Icono} n="doc" t=${18} /></span>
        <span class="crece" style="display:flex;flex-direction:column;gap:2px;min-width:0"><b class="corta">${cl.n}</b><span class="sub">${numeroCot(c)} · ${c.items.length} ${c.items.length === 1 ? 'producto' : 'productos'} · ${est === 'pendiente' ? 'vale hasta ' + fechaCorta(c.vence) : ESTADOS_COT[est][0].toLowerCase()}</span></span>
        <b class="num">${D.m(totalDe(c))}</b>
      </button>`; })
      : html`<div class="tarjeta pila entra" style="align-items:center;text-align:center;padding:26px 18px">
          <span class="ic t-azu" style="width:52px;height:52px;border-radius:16px"><${Icono} n="doc" t=${24} /></span>
          <b style="font-size:16px">${todas.length ? 'No hay cotizaciones aquí' : 'Todavía no tienes cotizaciones'}</b>
          <span class="sub" style="line-height:1.45;max-width:340px">En Vender agrega lo que el cliente quiere y toca “Cotizar”. Se la mandas en PDF por WhatsApp y, si acepta, la conviertes en venta con un toque.</span>
          ${!todas.length && Nueva}</div>`}</div>`;
}
