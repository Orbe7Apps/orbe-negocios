// Agenda de citas (barbería, salón, consultorio…): citas por día y por profesional,
// recordatorio por WhatsApp y cobro al terminar con los servicios ya puestos.
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { inicioDia, listaProductos, guardarCita, estadoCita, citaActiva, ESTADOS_CITA } from '../datos.js';
import { Hoja, Icono, avisar, hora, iniciales } from '../ui.js';
import { totales } from './vender.js';
import { enlaceWA } from '../ordenpdf.js';
import { normal } from '../buscar.js';

const COLORES = ['#7b6cff', '#12a37a', '#e8961a', '#3d9be9', '#e8436a', '#a35bf0'];
const TONO_ESTADO = { pendiente: 't-azu', llego: 't-amb', atendida: 't-ver', cancelada: 't-ros', falto: 't-ros' };
// Día de hoy más «i» días (con setDate: así no se corre con el cambio de horario).
const diaMas = i => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d.getTime(); };
const finDe = t => { const d = new Date(t); d.setDate(d.getDate() + 1); return d.getTime(); };
const nombreDia = t => { const h = inicioDia(Date.now()); return t === h ? 'Hoy' : t === diaMas(1) ? 'Mañana' : new Date(t).toLocaleDateString('es', { weekday: 'short' }).replace('.', ''); };
const fechaLarga = t => new Date(t).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
export const profesionales = S => S.perfiles.filter(p => !p.inactivo && !p.borrado);
export const citasDelDia = (S, dia) => S.citas.filter(c => c.t >= dia && c.t < finDe(dia)).sort((a, b) => a.t - b.t);
export const citasPendientesHoy = S => citasDelDia(S, inicioDia(Date.now())).filter(citaActiva).length;
const serviciosDe = c => c.srv.map(id => listaProductos().find(p => p.id === id) || { id, n: 'Servicio', p: 0, dur: 30 });
const colorPro = (S, pid) => COLORES[Math.max(0, profesionales(S).findIndex(p => p.id === pid)) % COLORES.length];
const nombrePro = (S, pid) => ((S.perfiles.find(p => p.id === pid) || {}).n || '').split(' ')[0];

// Fila de una cita (lista del día y tarjeta de Hoy).
export function CitaFila({ c, i = 0, conPro = true }) {
  const { S, D, abrir } = useApp();
  const ss = serviciosDe(c);
  return html`<button type="button" class=${'cita-fila toca entra' + (citaActiva(c) ? '' : ' cerrada')} style=${{ '--i': i, '--c': colorPro(S, c.pro) }} onClick=${() => abrir('cita', { cid: c.id })}>
    <span class="cita-hora"><b class="num">${hora(c.t)}</b><small>${c.dur} min</small></span>
    <span class="crece" style="display:flex;flex-direction:column;gap:2px;min-width:0">
      <b class="corta" style="font-size:15px">${c.nom || 'Cliente'}</b>
      <span class="sub corta">${ss.map(s => s.n).join(' + ')}${conPro && c.pro ? ' · ' + nombrePro(S, c.pro) : ''}</span>
    </span>
    <span style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class=${'pildora ' + TONO_ESTADO[c.estado]}>${ESTADOS_CITA[c.estado]}</span><small class="num faint">${D.m(ss.reduce((a, s) => a + s.p, 0))}</small></span>
  </button>`;
}

