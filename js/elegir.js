// Elegir fecha, hora u opción con piezas propias de Orbe (en vez del calendario y las listas del teléfono):
// un botón que muestra lo elegido y, al tocarlo, una capa que sube desde abajo con un calendario grande,
// una rueda de horas que se desliza con el dedo o fichas para elegir con un toque.
import { html, useState, useEffect, useRef } from './lib/preact-htm.js';
import { usePortal } from './guia.js';
import { Icono, simbolo, ponerCapaEncima, quitarCapaEncima, cerrarCapaEncima, saltarAtras } from './ui.js';

const DIA = 86400000;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const inicioDe = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const hora12 = m => ((Math.floor(m / 60) + 11) % 12 + 1) + ':' + String(m % 60).padStart(2, '0') + (m < 720 ? ' am' : ' pm');
// “Hoy”, “Mañana”, “Pasado mañana” o “Viernes 4 de diciembre”.
export function textoDia(t) {
  const n = Math.round((inicioDe(t) - inicioDe(Date.now())) / DIA), d = new Date(t);
  if (n === 0) return 'Hoy'; if (n === 1) return 'Mañana'; if (n === 2) return 'Pasado mañana'; if (n === -1) return 'Ayer';
  const s = DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' de ' + d.getFullYear() : '');
  return s[0].toUpperCase() + s.slice(1);
}

const diaCorto = t => { const s = textoDia(t); return /^(Hoy|Mañana|Pasado|Ayer)/.test(s) ? s : s.slice(0, 3) + ' ' + new Date(t).getDate() + ' ' + MESES[new Date(t).getMonth()].slice(0, 3); };

// ---------- capa que sube desde abajo, encima de la hoja abierta ----------
// El botón “atrás” del teléfono cierra solo la capa (no la hoja de debajo).
function Capa({ titulo, onCerrar, children, pie }) {
  const [sale, setSale] = useState(false), caja = useRef(null), arr = useRef(null);
  const cerrar = () => { if (sale) return; setSale(true); setTimeout(onCerrar, 260); };
  const ref = useRef(cerrar); ref.current = cerrar;
  useEffect(() => {
    let porAtras = false;
    try { history.pushState({ capa: true, sub: true }, ''); } catch (e) {}
    const porBoton = () => { porAtras = true; ref.current(); };
    ponerCapaEncima(porBoton);
    // Si no hay hoja debajo que atienda el “atrás”, lo atiende la capa.
    const pop = () => { if (cerrarCapaEncima()) return; };
    const tecla = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); ref.current(); } };
    window.addEventListener('popstate', pop); window.addEventListener('keydown', tecla, true);
    return () => {
      window.removeEventListener('popstate', pop); window.removeEventListener('keydown', tecla, true);
      quitarCapaEncima(porBoton);
      // Quitar la entrada propia del historial sin que la hoja de debajo se cierre.
      if (!porAtras && history.state && history.state.sub) { saltarAtras(); history.back(); }
    };
  }, []);
  // Cerrar arrastrando hacia abajo desde la cabecera: gesto claro de 14 px.
  const baja = e => { if (e.target.closest('button')) return; arr.current = { y: e.clientY, dy: 0, on: false }; e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); };
  const mueve = e => { const a = arr.current; if (!a) return; a.dy = e.clientY - a.y; if (!a.on && a.dy > 14) a.on = true; if (a.on && caja.current) { caja.current.style.transition = 'none'; caja.current.style.transform = 'translateY(' + Math.max(0, a.dy - 14) + 'px)'; } };
  const suelta = () => { const a = arr.current; arr.current = null; if (!a || !caja.current) return; caja.current.style.transition = ''; caja.current.style.transform = ''; if (a.on && a.dy > 80) cerrar(); };
  return html`<div class=${'velo capa-velo' + (sale ? ' sale' : '')} onClick=${cerrar}></div>
    <div class=${'hoja capa' + (sale ? ' sale' : '')} ref=${caja} role="dialog" aria-modal="true" aria-label=${titulo}>
      <div class="hoja-cab" onPointerDown=${baja} onPointerMove=${mueve} onPointerUp=${suelta} onPointerCancel=${suelta}>
        <span class="rayita"></span>
        <div class="fila"><h2>${titulo}</h2><button type="button" class="icono-btn chico toca" aria-label="Cerrar" onClick=${cerrar}><${Icono} n="cerrar" t=${16} g=${2.4} /></button></div>
      </div>
      <div class="hoja-cuerpo">${typeof children === 'function' ? children(cerrar) : children}</div>
      ${pie && html`<div class="hoja-pie">${pie(cerrar)}</div>`}
    </div>`;
}
// La capa se dibuja fuera de la hoja (en el body), para quedar encima de todo.
function useCapa(nodo) { usePortal(nodo); }

