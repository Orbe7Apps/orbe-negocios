// Personalizados: un producto que se arma a la medida (torta de varios pisos, arreglo, combo…).
// Se arma en 3 pasos: piezas del inventario con cantidad, extras con precio y el precio final (sugerido, editable).
// Si es un encargo, pasa a Órdenes con abono y fecha: las piezas quedan apartadas y bajan del inventario al entregar.
import { html, useState, useEffect } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { Hoja, Icono, Interruptor, avisar, avisarDeshacer } from '../ui.js';
import { listaProductos, apartadas, guardarPlantilla, borrarPlantilla, conDeshacer } from '../datos.js';
import { numero } from './pagos.js';
import { tonoProd } from './grupos.js';

// Las tortas se dibujan por pisos; lo demás se muestra como lista.
export const esTorta = p => /torta|pastel|ponqu|bizcoch|cake|queque|tarta/i.test((p && p.n) || '');
const coma = v => String(v).replace('.', ',');
const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
const corto = (pz, per) => esTorta(per) ? pz.n.replace(/^torta( base)?\s*/i, '') || pz.n : pz.n;

export function Armar({ d, cerrar }) {
  const { S, D, T, abrir, puede } = useApp();
  const per = S.productos.find(p => p.id === d.pid);
  const torta = esTorta(per);
  const piezas = listaProductos().filter(p => p.pz && p.id !== d.pid).sort((a, b) => b.p - a.p);
  const extras = listaProductos().filter(p => p.ex && p.id !== d.pid);
  const ap = apartadas();
  const [paso, setPaso] = useState(1);
  const [b, setB] = useState({});
  const [e, setE] = useState([]);
  const [otros, setOtros] = useState([]);
  const [nuevo, setNuevo] = useState(null);
  const [precio, setPrecio] = useState(null);
  const [det, setDet] = useState('');
  const conEncargo = T.mod('ordenes') && puede('ordenes');
  const [tipo, setTipo] = useState('ya');
  const [conPl, setConPl] = useState(false);
  const [nombrePl, setNombrePl] = useState('');
  const [desde, setDesde] = useState('');
  useEffect(() => { const c = document.querySelector('.hoja:last-of-type .hoja-cuerpo'); if (c) c.scrollTop = 0; }, [paso]);
  if (!per) return null;

  const nPz = torta ? 'Bases' : 'Piezas';
  const disp = p => p.q == null ? Infinity : Math.max(0, p.q - (ap[p.id] || 0));
  const nb = Object.values(b).reduce((a, x) => a + x, 0);
  const elegidas = piezas.filter(p => b[p.id]);
  const exSel = extras.filter(x => e.includes(x.id)).concat(otros.filter(x => e.includes(x.id)));
  const sumaB = elegidas.reduce((a, p) => a + b[p.id] * p.p, 0), sumaE = exSel.reduce((a, x) => a + x.p, 0);
  const sug = D.redondo(Math.max(per.p || 0, sumaB + sumaE));
  const fin = precio == null ? sug : D.redondo(numero(precio));
  const costo = D.redondo(elegidas.reduce((a, p) => a + b[p.id] * (p.c || 0), 0) + exSel.reduce((a, x) => a + (x.c || 0), 0));
  const cambiaPiezas = o => { setB(o); setPrecio(null); setDesde(''); };
  const toggleEx = id => { setE(e.includes(id) ? e.filter(x => x !== id) : e.concat([id])); setPrecio(null); setDesde(''); };
  const usarPl = pl => {
    const b2 = {}; Object.keys(pl.b || {}).forEach(k => { const p = piezas.find(x => x.id === k); if (p) b2[k] = Math.min(pl.b[k], disp(p)); });
    setB(b2); setE((pl.e || []).filter(id => extras.some(x => x.id === id))); setPrecio(pl.p ? coma(pl.p) : null); setDesde(pl.n);
    if (Object.keys(b2).some(k => b2[k] < pl.b[k])) avisar('No alcanzan las piezas de “' + pl.n + '”: revisa las cantidades');
  };
  const nombreLinea = per.n + (nb ? ' · ' + (torta ? plural(nb, 'piso', 'pisos') : plural(nb, 'pieza', 'piezas')) : '');
  const textoDet = [elegidas.map(p => b[p.id] + '× ' + p.n).join(' + '), exSel.map(x => x.n).join(', '), det.trim()].filter(Boolean).join('. ');
  const plAuto = () => (torta && nb ? plural(nb, 'piso', 'pisos') : per.n) + ' · ' + D.m(fin);

  const terminar = c => {
    if (!(fin > 0)) { avisar('Escribe el precio'); return; }
    if (nb && elegidas.some(p => b[p.id] > disp(p))) { avisar('No hay suficientes piezas'); return; }
    // Lo que baja del inventario: las piezas y los extras que llevan existencia.
    const pz = elegidas.map(p => ({ pid: p.id, n: p.n, q: b[p.id] })).concat(exSel.filter(x => x.q != null && !x.libre).map(x => ({ pid: x.id, n: x.n, q: 1 })));
    if (conPl) { const n = nombrePl.trim() || plAuto(); guardarPlantilla(per.id, { n, b: Object.assign({}, b), e: e.filter(id => extras.some(x => x.id === id)), p: fin }); }
    const linea = { n: nombreLinea, p: fin, c: costo, per: per.id, pz, det: textoDet };
    if (tipo === 'encargo') {
      c(() => abrir('nuevaOrden', { tipo: 'pedido', que: nombreLinea, det: textoDet, items: [Object.assign({ pid: 'libre:' + Math.random().toString(36).slice(2, 8), q: 1, libre: true }, linea)] }));
      return;
    }
    c(() => { d.onAgregar && d.onAgregar(linea); avisar('Agregado: ' + nombreLinea + (conPl ? ' · plantilla guardada' : '')); });
  };

  // Dibujo de la torta: un piso por base, la más grande abajo.
  const Dibujo = () => {
    const pisos = []; elegidas.forEach(p => { for (let i = 0; i < b[p.id]; i++) pisos.push(p); });
    const max = Math.max(1, ...piezas.map(p => p.p));
    const fondant = exSel.some(x => /fondant|cubierta/i.test(x.n)), letrero = exSel.find(x => /letrero|topper/i.test(x.n)), figuras = exSel.some(x => /figura|flor/i.test(x.n));
    return html`<div class="armar-dibujo" style=${{ height: Math.max(140, 64 + pisos.length * 38) + 'px' }}>
      <span class="armar-plato"></span>
      <div class="armar-pisos">${pisos.map((p, i) => html`<div key=${p.id + i} class=${'armar-piso' + (fondant ? ' fondant' : '')} style=${{ width: Math.round(96 + 104 * Math.sqrt(p.p / max)) + 'px', '--c': i % 2 ? 'var(--c1)' : 'color-mix(in srgb, var(--c1) 82%, #fff)' }}>
        ${corto(p, per)}${i === pisos.length - 1 && letrero ? html`<span class="armar-letrero">${letrero.n}</span>` : null}${i === pisos.length - 1 && figuras ? html`<span class="armar-figura"></span>` : null}</div>`)}</div>
      ${!pisos.length && html`<span class="sub faint armar-vacio">Elige las bases que lleva</span>`}
    </div>`;
  };

  const Pasos = html`<div class="armar-pasos" role="list">${[nPz, 'Extras', 'Precio'].map((n, i) => html`<div role="listitem" class=${i + 1 < paso ? 'hecho' : i + 1 === paso ? 'on' : ''}><i></i><span>${i + 1} · ${n}</span></div>`)}</div>`;

  const Paso1 = html`
    ${(per.pl || []).length > 0 && html`<div class="campo"><span>Empezar de una plantilla</span><div class="chips desliza">${per.pl.slice().reverse().map(pl => html`<button type="button" key=${pl.n} class=${'chip chico toca' + (desde === pl.n ? ' on' : '')} onClick=${() => usarPl(pl)}>${pl.n}${pl.p ? ' · ' + D.m(pl.p) : ''}</button>`)}</div></div>`}
    ${torta && piezas.length > 0 && Dibujo()}
    <div class="campo"><span>${nPz} (salen del inventario)</span>
      ${piezas.length ? html`<div class="pila" style="gap:8px">${piezas.map(p => { const q = b[p.id] || 0, hay = disp(p), queda = hay === Infinity ? null : hay - q; return html`
        <div key=${p.id} class=${'armar-pieza' + (q ? ' on' : '')}>
          <span class="ic" style=${Object.assign({ width: '40px', height: '40px', fontSize: '12px', fontWeight: 700, flex: 'none' }, tonoProd(S, p))}>${p.ab}</span>
          <span class="crece" style="display:flex;flex-direction:column;gap:2px;min-width:0"><b style="font-size:15px;line-height:1.25">${p.n}</b>
            <span class="sub num">${D.m(p.p)}${queda != null ? html` · <span class=${queda <= 0 ? 'amber' : ''}>${queda <= 0 ? 'no quedan' : 'quedan ' + queda}</span>` : ''}</span>
            ${ap[p.id] ? html`<span class="sub amber" style="font-size:12px">${ap[p.id]} apartada${ap[p.id] > 1 ? 's' : ''} para encargos</span>` : null}</span>
          <span class="fila" style="gap:6px">
            <button type="button" class="icono-btn chico toca armar-btn" aria-label=${'Quitar una ' + p.n} disabled=${!q} onClick=${() => { const o = Object.assign({}, b); if (o[p.id] > 1) o[p.id]--; else delete o[p.id]; cambiaPiezas(o); }}><${Icono} n="menos1" t=${14} g=${2.6} /></button>
            <b class="num" style="min-width:22px;text-align:center;font-size:17px">${q}</b>
            <button type="button" class="icono-btn chico toca armar-btn" aria-label=${'Agregar una ' + p.n} onClick=${() => { if (q >= hay) { avisar(hay <= 0 ? p.n + ': no quedan' : 'Solo quedan ' + hay + ' de ' + p.n); return; } cambiaPiezas(Object.assign({}, b, { [p.id]: q + 1 })); }}><${Icono} n="mas1" t=${14} g=${2.6} /></button>
          </span>
        </div>`; })}</div>`
      : html`<div class="tarjeta pila" style="box-shadow:none;background:var(--fill2);gap:8px"><span class="sub" style="line-height:1.45">Todavía no tienes piezas. En Inventario, abre un producto y en “En personalizados” elige <b>Es una pieza</b>${torta ? ' (por ejemplo, Torta base 1 kg)' : ''}.</span></div>`}
    </div>`;

  const Paso2 = html`<div class="campo"><span>¿Qué le pones?</span>
    <div class="armar-extras">${extras.concat(otros).map(x => { const on = e.includes(x.id); return html`<button type="button" key=${x.id} class=${'armar-extra toca' + (on ? ' on' : '')} aria-pressed=${on ? 'true' : 'false'} onClick=${() => toggleEx(x.id)}>
        <span class="ok"><${Icono} n="check" t=${12} g=${3} /></span><b>${x.n}</b><span class="sub num">+ ${D.m(x.p)}</span></button>`; })}
      ${nuevo ? null : html`<button type="button" class="armar-extra mas toca" onClick=${() => setNuevo({ n: '', p: '' })}>+ Otro extra</button>`}</div>
    ${nuevo && html`<div class="tarjeta pila entra" style="box-shadow:none;background:var(--fill2);gap:8px">
      <div class="rejilla-2" style="gap:8px"><input type="text" value=${nuevo.n} placeholder="Ej.: Velas" aria-label="Nombre del extra" autocomplete="off" onInput=${ev => setNuevo(Object.assign({}, nuevo, { n: ev.target.value }))} />
        <input class="num" type="text" inputmode="decimal" value=${nuevo.p} placeholder="Precio" aria-label="Precio del extra" onInput=${ev => setNuevo(Object.assign({}, nuevo, { p: ev.target.value }))} /></div>
      <div class="chips"><button type="button" class="chip chico toca on" onClick=${() => { const n = nuevo.n.trim(), p = D.redondo(numero(nuevo.p)); if (!n || !(p > 0)) { avisar('Escribe el nombre y el precio'); return; } const id = 'x' + Math.random().toString(36).slice(2, 7); setOtros(otros.concat([{ id, n, p, c: 0, q: null, libre: true }])); setE(e.concat([id])); setPrecio(null); setNuevo(null); if (document.activeElement) document.activeElement.blur(); }}>Agregar</button><button type="button" class="chip chico toca" onClick=${() => setNuevo(null)}>Cancelar</button></div>
      <span class="sub faint" style="font-size:12px">Solo para esta venta. Para tenerlo siempre, créalo en Inventario como “Es un extra”.</span></div>`}
    ${!extras.length && !otros.length && html`<span class="sub faint" style="font-size:12px;line-height:1.4">Para que salgan aquí, en Inventario marca servicios o productos como <b>Es un extra</b> (relleno, cubierta, letrero…).</span>`}
  </div>`;

  const redondeos = [...new Set([sug, Math.ceil(sug / 5) * 5, Math.ceil(sug / 5) * 5 + 5])].filter(v => v > 0);
  const Paso3 = html`
    <div class="armar-desglose">
      ${elegidas.length > 0 && html`<span class="tit">${nPz}</span>${elegidas.map(p => html`<div class="fila"><span class="crece">${b[p.id]} × ${p.n}</span><span class="num">${D.m(b[p.id] * p.p)}</span></div>`)}`}
      ${exSel.length > 0 && html`<span class="tit">Extras</span>${exSel.map(x => html`<div class="fila"><span class="crece">${x.n}</span><span class="num">${D.m(x.p)}</span></div>`)}`}
      <div class="fila sug"><span class="crece">Precio sugerido</span><span class="num">${D.m(sug)}</span></div>
      ${costo > 0 && puede('ganancias') && html`<span class="sub num">Costo ${D.m(costo)} · ganas ${D.m(fin - costo)}</span>`}
    </div>
    <label class="campo"><span>Precio final (lo puedes cambiar)</span><input class="grande num" type="text" inputmode="decimal" value=${precio == null ? coma(sug) : precio} aria-label="Precio final" onInput=${ev => setPrecio(ev.target.value)} />
      ${D.dual && fin > 0 && html`<span class="sub num">${D.s(fin)}</span>`}</label>
    <div class="chips">${redondeos.map(v => html`<button type="button" key=${v} class=${'chip chico toca' + (Math.abs(fin - v) < 0.004 ? ' on' : '')} onClick=${() => setPrecio(coma(v))}>${D.m(v)}</button>`)}</div>
    <label class="campo"><span>Detalles (opcional)</span><textarea rows="2" value=${det} placeholder=${torta ? 'Sabor, colores, letrero “Feliz 7, Sofía”…' : 'Colores, mensaje, medidas…'} onInput=${ev => setDet(ev.target.value)}></textarea></label>
    ${conEncargo && html`<div class="campo"><span>¿Cuándo se lo lleva?</span>
      <div class="segmento" style="width:100%">${[['ya', 'Ahora mismo'], ['encargo', 'Es un encargo']].map(x => html`<button type="button" style="flex:1" class=${tipo === x[0] ? 'on' : ''} onClick=${() => setTipo(x[0])}>${x[1]}</button>`)}</div>
      <span class="sub" style="line-height:1.4">${tipo === 'encargo' ? 'Se crea un pedido con abono y fecha de entrega. Las piezas quedan apartadas y bajan del inventario al entregar.' : 'Va al pedido como una línea. Las piezas bajan del inventario al cobrar.'}</span></div>`}
    <${Interruptor} on=${conPl} onCambio=${setConPl} titulo="Guardar como plantilla" sub=${desde && !conPl ? 'Viene de “' + desde + '”' : 'Para armarlo igual con un toque'} />
    ${conPl && html`<label class="campo entra"><span>Nombre de la plantilla</span><input type="text" value=${nombrePl} placeholder=${plAuto()} aria-label="Nombre de la plantilla" autocomplete="off" onInput=${ev => setNombrePl(ev.target.value)} /></label>`}
    ${desde && html`<button type="button" class="enlace-tasa toca" style="align-self:flex-start;color:var(--out-text)" onClick=${() => { const u = conDeshacer(() => borrarPlantilla(per.id, desde), 'Plantilla borrada'); setDesde(''); avisarDeshacer('Plantilla borrada', u); }}>Borrar la plantilla “${desde}”</button>`}`;

  return html`<${Hoja} titulo=${per.n} onCerrar=${cerrar} contenido=${c => ({
    cuerpo: html`${Pasos}<div class="armar-vista" key=${paso}>${paso === 1 ? Paso1 : paso === 2 ? Paso2 : Paso3}</div>`,
    pie: paso === 1 ? html`<div class="fila"><span class="crece sub">${nb ? plural(nb, torta ? 'base' : 'pieza', torta ? 'bases' : 'piezas') : 'Sin ' + nPz.toLowerCase() + ' todavía'}</span><b class="num">${D.m(sumaB)}</b></div>
        <button type="button" class="btn toca" onClick=${() => setPaso(2)}>Siguiente: extras</button>`
      : paso === 2 ? html`<div class="fila"><span class="crece sub num">${nPz} ${D.m(sumaB)} + extras ${D.m(sumaE)}</span><b class="num">${D.m(sumaB + sumaE)}</b></div>
        <div class="fila" style="gap:8px"><button type="button" class="btn2 toca" style="min-height:54px;border-radius:27px;padding:0 20px" onClick=${() => setPaso(1)}>Atrás</button><button type="button" class="btn toca crece" onClick=${() => setPaso(3)}>Siguiente: precio</button></div>`
      : html`<div class="fila" style="gap:8px"><button type="button" class="btn2 toca" style="min-height:54px;border-radius:27px;padding:0 20px" onClick=${() => setPaso(2)}>Atrás</button><button type="button" class=${'btn toca crece' + (fin > 0 ? '' : ' apagado')} onClick=${() => terminar(c)}>${tipo === 'encargo' ? 'Encargar' : 'Agregar'} · ${D.m(fin)}</button></div>`
  })} />`;
}
