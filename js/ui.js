// Piezas compartidas de la interfaz.
import { html, useState, useEffect, useRef } from './lib/preact-htm.js';
import { useApp } from './ctx.js';

export const ICONOS = {
  dividir: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 3v18',
  persona: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6',
  clienteMas: 'M9 12a4 4 0 100-8 4 4 0 000 8zM2 21c1-4 3-6 7-6s6 2 7 6M19 8v6M16 11h6',
  escanear: 'M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 8v8M10 8v8M13 8v5M13 15v1M16.5 8v8',
  tijeras: 'M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12',
  llave: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  regla: 'M21.3 15.3a2.4 2.4 0 010 3.4l-2.6 2.6a2.4 2.4 0 01-3.4 0L2.7 8.7a2.41 2.41 0 010-3.4l2.6-2.6a2.41 2.41 0 013.4 0zM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2',
  capas: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  armar: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z',
  tele: 'M4 7h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1zM17 2l-5 5-5-5',
  pastilla: 'M10.5 20.5l10-10a4.95 4.95 0 10-7-7l-10 10a4.95 4.95 0 107 7zM8.5 8.5l7 7',
  camisa: 'M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z',
  taza: 'M17 8h1a4 4 0 110 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4zM6 2v2M10 2v2M14 2v2',
  auto: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 002 12v4c0 .6.4 1 1 1h2M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4zM9 17h6',
  brillo: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  pan: 'M5 11a4 4 0 01-1-7.87A4 4 0 0112 3a4 4 0 018 0 4 4 0 01-1 7.87V19a2 2 0 01-2 2H7a2 2 0 01-2-2zM9 13v4M15 13v4',
  inicio: 'M3 12l9-8 9 8M5 10v10h14V10',
  carrito: 'M4 5h2l2.4 10h9.2L20 8H7M10 20h.01M17 20h.01',
  personas: 'M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 10a4 4 0 100-8 4 4 0 000 8zM22 20v-2a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8',
  deshacer: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11',
  lapiz: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z',
  orden: 'M9 3h6v3H9zM8 4.5H6a1 1 0 00-1 1V20a1 1 0 001 1h12a1 1 0 001-1V5.5a1 1 0 00-1-1h-2M9 11h6M9 15h6M9 19h3',
  camara: 'M3 8a2 2 0 012-2h2.2l1.4-2h6.8l1.4 2H19a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM12 17a4 4 0 100-8 4 4 0 000 8z',
  linterna: 'M8 2h8v4l-2 4v11a1 1 0 01-1 1h-2a1 1 0 01-1-1V10L8 6zM12 13v2',
  texto: 'M4 7V5h16v2M9 19h6M12 5v14',
  subir: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  caja: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  lista: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
  campana: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  candado: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
  sube: 'M3 17l6-6 4 4 8-8M14 7h7v7',
  dinero: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  calendario: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  wifi: 'M2 8.8a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 20h.01',
  guardar: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8',
  mundo: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
  tarjeta: 'M2 5h20v14H2zM2 10h20',
  porciento: 'M19 5L5 19M6.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM17.5 20a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  gorro: 'M22 9 12 4 2 9l10 5 10-5zM6 11v5c1.7 1.6 3.8 2.5 6 2.5s4.3-.9 6-2.5v-5M22 9v6',
  escudo: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  doc: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5',
  grafico: 'M3 3v18h18M7 14l4-4 4 4 5-6',
  edificio: 'M3 21h18M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16M15 9h4a2 2 0 012 2v10M9 7h2M9 11h2M9 15h2',
  tienda: 'M3 9l1.5-5h15L21 9M3 9h18M4 9v11h16V9M9 20v-6h6v6',
  comida: 'M7 2v9M4 2v5a3 3 0 006 0V2M7 11v11M17 2c-2 2-3 4-3 7 0 2 1 3 3 3v10',
  citas: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  online: 'M6 7h12l1 14H5L6 7zM9 7a3 3 0 016 0',
  indep: 'M3 7h18v13H3zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18',
  check: 'M5 12l5 5L20 7',
  cerrar: 'M6 6l12 12M18 6L6 18',
  abajo: 'M6 9l6 6 6-6',
  atras: 'M15 18l-6-6 6-6',
  salir: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-5M12 8h.01',
  refrescar: 'M21 12a9 9 0 01-15.5 6.2L3 16M3 12a9 9 0 0115.5-6.2L21 8M21 3v5h-5M3 21v-5h5',
  sig: 'M9 18l6-6-6-6',
  mas1: 'M12 5v14M5 12h14',
  menos1: 'M5 12h14',
  buscar: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  codigo: 'M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 8v8M11 8v8M15 8v8M18 8v8',
  sol: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  descarga: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  alerta: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  basura: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  billete: 'M2 6h20v12H2zM12 15a3 3 0 100-6 3 3 0 000 6zM6 9v.01M18 15v.01',
  movil: 'M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2',
  transfer: 'M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12',
  cripto: 'M12 22a10 10 0 100-20 10 10 0 000 20zM8 8h8M12 8v9',
  reloj: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  casa: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5',
  rayo: 'M13 3L5 13h6l-1 8 8-10h-6z',
  bus: 'M5 4h14v13H5zM5 11h14M8 20v-3M16 20v-3',
  etiqueta: 'M20 12l-8 8-9-9V4h7zM7.5 7.5h.01',
  ajustes: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z'
};

