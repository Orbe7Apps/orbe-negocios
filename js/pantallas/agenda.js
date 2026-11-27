// Agenda de citas (barbería, salón, consultorio…): citas por día y por profesional,
// recordatorio por WhatsApp y cobro al terminar con los servicios ya puestos.
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { BotonAyuda } from '../ayuda.js';
import { Frase, BotonGuiame } from '../guias.js';
import { Escena } from './empezar.js';
import { inicioDia, listaProductos, guardarCita, estadoCita, citaActiva, ESTADOS_CITA } from '../datos.js';
import { Hoja, Icono, avisar, hora, iniciales } from '../ui.js';
import { totales } from './vender.js';
import { enlaceWA } from '../ordenpdf.js';
import { horasDelDia, fueraDeHorario } from '../horario.js';
import { normal } from '../buscar.js';

const COLORES = ['#7b6cff', '#12a37a', '#e8961a', '#3d9be9', '#e8436a', '#a35bf0'];
const TONO_ESTADO = { pendiente: 't-azu', llego: 't-amb', atendida: 't-ver', cancelada: 't-ros', falto: 't-ros' };
// Día de hoy más “i” días (con setDate: así no se corre con el cambio de horario).
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

// Hora partida: “3:30” grande y “p. m.” chico.
const partes = t => { const h = hora(t), k = h.indexOf(' '); return k > 0 ? [h.slice(0, k), h.slice(k + 1)] : [h, '']; };
const bloqueDe = t => { const h = new Date(t).getHours(); return h < 12 ? 'Mañana' : h < 18 ? 'Tarde' : 'Noche'; };

// Una cita (lista del día y tarjeta de Hoy): hora, cliente, servicios, con quién y estado.
export function CitaFila({ c, i = 0, conPro = true }) {
  const { S, D, abrir } = useApp();
  const ss = serviciosDe(c), [hh, ap] = partes(c.t), ahora = Date.now(), activa = citaActiva(c);
  const enCurso = activa && c.t <= ahora && ahora < c.t + c.dur * 60000, falta = Math.round((c.t - ahora) / 60000);
  const aviso = enCurso ? 'Ahora' : activa && falta > 0 && falta <= 60 ? 'En ' + falta + ' min' : '';
  return html`<button type="button" class=${'cita-fila toca entra' + (activa ? '' : ' cerrada') + (enCurso ? ' en-curso' : '')} style=${{ '--i': i, '--c': colorPro(S, c.pro) }} onClick=${() => abrir('cita', { cid: c.id })}>
    <span class="cita-hora"><b class="num">${hh}</b><small>${ap}</small></span>
    <span class="cita-cuerpo">
      <span class="fila" style="gap:8px;min-width:0"><b class="corta crece">${c.nom || 'Cliente'}</b>${aviso ? html`<span class="cita-aviso">${aviso}</span>` : html`<span class=${'pildora ' + TONO_ESTADO[c.estado]}>${ESTADOS_CITA[c.estado]}</span>`}</span>
      <span class="corta cita-srv">${ss.map(s => s.n).join(' + ')}</span>
      <span class="cita-meta">${conPro && c.pro ? html`<span class="fila" style="gap:5px"><i style=${{ background: colorPro(S, c.pro) }}></i>${nombrePro(S, c.pro)}</span>` : null}<span>${c.dur} min</span><b class="num">${D.m(ss.reduce((a, s) => a + s.p, 0))}</b></span>
    </span>
  </button>`;
}

