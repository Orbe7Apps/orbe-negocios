// Cuotas y apartados: opciones al cobrar, la lista de planes, el detalle de cada uno, los abonos
// y qué hacer cuando un apartado vence sin completarse (Orbe nunca libera nada solo: pregunta).
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { vender, crearPlanCuotas, crearApartado, abonarPlan, cuentaPlan, numeroPlan, FRECUENCIAS, ACUERDOS_APARTADO, calendarioCuotas, entregarApartado, liberarApartado, apartadoACuotas, masTiempoApartado, posponerApartado, recordadoPlan, abonosDePlan, pagosDeAbono } from '../datos.js';
import { Hoja, Icono, avisar } from '../ui.js';
import { usePagos, useMonto, numero } from './pagos.js';
import { enlaceWA } from '../ordenpdf.js';
import { buscar } from '../buscar.js';
import { BotonAyuda } from '../ayuda.js';
import { Frase, BotonGuiame } from '../guias.js';
import { esc, imgSegura } from '../seguro.js';

export const CUOTAS_M = 'En cuotas', APARTADO_M = 'Apartado';
const DIA = 86400000;
const fCorta = t => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '');
const fLarga = t => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'long' });
const primero = s => String(s || '').trim().split(' ')[0];
const queEs = p => p.items.filter(it => !it.cargo).map(it => (it.q !== 1 ? it.q + ' × ' : '') + it.n).join(', ');

// Estado de un plan en palabras, con su color.
export function estadoTxt(p, c) {
  if (p.estado !== 'abierto') return { pagado: ['Pagado', 't-ver'], entregado: ['Entregado', 't-vio'], liberado: ['Liberado', 't-gris'], anulado: ['Anulado', 't-ros'] }[p.estado] || [p.estado, 't-gris'];
  if (p.tipo === 'apartado') return c.vencido ? ['Venció', 't-ros'] : c.completo ? ['Listo para entregar', 't-ver'] : ['Apartado · ' + c.diasQuedan + (c.diasQuedan === 1 ? ' día' : ' días'), 't-vio'];
  if (c.atrasado > 0.004) return ['Atrasada ' + c.diasAtraso + (c.diasAtraso === 1 ? ' día' : ' días'), 't-ros'];
  if (c.proxima && c.proxima.f < Date.now() + DIA) return ['Cuota hoy', 't-amb'];
  return ['Al día', 't-ver'];
}

// Mensajes de WhatsApp: recordatorio y comprobante de cada abono.
export function mensajePlan(p, c, { S, D }) {
  const cli = S.clientes.find(x => x.id === p.cli) || {}, n = S.negocio;
  const hola = 'Hola ' + primero(cli.n) + ' 👋, te escribimos de ' + n.nombre + '.\n\n', pagar = 'Puedes pagar por ' + n.pays.slice(0, 2).join(' o ') + ' o en la tienda. ¡Gracias!';
  if (p.tipo === 'apartado') return hola + (c.vencido ? 'Tu apartado de ' + queEs(p) + ' venció el ' + fLarga(p.vence) + '. Llevas ' + D.m(c.pagado) + ' de ' + D.m(p.total) + ' (faltan ' + D.m(c.falta) + '). ¿Quieres completar el pago o necesitas más tiempo?'
    : 'Te recordamos tu apartado de ' + queEs(p) + ': llevas ' + D.m(c.pagado) + ' de ' + D.m(p.total) + ' y faltan ' + D.m(c.falta) + '. Te lo guardamos hasta el ' + fLarga(p.vence) + '. ' + pagar);
  const atr = c.atrasado > 0.004, prox = c.proxima;
  return hola + (atr ? 'Te recordamos que tienes ' + D.m(c.atrasado) + ' atrasado de tu ' + queEs(p) + '.'
    : prox ? 'Te recordamos la cuota ' + (prox.i + 1) + ' de ' + p.cuotas.length + ' de tu ' + queEs(p) + ': ' + D.m(prox.queda) + ', vence el ' + fLarga(prox.f) + '.' : 'Tu plan de ' + queEs(p) + ' está al día.')
    + '\n\nLlevas pagado ' + D.m(c.pagado) + ' de ' + D.m(p.total) + '. ' + pagar;
}
export function mensajeAbono(p, c, v, { S, D }) {
  const cli = S.clientes.find(x => x.id === p.cli) || {};
  return 'Hola ' + primero(cli.n) + ', recibimos ' + D.m(v) + ' de tu ' + (p.tipo === 'apartado' ? 'apartado' : 'plan de cuotas') + ' ' + numeroPlan(p) + ' (' + queEs(p) + ').\n\n'
    + (c.completo ? (p.tipo === 'apartado' ? '¡Completaste el pago! Ya puedes retirarlo.' : '¡Terminaste de pagar! Gracias por tu confianza.')
      : 'Llevas ' + D.m(c.pagado) + ' de ' + D.m(p.total) + '. Faltan ' + D.m(c.falta) + (c.proxima ? ' · próxima cuota: ' + fLarga(c.proxima.f) : '') + '.')
    + '\n\nComprobante no fiscal · ' + S.negocio.nombre;
}