export function Icono({ n, t = 20, g = 2, c = 'currentColor', estilo }) {
  return html`<svg width=${t} height=${t} viewBox="0 0 24 24" fill="none" stroke=${c} stroke-width=${g} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style=${estilo}><path d=${ICONOS[n] || ''}></path></svg>`;
}

// Logo de Orbe Negocios: los círculos se dibujan al aparecer; al tocarlo (o pasar el ratón) da una vuelta.
// “orbita” lo hace girar despacio todo el tiempo (para los logos grandes).
// Bandera del país, circular (SVG guardado en la app, funciona sin internet y en Windows también).
export const Bandera = ({ id, t = 20 }) => html`<img class="bandera" src=${'icons/banderas/' + String(id || 'VE').toLowerCase() + '.svg'} width=${t} height=${t} alt="" aria-hidden="true" decoding="async" />`;

export function LogoOrbe({ t = 42, orbita = false }) {
  const [vuelta, setVuelta] = useState(0);
  const girar = () => setVuelta(v => v + 1);
  return html`<svg width=${t} height=${t} viewBox="0 0 92 92" class=${'logo-orbe' + (orbita ? ' orbita' : '')} role="img" aria-label="Orbe Negocios" onClick=${girar} onMouseEnter=${girar}>
    <rect width="92" height="92" rx="26" fill="#16142a"></rect>
    <g key=${vuelta} class=${'lo-g' + (vuelta ? ' gira' : '')}>
      <g class="lo-orbita">
        <circle class="lo-c lo-c1" cx="35" cy="39.7" r="23" pathLength="100"></circle>
        <circle class="lo-c lo-c2" cx="57" cy="39.7" r="23" pathLength="100"></circle>
        <circle class="lo-c lo-c3" cx="46" cy="58.7" r="23" pathLength="100"></circle>
      </g>
    </g>
  </svg>`;
}