// Las citas de un día, por mañana, tarde y noche; hoy, con la línea de “ahora”.
function ListaDia({ lista, conPro, hoy }) {
  const ahora = Date.now(), out = [];
  let bloque = '', linea = !hoy;
  lista.forEach((c, i) => {
    if (!linea && c.t > ahora) { linea = true; out.push(html`<div class="linea-ahora" key="ahora"><span>Ahora · ${hora(ahora)}</span></div>`); }
    const b = bloqueDe(c.t);
    if (b !== bloque) { bloque = b; out.push(html`<span class="cita-bloque" key=${'b' + b}>${b}</span>`); }
    out.push(html`<${CitaFila} key=${c.id} c=${c} i=${i} conPro=${conPro} />`);
  });
  if (!linea && lista.length) out.push(html`<div class="linea-ahora" key="ahora"><span>Ahora · ${hora(ahora)}</span></div>`);
  return html`<div class="pila lista-dia">${out}</div>`;
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

  const Dias = html`<div class="chips desliza dias-agenda" data-guia="dias" role="tablist" aria-label="Día">${dias.map(t => { const n = citasDelDia(S, t).filter(citaActiva).length; return html`
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
    ${S.citas.length ? html`<span class="ic t-azu"><${Icono} n="calendario" t=${18} /></span>` : html`<${Escena} e="agenda" />`}<b>No hay citas ${nombreDia(dia) === 'Hoy' ? 'hoy' : 'este día'}</b>
    <button type="button" class="btn2 chico acento toca" onClick=${() => nueva()}>+ Agendar una cita</button></div>`;

  // La frase: la próxima cita de hoy, o cuántas hay el día que se ve.
  const esHoy = dia === inicioDia(Date.now()), ahora = Date.now();
  const proxima = esHoy ? activas.filter(c => citaActiva(c) && c.t + c.dur * 60000 > ahora).sort((a, b) => a.t - b.t)[0] : null;
  const nDia = esHoy ? 'hoy' : nombreDia(dia) === 'Mañana' ? 'mañana' : 'el ' + fechaLarga(dia).split(',')[0];
  const FraseAgenda = !activas.length ? null : html`<${Frase}>${!activas.length ? ''
    : html`Tienes <b>${activas.length} ${activas.length === 1 ? 'cita' : 'citas'}</b> ${nDia}${estimado > 0 ? html`, unos <b class="v num">${D.m(estimado)}</b> si vienen todos` : ''}.${proxima ? html` ${proxima.t <= ahora ? 'Ahora' : 'La próxima'}: <b>${(proxima.nom || 'Cliente').split(' ')[0]}</b>${proxima.t <= ahora ? '' : ' a las ' + hora(proxima.t)}.` : esHoy ? ' Ya no quedan por atender.' : ''}`}</${Frase}>`;
  if (tel) return html`
    <div class="fila entra"><h1 class="titulo crece">Agenda</h1><${BotonGuiame} k="agenda" /><${BotonAyuda} /><button type="button" data-guia="nueva-cita" class="icono-btn toca boton-agregar" aria-label="Nueva cita" onClick=${() => nueva({ pro })}><${Icono} n="mas1" t=${20} g=${2.6} /></button></div>
    ${FraseAgenda}
    ${Dias}
    ${pros.length > 1 && html`<div class="chips desliza" data-guia="pros">${[{ id: '', n: 'Todos' }].concat(pros).map(p => html`<button type="button" key=${p.id} class=${'chip chico toca' + (pro === p.id ? ' on' : '')} onClick=${() => setPro(p.id)}>${p.id && html`<i class="punto-grupo" style=${{ background: colorPro(S, p.id) }}></i>`}${p.id ? p.n.split(' ')[0] : 'Todos'}</button>`)}</div>`}
    ${Resumen}
    ${vistas.length ? html`<${ListaDia} lista=${vistas} conPro=${!pro} hoy=${dia === inicioDia(Date.now())} />` : Vacio}`;

  // Computadora: una columna por profesional.
  const cols = pros.length ? pros : [{ id: '', n: 'Citas' }];
  if (!S.citas.length) return html`<div class="pila" style="gap:14px;max-width:560px;margin:24px auto 0">${Vacio}</div>`;
  return html`<div class="pila" style="gap:14px">
    ${FraseAgenda}
    <div class="fila" style="gap:12px">${Dias}<span style="flex:1"></span><button type="button" class="btn2 lleno toca" data-guia="nueva-cita" onClick=${() => nueva()}>+ Cita</button></div>
    ${Resumen}
    <div class="agenda-cols" style=${{ gridTemplateColumns: 'repeat(' + Math.min(cols.length, 4) + ', minmax(0, 1fr))' }}>${cols.map((p, k) => { const lista = delDia.filter(c => !p.id || c.pro === p.id); return html`
      <section class="tarjeta entra" key=${p.id} style=${{ '--i': k, padding: '14px' }}>
        <div class="fila" style="gap:10px;margin-bottom:10px"><span class="logo redondo" style=${{ width: '34px', height: '34px', fontSize: '12px', background: colorPro(S, p.id), color: '#fff' }}>${iniciales(p.n)}</span>
          <span class="crece" style="display:flex;flex-direction:column"><b style="font-size:14px">${p.n}</b><span class="sub">${lista.filter(citaActiva).length} por atender</span></span>
          <button type="button" class="icono-btn chico toca" aria-label=${'Nueva cita con ' + p.n} onClick=${() => nueva({ pro: p.id })}><${Icono} n="mas1" t=${15} g=${2.6} /></button></div>
        ${lista.length ? html`<${ListaDia} lista=${lista} conPro=${false} hoy=${dia === inicioDia(Date.now())} />` : html`<p class="vacio" style="padding:18px 0">Día libre</p>`}
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
  // Horas que se ofrecen: las del horario de esa persona (o del negocio), sin almuerzo, días libres ni vacaciones.
  const ahora = Date.now(), horas = horasDelDia(S, f.pro, f.dia, dur);
  const porQueNo = horas.length ? '' : fueraDeHorario(S, f.pro, f.dia + 12 * 3600000, 30);
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
      <div class="paso-cita"><span class="paso-n">1</span><b>¿Para quién?</b></div>
      <label class="campo"><span class="sr">Nombre del cliente</span><input type="text" value=${f.nom} placeholder="Nombre del cliente" autocomplete="off" onInput=${e => pon({ nom: e.target.value, cli: '' })} /></label>
      ${sug.length > 0 && html`<div class="chips entra">${sug.map(x => html`<button type="button" key=${x.id} class="chip chico toca" onClick=${() => pon({ nom: x.n, tel: x.tel || f.tel, cli: x.id })}><${Icono} n="personas" t=${13} />${x.n}</button>`)}</div>`}
      <label class="campo"><span class="sr">Teléfono</span><input type="tel" inputmode="tel" value=${f.tel} placeholder="Teléfono (para avisarle por WhatsApp)" autocomplete="off" onInput=${e => pon({ tel: e.target.value })} /></label>

      <div class="paso-cita"><span class="paso-n">2</span><b>¿Qué se va a hacer?</b>${elegidos.length > 0 && html`<span class="sub">${dur} min · ${D.m(total)}</span>`}</div>
      ${!srvs.length && html`<div class="tarjeta pila" style="box-shadow:none;background:var(--amber-soft);gap:8px"><b style="font-size:14px">Primero agrega tus servicios</b><span class="sub">Así la cita sabe cuánto dura y cuánto cobrar.</span><button type="button" class="btn2 chico lleno toca" style="align-self:flex-start" onClick=${() => c(() => abrir('sugerencias'))}>Agregar lo típico</button></div>`}
      ${srvs.length > 0 && html`<div class="servicios-cita">${srvs.map(p => { const on = f.srv.includes(p.id); return html`
        <button type="button" key=${p.id} class=${'srv-cita toca' + (on ? ' on' : '')} aria-pressed=${on ? 'true' : 'false'} onClick=${() => pon({ srv: on ? f.srv.filter(x => x !== p.id) : f.srv.concat([p.id]) })}>
          <span class="marca-check">${on && html`<${Icono} n="check" t=${12} g=${3.2} c="#fff" />`}</span>
          <b>${p.n}</b><span class="sub num">${p.dur ? p.dur + ' min · ' : ''}${D.m(p.p)}</span>
        </button>`; })}</div>`}

      ${pros.length > 1 && html`<div class="paso-cita"><span class="paso-n">3</span><b>¿Con quién?</b></div>
        <div class="pros-cita">${pros.map(p => html`<button type="button" key=${p.id} class=${'pro-cita toca' + (f.pro === p.id ? ' on' : '')} onClick=${() => pon({ pro: p.id, min: null })}>
          <span class="logo redondo" style=${{ background: colorPro(S, p.id), color: '#fff' }}>${iniciales(p.n)}</span><span>${p.n.split(' ')[0]}</span></button>`)}</div>`}

      <div class="paso-cita"><span class="paso-n">${pros.length > 1 ? 4 : 3}</span><b>¿Cuándo?</b></div>
      <div class="chips desliza dias-agenda">${Array.from({ length: 14 }, (_, i) => diaMas(i)).map(t => html`
        <button type="button" key=${t} class=${'dia-chip toca' + (t === f.dia ? ' on' : '')} onClick=${() => pon({ dia: t, min: null })}><small>${nombreDia(t)}</small><b class="num">${new Date(t).getDate()}</b></button>`)}</div>
      ${['Mañana', 'Tarde', 'Noche'].map(bq => { const hs = horas.filter(m => bloqueDe(f.dia + m * 60000) === bq && f.dia + m * 60000 >= ahora - 15 * 60000); if (!hs.length) return null; const libres = hs.filter(m => !ocupada(m)).length; return html`
        <div class="pila" style="gap:6px" key=${bq}><span class="sub" style="font-weight:600">${bq} <span class="faint">· ${libres} ${libres === 1 ? 'libre' : 'libres'}</span></span>
          <div class="horas-grid">${hs.map(m => { const oc = ocupada(m); return html`<button type="button" key=${m} class=${'chip chico toca' + (f.min === m ? ' on' : '') + (oc ? ' ocupada' : '')} disabled=${oc} onClick=${() => pon({ min: m })}>${partes(f.dia + m * 60000)[0]}</button>`; })}</div></div>`; })}
      ${porQueNo ? html`<p class="vacio">${(pros.find(p => p.id === f.pro) || { n: 'El negocio' }).n.split(' ')[0]}: ${porQueNo.toLowerCase()}. Elige otro día${pros.length > 1 ? ' u otra persona' : ''}.</p>`
        : horas.every(m => f.dia + m * 60000 < ahora - 15 * 60000) && html`<p class="vacio">Ya no quedan horas ${f.dia === inicioDia(ahora) ? 'hoy' : 'este día'}. Elige otro día.</p>`}
      <label class="campo"><span>Nota (opcional)</span><input type="text" value=${f.nota} placeholder="Ej.: degradado bajo, trae foto" autocomplete="off" onInput=${e => pon({ nota: e.target.value })} /></label>`,
    pie: html`${(elegidos.length > 0 || f.min != null) && html`<div class="resumen-cita"><${Icono} n="calendario" t=${16} />
        <span class="crece corta">${[elegidos.map(p => p.n).join(' + '), f.min != null ? nombreDia(f.dia) + ' ' + new Date(f.dia).getDate() + ', ' + textoHora(f.min) : 'elige la hora'].filter(Boolean).join(' · ')}</span><b class="num">${D.m(total)}</b></div>`}
      <button type="button" class=${'btn toca' + (f.nom.trim() && elegidos.length && f.min != null ? '' : ' apagado')} onClick=${() => guardar(c, false)}>${c0 ? 'Guardar cambios' : 'Guardar cita'}</button>
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