// ---------- rueda: el número elegido queda grande en el centro ----------
const ALTO = 48;
function Rueda({ items, i, onCambio, ancho = 76, etiqueta }) {
  const r = useRef(null), actual = useRef(i), [sel, setSel] = useState(i);
  useEffect(() => { if (r.current) r.current.scrollTop = i * ALTO; }, []);
  const mover = () => {
    const k = Math.max(0, Math.min(items.length - 1, Math.round(r.current.scrollTop / ALTO)));
    if (k !== actual.current) { actual.current = k; setSel(k); onCambio(k); try { navigator.vibrate && navigator.vibrate(4); } catch (e) {} }
  };
  return html`<div class="rueda" ref=${r} style=${{ width: ancho + 'px' }} onScroll=${mover} role="listbox" aria-label=${etiqueta}>
    ${items.map((t, k) => html`<div key=${k} role="option" aria-selected=${k === sel ? 'true' : 'false'} class=${k === sel ? 'on' : Math.abs(k - sel) === 1 ? 'c1' : ''} onClick=${() => r.current.scrollTo({ top: k * ALTO, behavior: 'smooth' })}>${t}</div>`)}
  </div>`;
}
const HORAS12 = Array.from({ length: 12 }, (_, k) => String(k + 1));
const MINUTOS = Array.from({ length: 60 }, (_, k) => String(k).padStart(2, '0'));
// Tres ruedas: hora, minutos y am/pm. m = minutos desde las 00:00.
export function Ruedas({ m, onCambio }) {
  const v = useRef(m); v.current = m;
  const pon = (h12, mi, pm) => onCambio((h12 % 12 + (pm ? 12 : 0)) * 60 + mi);
  const h = Math.floor(m / 60), mi = m % 60, pm = h >= 12;
  return html`<div class="ruedas">
    <${Rueda} etiqueta="Hora" items=${HORAS12} i=${(h + 11) % 12} onCambio=${k => { const x = v.current; pon(k + 1, x % 60, x >= 720); }} />
    <span class="ruedas-dos">:</span>
    <${Rueda} etiqueta="Minutos" items=${MINUTOS} i=${mi} onCambio=${k => { const x = v.current; pon(Math.floor(x / 60), k, x >= 720); }} />
    <${Rueda} etiqueta="Mañana o tarde" items=${['am', 'pm']} i=${pm ? 1 : 0} onCambio=${k => { const x = v.current; pon(Math.floor(x / 60), x % 60, k === 1); }} />
  </div>`;
}

// ---------- calendario ----------
function Calendario({ dia, onDia, desde }) {
  const [mes, setMes] = useState(() => { const d = new Date(dia || Date.now()); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const hoy = inicioDe(Date.now()), ini = (mes.getDay() + 6) % 7, dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const otro = n => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1));
  const celdas = [];
  for (let k = 0; k < ini; k++) celdas.push(html`<span key=${'v' + k}></span>`);
  for (let k = 1; k <= dias; k++) {
    const t = new Date(mes.getFullYear(), mes.getMonth(), k).getTime();
    celdas.push(html`<button type="button" key=${t} class=${'cal-dia toca' + (t === hoy ? ' hoy' : '') + (dia && t === inicioDe(dia) ? ' on' : '')} disabled=${desde != null && t < desde} aria-label=${textoDia(t)} onClick=${() => onDia(t)}>${k}</button>`);
  }
  return html`<div class="pila" style="gap:10px">
    <div class="cal-mes"><button type="button" class="icono-btn toca" aria-label="Mes anterior" onClick=${() => otro(-1)}><${Icono} n="atras" t=${18} /></button>
      <b>${MESES[mes.getMonth()][0].toUpperCase() + MESES[mes.getMonth()].slice(1)} ${mes.getFullYear()}</b>
      <button type="button" class="icono-btn toca" aria-label="Mes siguiente" onClick=${() => otro(1)}><span style="display:inline-flex;transform:scaleX(-1)"><${Icono} n="atras" t=${18} /></span></button></div>
    <div class="cal">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, k) => html`<span key=${'d' + k} class="cal-ds">${d}</span>`)}${celdas}</div>
  </div>`;
}

