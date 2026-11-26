// Ajustes → Funciones: el rubro del negocio y las funciones que se encienden o apagan.
import { html, useState, useRef } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { cambiarNegocio } from '../datos.js';
import { RUBROS, MODULOS, rubro, adivinarRubro } from '../rubros.js';
import { Hoja, Icono, avisar, Pista } from '../ui.js';

const TONO = { vio: 't-vio', amb: 't-amb', ver: 't-ver', ros: 't-ros', azu: 't-azu' };
// Lista de funciones con su interruptor: primero las recomendadas para el rubro y después las demás.
// Se usa al crear la cuenta y en Ajustes → Funciones.
export function ListaFunciones({ on, onCambio, reco = [], rubroN = '' }) {
  // Tocar enciende o apaga. Mantener presionado (o clic derecho) dice qué hace.
  const largo = useRef({ t: 0, hecho: false });
  const explicar = m => avisar(m.n + ': ' + m.d.charAt(0).toLowerCase() + m.d.slice(1));
  const Fila = (m, k) => { const si = !!on[m.k]; return html`
    <button type="button" key=${m.k} role="switch" aria-checked=${si ? 'true' : 'false'} aria-label=${m.n + '. ' + m.d} title=${m.d} class=${'funcion-op toca entra' + (si ? ' on' : '')} style=${{ '--i': k }}
      onPointerDown=${() => { clearTimeout(largo.current.t); largo.current.hecho = false; largo.current.t = setTimeout(() => { largo.current.hecho = true; explicar(m); }, 480); }}
      onPointerUp=${() => clearTimeout(largo.current.t)} onPointerLeave=${() => clearTimeout(largo.current.t)} onPointerCancel=${() => clearTimeout(largo.current.t)}
      onContextMenu=${e => { e.preventDefault(); if (!largo.current.hecho) { largo.current.hecho = true; explicar(m); } }}
      onClick=${() => { if (largo.current.hecho) { largo.current.hecho = false; return; } onCambio(m, !si); }}>
      <span class="ic funcion-ic"><${Icono} n=${m.i} t=${17} /></span>
      <b>${m.c || m.n}</b>
      <span class=${'inter' + (si ? ' on' : '')}></span>
    </button>`; };
  const recos = MODULOS.filter(m => reco.includes(m.k)), otras = MODULOS.filter(m => !reco.includes(m.k));
  return html`<div class="pila" style="gap:8px">
    <${Pista} id="funciones"><span>Toca para encender o apagar. <b>Mantén presionado</b> para ver qué hace.</span></${Pista}>
    ${recos.length > 0 && html`<span class="titulo-funciones">Recomendado${rubroN ? ' para ' + rubroN.toLowerCase() : ''}</span><div class="funciones-rejilla">${recos.map(Fila)}</div>`}
    <span class="titulo-funciones">${recos.length ? 'Otras funciones' : 'Funciones'}</span><div class="funciones-rejilla">${otras.map((m, k) => Fila(m, k + recos.length))}</div>
  </div>`;
}

