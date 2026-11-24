// Cuenta nueva: los primeros pasos (en Hoy) y las sugerencias del rubro para llenar el catálogo con un toque.
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { catalogoDe, agregarVarios, cambiarNegocio, listaProductos } from '../datos.js';
import { rubro } from '../rubros.js';
import { Hoja, Icono, avisar } from '../ui.js';
import { numero } from './pagos.js';
import { iniciales2 } from './grupos.js';

// Productos y servicios típicos del rubro que todavía no están en el catálogo.
export function sugeridos(S, T) {
  const ya = new Set(listaProductos().map(p => p.n.toLowerCase())), R = rubro(S.negocio.rubro);
  const grupoDe = ab => ((R && R.grupos) || []).find(g => g[1].includes(ab));
  return catalogoDe(S.negocio.rubro, T.id).filter(x => !ya.has(x[1].toLowerCase())).map(x => ({ x, g: (grupoDe(x[0]) || [])[0] || '' }));
}

// Tarjeta de Hoy: lo que falta para dejar el negocio listo. Se va sola al completarlo (o con «Ocultar»).
export function PrimerosPasos() {
  const { S, T, ir, abrir, puede } = useApp();
  const n = S.negocio;
  if (n.pasosListos || !puede('ajustes')) return null;
  const hayCat = S.productos.some(p => !p.borrado), conStock = S.productos.some(p => !p.borrado && p.q > 0);
  const pasos = [
    { ok: hayCat, i: T.inv ? 'caja' : 'lista', t: T.inv ? 'Agrega tus productos' : 'Agrega tus servicios', s: 'Con sugerencias de tu rubro, en un toque', go: () => abrir('sugerencias') },
    T.inv && { ok: conStock, i: 'etiqueta', t: 'Anota cuánto tienes', s: 'Para saber qué se acaba', go: () => ir('inventario') },
    { ok: !!(n.logo || n.tel), i: 'tienda', t: 'Pon tu logo y teléfono', s: 'Salen en tus recibos y mensajes', go: () => abrir('negocio') },
    T.mod('agenda') && { ok: S.citas.length > 0, i: 'calendario', t: 'Agenda tu primera cita', s: 'Con el día, la hora y el servicio', go: () => abrir('nuevaCita', {}) },
    { ok: S.ventas.length > 0, i: 'carrito', t: T.vender === 'Cobrar' ? 'Haz tu primer cobro' : 'Haz tu primera venta', s: 'Toca los productos y cobra', go: () => ir('vender') },
    { ok: S.perfiles.length > 1, i: 'personas', t: 'Suma a tu equipo', s: 'Cada uno con su PIN y sus permisos', go: () => abrir('perfil', {}) }
  ].filter(Boolean);
  const hechos = pasos.filter(p => p.ok).length;
  if (hechos === pasos.length) return null;
  const sig = pasos.find(p => !p.ok);
  return html`<section class="tarjeta entra pasos" data-tour="primeros-pasos">
    <div class="fila" style="gap:12px;margin-bottom:6px">
      <span class="crece" style="display:flex;flex-direction:column;gap:2px"><b style="font-size:16px">Deja tu negocio listo</b><span class="sub">${hechos} de ${pasos.length} pasos</span></span>
      <button type="button" class="btn2 chico toca" onClick=${() => { cambiarNegocio({ pasosListos: true }); avisar('Los vuelves a ver en Ajustes → Ayuda'); }}>Ocultar</button>
    </div>
    <span class="barra-prog" style="margin-bottom:8px"><i style=${{ width: Math.round(hechos / pasos.length * 100) + '%', background: 'var(--in)' }}></i></span>
    <div class="lista">${pasos.map((p, k) => html`<button type="button" key=${p.t} class=${'item toca entra paso' + (p.ok ? ' hecho' : '') + (p === sig ? ' siguiente' : '')} style=${{ '--i': k, color: 'var(--ink)' }} onClick=${p.go}>
      <span class="paso-check">${p.ok ? html`<${Icono} n="check" t=${14} g=${3} c="#fff" />` : html`<${Icono} n=${p.i} t=${15} />`}</span>
      <span class="crece" style="display:flex;flex-direction:column;gap:1px;min-width:0"><b style="font-size:14px;font-weight:600">${p.t}</b>${!p.ok && html`<span class="sub faint">${p.s}</span>`}</span>
      ${!p.ok && html`<${Icono} n="sig" t=${16} c="var(--faint)" />`}
    </button>`)}</div>
  </section>`;
}

