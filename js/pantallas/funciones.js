// Ajustes → Funciones: el rubro del negocio y las funciones que se encienden o apagan.
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { cambiarNegocio } from '../datos.js';
import { RUBROS, MODULOS, rubro, adivinarRubro } from '../rubros.js';
import { Hoja, Icono, Interruptor, avisar } from '../ui.js';

const TONO = { vio: 't-vio', amb: 't-amb', ver: 't-ver', ros: 't-ros', azu: 't-azu' };
const GRUPOS = ['Productos', 'Clientes y atención', 'Ventas y caja'];

export function Funciones() {
  const { S, T, abrir } = useApp();
  const n = S.negocio, R = rubro(n.rubro);
  const poner = (m, v) => {
    cambiarNegocio({ mods: Object.assign({}, n.mods || {}, { [m.k]: v }) }, (v ? 'Activó ' : 'Apagó ') + '«' + m.n + '»');
    avisar((v ? 'Activado: ' : 'Apagado: ') + m.n);
  };
  return html`
    <button type="button" class="tarjeta fila toca" style="width:100%;box-shadow:none;background:var(--fill2);gap:12px;padding:12px;border:0;color:var(--ink);text-align:left" onClick=${() => abrir('rubro')}>
      <span class=${'ic ' + (R ? TONO[R.c] : 't-vio')} style="width:42px;height:42px;border-radius:13px"><${Icono} n=${T.icono} t=${20} /></span>
      <span class="crece" style="display:flex;flex-direction:column;gap:2px"><span class="sub">Rubro</span><b style="font-size:15px">${T.n}</b></span>
      <span class="btn2 chico acento">Cambiar</span>
    </button>
    <span class="sub" style="display:block;margin:12px 0 4px;line-height:1.45">Enciende solo lo que usas: lo apagado no aparece en la app. Tus datos no se borran al apagar algo.</span>
    ${GRUPOS.map(g => html`<div class="grupo-funciones">
      <small>${g}</small>
      ${MODULOS.filter(m => m.g === g).map(m => html`<div class="funcion-fila">
        <span class=${'ic ' + (T.mod(m.k) ? 't-ver' : '')} style="width:34px;height:34px;border-radius:11px;flex:none;${T.mod(m.k) ? '' : 'background:var(--fill2);color:var(--muted)'}"><${Icono} n=${m.i} t=${17} /></span>
        <div class="crece"><${Interruptor} on=${T.mod(m.k)} onCambio=${v => poner(m, v)} titulo=${R && R.mods.includes(m.k) ? html`${m.n}<span class="pildora t-ver mini">Recomendado</span>` : m.n} sub=${m.d} /></div>
      </div>`)}
    </div>`)}`;
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
