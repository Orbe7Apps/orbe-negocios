// Clientes: quién te debe, recordatorios por WhatsApp, abonos e historial.
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { BotonAyuda } from '../ayuda.js';
import { Frase, BotonGuiame } from '../guias.js';
import { deudores } from '../datos.js';
import { BarrasH, Monto, color } from '../graficos.js';
import { Icono, Chips, iniciales, TONOS, hace } from '../ui.js';
import { Vacio } from './empezar.js';

export function Clientes() {
  const { S, D, T, tel, abrir, puede } = useApp();
  const pc = puede('clientes');
  // Sin fiado (barbería, salón…) no se habla de deudas: solo la lista de clientes.
  const fiado = T.mod('fiado');
  const todos = deudores();
  const [filtro, setFiltro] = useState(fiado && todos.some(c => c.deuda > 0) ? 'Deben' : 'Todos');
  const deben = todos.filter(c => c.deuda > 0), tot = deben.reduce((a, c) => a + c.deuda, 0);
  const lista = filtro === 'Deben' ? deben : filtro === 'Empresas' ? todos.filter(c => c.tipo === 'empresa') : todos;
  const opciones = (fiado ? ['Deben', 'Todos'] : ['Todos']).concat(S.negocio.escala === 'empresa' && (filtro === 'Empresas' || todos.some(c => c.tipo === 'empresa')) ? ['Empresas'] : []);
  const viejo = c => c.desde && Date.now() - c.desde > 15 * 86400000;
  // Celular: la tarjeta solo dice el total; la lista de abajo ya va del que más debe al que menos (sin repetirlos).
  const vencidoTel = deben.filter(viejo).reduce((a, c) => a + c.deuda, 0);

  const Resumen = html`<section class="tarjeta entra" data-tour="deben" style="background:var(--amber-soft);box-shadow:none">
    <div class="fila" style="align-items:flex-start">
      <span class="crece" style="display:flex;flex-direction:column;gap:2px"><span class="sub">Te deben</span><${Monto} v=${tot} f=${D.m} clase="titulo amber" />${D.dual && html`<span class="sub num">${D.s(tot)}</span>`}</span>
      <span class="pildora t-amb" style="flex-shrink:0">${deben.length} ${deben.length === 1 ? 'cliente' : 'clientes'}</span>
    </div>
    ${tel && vencidoTel > 0.004 && html`<span class="sub" style="display:block;margin-top:8px">De eso, <b class="out num">${D.m(vencidoTel)}</b> lleva más de 15 días.</span>`}
    ${deben.length > 0 && !tel && html`<div style="margin-top:14px"><${BarrasH} total=${tot} datos=${deben.slice(0, 5).map((c, i) => ({ n: c.n, v: c.deuda, txt: D.m(c.deuda), c: viejo(c) ? 'var(--out)' : 'var(--amber)', sub: viejo(c) ? 'Desde ' + hace(c.desde) + ' · vencido' : 'Desde ' + hace(c.desde) }))} /></div>`}
  </section>`;

  const Fila = (c, i) => html`<div class="tarjeta entra" key=${c.id} style=${{ '--i': i, display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <button type="button" class="fila toca" data-guia="cliente" style="border:0;background:none;padding:0;text-align:left;color:var(--ink)" onClick=${() => abrir('cliente', { cid: c.id })}>
      <span class=${'logo redondo ' + TONOS[i % 5]}>${iniciales(c.n)}</span>
      <span class="crece" style="display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">${c.n}</b><span class="sub" style=${{ color: viejo(c) && c.deuda > 0 ? 'var(--out)' : '' }}>${c.deuda > 0 ? 'Debe desde ' + hace(c.desde) + (viejo(c) ? ' · vencido' : '') : c.compras ? c.compras + (c.compras === 1 ? ' compra' : ' compras') + ' · última ' + hace(c.ultima) : (c.tel || 'Sin compras todavía')}</span></span>
      ${fiado && html`<b class=${'num' + (c.deuda > 0 ? (viejo(c) ? ' out' : '') : ' faint')} style="font-size:17px">${D.m(c.deuda)}</b>`}
    </button>
    ${c.deuda > 0 && html`<div class="rejilla-2">
      <button type="button" class="btn2 verde toca" data-guia="recordar" onClick=${() => abrir('recordar', { cid: c.id })}><${Icono} n="movil" t=${16} />Recordar</button>
      ${pc && html`<button type="button" class="btn2 toca" data-guia="abono" onClick=${() => abrir('abono', { cid: c.id })}>Anotar abono</button>`}
    </div>`}
  </div>`;

  // La frase de arriba: quién debe y desde cuándo, o cuántos clientes compran.
  const masViejo = deben.filter(c => c.desde).sort((a, b) => a.desde - b.desde)[0];
  const diasDe = c => Math.max(1, Math.floor((Date.now() - c.desde) / 86400000));
  const mesCompran = todos.filter(c => c.ultima > Date.now() - 30 * 86400000).length;
  const FraseClientes = html`<${Frase}>${fiado && deben.length
    ? html`${deben.length === 1 ? '1 cliente te debe' : deben.length + ' clientes te deben'} <b class="a num">${D.m(tot)}</b>.${masViejo && viejo(masViejo) ? html` <b>${masViejo.n.split(' ')[0]}</b> ya lleva <b class="r">${diasDe(masViejo)} días</b>.` : ' Nadie lleva más de 15 días.'}`
    : html`Tienes <b>${todos.length} ${todos.length === 1 ? 'cliente' : 'clientes'}</b>${mesCompran ? html`; ${mesCompran} ${mesCompran === 1 ? 'compró' : 'compraron'} este mes` : ''}.${fiado ? ' Nadie te debe.' : ''}`}</${Frase}>`;
  const Ninguno = html`<${Vacio} i="personas" e="clientes" t="Todavía no tienes clientes" s=${'Anótalos aquí o al cobrar, con su teléfono para mandarles el recibo' + (fiado ? ', recordarles lo que deben' : '') + ' y avisarles por WhatsApp.'}>${pc && html`<button type="button" class="btn2 lleno toca" data-guia="nuevo-cliente" onClick=${() => abrir('nuevoCliente')}>+ Cliente</button>`}</${Vacio}>`;
  if (!todos.length) return html`${tel ? html`<div class="fila entra"><h1 class="titulo crece">Clientes</h1><${BotonGuiame} k="clientes" /><${BotonAyuda} /></div>` : null}${Ninguno}`;
  if (tel) return html`
    <div class="fila entra"><h1 class="titulo crece">Clientes</h1><${BotonGuiame} k="clientes" /><${BotonAyuda} />${pc && html`<button type="button" class="btn2 chico acento toca" data-guia="nuevo-cliente" onClick=${() => abrir('nuevoCliente')}>+ Cliente</button>`}</div>
    ${FraseClientes}
    ${fiado && Resumen}
    ${opciones.length > 1 && html`<${Chips} opciones=${opciones} valor=${filtro} onCambio=${setFiltro} chico />`}
    ${lista.length ? lista.map(Fila) : html`<p class="vacio">${filtro === 'Deben' ? 'Nadie te debe. Así da gusto.' : 'Todavía no tienes clientes.'}</p>`}`;

  const vencido = deben.filter(viejo).reduce((a, c) => a + c.deuda, 0);
  const mes0 = new Date(); mes0.setDate(1); mes0.setHours(0, 0, 0, 0);
  const cobrado = S.abonos.filter(a => a.t >= mes0.getTime()).reduce((a, x) => a + x.v, 0);
  const cifras = [['Te deben', tot, deben.length + ' clientes', 'var(--amber)', 'reloj'], ['Vencido', vencido, 'más de 15 días', 'var(--out)', 'alerta'], ['Cobrado este mes', cobrado, 'en abonos', 'var(--in)', 'check'], ['Clientes', todos.length, (n => n === 1 ? '1 compró este mes' : n + ' compraron este mes')(todos.filter(c => c.ultima > Date.now() - 30 * 86400000).length), 'var(--c1)', 'personas', 'cuenta']];
  const cifrasV = fiado ? cifras : cifras.slice(3);
  return html`
    ${FraseClientes}
    <div class=${fiado ? 'cifras' : 'rejilla-2'}>${cifrasV.map((k, i) => html`<div class="tarjeta cifra entra" style=${{ '--i': i }}><span class="fila" style="gap:8px"><span class="simb-c" style=${{ '--c': k[3] }}><${Icono} n=${k[4]} t=${14} g=${2.2} /></span><span class="sub">${k[0]}</span></span>${k[5] === 'cuenta' ? html`<span class="v num">${k[1]}</span>` : html`<${Monto} v=${k[1]} f=${D.m} clase="v" />`}<span class="sub faint">${k[2]}</span></div>`)}</div>
    <div class=${fiado ? 'con-lado' : ''}>
      <div class="pila">
        <div class="fila"><${Chips} opciones=${opciones} valor=${filtro} onCambio=${setFiltro} chico /><span style="flex:1"></span>${pc && html`<button type="button" class="btn2 lleno toca" data-guia="nuevo-cliente" onClick=${() => abrir('nuevoCliente')}>+ Cliente</button>`}</div>
        <div class="tabla-caja entra"><table class="tabla">
          <thead><tr><th>Cliente</th><th>Teléfono</th>${S.negocio.escala === 'empresa' ? html`<th>Tipo</th>` : null}${fiado ? html`<th class="der">Debe</th><th>Desde</th>` : null}<th>Compras</th><th></th></tr></thead>
          <tbody>${lista.map((c, i) => html`<tr key=${c.id} style=${{ animationDelay: i * 25 + 'ms' }}>
            <td><button type="button" class="fila" data-guia="cliente" style="border:0;background:none;padding:0;color:var(--ink);gap:10px" onClick=${() => abrir('cliente', { cid: c.id })}><span class=${'logo redondo ' + TONOS[i % 5]} style="width:32px;height:32px;font-size:12px">${iniciales(c.n)}</span><b style="font-weight:600">${c.n}</b></button></td>
            <td class="muted">${c.tel || '—'}</td>
            ${S.negocio.escala === 'empresa' ? html`<td><span class=${'pildora ' + (c.tipo === 'empresa' ? 't-vio' : 't-azu')}>${c.tipo === 'empresa' ? 'Empresa' : 'Persona'}</span></td>` : null}
            ${fiado ? html`<td class=${'der num ' + (c.deuda > 0 ? (viejo(c) ? 'out' : 'amber') : 'faint')}><b>${D.m(c.deuda)}</b></td>
            <td>${c.deuda > 0 ? html`<span class=${'pildora ' + (viejo(c) ? 't-ros' : 't-amb')}>${hace(c.desde)}</span>` : html`<span class="pildora t-ver">Al día</span>`}</td>` : null}
            <td class="muted num">${c.compras}</td>
            <td class="der">${c.deuda > 0 && html`<span class="fila" style="gap:6px;justify-content:flex-end"><button type="button" class="btn2 chico verde toca" data-guia="recordar" onClick=${() => abrir('recordar', { cid: c.id })}>Recordar</button>${pc && html`<button type="button" class="btn2 chico toca" data-guia="abono" onClick=${() => abrir('abono', { cid: c.id })}>Abono</button>`}</span>`}</td>
          </tr>`)}</tbody>
        </table>${lista.length ? null : html`<p class="vacio">Nada por aquí con ese filtro.</p>`}</div>
      </div>
      ${fiado && Resumen}
    </div>`;
}