// Hoja: lo típico del rubro, todo marcado, con precio (y existencia si es producto) para cambiar antes de agregar.
export function Sugerencias({ cerrar }) {
  const { S, T, D, ir } = useApp();
  const R = rubro(S.negocio.rubro), lista = sugeridos(S, T);
  const [f, setF] = useState(() => lista.map(({ x, g }) => ({ on: true, n: x[1], ab: x[0], p: String(D.precio(x[2])).replace('.', ','), c: D.precio(x[3]), q: '', srv: x[4] < 0 || !T.inv, dur: x[6] || 0, ex: x[8] || {}, g })));
  const pon = (i, o) => setF(xs => xs.map((x, k) => k === i ? Object.assign({}, x, o) : x));
  const elegidos = f.filter(x => x.on);
  const agregar = c => {
    if (!elegidos.length) { avisar('Marca al menos uno'); return; }
    agregarVarios(elegidos.map(x => Object.assign({ n: x.n, ab: iniciales2(x.n), p: numero(x.p) || D.precio(0), c: x.c, q: x.srv ? null : Math.max(0, Math.round(numero(x.q))), dur: x.dur, g: x.g },
      x.ex.u ? { u: x.ex.u } : {}, x.ex.gar && T.mod('garantia') ? { gar: x.ex.gar } : {})));
    c(() => { avisar('Agregados: ' + elegidos.length + '. Cambia lo que quieras en ' + (T.inv ? 'Inventario' : 'Servicios')); ir('inventario'); });
  };
  return html`<${Hoja} titulo=${'Lo típico de ' + (R ? R.n.toLowerCase() : 'tu negocio')} onCerrar=${cerrar} contenido=${c => ({
    cuerpo: lista.length ? html`
      <span class="sub" style="line-height:1.45">Marca lo que vendes y ajusta el precio${T.inv ? ' y cuánto tienes' : ''}. Después agregas lo demás con el botón +.</span>
      <div class="pila" style="gap:8px">${f.map((x, i) => html`<div key=${x.ab + i} class=${'sugerido entra' + (x.on ? ' on' : '')} style=${{ '--i': i }}>
        <button type="button" class="fila toca" style="gap:10px;border:0;background:none;padding:0;color:var(--ink);text-align:left;width:100%" aria-pressed=${x.on ? 'true' : 'false'} onClick=${() => pon(i, { on: !x.on })}>
          <span class="marca-check">${x.on && html`<${Icono} n="check" t=${13} g=${3.2} c="#fff" />`}</span>
          <span class="crece" style="display:flex;flex-direction:column;min-width:0"><b class="corta" style="font-size:14px">${x.n}</b><span class="sub">${x.srv ? (x.dur ? x.dur + ' min · ' : '') + 'Servicio' : (x.g || 'Producto') + (x.ex.u ? ' · por ' + x.ex.u : '')}</span></span>
        </button>
        ${x.on && html`<div class="sugerido-datos">
          <label><span>Precio${x.ex.u ? ' por ' + x.ex.u : ''}</span><input class="num" type="text" inputmode="decimal" value=${x.p} aria-label=${'Precio de ' + x.n} onInput=${e => pon(i, { p: e.target.value })} /></label>
          ${!x.srv && html`<label><span>Tienes</span><input class="num" type="text" inputmode="decimal" value=${x.q} placeholder="0" aria-label=${'Cuántos tienes de ' + x.n} onInput=${e => pon(i, { q: e.target.value })} /></label>`}
        </div>`}
      </div>`)}</div>`
      : html`<p class="vacio">Ya agregaste todo lo sugerido. Usa el botón + para lo demás.</p>`,
    pie: lista.length ? html`<button type="button" class=${'btn toca' + (elegidos.length ? '' : ' apagado')} onClick=${() => agregar(c)}>Agregar ${elegidos.length} ${elegidos.length === 1 ? (T.inv ? 'producto' : 'servicio') : (T.inv ? 'productos' : 'servicios')}</button>` : null
  })} />`;
}

// Pantalla vacía con guía: qué es esto y qué hacer ahora (en lugar de una línea gris).
export function Vacio({ i, t, s, children }) {
  return html`<div class="vacio-guia entra">
    <span class="vacio-ic"><${Icono} n=${i} t=${26} /></span>
    <b>${t}</b>${s && html`<span class="sub">${s}</span>`}
    ${children && html`<div class="chips" style="justify-content:center">${children}</div>`}
  </div>`;
}
// Catálogo vacío: agregar lo típico del rubro, uno a mano o escanearlo.
export function CatalogoVacio({ donde }) {
  const { S, T, abrir, puede } = useApp();
  const pp = puede('productos'), hay = sugeridos(S, T).length, R = rubro(S.negocio.rubro);
  const cosa = T.inv ? 'productos' : 'servicios';
  return html`<${Vacio} i=${T.inv ? 'caja' : 'lista'} t=${'Todavía no tienes ' + cosa} s=${donde === 'vender' ? 'Agrégalos y aquí aparecen para tocar y cobrar.' : 'Empieza con lo típico de ' + (R ? R.n.toLowerCase() : 'tu negocio') + ' y cambia los precios a tu gusto.'}>
    ${pp && hay > 0 && html`<button type="button" class="btn2 lleno toca" onClick=${() => abrir('sugerencias')}><${Icono} n="rayo" t=${15} />Agregar lo típico</button>`}
    ${pp && html`<button type="button" class="btn2 toca" onClick=${() => abrir('producto', T.inv ? {} : { svc: true })}>+ ${T.inv ? 'Producto' : 'Servicio'}</button>`}
    ${pp && T.inv && T.mod('escaner') && html`<button type="button" class="btn2 toca" onClick=${() => abrir('escaner', { para: 'inventario' })}><${Icono} n="escanear" t=${15} />Escanear</button>`}
    ${!pp && html`<span class="sub">Pídele al dueño que los agregue.</span>`}
  </${Vacio}>`;
}
