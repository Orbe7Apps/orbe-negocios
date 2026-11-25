// Página pública de reservas: el cliente elige servicio, con quién, día y hora libre, y reserva.
// No necesita cuenta. Solo ve lo que el negocio publicó (servicios, horarios y horas ocupadas), nunca datos de otros clientes.
import { html, render, useState, useEffect } from './lib/preact-htm.js';
import { Icono, Avisos, avisar, LogoOrbe } from './ui.js';
import { horasDelDia, fueraDeHorario } from './horario.js';

const URL_NUBE = 'https://cwjmstctrxrcisfbknam.supabase.co';
const CLAVE_PUBLICA = 'sb_publishable_x95K8o7WAhVtldQrU3fnGw_nbcVSEGE';
const DIA = 86400000;
const slug = (new URLSearchParams(location.search).get('n') || '').toLowerCase();
const hoy0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const diaMas = i => { const d = new Date(hoy0()); d.setDate(d.getDate() + i); return d.getTime(); };
const hora = t => new Date(t).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });
const nombreDia = t => t === hoy0() ? 'Hoy' : t === diaMas(1) ? 'Mañana' : new Date(t).toLocaleDateString('es', { weekday: 'short' }).replace('.', '');
const fechaLarga = t => new Date(t).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
const telWA = t => String(t || '').replace(/\D/g, '');

let sb = null;
const cliente = () => sb || (sb = window.supabase.createClient(URL_NUBE, CLAVE_PUBLICA, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }));
const explicar = er => String((er && er.message) || er || 'Algo salió mal').replace(/^.*?:\s(?=[A-ZÁÉÍÓÚ])/, '');