// ---------- avisos ----------
// Tres tipos: “ok” (verde, check), “error” (rojo: algo salió mal o no se puede) e “info” (ámbar: falta un dato o un aviso).
// Si no se dice el tipo, se adivina por el texto.
const ERROR = /no coincid|no se pudo|no pude|no se encontr|no encontré|inválid|incorrect|venci|vencid|no puede|no puedes|no permite|no tiene|no es |no son |no está|ya existe|ya hay|ya tienes|ya lo tiene|debe ser|es más que|no alcanza|demasiados|sin permiso|sin conexión|algo salió mal|no es una copia|hay un trabajo sin|^solo (el|quien)|^ese |^esa /i;
const INFO = /^(escribe|elige|marca|agrega |crea tu|para crear|la contraseña (debe|es muy)|pon |pídele|reparte|falta|toca|lo encuentras|los vuelves|todavía|sin internet|la cámara|espera|primero|este producto|el dueño siempre|el porcentaje va|el usuario lleva|el pin (nuevo )?son|guardando|un momento|revisa)/i;
export const tipoAviso = t => { const x = String(t || ''); return INFO.test(x) ? 'info' : ERROR.test(x) ? 'error' : 'ok'; };
let ponerAviso = () => {};
export const avisar = (t, tipo, accion) => ponerAviso(t, tipo, accion);
// Aviso con botón “Deshacer” (dura más para que dé tiempo de tocarlo).
export const avisarDeshacer = (t, deshacer) => deshacer ? ponerAviso(t, 'ok', { n: 'Deshacer', fn: deshacer }) : ponerAviso(t);
const ICONO_AVISO = { ok: ['check', '#3ddc9f'], error: ['alerta', '#ff7a8f'], info: ['info', '#f5b544'] };
export function Avisos() {
  const [a, setA] = useState(null);
  useEffect(() => {
    let tm;
    // Los errores y los textos largos se quedan un poco más en pantalla.
    ponerAviso = (t, tipo, accion) => { const k = tipo || tipoAviso(t); setA(x => ({ t: String(t), k, accion, n: (x ? x.n : 0) + 1 })); clearTimeout(tm); tm = setTimeout(() => setA(null), accion ? 7000 : Math.min(6000, Math.max(k === 'ok' ? 2400 : 3400, String(t).length * 55))); };
    return () => clearTimeout(tm);
  }, []);
  if (!a) return null;
  const ic = ICONO_AVISO[a.k];
  return html`<div class=${'aviso-toast ' + a.k} role=${a.k === 'error' ? 'alert' : 'status'} key=${a.n}><${Icono} n=${ic[0]} t=${18} g=${2.6} c=${ic[1]} /><span>${a.t}</span>${a.accion && html`<button type="button" class="aviso-accion toca" onClick=${() => { const f = a.accion.fn; setA(null); f(); }}>${a.accion.n}</button>`}</div>`;
}

// ---------- interruptor ----------
// Botón cuadrado con ícono y una etiqueta corta (opciones secundarias de una hoja).
export function Atajo({ n, t, on, onClick }) {
  return html`<button type="button" class=${'atajo toca' + (on ? ' on' : '')} data-atajo=${n} aria-pressed=${on ? 'true' : 'false'} onClick=${onClick}><${Icono} n=${n} t=${22} /><span>${t}</span></button>`;
}
// “Más opciones”: lo poco usado de un formulario queda plegado. resumen: qué hay adentro.
export function MasOpciones({ abierto, onCambio, resumen, children }) {
  return html`<div class="pila" style="gap:12px">
    <button type="button" class=${'mas-opciones toca' + (abierto ? ' abierto' : '')} aria-expanded=${abierto ? 'true' : 'false'} onClick=${() => onCambio(!abierto)}>
      <span class="crece" style="display:flex;flex-direction:column;gap:2px;min-width:0"><b>${abierto ? 'Menos opciones' : 'Más opciones'}</b>${!abierto && resumen && html`<span class="sub">${resumen}</span>`}</span>
      <${Icono} n="sig" t=${18} estilo=${{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .3s var(--spring)', color: 'var(--muted)' }} />
    </button>
    ${abierto && html`<div class="pila entra" style="gap:14px">${children}</div>`}
  </div>`;
}
// Pista que sale una sola vez en este aparato. Se cierra con “Entendido”.
export function Pista({ id, children }) {
  const clave = 'orbe-pista-' + id;
  const [vista, setVista] = useState(() => { try { return !!localStorage.getItem(clave); } catch (e) { return true; } });
  if (vista) return null;
  return html`<div class="pista entra" role="note">${children}<button type="button" class="pista-ok toca" onClick=${() => { try { localStorage.setItem(clave, '1'); } catch (e) { /* sin espacio */ } setVista(true); }}>Entendido</button></div>`;
}

export function Interruptor({ on, onCambio, titulo, sub }) {
  return html`<button type="button" class="opcion" role="switch" aria-checked=${on ? 'true' : 'false'} onClick=${() => onCambio(!on)}>
    <span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:14px;font-weight:600">${titulo}</b>${sub && html`<span class="sub">${sub}</span>`}</span>
    <span class=${'inter' + (on ? ' on' : '')}></span>
  </button>`;
}

