// Horario de atención del negocio y de cada profesional: qué días trabaja, de qué hora a qué hora, almuerzo,
// y vacaciones o días libres. La agenda (y el link de reservas) solo ofrecen las horas en que la persona trabaja.
import { html } from './lib/preact-htm.js';
import { Interruptor } from './ui.js';
import { CampoFecha, CampoHora } from './elegir.js';

export const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGO = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
export const HORARIO_BASE = { dias: [1, 2, 3, 4, 5, 6], ini: 8 * 60, fin: 20 * 60, alm: null };
export const aHora = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
export const deHora = s => { const [h, m] = String(s || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const DIA = 86400000;

// El horario que vale para alguien: el suyo, si tiene; si no, el del negocio.
export function horarioDe(S, pid) {
  const p = (S.perfiles || []).find(x => x.id === pid) || {};
  return Object.assign({}, HORARIO_BASE, S.negocio.horario || {}, p.horario || {});
}
// Vacaciones o días libres de alguien que tocan ese día.
export function ausenciaEn(S, pid, t) {
  const p = (S.perfiles || []).find(x => x.id === pid) || {};
  return (p.aus || []).find(a => t >= a.desde && t < a.hasta + DIA) || null;
}
// ¿Por qué no se puede a esa hora? (vacío = se puede). dur en minutos.
export function fueraDeHorario(S, pid, t, dur) {
  const h = horarioDe(S, pid), d = new Date(t), dow = d.getDay(), min = d.getHours() * 60 + d.getMinutes();
  const aus = pid ? ausenciaEn(S, pid, t) : null;
  if (aus) return aus.motivo || 'De vacaciones';
  if (!h.dias.includes(dow)) return 'No trabaja los ' + DIAS_LARGO[dow];
  if (min < h.ini || min + dur > h.fin) return 'Fuera del horario';
  if (h.alm && min < h.alm[1] && min + dur > h.alm[0]) return 'Hora de almuerzo';
  return '';
}
// Horas que se ofrecen ese día (cada 30 minutos, que quepa el servicio completo).
export function horasDelDia(S, pid, dia, dur) {
  const h = horarioDe(S, pid), out = [];
  for (let m = Math.floor(h.ini / 30) * 30; m + dur <= h.fin; m += 30) if (!fueraDeHorario(S, pid, dia + m * 60000, dur)) out.push(m);
  return out;
}
export const textoHorario = h => (h.dias.length === 7 ? 'Todos los días' : h.dias.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => DIAS_SEM[x]).join(', ')) + ' · ' + aHora(h.ini) + ' a ' + aHora(h.fin) + (h.alm ? ' · almuerzo ' + aHora(h.alm[0]) + '–' + aHora(h.alm[1]) : '');

// Editor: días de la semana, desde/hasta y almuerzo.
export function EditorHorario({ h, onCambio }) {
  const pon = o => onCambio(Object.assign({}, h, o));
  const orden = [1, 2, 3, 4, 5, 6, 0];
  return html`<div class="pila" style="gap:12px">
    <div class="campo"><span>Días que trabaja</span><div class="chips">${orden.map(x => { const on = h.dias.includes(x); return html`<button type="button" key=${x} class=${'chip chico toca' + (on ? ' on' : '')} aria-pressed=${on ? 'true' : 'false'} onClick=${() => pon({ dias: on ? h.dias.filter(y => y !== x) : h.dias.concat([x]) })}>${DIAS_SEM[x]}</button>`; })}</div></div>
    <div class="rejilla-2" style="gap:10px">
      <${CampoHora} etiqueta="Abre" titulo="¿A qué hora abre?" valor=${h.ini} onCambio=${v => pon({ ini: v })} />
      <${CampoHora} etiqueta="Cierra" titulo="¿A qué hora cierra?" valor=${h.fin} onCambio=${v => pon({ fin: v })} />
    </div>
    <${Interruptor} on=${!!h.alm} onCambio=${v => pon({ alm: v ? [12 * 60, 13 * 60] : null })} titulo="Hora de almuerzo" sub="La agenda no ofrece esas horas" />
    ${h.alm && html`<div class="rejilla-2 entra" style="gap:10px">
      <${CampoHora} etiqueta="Almuerzo" titulo="¿A qué hora sale a almorzar?" valor=${h.alm[0]} onCambio=${v => pon({ alm: [v, h.alm[1]] })} />
      <${CampoHora} etiqueta="Hasta" titulo="¿A qué hora vuelve?" valor=${h.alm[1]} onCambio=${v => pon({ alm: [h.alm[0], v] })} />
    </div>`}
  </div>`;
}

// Vacaciones y días libres: lista con “+ Agregar”.
export function EditorAusencias({ lista, onCambio }) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const pon = (i, o) => onCambio(lista.map((a, k) => k === i ? Object.assign({}, a, o) : a));
  const vigentes = lista.filter(a => a.hasta >= hoy.getTime());
  return html`<div class="pila" style="gap:8px">
    ${vigentes.length === 0 && html`<span class="sub">Sin vacaciones ni días libres anotados.</span>`}
    ${lista.map((a, i) => a.hasta < hoy.getTime() ? null : html`<div key=${i} class="tarjeta pila entra" style="box-shadow:none;background:var(--fill2);gap:8px;padding:12px">
      <div class="rejilla-2" style="gap:8px">
        <${CampoFecha} etiqueta="Desde" titulo="¿Desde qué día?" valor=${a.desde} onCambio=${v => pon(i, { desde: v, hasta: Math.max(v, a.hasta) })} />
        <${CampoFecha} etiqueta="Hasta" titulo="¿Hasta qué día?" valor=${a.hasta} desde=${a.desde} onCambio=${v => pon(i, { hasta: v })} />
      </div>
      <div class="fila" style="gap:8px"><input type="text" class="crece" value=${a.motivo || ''} placeholder="Motivo (opcional): vacaciones, médico…" style="min-height:44px;border-radius:14px;border:1.5px solid var(--line);background:var(--surface);padding:0 12px;font:inherit" onInput=${e => pon(i, { motivo: e.target.value })} />
        <button type="button" class="btn2 chico rojo toca" onClick=${() => onCambio(lista.filter((_, k) => k !== i))}>Quitar</button></div>
    </div>`)}
    <button type="button" class="btn2 chico toca" style="align-self:flex-start" onClick=${() => onCambio(lista.concat([{ desde: hoy.getTime() + DIA, hasta: hoy.getTime() + 7 * DIA, motivo: 'Vacaciones' }]))}>+ Vacaciones o día libre</button>
  </div>`;
}