// La guía que se ofrece al encender cada función.
const GUIA_DE = { agenda: 'cita', ordenes: 'orden', cotizaciones: 'cotizar', cuotas: 'cuotas', fiado: 'fiar', caja: 'caja', promos: 'promo', compras: 'factura', medidas: 'medidas', comisiones: 'comisiones', escaner: 'reponer', inventario: 'productos', servicios: 'productos', variantes: 'productos' };
export function Funciones() {
  const { S, T, abrir, ayuda } = useApp();
  const n = S.negocio, R = rubro(n.rubro);
  const poner = (m, v) => {
    cambiarNegocio({ mods: Object.assign({}, n.mods || {}, { [m.k]: v }) }, (v ? 'Activó ' : 'Apagó ') + '“' + m.n + '”');
    // Al encender algo nuevo, Orbe ofrece enseñar a usarlo (la guía paso a paso de esa función).
    const g = v && GUIA_DE[m.k];
    if (g) avisar('Activado: ' + m.n, 'ok', { n: 'Ver cómo se usa', fn: () => ayuda(g) });
    else avisar((v ? 'Activado: ' : 'Apagado: ') + m.n);
  };
  return html`
    <button type="button" class="tarjeta fila toca" style="width:100%;box-shadow:none;background:var(--fill2);gap:12px;padding:12px;border:0;color:var(--ink);text-align:left" onClick=${() => abrir('rubro')}>
      <span class=${'ic ' + (R ? TONO[R.c] : 't-vio')} style="width:42px;height:42px;border-radius:13px"><${Icono} n=${T.icono} t=${20} /></span>
      <span class="crece" style="display:flex;flex-direction:column;gap:2px"><span class="sub">Rubro</span><b style="font-size:15px">${T.n}</b></span>
      <span class="btn2 chico acento">Cambiar</span>
    </button>
    <span class="sub" style="display:block;margin:12px 0 4px;line-height:1.45">Lo apagado se oculta. Tus datos no se borran.</span>
    <${ListaFunciones} on=${T.mods} onCambio=${poner} reco=${R ? R.mods : []} rubroN=${R ? R.n : ''} />`;
}

// Hoja para cambiar el rubro: se encienden sus funciones recomendadas; productos y ventas no cambian.
export function ElegirRubro({ cerrar }) {
  const { S } = useApp();
  const [busca, setBusca] = useState('');
  const [elegido, setElegido] = useState(S.negocio.rubro || '');
  const sug = adivinarRubro(busca), lista = sug.concat(RUBROS.filter(r => !sug.includes(r)));
  const R = rubro(elegido);
  const guardar = c => {
    if (!R) { avisar('Elige un rubro'); return; }
    if (R.id === S.negocio.rubro) { c(); return; }
    cambiarNegocio({ rubro: R.id, tipo: R.t, mods: {} }, 'Cambió el rubro a ' + R.n);
    c(() => avisar('Listo: Orbe ahora está armado para ' + R.n.toLowerCase()));
  };
  return html`<${Hoja} titulo="Rubro del negocio" onCerrar=${cerrar} contenido=${c => ({
    cuerpo: html`
      <label class="buscador" style="min-height:50px"><${Icono} n="buscar" t=${16} c="var(--muted)" /><input type="search" value=${busca} placeholder="Escribe a qué te dedicas" aria-label="Buscar rubro" autocomplete="off" onInput=${e => setBusca(e.target.value)} /></label>
      <div class="pila" style="gap:8px">${lista.map(r => { const on = elegido === r.id; return html`
        <button type="button" key=${r.id} class=${'chip toca rubro-op' + (on ? ' on' : '')} style="min-height:60px" aria-pressed=${on ? 'true' : 'false'} onClick=${() => setElegido(r.id)}>
          <span class=${'ic ' + TONO[r.c]} style="width:36px;height:36px;border-radius:11px"><${Icono} n=${r.i} t=${18} /></span>
          <span style="flex:1;display:flex;flex-direction:column;gap:1px;text-align:left;min-width:0"><b style="font-size:14px">${r.n}</b><span class="sub corta">${r.ex}</span></span>
          ${on && html`<${Icono} n="check" t=${18} g=${3} c="var(--accent)" />`}
        </button>`; })}</div>
      ${R && R.id !== S.negocio.rubro && html`<span class="sub entra" style="line-height:1.45">Se encienden las funciones recomendadas para ${R.n.toLowerCase()}. Tus productos, clientes y ventas se quedan como están.</span>`}`,
    pie: html`<button type="button" class=${'btn toca' + (R ? '' : ' apagado')} onClick=${() => guardar(c)}>${R && R.id !== S.negocio.rubro ? 'Cambiar a ' + R.n : 'Listo'}</button>`
  })} />`;
}
