// Ventas del día: el desglose completo (cuánto, cómo pagaron, quién vendió, qué se vendió y cada venta).
// Lo ve cualquiera que vea “Últimas ventas”; la ganancia, solo quien tiene permiso de ver ganancias.
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { leer, resumen, inicioDia } from '../datos.js';
import { Hoja, Chips, Icono, simbolo } from '../ui.js';
import { color } from '../graficos.js';
import { FilaVenta } from './hojas.js';

const DIA = 86400000;

export function VentasDia({ cerrar }) {
  const { S, D, E, suc, puede } = useApp();
  const [quien, setQuien] = useState('');
  const hoy0 = inicioDia(Date.now());
  const r = resumen(hoy0, hoy0 + DIA, suc);
  const todas = leer().ventas.filter(v => v.t >= hoy0 && v.t < hoy0 + DIA && (!suc || v.suc === suc)).reverse();
  const nombre = id => { const p = S.perfiles.find(x => x.id === id); return p ? p.n.split(' ')[0] : 'Sin perfil'; };
  // Quién vendió: una píldora por persona (solo si vendió más de una).
  const personas = Object.keys(r.porPersona).filter(k => r.porPersona[k]).sort((a, b) => r.porPersona[b] - r.porPersona[a]);
  const cuantas = k => todas.filter(v => (v.por || '') === k && !v.anulada && !v.dev).length;
  const lista = quien ? todas.filter(v => (v.por || '') === quien) : todas;
  const pagos = Object.keys(r.porPago).sort((a, b) => r.porPago[b] - r.porPago[a]).map((k, i) => ({ n: k, v: r.porPago[k], c: k === 'Fiado' ? 'var(--c3)' : color(i === 2 ? 3 : i) }));
  const prods = Object.keys(r.porProd).map(k => r.porProd[k]).filter(x => x.q).sort((a, b) => b.v - a.v);
  const [verProds, setVerProds] = useState(false);
  const nProd = verProds ? prods.length : Math.min(prods.length, 5);
  const anuladas = todas.filter(v => v.anulada).length, devs = todas.filter(v => v.dev).length;
  const cifras = [['Ventas', String(r.n)], ['Ticket promedio', D.m(r.ticket)], puede('ganancias') ? ['Ganancia', D.m(r.ganancia), 'var(--in)'] : r.fiado ? ['Fiado', D.m(r.fiado), 'var(--amber)'] : null].filter(Boolean);
  const qty = q => String(Math.round(q * 1000) / 1000).replace('.', ',');

  return html`<${Hoja} titulo="Ventas de hoy" onCerrar=${cerrar} contenido=${() => ({
    cuerpo: html`
      <div class="cierre-resumen">
        <span class="sub">${new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}${E ? ' · ' + (suc || 'Todos los locales') : ''}</span>
        <b class="num cierre-total">${D.m(r.total)}</b>
        ${D.dual && html`<span class="sub num">${D.s(r.total)}</span>`}
        <div class="cierre-cifras">${cifras.map(k => html`<div><span class="sub">${k[0]}</span><b class="num" style=${{ color: k[2] || 'var(--ink)' }}>${k[1]}</b></div>`)}</div>
      </div>

      ${pagos.length > 0 && html`<div class="cierre-seccion"><span class="cierre-tit">Cómo te pagaron</span>
        <ul class="lista-orbe">${pagos.map((s, k) => html`<li key=${s.n} class="entra" style=${{ '--i': k, '--c': s.c }}>
          <span class="simbolo"><${Icono} n=${simbolo(s.n)} t=${16} g=${2} /></span>
          <b class="crece corta">${s.n}</b>
          <span class="faint num pct">${r.total ? Math.round(s.v / r.total * 100) : 0} %</span>
          <b class="num">${D.m(s.v)}</b>
        </li>`)}</ul>
      </div>`}

      ${personas.length > 0 && html`<div class="cierre-seccion"><span class="cierre-tit">Quién vendió</span>
        <div class="cierre-digital">${personas.map(k => html`<div class="fila" key=${'p' + k}><span class="crece corta">${nombre(k)}</span><span class="sub faint">${cuantas(k)} ${cuantas(k) === 1 ? 'venta' : 'ventas'}</span><b class="num">${D.m(r.porPersona[k])}</b></div>`)}</div>
      </div>`}

      ${prods.length > 0 && html`<div class="cierre-seccion"><span class="cierre-tit">Lo que se vendió</span>
        <div class="cierre-digital">${prods.slice(0, nProd).map(x => html`<div class="fila" key=${'x' + x.n}><span class="crece corta">${qty(x.q)} × ${x.n}</span><b class="num">${D.m(x.v)}</b></div>`)}</div>
        ${prods.length > 5 && html`<button type="button" class="ver-mas toca" onClick=${() => setVerProds(!verProds)}>${verProds ? 'Ver menos' : 'Ver ' + (prods.length - 5) + ' más'}</button>`}
      </div>`}

      <div class="cierre-seccion" style="padding-bottom:4px"><span class="cierre-tit">Cada venta<span class="sub faint" style="margin-left:auto;font-weight:400">${anuladas ? anuladas + (anuladas === 1 ? ' anulada' : ' anuladas') : ''}${anuladas && devs ? ' · ' : ''}${devs ? devs + (devs === 1 ? ' devolución' : ' devoluciones') : ''}</span></span>
        ${personas.length > 1 && html`<${Chips} desliza chico valor=${quien} onCambio=${setQuien} opciones=${[{ v: '', n: 'Todas' }].concat(personas.map(k => ({ v: k, n: nombre(k) })))} />`}
        <div class="lista">${lista.map((v, k) => html`<${FilaVenta} key=${v.id} v=${v} i=${Math.min(k, 12)} quien=${personas.length > 1 && !quien ? nombre(v.por || '') : ''} />`)}</div>
        ${!todas.length && html`<p class="vacio">Todavía no hay ventas hoy.</p>`}
      </div>`,
    pie: null
  })} />`;
}