// ---------- al cobrar: opciones de cuotas o de apartado ----------
export function OpcionesPlan({ tipo, monto, op, setOp, total, onInicial }) {
  const { D } = useApp();
  const pon = o => setOp(Object.assign({}, op, o));
  // “Inicial hoy”: lo que paga ahora (se cobra con la forma de pago de siempre) y el resto va a cuotas o al apartado.
  const ini = total ? D.redondo(total - monto) : 0, pctIni = total ? Math.round(ini / total * 100) : 0;
  const Inicial = onInicial ? html`<div class="campo"><span>${tipo === 'apartado' ? 'Abono inicial hoy' : 'Inicial hoy'}${ini > 0 ? ': ' + D.m(ini) : ''}</span><div class="chips">${[0, 10, 20, 30, 50].map(x => html`<button type="button" key=${x} class=${'chip chico toca' + (Math.abs(pctIni - x) < 1 ? ' on' : '')} onClick=${() => onInicial(x)}>${x ? x + ' %' : 'Sin inicial'}</button>`)}</div>${ini > 0 ? html`<span class="sub faint">Puedes cambiar el monto y la forma de pago arriba.</span>` : null}</div>` : null;
  if (tipo === 'apartado') return html`<div class="tarjeta pila entra" style="box-shadow:none;background:var(--accent-soft);gap:12px">
    ${Inicial}
    <div class="campo"><span>¿Cuántos días se lo guardas?</span><div class="chips">${[15, 30, 45, 60].map(x => html`<button type="button" key=${x} class=${'chip chico toca' + (op.dias === x ? ' on' : '')} onClick=${() => pon({ dias: x })}>${x} días</button>`)}</div></div>
    <div class="campo"><span>Si no completa el pago a tiempo, lo abonado…</span><div class="chips">${ACUERDOS_APARTADO.map(a => html`<button type="button" key=${a.k} class=${'chip chico toca' + (op.acuerdo === a.k ? ' on' : '')} onClick=${() => pon({ acuerdo: a.k })}>${a.corto}</button>`)}</div></div>
    <span class="sub" style="line-height:1.45">Queda separado del inventario hasta el <b>${fLarga(Date.now() + op.dias * DIA)}</b>. Faltan <b>${D.m(monto)}</b>: los abona cuando pueda. Esto sale en el acuerdo que firma.</span>
  </div>`;
  const pct = Math.max(0, numero(op.rec) || 0), recargo = D.redondo(monto * pct / 100), fin = D.redondo(monto + recargo);
  const cal = calendarioCuotas(fin, op.n, op.cada), iguales = cal.every(x => Math.abs(x.v - cal[0].v) < 0.02);
  return html`<div class="tarjeta pila entra" style="box-shadow:none;background:var(--accent-soft);gap:12px">
    ${Inicial}
    <div class="campo"><span>¿En cuántas cuotas?</span><div class="chips">${[2, 3, 4, 6, 8, 12].map(x => html`<button type="button" key=${x} class=${'chip chico toca' + (op.n === x ? ' on' : '')} onClick=${() => pon({ n: x })}>${x}</button>`)}</div></div>
    <div class="segmento" style="width:100%">${FRECUENCIAS.map(f => html`<button type="button" key=${f.k} style="flex:1" class=${op.cada === f.k ? 'on' : ''} onClick=${() => pon({ cada: f.k })}>${f.n}</button>`)}</div>
    <label class="campo"><span>Recargo por financiar (opcional)</span><span class="fila" style="gap:8px"><input type="text" inputmode="decimal" value=${op.rec} placeholder="0" style="max-width:110px" onInput=${e => pon({ rec: e.target.value })} /><b>%</b>${recargo > 0 ? html`<span class="sub num">+ ${D.m(recargo)}</span>` : null}</span></label>
    <div class="pila" style="gap:4px;font-size:14px">
      <div class="fila" style="justify-content:space-between"><span class="sub">${op.n} cuotas de</span><b class="num">${D.m(cal[0].v)}${iguales ? '' : ' aprox.'}</b></div>
      <div class="fila" style="justify-content:space-between"><span class="sub">Primera</span><b>${fCorta(cal[0].f)}</b></div>
      <div class="fila" style="justify-content:space-between"><span class="sub">Última</span><b>${fCorta(cal[cal.length - 1].f)}</b></div>
      ${recargo > 0 && html`<div class="fila" style="justify-content:space-between"><span class="sub">Total a cuotas</span><b class="num">${D.m(fin)}</b></div>`}
    </div>
  </div>`;
}
// Hace la venta a cuotas (o el apartado) con lo que se eligió al cobrar.
export function planDesdeCobro({ d, partes, cli, suc, op, total, D, igtf }) {
  const items = d.items.map(it => Object.assign({}, it));
  if (partes.some(p => p.m === CUOTAS_M)) {
    const financiado = D.redondo(partes.reduce((a, p) => a + (p.m === CUOTAS_M ? p.v : 0), 0));
    const pct = Math.max(0, numero(op.rec) || 0), recargo = D.redondo(financiado * pct / 100);
    if (recargo > 0) items.push({ n: 'Recargo por financiar (' + pct + ' %)', q: 1, p: recargo, c: 0, cargo: true });
    const pagos = partes.map(p => p.m === CUOTAS_M ? { m: 'Cuotas', v: D.redondo(p.v + recargo) } : p);
    const venta = vender({ items, pagos, cli, suc, total: D.redondo(total + recargo), igtf });
    if (d.tt) { venta.imp = d.tt.imp; venta.impTxt = d.tt.txt; }
    const plan = crearPlanCuotas(venta, { inicial: D.redondo(total - financiado), financiado: D.redondo(financiado + recargo), n: op.n, cada: op.cada, recargo, recargoPct: pct });
    return { venta, plan };
  }
  const pagos = partes.filter(p => p.m !== APARTADO_M && p.v > 0);
  return { plan: crearApartado({ items, cli, suc, total, pagos, dias: op.dias, acuerdo: op.acuerdo }) };
}

