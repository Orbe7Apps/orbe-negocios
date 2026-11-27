// Registrar días anteriores: pasar a la app lo que el negocio anotó en su cuaderno (ventas, gastos, abonos y fiados).
// Todo entra con la fecha y la tasa de ese día y la marca “Registrado después”; la caja de hoy no se mueve.
// Mueve dinero: no tiene “Deshacer”. Si algo quedó mal, la venta se anula como siempre (queda en el registro de cambios).
import { html, useState } from '../lib/preact-htm.js';
import { useApp, Ctx } from '../ctx.js';
import { inicioDia, diaClave, tasasDelDia, ventaAnterior, gastoAnterior, abonoAnterior, movimientosDelDia, deudores, listaClientes, listaProductos, usaEuro } from '../datos.js';
import { dinero } from '../paises.js';
import { Hoja, Icono, Chips, Interruptor, avisar, iniciales } from '../ui.js';
import { usePagos, useMonto, conSimbolo, numero } from './pagos.js';
import { normal } from '../buscar.js';
import { CampoFecha } from '../elegir.js';

const DIA = 86400000;
const CATS = ['Mercancía', 'Alquiler', 'Servicios', 'Sueldos', 'Transporte', 'Otro'];
const NO_COBRO = ['Fiado', 'Saldo a favor', 'Anticipo', 'Cuotas'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const nombreDia = t => { const d = new Date(t); return SEMANA[d.getDay()] + ' ' + d.getDate(); };
const nombreLargo = t => { const d = new Date(t); return SEMANA[d.getDay()] + ' ' + d.getDate() + ' de ' + MES[d.getMonth()] + '.'; };
const mayus = s => s.charAt(0).toUpperCase() + s.slice(1);

// La hoja: pone en el contexto la tasa del día elegido (para escribir en Bs con la tasa de ese día).
export function Anteriores({ d, cerrar }) {
  const app = useApp();
  const [dia, setDia] = useState(d.dia || 0);
  const [tasaTxt, setTasaTxt] = useState('');
  const t = dia ? tasasDelDia(dia, numero(tasaTxt)) : null;
  const val = t ? Object.assign({}, app, { D: dinero(app.P, t.prin, usaEuro(app.S.negocio) ? t.euro : 0), tasaM: t.tasaM }) : app;
  if (!app.puede('anteriores')) return html`<${Hoja} titulo="Registrar días anteriores" onCerrar=${cerrar} contenido=${() => ({ cuerpo: html`<p class="vacio">Pídele al dueño el permiso “Registrar días anteriores”.</p>` })} />`;
  return html`<${Ctx.Provider} value=${val}><${Registro} d=${d} cerrar=${cerrar} dia=${dia} setDia=${setDia} t=${t} tasaTxt=${tasaTxt} setTasaTxt=${setTasaTxt} /></${Ctx.Provider}>`;
}

function Registro({ d, cerrar, dia, setDia, t, tasaTxt, setTasaTxt }) {
  const { S, P, D, T, tel, puede } = useApp();
  const hoy0 = inicioDia(Date.now());
  const [paso, setPaso] = useState(dia ? 'menu' : 'dia');
  const [otro, setOtro] = useState(false);
  const [verTasa, setVerTasa] = useState(false);
  const [cat, setCat] = useState('Mercancía');
  const [nota, setNota] = useState('');
  const [cli, setCli] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState({});
  const [bajar, setBajar] = useState(false);
  const formas = S.negocio.pays.filter(m => !NO_COBRO.includes(m));
  const mo = useMonto('');
  const deuda = cli ? (deudores().find(x => x.id === cli) || { deuda: 0 }).deuda : 0;
  const fp = usePagos(m => paso === 'abono' && deuda > 0 ? Math.min(mo.total(m), deuda) : mo.total(m), formas, undefined, undefined, mo);
  const fiado = paso === 'fiado', forma = fiado ? null : fp.m;
  const monto = fiado ? mo.total(null) : fp.total;
  const conFiado = T.mod('fiado');
  const nDia = dia ? nombreDia(dia) : '';

  // ---- elegir el día ----
  const ultimos = Array.from({ length: 13 }, (_, i) => hoy0 - (13 - i) * DIA);
  const conAlgo = (() => { const o = {}, desde = hoy0 - 14 * DIA, pon = x => { if (x.t >= desde && x.t < hoy0) o[diaClave(x.t)] = 1; }; S.ventas.forEach(pon); S.gastos.forEach(pon); S.abonos.forEach(pon); return o; })();
  const elegir = x => { setDia(inicioDia(x)); setTasaTxt(''); setVerTasa(false); };
  const ayer = hoy0 - DIA, antier = hoy0 - 2 * DIA;
  const cualChip = !dia ? '' : otro ? 'otro' : dia === ayer ? 'ayer' : dia === antier ? 'antier' : '';
  const f2 = x => new Intl.NumberFormat(P.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
  const FilaTasa = () => D.dual && t ? html`<div class="tarjeta fila" style="box-shadow:none;background:var(--fill);gap:10px;padding:10px 14px" data-guia="ant-tasa">
      <span class="crece" style="display:flex;flex-direction:column;gap:1px"><span class="sub">Tasa ${P.id === 'VE' ? 'BCV ' : ''}del ${nDia}${t.guardada || numero(tasaTxt) > 0 ? '' : ' (no estaba guardada, revisa)'}</span><b class="num" style="font-size:15px">${P.id === 'VE' ? 'Bs ' : ''}${f2(t.prin)}</b></span>
      <button type="button" class="btn2 chico acento toca" onClick=${() => setVerTasa(!verTasa)}>${verTasa ? 'Listo' : 'Cambiar'}</button></div>
    ${verTasa && html`<label class="campo entra"><span>Tasa de ese día</span><input class="num" type="text" inputmode="decimal" autocomplete="off" placeholder=${f2(t.prin)} value=${tasaTxt} onInput=${e => setTasaTxt(e.target.value)} /></label>`}` : null;

  // ---- lo que ya hay ese día ----
  const md = dia ? movimientosDelDia(dia) : null;
  const sumaV = md ? md.ventas.reduce((a, v) => a + v.total, 0) : 0, sumaG = md ? md.gastos.reduce((a, g) => a + g.v, 0) : 0, sumaA = md ? md.abonos.reduce((a, x) => a + x.v, 0) : 0;
  const nombreCli = id => ((S.clientes.find(c => c.id === id) || {}).n || '');
  const filasDia = md ? [].concat(
    md.ventas.map(v => ({ t: v.t, k: v.id, i: v.fiado ? 'reloj' : 'carrito', c: v.fiado ? 't-amb' : 't-ver', n: v.nota || (v.fiado ? 'Fiado a ' + nombreCli(v.cli) : '#' + v.n + ' · ' + v.items.map(it => it.n).join(', ')), s: v.pagos.map(p => p.m).join(' + '), v: D.m(v.total), cl: v.fiado ? 'amber' : '', ant: v.ant })),
    md.gastos.map(g => ({ t: g.t, k: g.id, i: 'billete', c: 't-ros', n: g.n, s: g.m, v: '−' + D.m(g.v), cl: 'out', ant: g.ant })),
    md.abonos.map(a => ({ t: a.t, k: a.id, i: 'check', c: 't-vio', n: 'Abono de ' + (nombreCli(a.cli) || 'un cliente'), s: a.m, v: D.m(a.v), cl: '', ant: a.ant }))
  ).sort((a, b) => a.t - b.t) : [];

  // ---- guardar ----
  const limpiar = () => { mo.poner(0, forma); fp.setVarias(false); setNota(''); setCli(''); setItems({}); setQ(''); setBajar(false); };
  const listo = txt => { avisar(txt + ' en el ' + nDia); limpiar(); setPaso('menu'); };
  const prods = listaProductos();
  const lineas = Object.keys(items).filter(k => items[k] > 0).map(k => { const p = prods.find(x => x.id === k) || {}; return { pid: k, n: p.n, q: items[k], p: p.p || 0, c: p.c || 0 }; });
  const sumaProd = lineas.reduce((a, it) => a + it.q * it.p, 0);
  const guardar = () => {
    if (!(monto > 0)) { avisar('Escribe el monto'); return; }
    if (!fiado && !fp.ok) { avisar('Falta repartir ' + D.m(fp.falta)); return; }
    if ((paso === 'abono' || fiado) && !cli) { avisar('Elige el cliente'); return; }
    const tasa = t.prin;
    if (paso === 'venta' || fiado) {
      const v = ventaAnterior({ dia, items: lineas, pagos: fiado ? [{ m: 'Fiado', v: monto }] : fp.pagos(), cli, fiado, nota: nota.trim(), bajar, tasa, tasaEur: t.euro });
      if (v) listo(fiado ? 'Fiado registrado' : 'Venta registrada'); return;
    }
    if (paso === 'gasto') {
      const pagos = fp.pagos(), orig = mo.original(forma);
      const g = gastoAnterior(dia, Object.assign({ n: nota.trim() || cat, cat, v: monto, m: pagos[0].m, pagos }, orig ? { otra: orig.otra, tasa: orig.tasa } : {}), tasa);
      if (g) listo('Gasto registrado'); return;
    }
    if (paso === 'abono') { if (abonoAnterior(dia, cli, fp.pagos(), tasa)) listo('Abono registrado'); }
  };

  // ---- elegir cliente ----
  const ElegirCliente = (lista, vacio) => {
    const qn = normal(q), vis = lista.filter(c => !qn || normal(c.n + ' ' + (c.doc || '')).includes(qn)).slice(0, 8);
    const elegido = lista.find(c => c.id === cli);
    if (elegido) return html`<div class="tarjeta fila entra" style="box-shadow:none;background:var(--fill);gap:10px;padding:10px 14px"><span class="logo redondo t-vio" style="width:34px;height:34px;font-size:12px">${iniciales(elegido.n)}</span><span class="crece" style="display:flex;flex-direction:column"><b style="font-size:14px">${elegido.n}</b>${elegido.deuda > 0 && html`<span class="sub amber num">Debe ${D.m(elegido.deuda)}</span>`}</span><button type="button" class="btn2 chico toca" onClick=${() => setCli('')}>Cambiar</button></div>`;
    if (!lista.length) return html`<p class="vacio">${vacio}</p>`;
    return html`<div class="campo"><span>¿Quién?</span>
      ${lista.length > 6 && html`<input type="search" placeholder="Buscar cliente" value=${q} onInput=${e => setQ(e.target.value)} />`}
      <div class="lista">${vis.map((c, i) => html`<button type="button" key=${c.id} class="item toca entra" style=${{ '--i': i, color: 'var(--ink)' }} onClick=${() => { setCli(c.id); setQ(''); }}>
        <span class="logo redondo t-vio" style="width:34px;height:34px;font-size:12px">${iniciales(c.n)}</span><span class="crece corta" style="font-size:14px">${c.n}</span>${c.deuda > 0 && html`<b class="num amber" style="font-size:13px">${D.m(c.deuda)}</b>`}</button>`)}</div></div>`;
  };

  // ---- pasos ----
  const titulo = paso === 'dia' ? 'Registrar días anteriores' : paso === 'menu' ? mayus(nombreLargo(dia)) : paso === 'venta' ? 'Venta del ' + nDia : paso === 'gasto' ? 'Gasto del ' + nDia : paso === 'abono' ? 'Abono del ' + nDia : paso === 'fiado' ? 'Fiado del ' + nDia : 'Qué se vendió';
  let cuerpo, pie;
  if (paso === 'dia') {
    cuerpo = html`<div class="pila entra" key="dia" style="gap:14px">
      <b style="font-size:18px;letter-spacing:-.01em">¿De qué día es?</b>
      <${Chips} opciones=${[{ v: 'ayer', n: 'Ayer' }, { v: 'antier', n: 'Antier' }, { v: 'otro', n: 'Otro día' }]} valor=${cualChip} onCambio=${v => { setOtro(v === 'otro'); if (v === 'ayer') elegir(ayer); if (v === 'antier') elegir(antier); }} />
      ${otro ? html`<div class="entra"><${CampoFecha} etiqueta="Fecha" titulo="¿De qué día es?" valor=${dia} hasta=${ayer} vacio="Elegir el día" onCambio=${x => x && elegir(x)} /></div>`
        : html`<div class="dias-ant" data-guia="ant-dias">${ultimos.slice(0, 7).map(x => html`<span key=${'s' + x} class="dias-ant-s">${'DLMMJVS'[new Date(x).getDay()]}</span>`)}
          ${ultimos.map(x => html`<button type="button" key=${x} class=${'dias-ant-d toca' + (dia === x ? ' on' : '')} aria-label=${nombreLargo(x)} onClick=${() => { setOtro(false); elegir(x); }}>${new Date(x).getDate()}${conAlgo[diaClave(x)] ? html`<i></i>` : null}</button>`)}
          <span class="dias-ant-d hoy">hoy</span></div>`}
      ${dia ? html`${FilaTasa()}<span class="sub fila" style="gap:8px;align-items:flex-start"><${Icono} n="check" t=${15} g=${2.4} c="var(--in)" />Lo que registres queda con fecha del ${nDia}. La caja de hoy no se mueve.</span>` : null}
    </div>`;
    pie = html`<button type="button" class=${'btn toca' + (dia ? '' : ' apagado')} onClick=${() => dia ? setPaso('menu') : avisar('Elige el día')}>${dia ? 'Seguir con el ' + nDia : 'Elige el día'}</button>`;
  } else if (paso === 'menu') {
    const B = (k, i, c, n, s) => html`<button type="button" class="tarjeta toca ant-boton" data-guia=${'ant-' + k} onClick=${() => { limpiar(); setPaso(k); }}><span class=${'ic ' + c}><${Icono} n=${i} t=${18} g=${2.2} /></span><b>${n}</b><span class="sub">${s}</span></button>`;
    cuerpo = html`<div class="pila entra" key="menu" style="gap:14px">
      ${FilaTasa()}
      ${md.cierre && html`<span class="sub fila" style="gap:8px;align-items:flex-start"><${Icono} n="info" t=${15} c="var(--amber)" />Ese día ya tiene su cierre Z. Lo que registres se suma a los reportes, pero no cambia ese cierre.</span>`}
      ${filasDia.length > 0 && html`<div class="rejilla-3 ant-res"><div><span class="sub">Ventas</span><b class="num in">${D.m(sumaV)}</b></div><div><span class="sub">Gastos</span><b class="num out">${D.m(sumaG)}</b></div><div><span class="sub">Abonos</span><b class="num">${D.m(sumaA)}</b></div></div>`}
      <b style="font-size:18px;letter-spacing:-.01em">¿Qué vas a registrar?</b>
      <div class="rejilla-2" style="gap:10px">
        ${B('venta', 'carrito', 't-ver', 'Venta', 'Una venta o el total del día')}
        ${B('gasto', 'billete', 't-ros', 'Gasto', 'Lo que pagaste ese día')}
        ${conFiado && B('abono', 'check', 't-vio', 'Abono', 'Un cliente te pagó lo que debía')}
        ${conFiado && puede('fiado') && B('fiado', 'reloj', 't-amb', 'Fiado', 'Le fiaste a un cliente')}
      </div>
      ${filasDia.length > 0 && html`<div class="campo"><span>Lo que hay ese día</span><div class="lista">${filasDia.map((x, i) => html`<div class="item entra" key=${x.k} style=${{ '--i': i }}>
        <span class=${'ic ' + x.c} style="width:34px;height:34px"><${Icono} n=${x.i} t=${16} g=${2.2} /></span>
        <span class="crece" style="display:flex;flex-direction:column;gap:1px;min-width:0"><b class="corta" style="font-size:14px;font-weight:600">${x.n}</b><span class="sub faint corta">${x.s}${x.ant ? ' · registrado después' : ''}</span></span>
        <b class=${'num ' + x.cl} style="font-size:14px">${x.v}</b></div>`)}</div></div>`}
    </div>`;
    pie = html`<button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => setPaso('dia')}>Cambiar de día</button>`;
  } else if (paso === 'productos') {
    const qn = normal(q), vis = prods.filter(p => !p.per && (!qn || normal(p.n).includes(qn))).slice(0, 30);
    const inv = prods.some(p => p.q != null);
    const pon = (k, n) => setItems(Object.assign({}, items, { [k]: Math.max(0, n) }));
    cuerpo = html`<div class="pila entra" key="prods" style="gap:12px">
      <input type="search" placeholder="Buscar producto" value=${q} onInput=${e => setQ(e.target.value)} />
      <div class="lista">${vis.map((p, i) => { const n = items[p.id] || 0; return html`<div class="item entra" key=${p.id} style=${{ '--i': i }}>
        <span class="crece" style="display:flex;flex-direction:column;gap:1px;min-width:0"><b class="corta" style="font-size:14px;font-weight:600">${p.n}</b><span class="sub faint num">${D.m(p.p)} c/u</span></span>
        ${n > 0 && html`<button type="button" class="icono-btn chico toca" aria-label=${'Uno menos de ' + p.n} onClick=${() => pon(p.id, n - 1)}><${Icono} n="menos1" t=${14} g=${2.6} /></button><b class="num" style="min-width:22px;text-align:center">${n}</b>`}
        <button type="button" class="icono-btn chico toca" style="background:var(--accent-soft);color:var(--accent)" aria-label=${'Uno más de ' + p.n} onClick=${() => pon(p.id, n + 1)}><${Icono} n="mas1" t=${14} g=${2.6} /></button></div>`; })}</div>
      ${inv && html`<${Interruptor} on=${bajar} onCambio=${setBajar} titulo="Bajar del inventario" sub="Apágalo si ya contaste el inventario después" />`}
      ${lineas.length > 0 && monto > 0 && Math.abs(sumaProd - monto) > 0.004 && html`<span class="sub fila" style="gap:8px;align-items:flex-start"><${Icono} n="info" t=${15} c="var(--amber)" />${sumaProd < monto ? 'Productos: ' + D.m(sumaProd) + '. Cobraste ' + D.m(monto) + '. La diferencia queda como “Otros”.' : 'Productos: ' + D.m(sumaProd) + ', más de lo que cobraste (' + D.m(monto) + '). Se guarda lo que cobraste.'}</span>`}
    </div>`;
    pie = html`<button type="button" class="btn toca" onClick=${() => { setQ(''); setPaso('venta'); }}>Listo</button>`;
  } else {
    const nProd = lineas.reduce((a, it) => a + it.q, 0);
    cuerpo = html`<div class="pila entra" key=${paso} style="gap:14px">
      ${(paso === 'abono' || fiado) && ElegirCliente(paso === 'abono' ? deudores().filter(c => c.deuda > 0.004) : listaClientes(), paso === 'abono' ? 'Nadie te debe ahora mismo.' : 'Primero agrega el cliente en Clientes.')}
      ${(paso !== 'abono' && !fiado) || cli ? html`
        ${mo.campo(forma, { titulo: paso === 'venta' ? '¿Cuánto entró?' : paso === 'gasto' ? '¿Cuánto pagaste?' : paso === 'abono' ? '¿Cuánto pagó?' : '¿Cuánto le fiaste?' })}
        ${paso === 'venta' && html`<span class="sub" style="margin-top:-8px">Puede ser una venta o el total del día.</span>`}
        ${paso === 'abono' && deuda > 0 && mo.total(forma) > deuda + 0.004 && html`<span class="sub amber">Debe ${D.m(deuda)}: se registra ese monto.</span>`}
        ${paso === 'gasto' && html`<div class="campo"><span>¿En qué?</span><${Chips} opciones=${conSimbolo(CATS)} valor=${cat} onCambio=${setCat} /></div>`}
        ${!fiado && fp.vista({ titulo: paso === 'gasto' ? '¿Cómo lo pagaste?' : '¿Cómo te pagaron?', desliza: tel })}
        ${paso === 'venta' && prods.length > 0 && html`<button type="button" class="opcion toca" onClick=${() => { setQ(''); setPaso('productos'); }}>
          <span style="flex:1;display:flex;flex-direction:column;gap:2px;text-align:left"><b style="font-size:14px;font-weight:600">Qué se vendió</b><span class="sub">${nProd ? nProd + (nProd === 1 ? ' producto' : ' productos') + ' · ' + D.m(sumaProd) + (bajar ? ' · baja del inventario' : '') : 'Opcional'}</span></span><${Icono} n="sig" t=${16} c="var(--faint)" /></button>`}
        ${paso !== 'abono' && html`<label class="campo"><span>Nota (opcional)</span><input type="text" placeholder=${paso === 'venta' ? 'Ej.: ventas de la mañana' : paso === 'gasto' ? cat : 'Qué se llevó'} value=${nota} onInput=${e => setNota(e.target.value)} /></label>`}` : null}
    </div>`;
    const nombreBoton = { venta: 'Registrar venta', gasto: 'Registrar gasto', abono: 'Registrar abono', fiado: 'Registrar fiado' }[paso];
    cuerpo = html`${cuerpo}${monto > 0 && html`<div class="fila num entra" style="justify-content:space-between;font-size:14px"><span class="muted">${D.dual ? (P.id === 'VE' ? 'Total con tasa BCV ' : 'Total con tasa ') + f2(t.prin) : 'Total'}</span><b style="font-size:18px">${D.m(monto)}</b></div>`}`;
    pie = html`<button type="button" class=${'btn toca' + (monto > 0 ? '' : ' apagado')} onClick=${guardar}>${nombreBoton}</button>
      <button type="button" class="btn2 toca" style="min-height:46px;border-radius:23px" onClick=${() => setPaso('menu')}>Volver</button>`;
  }
  return html`<${Hoja} titulo=${titulo} onCerrar=${cerrar} contenido=${() => ({ cuerpo, pie })} />`;
}