export function Agenda() {
  const { S, D, tel, abrir } = useApp();
  const [dia, setDia] = useState(inicioDia(Date.now()));
  const [pro, setPro] = useState('');
  const pros = profesionales(S), dias = Array.from({ length: 14 }, (_, i) => diaMas(i));
  const delDia = citasDelDia(S, dia), vistas = pro ? delDia.filter(c => c.pro === pro) : delDia;
  const activas = vistas.filter(c => c.estado !== 'cancelada' && c.estado !== 'falto');
  const estimado = activas.reduce((a, c) => a + serviciosDe(c).reduce((b, s) => b + s.p, 0), 0);
  const nueva = extra => abrir('nuevaCita', Object.assign({ dia }, extra || {}));

  const Dias = html`<div class="chips desliza dias-agenda" role="tablist" aria-label="Día">${dias.map(t => { const n = citasDelDia(S, t).filter(citaActiva).length; return html`
    <button type="button" key=${t} role="tab" aria-selected=${t === dia ? 'true' : 'false'} class=${'dia-chip toca' + (t === dia ? ' on' : '')} onClick=${() => setDia(t)}>
      <small>${nombreDia(t)}</small><b class="num">${new Date(t).getDate()}</b><i class=${n ? 'con' : ''} title=${n ? n + (n === 1 ? ' cita' : ' citas') : ''}>${n || ''}</i>
    </button>`; })}</div>`;
  const Resumen = html`<div class="fila entra" style="gap:8px;flex-wrap:wrap">
    <span class="sub crece">${fechaLarga(dia).replace(/^./, x => x.toUpperCase())}</span>
    <span class="pildora t-azu">${activas.length} ${activas.length === 1 ? 'cita' : 'citas'}</span>
    <span class="pildora t-ver">${activas.filter(c => c.estado === 'atendida').length} atendidas</span>
    <span class="pildora">${D.m(estimado)}</span>
  </div>`;
  const Vacio = html`<div class="tarjeta pila entra" style="align-items:center;text-align:center;box-shadow:none;background:var(--fill2)">
    <span class="ic t-azu"><${Icono} n="calendario" t=${18} /></span><b>No hay citas ${nombreDia(dia) === 'Hoy' ? 'hoy' : 'este día'}</b>
    <button type="button" class="btn2 chico acento toca" onClick=${() => nueva()}>+ Agendar una cita</button></div>`;

  if (tel) return html`
    <div class="fila entra"><h1 class="titulo crece">Agenda</h1><button type="button" class="icono-btn toca boton-agregar" aria-label="Nueva cita" onClick=${() => nueva({ pro })}><${Icono} n="mas1" t=${20} g=${2.6} /></button></div>
    ${Dias}
    ${pros.length > 1 && html`<div class="chips desliza">${[{ id: '', n: 'Todos' }].concat(pros).map(p => html`<button type="button" key=${p.id} class=${'chip chico toca' + (pro === p.id ? ' on' : '')} onClick=${() => setPro(p.id)}>${p.id && html`<i class="punto-grupo" style=${{ background: colorPro(S, p.id) }}></i>`}${p.id ? p.n.split(' ')[0] : 'Todos'}</button>`)}</div>`}
    ${Resumen}
    ${vistas.length ? html`<div class="pila" style="gap:8px">${vistas.map((c, i) => html`<${CitaFila} key=${c.id} c=${c} i=${i} conPro=${!pro} />`)}</div>` : Vacio}`;

  // Computadora: una columna por profesional.
  const cols = pros.length ? pros : [{ id: '', n: 'Citas' }];
  return html`<div class="pila" style="gap:14px">
    <div class="fila" style="gap:12px">${Dias}<span style="flex:1"></span><button type="button" class="btn2 lleno toca" onClick=${() => nueva()}>+ Cita</button></div>
    ${Resumen}
    <div class="agenda-cols" style=${{ gridTemplateColumns: 'repeat(' + Math.min(cols.length, 4) + ', minmax(0, 1fr))' }}>${cols.map((p, k) => { const lista = delDia.filter(c => !p.id || c.pro === p.id); return html`
      <section class="tarjeta entra" key=${p.id} style=${{ '--i': k, padding: '14px' }}>
        <div class="fila" style="gap:10px;margin-bottom:10px"><span class="logo redondo" style=${{ width: '34px', height: '34px', fontSize: '12px', background: colorPro(S, p.id), color: '#fff' }}>${iniciales(p.n)}</span>
          <span class="crece" style="display:flex;flex-direction:column"><b style="font-size:14px">${p.n}</b><span class="sub">${lista.filter(citaActiva).length} por atender</span></span>
          <button type="button" class="icono-btn chico toca" aria-label=${'Nueva cita con ' + p.n} onClick=${() => nueva({ pro: p.id })}><${Icono} n="mas1" t=${15} g=${2.6} /></button></div>
        ${lista.length ? html`<div class="pila" style="gap:8px">${lista.map((c, i) => html`<${CitaFila} key=${c.id} c=${c} i=${i} conPro=${false} />`)}</div>` : html`<p class="vacio" style="padding:18px 0">Día libre</p>`}
      </section>`; })}</div>
  </div>`;
}