// ---------- sección: todos los planes ----------
export function Cuotas() {
  const { S, D, abrir, tel } = useApp();
  const [filtro, setFiltro] = useState('abiertos'), [q, setQ] = useState('');
  const ahora = Date.now(), planes = (S.planes || []).slice().reverse();
  const cuentas = new Map(planes.map(p => [p.id, cuentaPlan(p, ahora)])), cu = p => cuentas.get(p.id);
  const abiertos = planes.filter(p => p.estado === 'abierto');
  const atrasados = abiertos.filter(p => cu(p).atrasado > 0.004 || cu(p).vencido);
  const semana = abiertos.filter(p => p.tipo === 'apartado' ? p.vence < ahora + 7 * DIA : cu(p).proxima && cu(p).proxima.f < ahora + 7 * DIA);
  const porCobrar = abiertos.reduce((a, p) => a + cu(p).falta, 0), atrasado = abiertos.reduce((a, p) => a + cu(p).atrasado + (cu(p).vencido ? cu(p).falta : 0), 0);
  const FIL = [['abiertos', 'Todos', abiertos], ['semana', 'Esta semana', semana], ['atrasados', 'Atrasados', atrasados], ['apartados', 'Apartados', abiertos.filter(p => p.tipo === 'apartado')], ['cerrados', 'Terminados', planes.filter(p => p.estado !== 'abierto')]];
  const base = (FIL.find(f => f[0] === filtro) || FIL[0])[2];
  const nombre = p => (S.clientes.find(c => c.id === p.cli) || {}).n || 'Cliente';
  const lista = q.trim() ? buscar(base, q, p => [nombre(p), numeroPlan(p), queEs(p)], true) : base;
  return html`<div class="pila" style="gap:14px">
    <div class="fila entra"><h1 class="titulo crece">Cuotas</h1><${BotonGuiame} k="cuotas" /><${BotonAyuda} /></div>
    <${Frase}>${!planes.length ? 'Aquí verás las ventas en cuotas y los apartados. Se crean al cobrar.'
      : atrasados.length ? html`<b class="r">${atrasados.length === 1 ? '1 cliente atrasado' : atrasados.length + ' clientes atrasados'}</b> por <b class="num">${D.m(atrasado)}</b>.${semana.length ? html` Esta semana te toca cobrar a <b>${semana.length}</b>.` : ''}`
      : abiertos.length ? html`Te falta cobrar <b class="num">${D.m(porCobrar)}</b> en ${abiertos.length} ${abiertos.length === 1 ? 'plan' : 'planes'}. Nadie está atrasado.${semana.length ? html` Esta semana: <b>${semana.length}</b>.` : ''}`
      : 'Todos los planes están pagados.'}</${Frase}>
    <div class="rejilla-2" data-tour="cuotas" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="tarjeta pila" style="gap:2px"><span class="sub">Por cobrar</span><b class="num" style="font-size:24px">${D.m(porCobrar)}</b><span class="sub faint">${abiertos.length} ${abiertos.length === 1 ? 'plan abierto' : 'planes abiertos'}</span></div>
      <div class="tarjeta pila" style="gap:2px"><span class="sub">Atrasado</span><b class="num" style=${{ fontSize: '24px', color: atrasado > 0.004 ? 'var(--out)' : 'var(--ink)' }}>${D.m(atrasado)}</b><span class="sub faint">${atrasados.length} ${atrasados.length === 1 ? 'cliente' : 'clientes'}</span></div>
    </div>
    ${planes.length > 3 && html`<label class="buscador"><${Icono} n="buscar" t=${18} /><input type="search" value=${q} placeholder="Buscar cliente o producto" onInput=${e => setQ(e.target.value)} /></label>`}
    <div data-guia="filtros" class=${'chips' + (tel ? ' desliza' : '')}>${FIL.map(f => html`<button type="button" key=${f[0]} class=${'chip chico toca' + (filtro === f[0] ? ' on' : '')} onClick=${() => setFiltro(f[0])}>${f[1]}${f[2].length ? ' ' + f[2].length : ''}</button>`)}</div>
    ${lista.length ? html`<div class="pila" style="gap:10px">${lista.map((p, i) => { const c = cu(p), e = estadoTxt(p, c), pct = Math.min(100, Math.round(c.pagado / (p.total || 1) * 100)), rojo = e[1] === 't-ros';
      return html`<button type="button" key=${p.id} data-guia="plan" class="tarjeta pila toca entra" style=${{ '--i': Math.min(i, 8), gap: '4px', textAlign: 'left', color: 'var(--ink)', border: 0, font: 'inherit' }} onClick=${() => abrir('plan', { pid: p.id })}>
        <span class="fila" style="justify-content:space-between;gap:8px"><b class="corta">${nombre(p)}</b><span class=${'pildora ' + e[1]}>${e[0]}</span></span>
        <span class="sub corta">${numeroPlan(p)} · ${queEs(p)}</span>
        <span style="height:6px;border-radius:6px;background:var(--fill);overflow:hidden;margin-top:4px"><i style=${{ display: 'block', height: '100%', width: pct + '%', borderRadius: '6px', background: rojo ? 'var(--out)' : p.tipo === 'apartado' ? 'var(--accent)' : 'var(--in)' }}></i></span>
        <span class="fila sub faint num" style="justify-content:space-between;font-size:12px"><span>${D.m(c.pagado)} de ${D.m(p.total)}</span><span>${p.estado !== 'abierto' ? fCorta(p.t) : p.tipo === 'apartado' ? 'Falta ' + D.m(c.falta) : c.atrasado > 0.004 ? 'Debe ' + D.m(c.atrasado) : c.proxima ? 'Próxima: ' + fCorta(c.proxima.f) + ' · ' + D.m(c.proxima.queda) : ''}</span></span>
      </button>`; })}</div>`
    : html`<div class="tarjeta pila" style="align-items:center;text-align:center;gap:8px;padding:26px 18px">
        <span class="ic t-vio" style="width:48px;height:48px;border-radius:16px"><${Icono} n="calendario" t=${22} /></span>
        <b>${planes.length ? 'Nada por aquí' : 'Todavía no hay cuotas ni apartados'}</b>
        <span class="sub" style="line-height:1.5;max-width:320px">${planes.length ? 'Prueba con otro filtro.' : 'Al cobrar una venta, elige “En cuotas” para que se lleve el producto y pague en partes, o “Apartado” para guardárselo hasta que termine de pagar.'}</span></div>`}
  </div>`;
}

