// Inventario (tienda, comida, venta en línea) o Servicios (citas, independientes).
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { BotonAyuda } from '../ayuda.js';
import { Frase, BotonGuiame } from '../guias.js';
import { bajoMinimo, bajoMeta, resumen, inicioDia, listaProductos, promosVigentes, apartadas } from '../datos.js';
import { verQ, FRACCIONES } from '../carrito.js';
import { BarrasH, Reparto, color } from '../graficos.js';
import { Chips, Icono, TONOS, avisar, FotoProd } from '../ui.js';
import { CatalogoVacio } from './empezar.js';
import { FiltroGrupos, filtrarGrupo, textosProducto, grupoDe, colorGrupo, suaveGrupo, tonoProd } from './grupos.js';
import { buscar, parecidos } from '../buscar.js';

export function Inventario() {
  const { S, T, D, tel, abrir, puede } = useApp();
  // Permisos: cambiar productos, reponer y ver costos o ganancias.
  const pp = puede('productos'), vg = puede('ganancias');
  const editarP = d => pp ? abrir('producto', d) : avisar('Tu perfil no puede cambiar productos');
  // Personalizados: qué papel tiene cada producto (se arma, pieza o extra) y lo apartado para encargos.
  const conPer = T.mod('personalizados'), ap = conPer ? apartadas() : {};
  const PillPer = p => !conPer ? null : p.per ? html`<span class="pildora mini t-vio">Se arma</span>` : p.pz ? html`<span class="pildora mini t-vio" style="margin-left:0">Pieza</span>` : p.ex ? html`<span class="pildora mini t-vio">Extra</span>` : null;
  const [filtro, setFiltro] = useState('Todo');
  const [q, setQ] = useState('');
  const [grupo, setGrupo] = useState('');
  // Buscar (tolerante) y filtrar por grupo; con “nuevo” el producto creado entra en el grupo que se está viendo.
  const elegir = lista => { const g = filtrarGrupo(lista, S, grupo); return q.trim() ? buscar(g, q, textosProducto(S)) : g; };
  const Buscador = html`<div class="pila" style="gap:10px">
    <label class="buscador entra" style=${{ width: '100%', background: 'var(--surface)', maxWidth: tel ? 'none' : '420px' }}><${Icono} n="buscar" t=${16} c="var(--muted)" /><input type="search" value=${q} onInput=${e => setQ(e.target.value)} placeholder=${'Buscar entre ' + listaProductos().length} aria-label="Buscar en el inventario" /></label>
    <${FiltroGrupos} valor=${grupo} onCambio=${setGrupo} />
  </div>`;
  const NoHay = (lista, base) => q.trim() && !lista.length ? html`<p class="vacio">No encontré “${q}”. ${(() => { const s = parecidos(base, q, textosProducto(S)); return s.length ? '¿Quisiste decir ' + s.map(p => p.n).join(', ') + '?' : ''; })()}</p>` : null;
  const PillGrupo = p => { const g = grupoDe(S, p); return g ? html`<span class="pildora" style=${{ background: suaveGrupo(g, 16), color: 'var(--ink)' }}><i class="punto-grupo" style=${{ background: colorGrupo(g) }}></i>${g.n}</span>` : html`<span class="faint">—</span>`; };
  const mes = resumen(inicioDia(Date.now()) - 29 * 86400000, Date.now() + 1, '');
  const top = Object.keys(mes.porProd).map(k => Object.assign({ id: k }, mes.porProd[k])).sort((a, b) => b.v - a.v);

  if (!T.inv) {
    const servicios = elegir(listaProductos());
    const Lista = html`<div class="pila" data-tour="productos">${NoHay(servicios, listaProductos())}${servicios.map((p, i) => { const x = mes.porProd[p.id] || { q: 0, v: 0 }; return html`
      <button type="button" key=${p.id} data-guia="producto" class="tarjeta fila toca entra" style=${{ '--i': i, border: 0, color: 'var(--ink)', textAlign: 'left' }} onClick=${() => editarP({ pid: p.id })}>
        ${FotoProd(p, 0, html`<span class="ic" style=${Object.assign({ fontSize: '12px', fontWeight: 700 }, tonoProd(S, p))}>${p.ab}</span>`)}
        <span class="crece" style="display:flex;flex-direction:column;gap:2px"><b style="font-size:14px;font-weight:600">${p.n}</b><span class="sub">${p.dur >= 60 ? p.dur / 60 + ' h' : p.dur + ' min'}${x.q ? ' · ' + x.q + ' este mes' : ''}</span></span>
        <b class="num">${D.m(p.p)}</b>
      </button>`; })}</div>`;
    const Graf = html`<section class="tarjeta entra"><div class="tarjeta-tit">Lo que más te dejan<span class="sub">30 días</span></div>
      <${BarrasH} datos=${top.slice(0, 6).map(t => ({ n: t.n, v: t.v, txt: D.m(t.v), sub: t.q + ' veces' }))} /></section>`;
    const Graf2 = top.length ? Graf : null;
    if (!listaProductos().length) return html`${tel ? html`<div class="fila entra"><h1 class="titulo crece">Servicios</h1><${BotonGuiame} k="inventario" /><${BotonAyuda} /></div>` : null}<${CatalogoVacio} />`;
    // La frase: cuántos servicios y cuál piden más.
    const masPedido = top[0];
    const FraseSvc = html`<${Frase}>Ofreces <b>${listaProductos().length} ${listaProductos().length === 1 ? 'servicio' : 'servicios'}</b>.${masPedido ? html` El que más te piden: <b>${masPedido.n}</b>, ${masPedido.q} ${masPedido.q === 1 ? 'vez' : 'veces'} en 30 días.` : ' Cada uno con su precio y lo que dura.'}</${Frase}>`;
    if (tel) return html`<div class="fila entra"><h1 class="titulo crece">Servicios</h1><${BotonGuiame} k="inventario" /><${BotonAyuda} />${pp && html`<button type="button" class="btn2 chico acento toca" data-guia="agregar" onClick=${() => editarP({})}>+ Agregar</button>`}</div>
      ${FraseSvc}${Buscador}${Lista}${Graf2}`;
    return html`${FraseSvc}<div class="dos-uno"><div class="pila"><div class="fila"><span class="sub crece">Con su precio y lo que dura.</span>${pp && html`<button type="button" class="btn2 lleno toca" data-guia="agregar" onClick=${() => editarP({ g: grupo && grupo !== 'sin' ? grupo : '' })}>+ Servicio</button>`}</div>${Buscador}${Lista}</div>${Graf2}</div>`;
  }

  // Cuenta nueva: sin productos todavía.
  if (!listaProductos().length) return html`${tel ? html`<div class="fila entra"><h1 class="titulo crece">Inventario</h1><${BotonGuiame} k="inventario" /><${BotonAyuda} /></div>` : null}<${CatalogoVacio} />`;
  const conStock = listaProductos().filter(p => p.q != null);
  // Servicios dentro de una tienda (mano de obra, instalación…): no llevan existencia.
  const servicios = elegir(listaProductos().filter(p => p.q == null));
  const bajos = bajoMinimo();
  const valor = conStock.reduce((a, p) => a + p.q * p.c, 0);
  const margen = conStock.length ? conStock.reduce((a, p) => a + (p.p > 0 ? (p.p - p.c) / p.p : 0), 0) / conStock.length : 0;
  const base = filtro === 'Por reponer' ? bajos : conStock;
  const lista = q.trim() ? elegir(base) : elegir(base).slice().sort((a, b) => (a.q < a.min ? 0 : 1) - (b.q < b.min ? 0 : 1));
  const estado = p => p.q === 0 ? ['Agotado', 't-ros', 'var(--out)'] : p.q < p.min ? ['Bajo', 't-amb', 'var(--amber)'] : ['Bien', 't-ver', 'var(--in)'];

  // La frase: lo que se está acabando primero; si no, lo que tienes en estantes.
  const agotados = bajos.filter(p => p.q === 0).length;
  const nombres = bajos.slice(0, 2).map(p => p.n).join(' y ');
  const FraseInv = html`<${Frase}>${bajos.length
    ? html`${bajos.length === 1 ? html`<b class="a">${nombres}</b> se está acabando.` : html`<b class="a">${bajos.length} productos</b> se están acabando${bajos.length === 2 ? html`: ${nombres}` : html`, como ${nombres}`}.`}${agotados ? html` <b class="r">${agotados === 1 ? '1 ya está agotado' : agotados + ' ya están agotados'}</b>.` : ''}`
    : html`Todo tiene existencia.`}${vg && conStock.length ? html` Tienes <b class="num">${D.m(valor)}</b> en estantes.` : ''}</${Frase}>`;
  const Tarjetas = html`<div class="pila" data-tour="productos">${lista.map((p, i) => { const e = estado(p); return html`
    <button type="button" key=${p.id} data-guia="producto" class="tarjeta fila toca entra" style=${{ '--i': i, border: 0, color: 'var(--ink)', textAlign: 'left' }} onClick=${() => editarP({ pid: p.id })}>
      ${FotoProd(p, 0, html`<span class="ic" style=${Object.assign({ fontSize: '12px', fontWeight: 700 }, tonoProd(S, p))}>${p.ab}</span>`)}
      <span class="crece" style="display:flex;flex-direction:column;gap:6px">
        <span class="fila" style="gap:8px"><b class="crece corta" style="font-size:14px;font-weight:600">${p.n}</b>${vg && p.c > 0 && p.p < p.c * 1.05 ? html`<span class="pildora t-ros">Sin ganancia</span>` : null}<b class="num" style=${{ fontSize: '13px', color: e[2] }}>${verQ(p.q, p.u && !FRACCIONES[p.u] ? p.u : 'und')}</b></span>
        <span class="barra-prog"><i style=${{ width: Math.min(100, Math.round(p.q / Math.max(1, p.min * 2) * 100)) + '%', background: e[2] }}></i></span>
        ${conPer && (p.pz || p.ex || ap[p.id]) ? html`<span class="fila" style="gap:6px">${PillPer(p)}${ap[p.id] ? html`<span class="pildora mini t-amb" style="margin-left:0">${ap[p.id]} apartada${ap[p.id] > 1 ? 's' : ''} para encargos</span>` : null}</span>` : null}
        ${p.vars && p.vars.length ? html`<span class="sub num" style="font-size:11px">${p.vars.map(v => v.n + ' ' + verQ(v.q || 0)).join(' · ')}</span>` : null}
        <span class="sub faint num" style="font-size:11px">${vg ? 'Costo ' + D.m(p.c) + ' · ' : ''}Precio ${D.m(p.p)}${p.u && !FRACCIONES[p.u] ? ' / ' + p.u : p.u ? ' · por ' + p.u : ''}${vg ? ' · Ganas ' + (p.p ? Math.round((p.p - p.c) / p.p * 100) : 0) + ' %' : ''}</span>
      </span>
    </button>`; })}</div>`;

  // Herramientas en una fila: escanear, factura del proveedor, promociones y precios.
  // Solo las que el negocio tiene encendidas (Ajustes → Funciones).
  const herr = [(pp || puede('reponer')) && T.mod('escaner') && ['escanear', 'Escanear', () => abrir('escaner', { para: 'inventario' }), 0, '#6a5cf2'], (pp || puede('reponer')) && T.mod('compras') && ['doc', 'Factura', () => abrir('factura'), 0, '#3d9be9'],
    pp && T.mod('promos') && ['porciento', 'Promos', () => abrir('promos'), promosVigentes().length, '#e8436a'], pp && T.mod('precios') && ['etiqueta', 'Precios', () => abrir('precios'), bajoMeta().length ? -1 : 0, '#e8961a']].filter(Boolean);
  const Herramientas = herr.length ? html`<div class="herramientas entra" data-tour="escanear">${herr.map(h => html`<button type="button" key=${h[1]} class="toca" onClick=${h[2]}><span style=${{ background: h[4] }}><${Icono} n=${h[0]} t=${18} c="#fff" /></span><b>${h[1]}</b>${h[3] > 0 ? html`<em>${h[3]}</em>` : h[3] < 0 ? html`<i class="punto-aviso" style="top:8px;right:14px"></i>` : null}</button>`)}</div>` : null;
  const servs = listaProductos().filter(p => p.q == null);
  const Pestañas = html`<div class="segmento ancho entra" data-guia="pestanas" role="tablist" aria-label="Qué ver">${[['Todo', 'Productos ' + conStock.length], ['Por reponer', 'Por reponer ' + bajos.length]].concat(servs.length || (pp && T.mod('servicios')) ? [['Servicios', 'Servicios' + (servs.length ? ' ' + servs.length : '')]] : []).map(o => html`<button type="button" role="tab" aria-selected=${filtro === o[0] ? 'true' : 'false'} class=${filtro === o[0] ? 'on' : ''} onClick=${() => setFiltro(o[0])}>${o[1]}</button>`)}</div>`;
  const Resumen = vg && conStock.length ? html`<div class="resumen-inv entra"><span><b class="num">${D.m(valor)}</b> en estantes</span><span><b class="num in">${Math.round(margen * 100)} %</b> de ganancia</span>${bajos.length ? html`<span><b class="num amber">${bajos.length}</b> por reponer</span>` : null}</div>` : null;
  const ListaServicios = html`<div class="pila" data-tour="productos">${servicios.length ? html`<section class="tarjeta" style="padding:4px 14px"><div class="lista">${servicios.map(p => html`<button type="button" key=${p.id} class="item toca" style="color:var(--ink)" onClick=${() => editarP({ pid: p.id })}>${FotoProd(p, 34, html`<span class="ic" style=${Object.assign({ width: '34px', height: '34px', fontSize: '11px', fontWeight: 700 }, tonoProd(S, p))}>${p.ab}</span>`)}<span class="crece corta" style="font-size:14px;font-weight:600">${p.n}${PillPer(p)}</span><b class="num">${p.per && conPer ? 'Variable' : D.m(p.p)}</b></button>`)}</div></section>`
    : html`<p class="vacio">Agrega lo que cobras sin ser un producto: instalación, revisión, envío… También al vender, con “+ Servicio o cargo”.</p>`}
    ${pp && html`<button type="button" class="btn2 acento toca" style="align-self:flex-start" onClick=${() => editarP({ svc: true })}>+ Servicio</button>`}</div>`;

  if (tel) return html`
    <div class="fila entra" style="gap:8px"><h1 class="titulo crece">Inventario</h1><${BotonGuiame} k="inventario" /><${BotonAyuda} />${pp && html`<button type="button" data-guia="agregar" class="icono-btn toca boton-agregar" aria-label=${filtro === 'Servicios' ? 'Agregar servicio' : 'Agregar producto'} onClick=${() => filtro === 'Servicios' ? editarP({ svc: true }) : editarP({ g: grupo && grupo !== 'sin' ? grupo : '' })}><${Icono} n="mas1" t=${20} g=${2.6} /></button>`}</div>
    ${FraseInv}
    <label class="buscador buscador-oscuro entra"><${Icono} n="buscar" t=${17} /><input type="search" value=${q} onInput=${e => setQ(e.target.value)} placeholder=${'Buscar entre ' + listaProductos().length} aria-label="Buscar en el inventario" />${(pp || puede('reponer')) && html`${T.mod('escaner') && html`<button type="button" class="buscador-cam toca" aria-label="Escanear código de barras" onClick=${() => abrir('escaner', { para: 'inventario' })}><${Icono} n="escanear" t=${17} /></button>`}`}</label>
    ${Herramientas}
    ${Pestañas}
    ${filtro !== 'Servicios' && html`<${FiltroGrupos} valor=${grupo} onCambio=${setGrupo} />`}
    ${filtro !== 'Servicios' && Resumen}
    ${filtro === 'Servicios' ? ListaServicios : html`${NoHay(lista, base)}${Tarjetas}${!lista.length && !q.trim() ? html`<p class="vacio">${filtro === 'Por reponer' ? 'Nada por reponer.' : grupo ? 'No hay nada en este grupo.' : 'Todavía no tienes productos.'}</p>` : null}`}`;

  return html`
    ${FraseInv}
    <div class="cifras">
      <div class="tarjeta cifra entra"><span class="sub">Valor en estantes</span><span class="v num">${vg ? D.m(valor) : '—'}</span><span class="sub faint">a precio de costo</span></div>
      <div class="tarjeta cifra entra" style="--i:1"><span class="sub">Ganas en promedio</span><span class="v num in">${vg ? Math.round(margen * 100) + ' %' : '—'}</span><span class="sub faint">por cada venta</span></div>
      <div class="tarjeta cifra entra" style="--i:2"><span class="sub">Por reponer</span><span class="v num amber">${bajos.length}</span><span class="sub faint">debajo del mínimo</span></div>
      <div class="tarjeta cifra entra" style="--i:3"><span class="sub">Productos</span><span class="v num">${conStock.length}</span><span class="sub faint">con existencia</span></div>
    </div>
    <div class="pila">
        <div class="fila" style="flex-wrap:wrap;gap:12px">${Pestañas}<span style="flex:1"></span>${Herramientas}${pp && html`<button type="button" class="btn2 lleno toca" data-guia="agregar" onClick=${() => filtro === 'Servicios' ? editarP({ svc: true }) : editarP({ g: grupo && grupo !== 'sin' ? grupo : '' })}>${filtro === 'Servicios' ? '+ Servicio' : '+ Producto'}</button>`}</div>
        ${Buscador}
        ${filtro === 'Servicios' ? ListaServicios : html`<div class="tabla-caja"><table class="tabla">
          <thead><tr><th>Producto</th><th>Grupo</th><th>Código</th><th class="der">Costo</th><th class="der">Precio</th><th class="der">Tienes</th><th class="der">Mínimo</th><th>Estado</th><th></th></tr></thead>
          <tbody>${lista.map((p, i) => { const e = estado(p); return html`<tr key=${p.id} data-guia="producto" style=${{ animationDelay: i * 25 + 'ms' }}>
            <td>${p.foto ? html`<span class="fila" style="gap:10px;display:inline-flex;vertical-align:middle">${FotoProd(p, 30)}<b style="font-weight:600">${p.n}</b></span>` : html`<b style="font-weight:600">${p.n}</b>`}${p.usd > 0 ? html` <span class="pildora t-ver" title="Precio atado al dólar">US$ ${p.usd}</span>` : null}${vg && p.c > 0 && p.p < p.c * 1.05 ? html` <span class="pildora t-ros">Sin ganancia</span>` : null}</td><td>${PillGrupo(p)}</td><td class="muted num">${p.cod || '—'}</td>
            <td class="der num muted">${vg ? D.m(p.c) : '—'}</td><td class="der num">${D.m(p.p)}</td>
            <td class="der num"><b style=${{ color: e[2] }}>${verQ(p.q)}</b></td><td class="der num muted">${p.min}</td>
            <td><span class=${'pildora ' + e[1]}>${e[0]}</span></td>
            <td class="der"><span class="fila" style="gap:6px;justify-content:flex-end">${puede('reponer') && html`<button type="button" class="btn2 chico verde toca" onClick=${() => abrir('reponer', { pid: p.id })}>Reponer</button>`}${pp && html`<button type="button" class="btn2 chico toca" onClick=${() => editarP({ pid: p.id })}>Editar</button>`}</span></td>
          </tr>`; })}</tbody>
        </table>${lista.length ? null : q.trim() ? NoHay(lista, base) : html`<p class="vacio">${grupo ? 'No hay nada en este grupo.' : 'Nada por reponer.'}</p>`}</div>`}
    </div>
    <div class="mitades">
      ${vg && html`<section class="tarjeta entra" style="--i:3"><div class="tarjeta-tit">Lo que más te deja<span class="sub">ganancia, 30 días</span></div>
        <${BarrasH} datos=${top.slice().sort((a, b) => b.g - a.g).slice(0, 6).map((t, i) => ({ n: t.n, v: t.g, txt: D.m(t.g), c: color(i), sub: t.q + ' vendidos' }))} /></section>`}
      ${vg && html`<section class="tarjeta entra" style="--i:4"><div class="tarjeta-tit">Dónde está tu dinero<span class="sub">a costo</span></div>
        <${BarrasH} datos=${conStock.slice().sort((a, b) => b.q * b.c - a.q * a.c).slice(0, 6).map((p, i) => ({ n: p.n, v: p.q * p.c, txt: D.m(p.q * p.c), c: color(i + 2), sub: p.q + ' und' }))} /></section>`}
    </div>`;
}