// rejilla: todas a la vista en dos columnas (formas de pago en el celular), sin fila que se desliza.
export function Chips({ opciones, valor, onCambio, desliza, calido, chico, rejilla }) {
  return html`<div class=${'chips' + (rejilla ? ' rejilla-chips' : desliza ? ' desliza' : '')}>
    ${opciones.map(o => { const v = typeof o === 'string' ? o : o.v, n = typeof o === 'string' ? o : o.n, on = v === valor;
      return html`<button type="button" key=${v} class=${'chip toca' + (on ? ' on' : '') + (on && calido && calido(v) ? ' calido' : '') + (chico ? ' chico' : '')} aria-pressed=${on ? 'true' : 'false'} onClick=${() => onCambio(v)}>${n}</button>`; })}
  </div>`;
}

// ---------- hoja (teléfono) o ventana (computadora) ----------
// contenido(cerrar) devuelve { cuerpo, pie }. Nunca enfoca un campo al abrir.
// Botón “atrás” del teléfono (Android) o gesto de volver: con una capa abierta (hoja, menú) la cierra en vez de
// cambiar de pantalla o salir de la app. Mientras la capa está abierta se deja una entrada en el historial.
// Al cerrar una capa con su botón se hace “atrás” en el historial; ese “atrás” llega después y no debe cerrar
// la capa siguiente que se abra enseguida (por ejemplo, volver de Tasas a Cobrar).
let ignorarAtrasHasta = 0;
// Capa encima de una hoja (calendario, rueda, fichas): “atrás” la cierra solo a ella.
let capaEncima = null;
export const ponerCapaEncima = f => { capaEncima = f; };
export const quitarCapaEncima = f => { if (capaEncima === f) capaEncima = null; };
export const saltarAtras = () => { ignorarAtrasHasta = Date.now() + 600; };
export const cerrarCapaEncima = () => { const f = capaEncima; capaEncima = null; if (f) f(); return !!f; };
export function useAtras(abierto, cerrar) {
  const ref = useRef(cerrar); ref.current = cerrar;
  useEffect(() => {
    if (!abierto) return;
    try { history.pushState({ capa: true }, ''); } catch (e) { return; }
    let porAtras = false;
    const pop = () => { if (Date.now() < ignorarAtrasHasta) { ignorarAtrasHasta = 0; return; } if (cerrarCapaEncima()) return; porAtras = true; ref.current(); };
    window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('popstate', pop); if (!porAtras && history.state && history.state.capa) { ignorarAtrasHasta = Date.now() + 600; history.back(); } };
  }, [abierto]);
}
// La hoja que está abierta (para su botón “?”): la pone HojaActual antes de dibujarla.
let ayudaHoja = '';
export const ponerAyudaHoja = k => { ayudaHoja = k; };
export function Hoja({ titulo, onCerrar, contenido }) {
  const app = useApp(), kAyuda = ayudaHoja;
  const [sale, setSale] = useState(false);
  const hoja = useRef(null), arrastre = useRef(null);
  const cerrar = despues => { if (sale) return; setSale(true); setTimeout(() => { onCerrar(); if (typeof despues === 'function') despues(); }, 280); };
  useEffect(() => {
    const tecla = e => { if (e.key === 'Escape') cerrar(); }, atras = () => cerrar();
    window.addEventListener('keydown', tecla); window.addEventListener('orbe-atras', atras);
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener('orbe-atras', atras); };
  }, [sale]);
  // Arrastrar hacia abajo para cerrar: hace falta un gesto claro (14 px para empezar).
  const baja = e => { if (document.documentElement.classList.contains('pc') || (e.target.closest && e.target.closest('button, a, input, select, textarea'))) return; arrastre.current = { y: e.clientY, dy: 0, activo: false }; e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); };
  const mueve = e => {
    const a = arrastre.current; if (!a) return;
    a.dy = e.clientY - a.y;
    if (!a.activo && a.dy > 14) a.activo = true;
    if (a.activo && hoja.current) { hoja.current.style.transition = 'none'; hoja.current.style.transform = 'translateY(' + Math.max(0, a.dy - 14) + 'px)'; }
  };
  const suelta = () => {
    const a = arrastre.current; arrastre.current = null; if (!a || !hoja.current) return;
    hoja.current.style.transition = ''; hoja.current.style.transform = '';
    if (a.activo && a.dy > 90) cerrar();
  };
  const { cuerpo, pie } = contenido(cerrar);
  return html`<div class=${'velo' + (sale ? ' sale' : '')} onClick=${() => cerrar()}></div>
    <div class=${'hoja' + (sale ? ' sale' : '')} ref=${hoja} role="dialog" aria-modal="true" aria-label=${titulo}>
      <div class="hoja-cab" onPointerDown=${baja} onPointerMove=${mueve} onPointerUp=${suelta} onPointerCancel=${suelta}>
        <span class="rayita"></span>
        <div class="fila"><h2>${titulo}</h2>${app && app.tieneAyuda(kAyuda) && html`<button type="button" class="boton-ayuda toca" aria-label="¿Cómo se usa?" onClick=${() => app.ayuda(kAyuda)}>?</button>`}<button type="button" class="icono-btn chico toca" aria-label="Cerrar" onClick=${() => cerrar()}><${Icono} n="cerrar" t=${16} g=${2.4} /></button></div>
      </div>
      <div class="hoja-cuerpo">${cuerpo}</div>
      ${pie && html`<div class="hoja-pie">${pie}</div>`}
    </div>`;
}