function App() {
  const [pag, setPag] = useState(null), [estado, setEstado] = useState('cargando');
  const [f, setF] = useState({ srv: [], pro: '', dia: hoy0(), min: null, nom: '', tel: '', nota: '' });
  const [hecha, setHecha] = useState(null), [ocupado, setOcupado] = useState(false);
  const pon = o => setF(x => Object.assign({}, x, o));
  const cargar = async () => {
    if (!slug) { setEstado('sin'); return; }
    const { data, error } = await cliente().rpc('pagina_reservas', { slug });
    if (error) { setEstado('error'); return; }
    if (!data) { setEstado('sin'); return; }
    setPag(data); setEstado('listo'); document.title = 'Reservar en ' + data.nombre;
    if (data.pros && data.pros.length === 1) pon({ pro: data.pros[0].id });
  };
  useEffect(() => { cargar().catch(() => setEstado('error')); }, []);

  if (estado === 'cargando') return html`<div class="res-caja"><p class="vacio" style="margin-top:30vh">Cargando…</p></div>`;
  if (estado !== 'listo') return html`<div class="res-caja"><div class="tarjeta pila" style="margin-top:18vh;text-align:center;align-items:center;gap:10px;padding:28px">
    <${LogoOrbe} t=${44} /><b style="font-size:18px">${estado === 'error' ? 'No pudimos abrir las reservas' : 'Este link de reservas no está activo'}</b>
    <span class="sub" style="line-height:1.5">${estado === 'error' ? 'Revisa tu conexión y vuelve a intentarlo.' : 'Escríbele al negocio para agendar tu cita.'}</span>
    ${estado === 'error' && html`<button type="button" class="btn toca" onClick=${() => { setEstado('cargando'); cargar().catch(() => setEstado('error')); }}>Intentar otra vez</button>`}</div></div>`;

  // Datos para las reglas de horario (las mismas de la app).
  const S = { negocio: { horario: pag.horario }, perfiles: (pag.pros || []).map(p => ({ id: p.id, horario: p.h, aus: p.aus || [] })) };
  const elegidos = f.srv.map(id => pag.servicios.find(s => s.id === id)).filter(Boolean);
  const dur = Math.max(30, elegidos.reduce((a, s) => a + (s.dur || 30), 0));
  const ocupados = (pag.ocupado || []).concat(pag.pendientes || []);
  const choca = (pro, t) => ocupados.some(o => (o.pro || '') === (pro || '') && o.t < t + dur * 60000 && o.t + (o.dur || 30) * 60000 > t);
  const pros = pag.pros || [];
  const conQuien = f.pro ? [f.pro] : pros.length ? pros.map(p => p.id) : [''];
  // Una hora se ofrece si alguna de las personas posibles trabaja y está libre.
  const libreCon = t => conQuien.find(pid => !fueraDeHorario(S, pid, t, dur) && !choca(pid, t));
  const ahora = Date.now();
  const horasDia = dia => { const set = new Set(); conQuien.forEach(pid => horasDelDia(S, pid, dia, dur).forEach(m => set.add(m))); return Array.from(set).sort((a, b) => a - b).filter(m => dia + m * 60000 > ahora + 30 * 60000 && libreCon(dia + m * 60000) != null); };
  const horas = elegidos.length ? horasDia(f.dia) : [];
  const reservar = async () => {
    if (!elegidos.length) { avisar('Elige un servicio'); return; }
    if (f.min == null) { avisar('Elige la hora'); return; }
    if (f.nom.trim().length < 2) { avisar('Escribe tu nombre'); return; }
    if (telWA(f.tel).length < 7) { avisar('Escribe tu WhatsApp'); return; }
    const t = f.dia + f.min * 60000, pro = libreCon(t) || '';
    setOcupado(true);
    const { error } = await cliente().rpc('reservar', { slug, nom: f.nom.trim(), tel: f.tel.trim(), srv: f.srv, pro, t, dur, nota: f.nota.trim() });
    setOcupado(false);
    if (error) { avisar(explicar(error)); if (/ocup/.test(error.message)) { pon({ min: null }); cargar(); } return; }
    setHecha({ t, pro: (pros.find(p => p.id === pro) || {}).n || '', srv: elegidos.map(s => s.n).join(' + ') });
  };

  const Cabeza = html`<header class="fila res-cab">${pag.logo ? html`<img src=${pag.logo} alt="" class="res-logo" />` : html`<span class="res-logo res-inic">${pag.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span>`}
    <span class="crece" style="display:flex;flex-direction:column;min-width:0"><b class="corta" style="font-size:19px">${pag.nombre}</b><span class="sub corta">${pag.dir || 'Reserva tu cita'}</span></span></header>`;

  if (hecha) return html`<div class="res-caja">${Cabeza}
    <div class="tarjeta pila entra" style="align-items:center;text-align:center;gap:10px;padding:28px 20px">
      <span style="width:72px;height:72px;border-radius:50%;background:var(--in);display:grid;place-items:center;animation:pop .5s var(--spring) both"><${Icono} n="check" t=${34} g=${2.8} c="#0b0a14" /></span>
      <b style="font-size:21px">¡Listo, ${f.nom.trim().split(' ')[0]}!</b>
      <span class="sub" style="line-height:1.5;font-size:15px">Tu cita quedó para el <b>${fechaLarga(hecha.t)}</b> a las <b>${hora(hecha.t)}</b>${hecha.pro ? ' con ' + hecha.pro : ''}.<br />${hecha.srv}</span>
      <span class="sub">Te van a escribir por WhatsApp para confirmarla.</span>
      ${pag.tel && html`<a class="btn2 verde toca" style="min-height:50px;border-radius:25px;justify-content:center;text-decoration:none;width:100%" href=${'https://wa.me/' + telWA(pag.tel) + '?text=' + encodeURIComponent('Hola, acabo de reservar para el ' + fechaLarga(hecha.t) + ' a las ' + hora(hecha.t) + ' (' + hecha.srv + '). Soy ' + f.nom.trim() + '.')} target="_blank" rel="noopener">Escribirle al negocio</a>`}
    </div><span class="sub res-pie">Reservas con Orbe Negocios</span></div>`;

  return html`<div class="res-caja">${Cabeza}
    <section class="tarjeta pila entra"><div class="paso-cita"><span class="paso-n">1</span><b>¿Qué te vas a hacer?</b></div>
      <div class="servicios-cita">${pag.servicios.map(s => { const on = f.srv.includes(s.id); return html`<button type="button" key=${s.id} class=${'srv-cita toca' + (on ? ' on' : '')} aria-pressed=${on ? 'true' : 'false'} onClick=${() => pon({ srv: on ? f.srv.filter(x => x !== s.id) : f.srv.concat([s.id]), min: null })}>
        <span class="marca-check">${on && html`<${Icono} n="check" t=${12} g=${3.2} c="#fff" />`}</span><b>${s.n}</b><span class="sub num">${s.dur} min · ${s.p}</span></button>`; })}</div>
      ${!pag.servicios.length && html`<p class="vacio">El negocio todavía no publicó sus servicios.</p>`}</section>
    ${pros.length > 1 && html`<section class="tarjeta pila entra" style="--i:1"><div class="paso-cita"><span class="paso-n">2</span><b>¿Con quién?</b></div>
      <div class="chips">${[{ id: '', n: 'Cualquiera' }].concat(pros).map(p => html`<button type="button" key=${p.id} class=${'chip toca' + (f.pro === p.id ? ' on' : '')} onClick=${() => pon({ pro: p.id, min: null })}>${p.n}</button>`)}</div></section>`}
    <section class="tarjeta pila entra" style="--i:2"><div class="paso-cita"><span class="paso-n">${pros.length > 1 ? 3 : 2}</span><b>¿Cuándo?</b></div>
      <div class="chips desliza dias-agenda">${Array.from({ length: 14 }, (_, i) => diaMas(i)).map(t => html`<button type="button" key=${t} class=${'dia-chip toca' + (t === f.dia ? ' on' : '')} onClick=${() => pon({ dia: t, min: null })}><small>${nombreDia(t)}</small><b class="num">${new Date(t).getDate()}</b></button>`)}</div>
      ${!elegidos.length ? html`<span class="sub">Primero elige el servicio.</span>`
        : horas.length ? html`<div class="horas-grid">${horas.map(m => html`<button type="button" key=${m} class=${'chip chico toca' + (f.min === m ? ' on' : '')} onClick=${() => pon({ min: m })}>${hora(f.dia + m * 60000)}</button>`)}</div>`
        : html`<p class="vacio">No quedan horas libres este día. Prueba otro.</p>`}</section>
    <section class="tarjeta pila entra" style="--i:3"><div class="paso-cita"><span class="paso-n">${pros.length > 1 ? 4 : 3}</span><b>Tus datos</b></div>
      <label class="campo"><span>Nombre</span><input type="text" value=${f.nom} autocomplete="name" placeholder="Tu nombre" onInput=${e => pon({ nom: e.target.value })} /></label>
      <label class="campo"><span>WhatsApp</span><input type="tel" inputmode="tel" value=${f.tel} autocomplete="tel" placeholder="0414-0000000" onInput=${e => pon({ tel: e.target.value })} /></label>
      <label class="campo"><span>Nota (opcional)</span><input type="text" value=${f.nota} placeholder="Algo que debamos saber" onInput=${e => pon({ nota: e.target.value })} /></label>
      <span class="sub" style="line-height:1.5;font-size:12.5px">Tu nombre y tu WhatsApp solo los usa <b>${pag.nombre}</b> para confirmar y recordarte tu cita. No se usan para publicidad. <a href="privacidad.html" target="_blank" rel="noopener" style="color:var(--accent-text);font-weight:600">Política de privacidad</a></span></section>
    <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${reservar}>${ocupado ? 'Reservando…' : f.min != null ? 'Reservar ' + nombreDia(f.dia).toLowerCase() + ' a las ' + hora(f.dia + f.min * 60000) : 'Reservar'}</button>
    <span class="sub res-pie">Reservas con Orbe Negocios</span></div>`;
}
render(html`<${App} /><${Avisos} />`, document.getElementById('app'));