// ---------- hoja: el detalle de un plan ----------
export function Plan({ d, cerrar }) {
  const { S, P, D, abrir, puede } = useApp();
  const p = (S.planes || []).find(x => x.id === d.pid);
  if (!p) return null;
  const c = cuentaPlan(p), cli = S.clientes.find(x => x.id === p.cli) || {}, e = estadoTxt(p, c), ctx = { S, D, P };
  const ab = abonosDePlan(p.id).slice().reverse();
  const abierto = p.estado === 'abierto', apartado = p.tipo === 'apartado';
  const wa = texto => { if (!cli.tel) { avisar('Este cliente no tiene teléfono'); return false; } window.open(enlaceWA(cli.tel, texto, P.id), '_blank', 'noopener'); return true; };
  const recordar = () => { if (wa(mensajePlan(p, c, ctx))) recordadoPlan(p.id); };
  const entregar = cc => { const v = entregarApartado(p.id); if (v) cc(() => { avisar('Entregado: ya es la venta #' + v.n); abrir('recibo', { venta: v, nueva: true }); }); };
  const pct = Math.min(100, Math.round(c.pagado / (p.total || 1) * 100));
  return html`<${Hoja} titulo=${(apartado ? 'Apartado ' : 'Cuotas ') + numeroPlan(p)} onCerrar=${cerrar} contenido=${cc => ({
    cuerpo: html`
      ${d.nuevo && html`<div class="tarjeta fila entra" style="box-shadow:none;background:var(--in-soft);gap:10px"><${Icono} n="check" t=${18} c="var(--in-text)" /><span class="sub" style="color:var(--ink);line-height:1.4">${apartado ? 'Listo: quedó apartado y separado del inventario.' : 'Listo: plan de cuotas creado.'} Imprime el acuerdo para que lo firme.</span></div>`}
      ${d.recibo > 0 && cli.tel && html`<button type="button" class="tarjeta fila toca entra" style="box-shadow:none;background:var(--in-soft);gap:10px;border:0;font:inherit;text-align:left;color:var(--ink)" onClick=${() => wa(mensajeAbono(p, c, d.recibo, ctx))}><${Icono} n="movil" t=${18} c="var(--in-text)" /><span class="crece sub" style="color:var(--ink)">Mandarle el comprobante del abono por WhatsApp</span><b style="color:var(--in-text)">Enviar</b></button>`}
      <div class="fila" style="gap:12px"><span class="logo redondo t-vio" style="width:44px;height:44px;font-size:15px">${(cli.n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span>
        <span class="crece" style="display:flex;flex-direction:column;min-width:0"><b style="font-size:16px">${cli.n || 'Cliente'}</b><span class="sub corta">${queEs(p)}</span></span><span class=${'pildora ' + e[1]}>${e[0]}</span></div>
      <div class="tarjeta pila" style="box-shadow:none;background:var(--fill2);gap:6px">
        <div class="fila" style="justify-content:space-between"><span class="sub">${apartado ? 'Abonado' : 'Pagado'}</span><b class="num">${D.m(c.pagado)} de ${D.m(p.total)}</b></div>
        <span style="height:8px;border-radius:8px;background:var(--fill);overflow:hidden"><i style=${{ display: 'block', height: '100%', width: pct + '%', background: e[1] === 't-ros' ? 'var(--out)' : apartado ? 'var(--accent)' : 'var(--in)', borderRadius: '8px', transition: 'width .5s var(--spring)' }}></i></span>
        <div class="fila" style="justify-content:space-between"><span class="sub">${c.falta > 0.004 ? 'Falta' : 'Completo'}</span>${c.falta > 0.004 && html`<b class="num" style=${{ color: c.atrasado > 0.004 || c.vencido ? 'var(--out-text)' : 'var(--ink)' }}>${D.m(c.falta)}${c.atrasado > 0.004 ? ' · ' + D.m(c.atrasado) + ' atrasado' : ''}</b>`}</div>
        ${p.recargo > 0 && html`<span class="sub faint">Incluye recargo por financiar de ${D.m(p.recargo)} (${p.recargoPct} %)</span>`}
      </div>
      ${apartado && abierto && html`<div class="tarjeta pila" style=${{ boxShadow: 'none', background: c.vencido ? 'var(--out-soft)' : 'var(--accent-soft)', gap: '4px' }}>
        <b style=${{ color: c.vencido ? 'var(--out-text)' : 'var(--accent-text)' }}>${c.vencido ? 'Venció el ' + fLarga(p.vence) : 'Separado hasta el ' + fLarga(p.vence)}</b>
        <span class="sub" style="line-height:1.45">${c.completo ? 'Ya pagó todo: entrégaselo y se hace la venta.' : 'No se vende a otro cliente. Si no completa, lo abonado: ' + ((ACUERDOS_APARTADO.find(a => a.k === p.acuerdo) || ACUERDOS_APARTADO[0]).n.toLowerCase()) + '.'}</span></div>`}
      ${!apartado && html`<div class="tarjeta" style="box-shadow:none;background:var(--fill2);padding:4px 14px">
        ${p.inicialVenta > 0 && html`<div class="fila cuota-fila"><span class="punto-cuota" style="background:var(--in)"><${Icono} n="check" t=${10} g=${3.4} c="#fff" /></span><span class="crece">Inicial · ${fCorta(p.t)}</span><b class="num">${D.m(p.inicialVenta)}</b></div>`}
        ${p.deApartado && p.antes > 0 && html`<div class="fila cuota-fila"><span class="punto-cuota" style="background:var(--in)"><${Icono} n="check" t=${10} g=${3.4} c="#fff" /></span><span class="crece">Abonado en el apartado</span><b class="num">${D.m(p.antes)}</b></div>`}
        ${c.cuotas.map(q => html`<div class="fila cuota-fila" key=${q.i}>
          <span class="punto-cuota" style=${{ background: q.estado === 'pagada' ? 'var(--in)' : q.estado === 'atrasada' ? 'var(--out)' : q.estado === 'hoy' ? 'var(--amber)' : 'var(--line)' }}>${q.estado === 'pagada' ? html`<${Icono} n="check" t=${10} g=${3.4} c="#fff" />` : q.estado === 'atrasada' ? '!' : ''}</span>
          <span class="crece" style="display:flex;flex-direction:column"><span style=${{ color: q.estado === 'atrasada' ? 'var(--out-text)' : 'var(--ink)', fontWeight: q.estado === 'atrasada' || q.estado === 'hoy' ? 700 : 400 }}>Cuota ${q.i + 1} · ${fCorta(q.f)}${q.estado === 'hoy' ? ' · hoy' : ''}</span>${q.aplicado > 0.004 && q.queda > 0.004 ? html`<span class="sub faint">Abonó ${D.m(q.aplicado)} · faltan ${D.m(q.queda)}</span>` : null}</span>
          <b class="num">${D.m(q.v)}</b></div>`)}
      </div>`}
      ${ab.length > 0 && html`<span class="titulo-funciones">Abonos</span>
        ${ab.map(a => html`<div class="fila" key=${a.id} style="justify-content:space-between;padding:6px 0;font-size:14px"><span>${fCorta(a.t)} · <span class="sub">${pagosDeAbono(a).map(x => x.m).join(' + ')}</span></span><b class="num" style=${{ color: a.v < 0 ? 'var(--out-text)' : 'var(--ink)' }}>${D.m(a.v)}</b></div>`)}`}
      <div class="chips" style="margin-top:4px">
        ${abierto && html`<button type="button" class="btn2 chico verde toca" onClick=${recordar}><${Icono} n="movil" t=${14} />Recordar</button>`}
        <button type="button" class="btn2 chico toca" onClick=${() => imprimirAcuerdo(p, c, ctx)}><${Icono} n="doc" t=${14} />Acuerdo</button>
        ${abierto && apartado && !c.vencido && puede('fiado') && html`<button type="button" class="btn2 chico toca" onClick=${() => cc(() => abrir('apartadoVencido', { pid: p.id }))}>Más opciones</button>`}
        ${p.venta && html`<button type="button" class="btn2 chico toca" onClick=${() => { const v = S.ventas.find(x => x.id === p.venta); if (v) cc(() => abrir('recibo', { venta: v })); }}>Ver la venta</button>`}
      </div>`,
    pie: !abierto ? null
      : apartado && c.completo ? html`<button type="button" class="btn toca" onClick=${() => entregar(cc)}>Entregar y hacer la venta</button>`
      : apartado && c.vencido && puede('fiado') ? html`<button type="button" class="btn toca" style="background:var(--out)" onClick=${() => cc(() => abrir('apartadoVencido', { pid: p.id }))}>Decidir qué hacer</button>`
      : html`<button type="button" class="btn toca" onClick=${() => cc(() => abrir('abonoPlan', { pid: p.id }))}>${apartado ? 'Registrar abono' : 'Registrar pago'}</button>`
  })} />`;
}

// ---------- hoja: abono a un plan ----------
export function AbonoPlan({ d, cerrar }) {
  const { S, D, tel, abrir } = useApp();
  const p = (S.planes || []).find(x => x.id === d.pid);
  const c = p ? cuentaPlan(p) : null;
  const sug = c ? (p.tipo === 'cuotas' ? (c.atrasado > 0.004 ? c.atrasado : c.proxima ? c.proxima.queda : c.falta) : c.falta) : 0;
  // Si la forma de pago es en Bs (Pago Móvil, Punto de venta), el pago se escribe en Bs.
  const mo = useMonto(sug > 0 ? String(D.redondo(sug)).replace('.', ',') : '', 'p', S.negocio.pays[0]);
  const fp = usePagos(m => c ? Math.min(mo.total(m), D.redondo(c.falta)) : 0, S.negocio.pays, undefined, undefined, mo);
  const v = fp.total;
  if (!p) return null;
  const listo = cc => {
    if (!(v > 0)) { avisar('Escribe cuánto paga'); return; }
    if (!fp.ok) { avisar('Falta repartir ' + D.m(fp.falta)); return; }
    abonarPlan(p.id, fp.pagos());
    cc(() => { avisar('Pago de ' + D.m(v) + ' anotado'); abrir('plan', { pid: p.id, recibo: v }); });
  };
  return html`<${Hoja} titulo=${'Pago a ' + numeroPlan(p)} onCerrar=${cerrar} contenido=${cc => ({
    cuerpo: html`<div class="fila"><b class="crece corta" style="font-size:16px">${queEs(p)}</b><span class="amber num" style="font-weight:600">Falta ${D.m(c.falta)}</span></div>
      ${p.tipo === 'cuotas' && (c.atrasado > 0.004 || c.proxima) && html`<div class="chips">${[c.atrasado > 0.004 ? ['Lo atrasado', c.atrasado] : null, c.proxima && !(c.atrasado > 0.004) ? ['La cuota ' + (c.proxima.i + 1), c.proxima.queda] : null, ['Todo', c.falta]].filter(Boolean).map(o => html`<button type="button" class=${'chip chico toca' + (Math.abs(v - o[1]) < 0.01 ? ' on' : '')} onClick=${() => mo.poner(D.redondo(o[1]), fp.m)}>${o[0]} · ${D.m(o[1])}</button>`)}</div>`}
      ${mo.campo(fp.m, { titulo: '¿Cuánto paga?' })}
      ${fp.vista({ titulo: '¿Cómo pagó?', desliza: tel })}`,
    pie: html`<button type="button" class=${'btn toca' + (v > 0 && fp.ok ? '' : ' apagado')} onClick=${() => listo(cc)}>Anotar pago de ${D.m(v)}</button>`
  })} />`;
}

// ---------- hoja: apartado vencido (o “Más opciones” de un apartado) ----------
const Opcion = ({ on, i, tono, t, s, onClick }) => html`<button type="button" class=${'opcion-plan toca' + (on ? ' on' : '')} aria-pressed=${on ? 'true' : 'false'} onClick=${onClick}>
  <span class=${'ic ' + tono} style="width:34px;height:34px;border-radius:11px;flex:none"><${Icono} n=${i} t=${16} /></span><span class="crece" style="display:flex;flex-direction:column;gap:2px;text-align:left"><b>${t}</b><span class="sub" style="line-height:1.4">${s}</span></span></button>`;
export function ApartadoVencido({ d, cerrar }) {
  const { S, P, D, abrir } = useApp();
  const p = (S.planes || []).find(x => x.id === d.pid);
  const [paso, setPaso] = useState('menu'), [elige, setElige] = useState('tiempo');
  const [dias, setDias] = useState(15), [como, setComo] = useState(p ? p.acuerdo || 'saldo' : 'saldo');
  const [op, setOp] = useState({ n: 4, cada: 'quin', rec: '' });
  if (!p || p.estado !== 'abierto') return null;
  const c = cuentaPlan(p), cli = S.clientes.find(x => x.id === p.cli) || {}, ctx = { S, D, P }, nom = primero(cli.n) || 'el cliente';
  const wa = texto => { if (cli.tel) window.open(enlaceWA(cli.tel, texto, P.id), '_blank', 'noopener'); };
  const continuar = cc => {
    if (paso === 'menu') {
      if (elige === 'escribir') { wa(mensajePlan(p, c, ctx)); posponerApartado(p.id); cc(() => avisar('Te lo recordamos mañana para decidir')); return; }
      setPaso(elige); return;
    }
    if (paso === 'tiempo') { masTiempoApartado(p.id, dias); cc(() => { avisar('Le diste ' + dias + ' días más'); abrir('plan', { pid: p.id }); }); return; }
    if (paso === 'cuotas') { const v = apartadoACuotas(p.id, { n: op.n, cada: op.cada, recargoPct: Math.max(0, numero(op.rec) || 0) }); if (v) cc(() => { avisar('Listo: se lo lleva y paga en ' + op.n + ' cuotas'); abrir('plan', { pid: p.id, nuevo: true }); }); return; }
    if (paso === 'liberar') {
      const txt = { saldo: 'Los ' + D.m(c.pagado) + ' que abonaste quedan como saldo a favor para tu próxima compra.', devolver: 'Te devolvemos los ' + D.m(c.pagado) + ' que abonaste.', retener: 'Como acordamos al apartar, lo abonado (' + D.m(c.pagado) + ') queda en el negocio.' }[como];
      liberarApartado(p.id, como);
      if (c.pagado > 0) wa('Hola ' + nom + ', te escribimos de ' + S.negocio.nombre + '. Tu apartado de ' + queEs(p) + ' venció y lo liberamos. ' + txt + '\n\nComprobante no fiscal · ' + S.negocio.nombre);
      cc(() => avisar('Liberado: volvió al inventario'));
    }
  };
  const botones = { menu: 'Continuar', tiempo: 'Darle ' + dias + ' días más', cuotas: 'Pasar a ' + op.n + ' cuotas', liberar: c.pagado > 0 && cli.tel ? 'Liberar y avisar a ' + nom : 'Liberar el producto' };
  return html`<${Hoja} titulo=${paso === 'menu' ? (c.vencido ? 'Apartado vencido' : 'Opciones del apartado') : paso === 'tiempo' ? 'Darle más tiempo' : paso === 'cuotas' ? 'Pasarlo a cuotas' : 'Liberar el producto'} onCerrar=${cerrar} contenido=${cc => ({
    cuerpo: html`
      ${paso !== 'menu' && html`<button type="button" class="enlace-tasa toca" style="align-self:flex-start" onClick=${() => setPaso('menu')}>‹ Volver a las opciones</button>`}
      <span class="sub" style="line-height:1.5">${c.vencido ? 'El apartado de ' : 'Apartado de '}<b style="color:var(--ink)">${cli.n || 'Cliente'}</b> (${queEs(p)})${c.vencido ? ' venció el ' + fLarga(p.vence) : ' vence el ' + fLarga(p.vence)}. Abonó <b style="color:var(--ink)">${D.m(c.pagado)} de ${D.m(p.total)}</b>; faltan ${D.m(c.falta)}.</span>
      ${paso === 'menu' && html`<div class="pila" style="gap:8px">
        <${Opcion} on=${elige === 'tiempo'} i="calendario" tono="t-vio" t="Darle más tiempo" s="Sigue apartado. Eliges 7, 15 o 30 días más." onClick=${() => setElige('tiempo')} />
        ${cli.tel && html`<${Opcion} on=${elige === 'escribir'} i="movil" tono="t-ver" t="Escribirle primero" s="Le mandas un WhatsApp y decides después. Te lo recordamos mañana." onClick=${() => setElige('escribir')} />`}
        <${Opcion} on=${elige === 'cuotas'} i="tarjeta" tono="t-amb" t="Pasarlo a cuotas" s=${'Se lo lleva ya y paga los ' + D.m(c.falta) + ' en cuotas.'} onClick=${() => setElige('cuotas')} />
        <${Opcion} on=${elige === 'liberar'} i="deshacer" tono="t-ros" t="Liberar el producto" s=${'Vuelve al inventario para venderlo.' + (c.pagado > 0 ? ' Luego eliges qué hacer con los ' + D.m(c.pagado) + '.' : '')} onClick=${() => setElige('liberar')} />
      </div>`}
      ${paso === 'tiempo' && html`<div class="chips">${[7, 15, 30].map(x => html`<button type="button" key=${x} class=${'chip toca' + (dias === x ? ' on' : '')} onClick=${() => setDias(x)}>${x} días más</button>`)}</div>
        <span class="sub">Quedaría separado hasta el <b style="color:var(--ink)">${fLarga(Math.max(p.vence, Date.now()) + dias * DIA)}</b>.</span>`}
      ${paso === 'cuotas' && html`<${OpcionesPlan} tipo="cuotas" monto=${c.falta} op=${op} setOp=${setOp} />`}
      ${paso === 'liberar' && html`<div class="pila" style="gap:8px">
        ${c.pagado > 0 ? html`<span class="sub">¿Qué hacemos con los <b style="color:var(--ink)">${D.m(c.pagado)}</b> que abonó?${p.acuerdo ? ' Al apartar acordaron: “' + (ACUERDOS_APARTADO.find(a => a.k === p.acuerdo) || {}).n + '”.' : ''}</span>
          <${Opcion} on=${como === 'saldo'} i="tarjeta" tono="t-ver" t="Dejarlo como saldo a favor" s="Lo usa en su próxima compra. Queda en su ficha de cliente." onClick=${() => setComo('saldo')} />
          <${Opcion} on=${como === 'devolver'} i="billete" tono="t-amb" t="Devolverle el dinero" s="Sale de la caja de hoy como devolución." onClick=${() => setComo('devolver')} />
          <${Opcion} on=${como === 'retener'} i="doc" tono="t-ros" t="Retener el abono" s="Solo si lo acordaron al apartar. Queda como ingreso." onClick=${() => setComo('retener')} />
          ${cli.tel && html`<span class="sub in">Le mandamos un WhatsApp a ${nom} con lo que decidiste.</span>`}`
        : html`<span class="sub">No abonó nada: el producto vuelve al inventario.</span>`}
      </div>`}`,
    pie: html`<button type="button" class=${'btn toca' + (paso === 'liberar' ? ' rojo' : '')} style=${paso === 'liberar' ? 'background:var(--out)' : ''} onClick=${() => continuar(cc)}>${botones[paso]}</button>`
  })} />`;
}

// ---------- en “Hoy”: apartados por decidir y cuotas para cobrar ----------
export function PlanesHoy() {
  const { S, P, D, abrir, ir } = useApp();
  const ahora = Date.now(), fin = new Date(); fin.setHours(23, 59, 59, 999);
  const abiertos = (S.planes || []).filter(p => p.estado === 'abierto');
  const vencidos = abiertos.filter(p => p.tipo === 'apartado' && cuentaPlan(p, ahora).vencido && !(p.posponer > ahora));
  const cobrar = abiertos.filter(p => p.tipo === 'cuotas').map(p => ({ p, c: cuentaPlan(p, ahora) })).filter(x => x.c.atrasado > 0.004 || (x.c.proxima && x.c.proxima.f <= fin.getTime()))
    .sort((a, b) => b.c.diasAtraso - a.c.diasAtraso);
  if (!vencidos.length && !cobrar.length) return null;
  const nombre = p => (S.clientes.find(c => c.id === p.cli) || {}).n || 'Cliente';
  const recordar = (p, c) => { const cli = S.clientes.find(x => x.id === p.cli) || {}; if (!cli.tel) { abrir('plan', { pid: p.id }); return; } window.open(enlaceWA(cli.tel, mensajePlan(p, c, { S, D }), P.id), '_blank', 'noopener'); recordadoPlan(p.id); };
  const total = cobrar.reduce((a, x) => a + (x.c.atrasado > 0.004 ? x.c.atrasado : x.c.proxima.queda), 0);
  return html`<section class="tarjeta entra" style=${vencidos.length ? 'box-shadow:inset 0 0 0 1.5px rgba(232,67,106,.35)' : ''}>
    <div class="tarjeta-tit">${vencidos.length ? (vencidos.length === 1 ? 'Un apartado venció' : vencidos.length + ' apartados vencieron') + (cobrar.length ? ' · cuotas de hoy' : '') : 'Cuotas para cobrar hoy'}<button type="button" class="enlace-tasa toca" onClick=${() => ir('cuotas')}>Ver todo →</button></div>
    <div class="lista">
      ${vencidos.map(p => { const c = cuentaPlan(p, ahora); return html`<div class="item" key=${p.id}><span class="crece" style="display:flex;flex-direction:column;min-width:0"><b class="corta" style="font-size:14px">${nombre(p)}</b><span class="sub corta" style="color:var(--out-text)">Apartado vencido · abonó ${D.m(c.pagado)} de ${D.m(p.total)}</span></span>
        <button type="button" class="btn2 chico rojo toca" onClick=${() => abrir('apartadoVencido', { pid: p.id })}>Decidir</button></div>`; })}
      ${cobrar.slice(0, 5).map(({ p, c }) => html`<div class="item" key=${p.id}><button type="button" class="crece toca" style="display:flex;flex-direction:column;min-width:0;border:0;background:none;padding:0;text-align:left;font:inherit;color:var(--ink)" onClick=${() => abrir('plan', { pid: p.id })}><b class="corta" style="font-size:14px">${nombre(p)}</b>
          <span class="sub corta" style=${{ color: c.atrasado > 0.004 ? 'var(--out-text)' : '' }}>${c.atrasado > 0.004 ? 'Atrasada ' + c.diasAtraso + (c.diasAtraso === 1 ? ' día' : ' días') + ' · ' + D.m(c.atrasado) : 'Cuota ' + (c.proxima.i + 1) + ' de ' + p.cuotas.length + ' · ' + D.m(c.proxima.queda)}</span></button>
        <button type="button" class="btn2 chico verde toca" onClick=${() => recordar(p, c)}><${Icono} n="movil" t=${14} />Recordar</button></div>`)}
    </div>
    ${cobrar.length > 0 && html`<span class="sub faint" style="display:block;padding:4px 0 2px">${cobrar.length} ${cobrar.length === 1 ? 'cliente' : 'clientes'} · ${D.m(total)} para cobrar</span>`}
  </section>`;
}

// ---------- acuerdo para firmar (cuotas o apartado) ----------
export function imprimirAcuerdo(p, c, { S, D, P }) {
  const n = S.negocio, cli = S.clientes.find(x => x.id === p.cli) || {}, apartado = p.tipo === 'apartado';
  const fil = (a, b) => `<tr><td>${esc(a)}</td><td style="text-align:right">${esc(b)}</td></tr>`;
  const acuerdo = (ACUERDOS_APARTADO.find(a => a.k === p.acuerdo) || ACUERDOS_APARTADO[0]).n.toLowerCase();
  const z = document.createElement('div'); z.className = 'zona-imprimir';
  z.innerHTML = `<style>@page { size: A4; margin: 14mm; } .zona-imprimir table { width: 100%; border-collapse: collapse; } .zona-imprimir td { padding: 5px 4px; border-bottom: 1px solid #e6e4f2; font-size: 10pt; }</style>
    <div class="imp-cab">${imgSegura(n.logo) ? `<img src="${esc(imgSegura(n.logo))}" alt="" class="imp-logo">` : `<span class="imp-logo imp-inic">${esc(n.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase())}</span>`}
      <div class="imp-neg"><b>${esc(n.nombre)}</b><span>${esc([n.razon, n.fiscal ? P.fiscal[0] + ' ' + n.fiscal : '', n.tel, n.dir].filter(Boolean).join(' · '))}</span></div>
      <div class="imp-num"><b>${apartado ? 'ACUERDO DE APARTADO' : 'ACUERDO DE PAGO EN CUOTAS'}</b><strong>${esc(numeroPlan(p))}</strong><span>${esc(new Date(p.t).toLocaleDateString('es'))}</span></div></div>
    <div class="imp-dos"><div><small>CLIENTE</small><b>${esc(cli.n || '')}</b><span>${esc([cli.tel, cli.doc].filter(Boolean).join(' · '))}</span></div><div><small>${apartado ? 'SE GUARDA HASTA' : 'CUOTAS'}</small><b>${esc(apartado ? new Date(p.vence).toLocaleDateString('es') : p.cuotas.length + ' · ' + ((FRECUENCIAS.find(f => f.k === p.cada) || {}).n || '').toLowerCase())}</b><span></span></div></div>
    <table><thead><tr><th style="text-align:left">Producto</th><th>Cant.</th><th>Total</th></tr></thead><tbody>${p.items.map(it => `<tr><td>${esc(it.n)}</td><td style="text-align:center">${esc(it.q)}</td><td style="text-align:right">${esc(D.m(it.q * it.p))}</td></tr>`).join('')}</tbody></table>
    <div class="imp-tot"><div><span>Total</span><span>${esc(D.m(p.total))}</span></div><div><span>${apartado ? 'Abonado' : 'Pagado'} a la fecha</span><span>${esc(D.m(c.pagado))}</span></div><div><span>Falta</span><span>${esc(D.m(c.falta))}</span></div></div>
    ${apartado ? '' : `<p style="margin:12px 0 4px;font-weight:700;font-size:10pt">Calendario de pagos</p><table><tbody>${p.cuotas.map((q, i) => fil('Cuota ' + (i + 1) + ' · ' + new Date(q.f).toLocaleDateString('es'), D.m(q.v))).join('')}</tbody></table>`}
    <p class="imp-cond">${apartado
      ? esc('El producto queda separado a nombre del cliente hasta la fecha indicada y se entrega cuando el total esté pagado. Si no completa el pago antes de esa fecha, el negocio puede darle más tiempo o liberar el producto; en ese caso lo abonado ' + acuerdo + '.')
      : esc('El cliente recibe el producto y se compromete a pagar cada cuota en la fecha indicada.' + (p.recargo > 0 ? ' El total incluye un recargo por financiar de ' + D.m(p.recargo) + ' (' + p.recargoPct + ' %).' : '') + ' Los pagos se pueden adelantar en cualquier momento.')}</p>
    <div class="imp-firmas"><span>Firma del cliente</span><span>Por ${esc(n.nombre)}</span></div>
    <p class="imp-cond" style="text-align:center;margin-top:14px">Documento no fiscal</p>`;
  document.querySelectorAll('.zona-imprimir').forEach(v => v.remove());
  document.body.appendChild(z); document.documentElement.classList.add('imprimiendo');
  const fin = () => { document.documentElement.classList.remove('imprimiendo'); z.remove(); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  setTimeout(() => document.addEventListener('pointerdown', fin, { once: true }), 1500);
  const img = z.querySelector('img'), ya = () => window.print();
  if (img && !img.complete) { img.onload = ya; img.onerror = ya; } else setTimeout(ya, 60);
}