// Símbolo para una forma de pago, una categoría de gasto o una sucursal.
const SIMBOLOS = [
  [/Efectivo/i, 'billete'], [/Tarjeta|Punto de venta/i, 'tarjeta'], [/USDT|Binance|cripto/i, 'cripto'],
  [/Transfer|SPEI|Zelle|Interac|Pix|De Una/i, 'transfer'], [/Pago Móvil|Nequi|Daviplata|Yape|Plin|SINPE|Yappy|Bizum|MB Way|CoDi|QR|Cash App|Venmo|Satispay|Mercado Pago/i, 'movil'],
  [/Fiado|Por cobrar|Crédito/i, 'reloj'], [/cuotas/i, 'calendario'], [/^Apartado/i, 'candado'], [/Mercancía|Compras/i, 'caja'], [/Alquiler/i, 'casa'], [/Servicios/i, 'rayo'], [/Sueldo/i, 'personas'], [/Transporte/i, 'bus'],
  [/Centro|Norte|Sur|Este|Oeste|Principal|Sucursal|Local/i, 'edificio'], [/Otros?$/i, 'mas']
];
export const simbolo = n => { const s = SIMBOLOS.find(x => x[0].test(n || '')); return s ? s[1] : 'etiqueta'; };

export const iniciales = n => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'ON';
// Logo del negocio: la imagen que subió el dueño o, si no hay, sus iniciales.
export const MarcaNegocio = ({ n, t = 42, lapiz }) => html`<span class=${'logo marca' + (n.logo ? ' con-imagen' : '')} style=${{ width: t + 'px', height: t + 'px', fontSize: Math.round(t * 0.36) + 'px', borderRadius: Math.round(t * 0.31) + 'px' }}>${n.logo ? html`<img src=${n.logo} alt="" draggable="false" />` : iniciales(n.nombre)}${lapiz && html`<i class="logo-lapiz"><${Icono} n="lapiz" t=${9} g=${2.6} /></i>`}</span>`;
// Achica una imagen elegida (logo, foto de producto) a lo sumo “lado” píxeles y la devuelve como texto (data URL) para guardarla.
// cuadrada: recorta el centro (las fotos de producto se ven en cuadritos).
export function achicarImagen(archivo, lado = 256, cuadrada = false, calidad = 0.9) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo), img = new Image();
    img.onload = () => {
      const m = Math.min(img.width, img.height), sw = cuadrada ? m : img.width, sh = cuadrada ? m : img.height;
      const k = Math.min(1, lado / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const webp = cv.toDataURL('image/webp', calidad);
      ok(webp.startsWith('data:image/webp') ? webp : cuadrada ? cv.toDataURL('image/jpeg', calidad) : cv.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('imagen')); };
    img.src = url;
  });
}
export const TONOS = ['t-vio', 't-ver', 't-amb', 't-azu', 't-ros'];
// Cuadrito del producto: su foto si tiene; si no, lo de siempre (sus iniciales en color).
export const FotoProd = (p, t, sinFoto) => p && p.foto ? html`<span class="ic foto-prod" style=${t ? { width: t + 'px', height: t + 'px' } : null}><img src=${p.foto} alt="" draggable="false" loading="lazy" /></span>` : sinFoto;
export function hace(t) {
  const d = Math.floor((Date.now() - t) / 86400000);
  if (d <= 0) return 'hoy'; if (d === 1) return 'ayer'; return 'hace ' + d + ' días';
}
export const hora = t => new Date(t).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });
export const fechaCorta = t => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '');