// Hoy: las próximas citas del día.
export function CitasHoy({ max = 4 }) {
  const { S, ir, abrir } = useApp();
  const hoy = citasDelDia(S, inicioDia(Date.now())), prox = hoy.filter(citaActiva);
  return html`<section class="tarjeta entra" data-tour="citas-hoy" style="padding-bottom:8px">
    <div class="tarjeta-tit">Citas de hoy<span class="fila" style="gap:8px"><span class="sub">${prox.length} por atender</span><button type="button" class="btn2 chico acento toca" onClick=${() => abrir('nuevaCita', {})}>+ Cita</button></span></div>
    ${prox.length ? html`<div class="pila" style="gap:8px">${prox.slice(0, max).map((c, i) => html`<${CitaFila} key=${c.id} c=${c} i=${i} />`)}</div>` : html`<p class="vacio" style="padding:10px 0">${hoy.length ? 'Ya atendiste todas las citas de hoy.' : 'No hay citas hoy.'}</p>`}
    <button type="button" class="ver-mas toca" onClick=${() => ir('agenda')}>Ver la agenda →</button>
  </section>`;
}

// ---------- hoja: nueva cita (o cambiar día y hora) ----------
export function NuevaCita({ d, cerrar }) {
  const { S, D, P, abrir } = useApp();
  const c0 = d.cid ? S.citas.find(x => x.id === d.cid) : null;
  const pros = profesionales(S), todos = listaProductos(), srvs = todos.filter(p => p.q == null).length ? todos.filter(p => p.q == null) : todos;
  const dia0 = c0 ? inicioDia(c0.t) : d.dia || inicioDia(Date.now());
  const [f, setF] = useState(c0 ? { nom: c0.nom, tel: c0.tel || '', cli: c0.cli || '', srv: c0.srv.slice(), pro: c0.pro || '', dia: dia0, min: Math.round((c0.t - dia0) / 60000), nota: c0.nota || '' }
    : { nom: '', tel: '', cli: '', srv: [], pro: d.pro || (pros.length === 1 ? pros[0].id : (pros[0] || {}).id || ''), dia: dia0, min: null, nota: '' });
  const pon = o => setF(x => Object.assign({}, x, o));
  const elegidos = f.srv.map(id => srvs.find(p => p.id === id)).filter(Boolean);
  const dur = Math.max(30, elegidos.reduce((a, p) => a + (p.dur || 30), 0));
  const total = elegidos.reduce((a, p) => a + p.p, 0);
  // Clientes que se parecen a lo escrito.
  const sug = f.nom.trim().length >= 2 && !f.cli ? S.clientes.filter(x => !x.borrado && normal(x.n).includes(normal(f.nom.trim()))).slice(0, 4) : [];
  // Horas: cada 30 minutos de 8:00 a 20:00. Ocupadas: otra cita del mismo profesional que se cruza.
  const ocupada = m => {
    const t = f.dia + m * 60000, fin = t + dur * 60000;
    return S.citas.some(x => x.id !== (c0 && c0.id) && citaActiva(x) && (!f.pro || x.pro === f.pro) && x.t < fin && x.t + x.dur * 60000 > t);
  };
  const ahora = Date.now(), horas = Array.from({ length: 24 }, (_, i) => 8 * 60 + i * 30);
  const textoHora = m => { const x = new Date(f.dia + m * 60000); return hora(x.getTime()); };
  const mensaje = t => 'Hola ' + f.nom.trim().split(' ')[0] + ', tu cita en ' + S.negocio.nombre + ' quedó para el ' + fechaLarga(t) + ' a las ' + hora(t) + ' (' + elegidos.map(p => p.n).join(' + ') + '). ¡Te esperamos!';
  const guardar = (c, avisarWA) => {
    if (!f.nom.trim()) { avisar('Escribe el nombre del cliente'); return; }
    if (!elegidos.length) { avisar('Elige al menos un servicio'); return; }
    if (f.min == null) { avisar('Elige la hora'); return; }
    if (ocupada(f.min)) { avisar('A esa hora ya hay una cita'); return; }
    const t = f.dia + f.min * 60000;
    guardarCita(Object.assign(c0 ? { id: c0.id } : {}, { t, dur, srv: f.srv, pro: f.pro, cli: f.cli, nom: f.nom.trim(), tel: f.tel.trim(), nota: f.nota.trim() }, c0 ? {} : { estado: 'pendiente' }));
    if (avisarWA && f.tel.trim()) window.open(enlaceWA(f.tel.trim(), mensaje(t), P.id), '_blank', 'noopener');
    c(() => avisar((c0 ? 'Cita movida: ' : 'Cita guardada: ') + f.nom.trim().split(' ')[0] + ' · ' + nombreDia(f.dia).toLowerCase() + ' ' + textoHora(f.min)));
  };
  return html`<${Hoja} titulo=${c0 ? 'Cambiar la cita' : 'Nueva cita'} onCerrar=${cerrar} contenido=${c => ({
    cuerpo: html`
      <label class="campo"><span>Cliente</span><input type="text" value=${f.nom} placeholder="Nombre" autocomplete="off" onInput=${e => pon({ nom: e.target.value, cli: '' })} /></label>
      ${sug.length > 0 && html`<div class="chips entra">${sug.map(x => html`<button type="button" key=${x.id} class="chip chico toca" onClick=${() => pon({ nom: x.n, tel: x.tel || f.tel, cli: x.id })}><${Icono} n="personas" t=${13} />${x.n}</button>`)}</div>`}
      <label class="campo"><span>Teléfono (para avisarle por WhatsApp)</span><input type="tel" inputmode="tel" value=${f.tel} placeholder="Opcional" autocomplete="off" onInput=${e => pon({ tel: e.target.value })} /></label>
      ${!srvs.length && html`<div class="tarjeta pila" style="box-shadow:none;background:var(--amber-soft);gap:8px"><b style="font-size:14px">Primero agrega tus servicios</b><span class="sub">Así la cita sabe cuánto dura y cuánto cobrar.</span><button type="button" class="btn2 chico lleno toca" style="align-self:flex-start" onClick=${() => c(() => abrir('sugerencias'))}>Agregar lo típico</button></div>`}
      ${srvs.length > 0 && html`<div class="campo"><span>Servicios${elegidos.length ? ' · ' + dur + ' min · ' + D.m(total) : ''}</span><div class="chips">${srvs.map(p => { const on = f.srv.includes(p.id); return html`
        <button type="button" key=${p.id} class=${'chip chico toca' + (on ? ' on' : '')} aria-pressed=${on ? 'true' : 'false'} onClick=${() => pon({ srv: on ? f.srv.filter(x => x !== p.id) : f.srv.concat([p.id]) })}>${on && html`<${Icono} n="check" t=${13} g=${3} />`}${p.n}<span class="faint num">${D.m(p.p)}</span></button>`; })}</div></div>`}
      ${pros.length > 1 && html`<div class="campo"><span>Con quién</span><div class="chips">${pros.map(p => html`<button type="button" key=${p.id} class=${'chip chico toca' + (f.pro === p.id ? ' on' : '')} onClick=${() => pon({ pro: p.id })}><i class="punto-grupo" style=${{ background: colorPro(S, p.id) }}></i>${p.n.split(' ')[0]}</button>`)}</div></div>`}
      <div class="campo"><span>Día</span><div class="chips desliza dias-agenda">${Array.from({ length: 14 }, (_, i) => diaMas(i)).map(t => html`
        <button type="button" key=${t} class=${'dia-chip toca' + (t === f.dia ? ' on' : '')} onClick=${() => pon({ dia: t, min: null })}><small>${nombreDia(t)}</small><b class="num">${new Date(t).getDate()}</b></button>`)}</div></div>
      <div class="campo"><span>Hora${f.min != null ? ' · ' + textoHora(f.min) : ''}</span><div class="horas-grid">${horas.map(m => { const pasada = f.dia + m * 60000 < ahora, oc = ocupada(m); return html`
        <button type="button" key=${m} class=${'chip chico toca' + (f.min === m ? ' on' : '') + (oc ? ' ocupada' : '')} disabled=${pasada || oc} onClick=${() => pon({ min: m })}>${textoHora(m)}</button>`; })}</div>
        <span class="sub faint" style="font-size:12px">Las horas tachadas ya tienen cita${f.pro && pros.length > 1 ? ' con ' + nombrePro(S, f.pro) : ''}.</span></div>
      <label class="campo"><span>Nota (opcional)</span><input type="text" value=${f.nota} placeholder="Ej.: degradado bajo, trae foto" autocomplete="off" onInput=${e => pon({ nota: e.target.value })} /></label>`,
    pie: html`<button type="button" class="btn toca" onClick=${() => guardar(c, false)}>${c0 ? 'Guardar cambios' : 'Guardar cita'}</button>
      ${f.tel.trim() && html`<button type="button" class="btn2 toca verde" style="min-height:50px;border-radius:25px" onClick=${() => guardar(c, true)}>Guardar y avisar por WhatsApp</button>`}`
  })} />`;
}