// Botón que muestra lo elegido (ícono, etiqueta pequeña y valor) y abre la capa.
const Boton = ({ ic, etiqueta, texto, onClick, vacio, guia }) => html`<button type="button" class="elegido toca" data-guia=${guia} onClick=${onClick}>
  <span class="elegido-ic"><${Icono} n=${ic} t=${17} /></span>
  <span class="elegido-tx">${etiqueta && html`<small>${etiqueta}</small>`}<b class=${vacio ? 'faint' : ''}>${texto}</b></span>
  <${Icono} n="abajo" t=${15} c="var(--muted)" />
</button>`;

// ---------- fecha (y hora, si conHora) ----------
// valor: milisegundos (0 = sin fecha). desde: primer día que se puede elegir. vacio: texto cuando no hay fecha.
export function CampoFecha({ valor, onCambio, etiqueta, titulo, conHora, desde, vacio = 'Elegir día', horaBase = 17 * 60, quitar, guia }) {
  const [abierto, setAbierto] = useState(false);
  const [dia, setDia] = useState(0), [min, setMin] = useState(horaBase);
  const abrir = () => { setDia(valor ? inicioDe(valor) : 0); setMin(valor && conHora ? new Date(valor).getHours() * 60 + new Date(valor).getMinutes() : horaBase); setAbierto(true); };
  const listo = cerrar => { if (!dia) return; onCambio(dia + (conHora ? min * 60000 : 0)); cerrar(); };
  useCapa(abierto ? html`<${Capa} titulo=${titulo || (conHora ? '¿Qué día y a qué hora?' : '¿Qué día?')} onCerrar=${() => setAbierto(false)}
    pie=${cerrar => html`<button type="button" class=${'btn toca' + (dia ? '' : ' apagado')} onClick=${() => listo(cerrar)}>${dia ? 'Listo · ' + diaCorto(dia) + (conHora ? ', ' + hora12(min) : '') : 'Toca un día'}</button>`}>${cerrar => html`
    <${Calendario} dia=${dia} desde=${desde} onDia=${t => { setDia(t); if (conHora) setTimeout(() => { const r = document.querySelector('.capa .ruedas'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 80); }} />
    ${conHora && html`<span class="titulo-funciones">¿A qué hora?</span><${Ruedas} m=${min} onCambio=${setMin} />`}
    ${quitar && valor ? html`<button type="button" class="enlace-tasa toca" style="align-self:center;padding:8px 12px" onClick=${() => { onCambio(0); cerrar(); }}>Quitar fecha</button>` : null}`}
  </${Capa}>` : null);
  const texto = valor ? textoDia(valor) + (conHora ? ' · ' + hora12(new Date(valor).getHours() * 60 + new Date(valor).getMinutes()) : '') : vacio;
  return html`<${Boton} ic="calendario" etiqueta=${etiqueta} texto=${texto} vacio=${!valor} onClick=${abrir} guia=${guia} />`;
}

// ---------- hora sola ----------
// valor: minutos desde las 00:00.
export function CampoHora({ valor, onCambio, etiqueta, titulo, guia }) {
  const [abierto, setAbierto] = useState(false), [min, setMin] = useState(valor);
  useCapa(abierto ? html`<${Capa} titulo=${titulo || '¿A qué hora?'} onCerrar=${() => setAbierto(false)}
    pie=${cerrar => html`<button type="button" class="btn toca" onClick=${() => { onCambio(min); cerrar(); }}>Listo · ${hora12(min)}</button>`}>
    <${Ruedas} m=${min} onCambio=${setMin} />
    <span class="sub" style="text-align:center">Desliza cada número hacia arriba o abajo.</span>
  </${Capa}>` : null);
  return html`<${Boton} ic="reloj" etiqueta=${etiqueta} texto=${hora12(valor)} onClick=${() => { setMin(valor); setAbierto(true); }} guia=${guia} />`;
}

// ---------- una opción de una lista ----------
// opciones: [{ v, n, sub?, ic?, pre? }] o textos. Hasta 8: fichas; más: lista (con buscador si pasan de 12; el teclado no se abre solo).
export function CampoOpcion({ valor, opciones, onCambio, etiqueta, titulo, ic, conSimbolo, compacto, guia, aria }) {
  const [abierto, setAbierto] = useState(false), [q, setQ] = useState('');
  const ops = opciones.map(o => typeof o === 'string' ? { v: o, n: o } : o);
  const elegida = ops.find(o => o.v === valor) || { n: valor || 'Elegir' };
  const muchas = ops.length > 8, filtro = q.trim().toLowerCase();
  const icono = o => o.ic || (conSimbolo ? simbolo(o.n) : null);
  const tomar = (o, cerrar) => { onCambio(o.v); setTimeout(cerrar, 140); };
  useCapa(abierto ? html`<${Capa} titulo=${titulo || etiqueta || 'Elegir'} onCerrar=${() => { setAbierto(false); setQ(''); }}>${cerrar => muchas
    ? html`${ops.length > 12 && html`<label class="buscador"><${Icono} n="buscar" t=${18} c="var(--muted)" /><input type="search" placeholder="Buscar" value=${q} onInput=${e => setQ(e.target.value)} aria-label="Buscar" /></label>`}
      <div class="opc-lista">${ops.filter(o => !filtro || (o.n + ' ' + (o.sub || '')).toLowerCase().includes(filtro)).map(o => html`<button type="button" key=${o.v} class=${'opc-fila toca' + (o.v === valor ? ' on' : '')} onClick=${() => tomar(o, cerrar)}>
        ${o.pre || (icono(o) && html`<span class="simb"><${Icono} n=${icono(o)} t=${14} g=${2.2} /></span>`)}<span class="crece"><b>${o.n}</b>${o.sub && html`<span class="sub">${o.sub}</span>`}</span>${o.v === valor && html`<${Icono} n="check" t=${16} c="var(--accent)" />`}</button>`)}</div>`
    : html`<div class="fichas-opc">${ops.map(o => html`<button type="button" key=${o.v} class=${'ficha-opc toca' + (o.v === valor ? ' on' : '')} aria-pressed=${o.v === valor ? 'true' : 'false'} onClick=${() => tomar(o, cerrar)}>
        ${o.pre || (icono(o) && html`<span class="simb"><${Icono} n=${icono(o)} t=${14} g=${2.2} /></span>`)}<span class="crece"><b>${o.n}</b>${o.sub && html`<span class="sub">${o.sub}</span>`}</span></button>`)}</div>
      <span class="sub">Un toque elige.</span>`}</${Capa}>` : null);
  if (compacto) return html`<button type="button" class="elegido compacto toca" data-guia=${guia} aria-label=${aria || etiqueta} onClick=${() => setAbierto(true)}>
    ${(elegida.pre || icono(elegida)) && (elegida.pre || html`<span class="simb"><${Icono} n=${icono(elegida)} t=${13} g=${2.2} /></span>`)}<span class="corta crece">${elegida.n}</span><${Icono} n="abajo" t=${14} c="var(--muted)" /></button>`;
  return html`<${Boton} ic=${ic || icono(elegida) || 'lista'} etiqueta=${etiqueta} texto=${elegida.n} onClick=${() => setAbierto(true)} guia=${guia} />`;
}