// ---------- bienvenida al entrar a un negocio ----------
// Después de iniciar sesión: “Bienvenido a tu negocio” con el nombre, y luego se desvanece y quedan los perfiles para el PIN.
let bienvenidaPend = null;
export const marcarBienvenida = n => { bienvenidaPend = { nombre: (n && n.nombre) || '', logo: (n && n.logo) || '', t: Date.now() }; };
export const tomarBienvenida = () => { const b = bienvenidaPend; bienvenidaPend = null; return b && Date.now() - b.t < 60000 ? b : null; };
const MIN_BIENVENIDA = 1700;
export function Bienvenida({ b, cargando, listo }) {
  const [sale, setSale] = useState(false);
  useEffect(() => {
    if (cargando || !listo) return;
    const falta = Math.max(250, MIN_BIENVENIDA - (Date.now() - b.t));
    const t1 = setTimeout(() => setSale(true), falta), t2 = setTimeout(listo, falta + 520);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [cargando]);
  const inic = (b.nombre || 'Orbe').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  // Si ya se venía mostrando (mientras bajaban los datos), sigue sin repetir la entrada.
  const [sigue] = useState(() => Date.now() - b.t > 500);
  return html`<div class=${'bienv' + (sigue ? ' sigue' : '') + (sale ? ' sale' : '')} role="status" aria-live="polite">
    <div class="bienv-halo"></div>
    <div class="bienv-centro">
      <span class="bienv-marca">${b.logo ? html`<img src=${b.logo} alt="" />` : inic}</span>
      <span class="bienv-t1">Bienvenido a tu negocio</span>
      <b class="bienv-t2">${b.nombre}</b>
      <span class="bienv-barra"><i class=${cargando ? '' : 'llena'}></i></span>
      <span class="bienv-t3">${cargando ? 'Preparando tus ventas, productos y clientes…' : '¡Todo listo!'}</span>
    </div>
  </div>`;
}

// ---------- cabecera que se pega arriba ----------
// Celular: el buscador y los filtros quedan a mano al bajar por la lista. Lo de arriba (frase, tasa,
// pestañas) se va con la página; al pegarse toma fondo con desenfoque, sin cambiar de alto (nada salta).
export function CabezaPegada({ children }) {
  // Un solo elemento (no fragmento): así lo que viene después no se desordena al redibujar.
  const caja = useRef(null);
  const [pegada, setPegada] = useState(false);
  useEffect(() => {
    const el = caja.current, sc = el && el.closest('.app-fondo');
    if (!el || !sc) return;
    const mirar = () => setPegada(sc.scrollTop > 4 && el.getBoundingClientRect().top - sc.getBoundingClientRect().top <= 1);
    sc.addEventListener('scroll', mirar, { passive: true }); mirar();
    return () => sc.removeEventListener('scroll', mirar);
  }, []);
  return html`<div ref=${caja} class=${'cabeza-pegada' + (pegada ? ' pegada' : '')}>${children}</div>`;
}

// ---------- el producto vuela al carrito ----------
// Una copia del ícono del producto sale de donde se tocó y cae en la barra del carrito.
export function volarAlCarro(origen) {
  if (!origen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ic = origen.querySelector('.ic, img') || origen, r = ic.getBoundingClientRect();
  const copia = ic.cloneNode(true);
  copia.classList.add('vuela-al-carro');
  Object.assign(copia.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.appendChild(copia);
  // La barra aparece con el primer producto: se espera un cuadro para saber dónde quedó.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const meta = document.querySelector('.carro-flota.on .carro-n');
    if (!meta || !copia.animate) { copia.remove(); return; }
    const m = meta.getBoundingClientRect(), dx = m.left + m.width / 2 - (r.left + r.width / 2), dy = m.top + m.height / 2 - (r.top + r.height / 2);
    const a = copia.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 60}px) scale(.85)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(.35)`, opacity: 0.2 }
    ], { duration: 520, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
    a.onfinish = () => copia.remove(); a.oncancel = () => copia.remove();
  }));
}