// ---------- hoja: una cita ----------
export function Cita({ d, cerrar }) {
  const { S, D, P, abrir, puede } = useApp();
  const c = S.citas.find(x => x.id === d.cid);
  if (!c) return null;
  const ss = serviciosDe(c), total = ss.reduce((a, s) => a + s.p, 0), activa = citaActiva(c);
  const cobrar = cc => {
    if (!puede('vender')) { avisar('Tu perfil no puede cobrar'); return; }
    const items = ss.map(p => Object.assign({ pid: p.id, n: p.n, q: 1, p: p.p, c: p.c || 0 }, p.imp != null ? { imp: p.imp } : {}));
    const tt = totales(items, S.negocio, P);
    cc(() => abrir('cobrar', { items, tt, cli: c.cli, pro: c.pro, titulo: 'Cobrar a ' + (c.nom || 'cliente').split(' ')[0], onListo: venta => estadoCita(c.id, 'atendida', { venta: venta.id }) }));
  };
  const recordar = () => {
    const txt = 'Hola ' + (c.nom || '').split(' ')[0] + ', te recordamos tu cita en ' + S.negocio.nombre + ' el ' + fechaLarga(c.t) + ' a las ' + hora(c.t) + ' (' + ss.map(s => s.n).join(' + ') + '). Si no puedes venir, avísanos. ¡Te esperamos!';
    window.open(enlaceWA(c.tel, txt, P.id), '_blank', 'noopener');
  };
  const venta = c.venta && S.ventas.find(v => v.id === c.venta);
  return html`<${Hoja} titulo=${c.nom || 'Cita'} onCerrar=${cerrar} contenido=${cc => ({
    cuerpo: html`
      <div class="fila" style="gap:12px"><span class="ic" style=${{ background: colorPro(S, c.pro), color: '#fff', width: '46px', height: '46px', borderRadius: '15px' }}><${Icono} n="calendario" t=${20} /></span>
        <span class="crece" style="display:flex;flex-direction:column;gap:2px"><b style="font-size:16px">${fechaLarga(c.t).replace(/^./, x => x.toUpperCase())}</b><span class="sub">${hora(c.t)} · ${c.dur} min${c.pro ? ' · con ' + nombrePro(S, c.pro) : ''}</span></span>
        <span class=${'pildora ' + TONO_ESTADO[c.estado]}>${ESTADOS_CITA[c.estado]}</span></div>
      <div class="tarjeta" style="box-shadow:none;background:var(--fill2);padding:6px 14px"><div class="lista">${ss.map(s => html`<div class="item"><span class="crece">${s.n}</span><b class="num">${D.m(s.p)}</b></div>`)}
        <div class="item"><b class="crece">Total</b><b class="num" style="font-size:17px">${D.m(total)}</b></div></div></div>
      ${(c.tel || c.nota) && html`<div class="pila" style="gap:6px">${c.tel && html`<span class="sub fila" style="gap:8px"><${Icono} n="movil" t=${15} />${c.tel}</span>`}${c.nota && html`<span class="sub fila" style="gap:8px"><${Icono} n="texto" t=${15} />${c.nota}</span>`}</div>`}
      ${activa && html`<div class="chips">
        ${c.estado === 'pendiente' && html`<button type="button" class="btn2 chico toca" onClick=${() => { estadoCita(c.id, 'llego'); avisar((c.nom || 'Cliente').split(' ')[0] + ' llegó'); }}><${Icono} n="check" t=${14} g=${2.6} />Llegó</button>`}
        ${c.tel && html`<button type="button" class="btn2 chico verde toca" onClick=${recordar}>Recordar por WhatsApp</button>`}
        <button type="button" class="btn2 chico toca" onClick=${() => cc(() => abrir('nuevaCita', { cid: c.id }))}>Cambiar día u hora</button>
        <button type="button" class="btn2 chico toca" onClick=${() => cc(() => { estadoCita(c.id, 'falto'); avisar('Anotado: no vino'); })}>No vino</button>
        <button type="button" class="btn2 chico rojo toca" onClick=${() => cc(() => { estadoCita(c.id, 'cancelada'); avisar('Cita cancelada'); })}>Cancelar cita</button>
      </div>`}`,
    pie: activa ? html`<button type="button" class="btn toca" onClick=${() => cobrar(cc)}>Cobrar ${D.m(total)}</button>`
      : venta ? html`<button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => cc(() => abrir('recibo', { venta }))}>Ver el recibo #${venta.n}</button>` : null
  })} />`;
}
