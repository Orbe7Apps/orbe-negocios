// Guías en vivo de cada pantalla (“Guíame”) y la frase que resume cada pantalla.
// La guía oscurece todo menos lo que hay que tocar (motor de js/guia.js), avanza cuando la persona lo toca
// y se arma con lo que este negocio tiene encendido y lo que este perfil puede hacer.
// Nunca enfoca un campo: ilumina y la persona toca.
import { html, useState, useEffect, useRef } from './lib/preact-htm.js';
import { useApp } from './ctx.js';
import { GuiaVivo, usePortal, terminarGuia } from './guia.js';
import { resumen, inicioDia, listaProductos } from './datos.js';

const DIA = 86400000;
// Cada guía vive en el “?” de su pantalla (“Guíame paso a paso”).
const clave = k => 'pant-' + k;

// ---------- pasos de cada pantalla ----------
// Paso: { sel, titulo, texto (texto o función), toca (se cumple tocando lo iluminado), fin }
const PASOS = {
  hoy: x => {
    const { D, T, puede } = x, hoy0 = inicioDia(Date.now()), r = resumen(hoy0, hoy0 + DIA, x.suc);
    return [
      { sel: '.frase-viva', titulo: 'Cómo vas hoy', texto: 'Esta frase resume tu día. Cambia sola cuando vendes, cobras o algo necesita tu atención.' },
      { sel: '[data-tour=resumen]', titulo: T.vender === 'Cobrar' ? 'Lo cobrado hoy' : 'Lo vendido hoy', texto: (r.n ? 'Llevas ' + D.m(r.total) + ' en ' + r.n + (r.n === 1 ? ' venta' : ' ventas') + '.' : 'Aquí verás lo de hoy en cuanto vendas.') + ' Toca las cifras para ver el detalle.' },
      D.dual && { sel: '.hero-tasa', titulo: 'La tasa del día', texto: 'Todo lo que ves en Bs sale de esta tasa. Se actualiza sola; si hace falta, tócala para cambiarla.' },
      { sel: '[data-tour=pendientes]', titulo: 'Para hacer hoy', texto: 'Lo urgente va de primero. Toca un aviso y te lleva directo a resolverlo.' },
      { sel: '[data-tour=boton-orbe]', titulo: 'El botón Orbe', texto: 'Desde cualquier pantalla: ' + ['una venta', puede('gastos') && 'un gasto', 'un cliente'].filter(Boolean).join(', ') + ' y más, con un toque.' },
      { fin: true, titulo: '¡Listo!', texto: puede('vender') ? 'Empieza el día aquí. Cuando llegue un cliente, ve a ' + (x.tel ? 'Vender' : 'Caja') + '.' : 'Empieza el día aquí. Lo que necesites está abajo.' }
    ];
  },
  vender: x => {
    const { T, D, puede } = x, hay = listaProductos().length > 0, cosa = T.inv ? 'producto' : 'servicio';
    if (!hay) return [
      { sel: '.frase-viva', titulo: 'Para vender', texto: 'Primero agrega lo que vendes. Cada ' + cosa + ' aparece aquí como un botón.' },
      { fin: true, titulo: 'Agrega tu primer ' + cosa, texto: 'Ve a ' + (T.inv ? 'Inventario' : 'Servicios') + ' y toca “+”. La guía de “Nuevo producto” te acompaña.' }
    ];
    const fiar = T.mod('fiado') && puede('fiado');
    return [
      { sel: '.frase-viva', titulo: 'Así vas hoy', texto: 'Esta frase cambia con cada venta y te dice cuánto llevas.' },
      { sel: () => document.querySelector('.productos .prod[data-directo]:not(.agotado)') ? '.productos .prod[data-directo]:not(.agotado)' : '.productos .prod:not(.agotado)', titulo: 'Toca lo que se lleva', texto: 'Un toque suma uno. Si lleva dos, toca otra vez. Lo que se vende por kilo o metro te pregunta cuánto.', toca: true },
      { sel: '[data-tour=cobrar]', titulo: 'Ahora, cobrar', texto: 'El botón te dice el total. Tócalo.', toca: true },
      { sel: '[data-guia=formas]', titulo: '¿Cómo te pagó?', texto: 'Toca la forma de pago.' + (D.dual ? ' Debajo ves el monto en Bs con la tasa de esa forma.' : '') + ' Con efectivo, te calcula el vuelto.' + (fiar ? ' Con fiado, te pregunta a quién.' : ''), toca: true },
      { sel: '[data-guia=cobrar-listo]', titulo: 'Cobra', texto: 'Toca el botón. “Dividir pago” y “Cliente” están justo arriba, por si hacen falta.', toca: true },
      { sel: '[data-guia=recibo]', titulo: 'El recibo', texto: 'Si lo pide, mándaselo por WhatsApp o imprímelo. Si no, cierra con la ✕.' },
      { fin: true, titulo: '¡Ya sabes vender!', texto: 'La venta se sumó a Hoy' + (T.inv ? ' y bajó del inventario.' : '.') }
    ];
  },
  clientes: x => {
    const { T, puede } = x, fiado = T.mod('fiado');
    if (!hay('[data-guia=cliente]')) return [
      hay('[data-guia=nuevo-cliente]') && { sel: '[data-guia=nuevo-cliente]', titulo: 'Tu primer cliente', texto: 'Toca aquí y anota su nombre y teléfono. También puedes crearlo al cobrar.' },
      { fin: true, titulo: 'Así de simple', texto: 'Con su teléfono le mandas el recibo' + (fiado ? ' y le recuerdas lo que debe' : '') + ' por WhatsApp.' }
    ];
    return [
      { sel: '.frase-viva', titulo: 'Cómo van tus clientes', texto: fiado ? 'Esta frase te dice cuánto te deben y quién lleva más tiempo sin pagar.' : 'Esta frase te dice cuántos clientes tienes y cuántos volvieron este mes.' },
      fiado && hay('[data-tour=deben]') && { sel: '[data-tour=deben]', titulo: 'Lo que te deben', texto: 'Lo que te deben en total. Abajo va cada cliente, el que más debe de primero; en rojo, los que llevan más de 15 días.' },
      { sel: '[data-guia=cliente]', titulo: 'Cada cliente', texto: 'Tócalo para ver lo que te ha comprado' + (fiado ? ', lo que debe' : '') + ' y su teléfono.' },
      hay('[data-guia=recordar]') && { sel: '[data-guia=recordar]', titulo: 'Recordarle', texto: 'Se abre WhatsApp con el mensaje ya armado: cuánto debe y desde cuándo. Solo lo envías.' },
      hay('[data-guia=abono]') && { sel: '[data-guia=abono]', titulo: 'Cuando te pague', texto: 'Toca aquí, escribe cuánto te dio y cómo. Entra a la caja de hoy y baja su deuda.' },
      puede('clientes') && hay('[data-guia=nuevo-cliente]') && { sel: '[data-guia=nuevo-cliente]', titulo: 'Un cliente nuevo', texto: 'Nombre y teléfono' + (x.D.dual ? ', y la cédula si te la pide para la factura' : '') + '. También lo puedes crear al cobrar.' },
      { fin: true, titulo: '¡Listo!', texto: fiado ? 'Revisa aquí una vez por semana quién te debe. Orbe te avisa en Hoy cuando alguien se atrasa.' : 'Cada venta con cliente queda en su historial.' }
    ];
  },
  caja: x => {
    const abierta = hay('[data-guia=caja-estado] .t-ver');
    return [
      { sel: '.hoja .frase-viva', titulo: 'Tu caja', texto: abierta ? 'Esta frase te dice cuánto efectivo debe haber ahora mismo.' : 'Esta frase te dice qué toca ahora. Lo primero: abrir la caja.' },
      { sel: '[data-guia=caja-estado]', titulo: abierta ? 'Caja abierta' : 'Abrir la caja', texto: abierta ? 'Aquí ves desde qué hora está abierta y quién cerró el turno anterior.' : 'Al empezar el día toca “Abrir caja” y anota con cuánto efectivo empiezas, para dar vuelto.' },
      { sel: '[data-guia=caja-efectivo]', titulo: 'Lo que debe haber', texto: 'Orbe suma el fondo y lo vendido en efectivo, y resta retiros y gastos. Debajo ves de dónde sale.' },
      hay('[data-guia=caja-mov]') && { sel: '[data-guia=caja-mov]', titulo: 'Sacar o meter efectivo', texto: 'Si te llevas dinero o traes sencillo, anótalo aquí. No es un gasto: así la caja sigue cuadrando.' },
      hay('[data-guia=caja-turno]') && { sel: '[data-guia=caja-turno]', titulo: 'Cerrar tu turno', texto: 'Al irte, cuentas el efectivo y dejas el fondo para quien sigue.' },
      hay('[data-guia=caja-dia]') && { sel: '[data-guia=caja-dia]', titulo: 'Cierre del día', texto: 'Al final del día lo cuentas todo. Orbe te dice si falta o sobra, y queda guardado.' },
      { fin: true, titulo: '¡Listo!', texto: 'Abre al empezar y cierra al terminar. Lo demás lo suma Orbe.' }
    ];
  },
  inventario: x => {
    const { T, puede } = x, cosa = T.inv ? 'producto' : 'servicio';
    if (!hay('[data-guia=producto]')) return [
      { fin: true, titulo: 'Agrega tu primer ' + cosa, texto: 'Toca “Agregar” y la guía de “Nuevo producto” te acompaña paso a paso.' }
    ];
    const herr = ['escaner', 'compras', 'promos', 'precios'].filter(m => T.mod(m)).map(m => ({ escaner: 'escanear códigos', compras: 'cargar la factura del proveedor', promos: 'hacer promociones', precios: 'subir precios de una vez' })[m]);
    return [
      { sel: '.frase-viva', titulo: T.inv ? 'Cómo está tu inventario' : 'Tus servicios', texto: T.inv ? 'Esta frase te dice qué se está acabando. Si nada, cuánto tienes en estantes.' : 'Esta frase te dice cuántos servicios ofreces y cuál te piden más.' },
      T.inv && hay('[data-guia=pestanas]') && { sel: '[data-guia=pestanas]', titulo: 'Por reponer', texto: 'Toca “Por reponer” para ver solo lo que se está acabando, y anótalo en tu lista de compras.' },
      { sel: '[data-guia=producto]', titulo: 'Cada ' + cosa, texto: T.inv ? (x.tel ? 'La barra muestra cuánto te queda: verde bien, amarillo poco, rojo agotado.' : 'En la tabla ves cuánto tienes, el mínimo y el estado. “Reponer” suma lo que llegó.') + ' Tócalo para cambiar precio o existencia.' : 'Con su precio y lo que dura. Tócalo para cambiarlo.' },
      T.inv && hay('.resumen-inv') && { sel: '.resumen-inv', titulo: 'Tu dinero en estantes', texto: 'Lo que tienes a precio de costo y cuánto ganas en promedio en cada venta.' },
      T.inv && herr.length && hay('[data-tour=escanear]') && { sel: '[data-tour=escanear]', titulo: 'Herramientas', texto: 'Aquí puedes ' + herr.join(', ').replace(/, ([^,]*)$/, ' y $1') + '.' },
      puede('productos') && hay('[data-guia=agregar]') && { sel: '[data-guia=agregar]', titulo: 'Agregar', texto: 'Toca aquí para un ' + cosa + ' nuevo. Primero eliges qué es y después llenas lo esencial.' },
      { fin: true, titulo: '¡Listo!', texto: T.inv ? 'Cada venta baja la existencia sola. Orbe te avisa en Hoy cuando algo se acaba.' : 'Lo que agregues aquí aparece en Vender como un botón.' }
    ];
  },
  gastos: () => [
    { sel: '.frase-viva', titulo: 'Tus gastos', texto: 'Esta frase te dice lo que vence pronto y cuánto llevas gastado este mes.' },
    { sel: '[data-guia=por-pagar]', titulo: 'Lo que debes pagar', texto: 'Alquiler, luz, proveedores… con su fecha. Orbe te avisa en Hoy cuando se acerca. Al pagarlo, toca “Pagado”.' },
    { sel: '[data-guia=nuevo-gasto]', titulo: 'Anotar un gasto', texto: 'Toca “+ Gasto”: cuánto, en qué y cómo lo pagaste. Si fue en efectivo, sale de la caja. También desde el botón Orbe.' },
    hay('[data-guia=gastos-mes]') && !hay('[data-guia=gastos-mes] .vacio') && { sel: '[data-guia=gastos-mes]', titulo: 'En qué se va el dinero', texto: 'Tus gastos del mes por tipo, el más grande primero.' },
    { fin: true, titulo: '¡Listo!', texto: 'Anota cada gasto el día que pasa: así tu ganancia es la real.' }
  ],
  agenda: x => [
    { sel: '.frase-viva', titulo: 'Tu día', texto: 'Esta frase te dice cuántas citas tienes y quién viene ahora.' },
    { sel: '[data-guia=dias]', titulo: 'Cambia de día', texto: 'Toca un día para ver sus citas. El número dice cuántas tiene.' },
    hay('[data-guia=pros]') && { sel: '[data-guia=pros]', titulo: 'Por persona', texto: 'Toca un nombre para ver solo sus citas. Cada uno tiene su color.' },
    hay('.cita-fila') && { sel: () => hay('.cita-fila:not(.cerrada)') ? '.cita-fila:not(.cerrada)' : '.cita-fila', titulo: 'Cada cita', texto: 'Tócala para marcar que llegó, cobrarla al terminar (con los servicios ya puestos) o recordarle por WhatsApp.' },
    hay('[data-guia=nueva-cita]') && { sel: '[data-guia=nueva-cita]', titulo: 'Agendar', texto: 'Toca aquí y elige el cliente, el servicio, ' + (x.S && x.S.perfiles && x.S.perfiles.length > 1 ? 'con quién ' : '') + 'y la hora.' },
    { fin: true, titulo: '¡Listo!', texto: 'Las citas de hoy también salen en Hoy. Si alguien no viene, márcalo: así sabes quién falta seguido.' }
  ],
  ordenes: x => [
    { sel: '.frase-viva', titulo: 'Cómo van tus órdenes', texto: 'Esta frase te dice lo atrasado primero, después lo que está listo y lo que falta cobrar.' },
    hay('[data-guia=filtros]') && { sel: '[data-guia=filtros]', titulo: 'Filtra', texto: 'Toca “Atrasadas” o “Listas” para ver solo esas.' },
    x.tel ? hay('.orden-tarjeta') && { sel: '.orden-tarjeta', titulo: 'Cada orden', texto: 'La barra dice en qué va: Recibida, En proceso, Lista. Tócala para cambiar el estado, anotar un abono o avisarle por WhatsApp que está lista.' }
      : hay('[data-tour=ordenes]') && { sel: '[data-tour=ordenes]', titulo: 'Una columna por paso', texto: 'Recibida, En proceso, Lista y Entregada. Arrastra una orden de una columna a otra para cambiar su estado, o tócala para ver el detalle.' },
    hay('[data-tour=nueva-orden]') && { sel: '[data-tour=nueva-orden]', titulo: 'Una orden nueva', texto: 'Anota qué te dejan, de quién, para cuándo y si dejó anticipo.' },
    { fin: true, titulo: '¡Listo!', texto: 'Cuando la entregues, cobras el saldo y queda en la caja del día.' }
  ],
  cotizaciones: () => [
    { sel: '.frase-viva', titulo: 'Tus cotizaciones', texto: 'Esta frase te dice cuánto espera respuesta y cuál vence pronto.' },
    { sel: '[data-guia=filtros]', titulo: 'Por estado', texto: 'Esperando, vendidas, vencidas o no aceptadas. Toca para cambiar.' },
    hay('[data-guia=cotizacion]') && { sel: '[data-guia=cotizacion]', titulo: 'Cada cotización', texto: 'Tócala para mandarla en PDF por WhatsApp o, si aceptó, volverla venta con un toque.' },
    { sel: '[data-guia=nueva-cot]', titulo: 'Cotizar', texto: 'Te lleva a Vender: agrega lo que quiere y toca “Cotizar” en lugar de cobrar.' },
    { fin: true, titulo: '¡Listo!', texto: 'Orbe te avisa en Hoy cuando una cotización está por vencer.' }
  ],
  cuotas: () => [
    { sel: '.frase-viva', titulo: 'Tus cuotas', texto: 'Esta frase te dice quién está atrasado y a cuántos te toca cobrar esta semana.' },
    hay('[data-tour=cuotas]') && { sel: '[data-tour=cuotas]', titulo: 'Lo que falta cobrar', texto: 'Lo que te deben en total y lo que ya está atrasado.' },
    { sel: '[data-guia=filtros]', titulo: 'Filtra', texto: 'Toca “Esta semana” para ver a quién cobrar, o “Atrasados”.' },
    hay('[data-guia=plan]') && { sel: '[data-guia=plan]', titulo: 'Cada plan', texto: 'La barra muestra cuánto ha pagado. Tócalo para anotar un pago, ver su calendario o recordarle.' },
    { fin: true, titulo: '¡Listo!', texto: 'Para crear uno, al cobrar elige “En cuotas” o “Apartado”.' }
  ],
  reportes: x => !hay('[data-guia=cifras]') ? [
    { fin: true, titulo: 'Aquí verás cómo te va', texto: 'Cuando empieces a vender: cuánto vendes cada día, lo que más se vende y tu ganancia real.' }
  ] : [
    { sel: '.frase-viva', titulo: 'Cómo te va', texto: 'Esta frase te dice cuánto vendiste, cómo vas contra antes y cuánto te queda de verdad.' },
    { sel: '[data-guia=periodo]', titulo: 'Elige el período', texto: '7 días, 30 días o este mes. Todo lo de abajo cambia.' },
    { sel: '[data-guia=cifras]', titulo: 'Lo que importa', texto: 'Ventas, ganancia, gastos y lo que de verdad te queda. La flecha compara con el período anterior.' },
    hay('[data-guia=resultado]') && { sel: '[data-guia=resultado]', titulo: 'A dónde se va', texto: 'De lo que vendes: lo que costó, lo que gastaste y lo que te queda.' },
    x.D.dual && hay('[data-guia=moneda]') && { sel: '[data-guia=moneda]', titulo: 'En otra moneda', texto: 'Cada venta se convierte con la tasa de su día: así la inflación no engaña.' },
    { sel: '[data-guia=exportar]', titulo: 'Llévatelo', texto: 'Descarga las ventas en Excel o guarda el reporte en PDF.' },
    { fin: true, titulo: '¡Listo!', texto: 'Míralo una vez por semana. Más abajo están tu mejor día y tu mejor hora.' }
  ],
  equipo: x => [
    { sel: '.frase-viva', titulo: 'Tu equipo', texto: 'Esta frase te dice quién va vendiendo más y si a alguien le falta el PIN.' },
    { sel: '[data-guia=personas]', titulo: 'Cada persona', texto: 'Tócala para cambiar su rol o su PIN. Con PIN, cada venta dice quién la hizo.' },
    { sel: x.tel ? '[data-guia=roles]' : '[data-tour=equipo]', titulo: 'Qué puede hacer cada rol', texto: 'Toca un permiso para darlo o quitarlo. El dueño siempre puede todo.' },
    { sel: '[data-guia=nuevo-perfil]', titulo: 'Agregar a alguien', texto: 'Su nombre, su rol y su PIN.' },
    { fin: true, titulo: '¡Listo!', texto: 'Dar un permiso delicado, como anular ventas, pide confirmación y queda en el registro.' }
  ],
  mas: x => [
    { sel: '[data-guia=buscar-ajuste]', titulo: '¿Qué quieres cambiar?', texto: 'Escribe una palabra, como “impresora”, “pago móvil” o “PIN”, y aparece dónde está.' },
    x.tel ? hay('[data-tour=mas-acciones]') && { sel: '[data-tour=mas-acciones]', titulo: 'Por temas', texto: 'Todo está ordenado por temas: dinero, tu negocio, ventas y cobro, y la app.' }
      : { sel: '.ajustes-temas', titulo: 'Por temas', texto: 'Toca un tema a la izquierda y cámbialo a la derecha.' },
    hay('[data-tour=funciones]') && { sel: '[data-tour=funciones]', titulo: 'Funciones', texto: 'Enciende solo lo que usas. Lo apagado desaparece de la app, sin borrar tus datos.' },
    { fin: true, titulo: '¡Listo!', texto: 'Si no encuentras algo, búscalo arriba con tus palabras.' }
  ],
  cierre: () => [
    { sel: '[data-guia=cierre-resumen]', titulo: 'Lo de hoy', texto: 'Lo vendido, con el fiado y los gastos del día.' },
    hay('[data-guia=cierre-contar]') && { sel: '[data-guia=cierre-contar]', titulo: 'Cuenta el efectivo', texto: 'Escribe lo que contaste o usa + y −. Si prefieres, cuenta billete por billete.' },
    hay('[data-guia=cierre-digital]') && { sel: '[data-guia=cierre-digital]', titulo: 'Lo digital', texto: 'Tarjeta, transferencias y pagos móviles ya están confirmados: no hay que contarlos.' },
    hay('[data-guia=cierre-resultado]') && { sel: '[data-guia=cierre-resultado]', titulo: '¿Cuadra?', texto: 'Aquí ves al momento si falta o sobra efectivo.' },
    { sel: '[data-guia=cierre-listo]', titulo: 'Cerrar', texto: 'Cuando esté bien, tócalo. Queda guardado y firmado: después no se puede cambiar.' },
    { fin: true, titulo: '¡Listo!', texto: 'Hazlo todos los días: así ves a tiempo si algo falta.' }
  ]
};
// En los negocios de servicios, Inventario se llama Servicios (y su “?” pregunta por “servicios”).
PASOS.servicios = PASOS.inventario;
// Al empezar, se saltan los pasos cuyo lugar no está en pantalla (una frase que no sale con la pantalla vacía…).
// Lo que viene después de un paso “toca” aparece más tarde (una hoja que se abre), así que se deja.
function presentes(pasos) {
  let despues = false;
  return pasos.filter(p => { if (despues || p.fin || p.toca) { if (p.toca) despues = true; return true; } return hay(selDe(p)); });
}
// ¿Está en pantalla? (para saltar lo que este negocio o este momento no tiene)
function hay(s) { return !!document.querySelector(s); }
// El selector de un paso puede depender de lo que hay en pantalla en ese momento.
const selDe = p => typeof p.sel === 'function' ? p.sel() : p.sel;
export const tieneGuia = k => !!PASOS[k];
export const empezarGuia = k => window.dispatchEvent(new CustomEvent('orbe-guiame', { detail: k }));

// ---------- la guía que corre sobre la pantalla ----------
export function GuiaPantallas() {
  const app = useApp();
  const [g, setG] = useState(null); // { k, pasos, i, ok }
  const gR = useRef(null); gR.current = g;
  useEffect(() => {
    const f = e => { const k = e.detail; if (!PASOS[k]) return; const pasos = presentes(PASOS[k](app).filter(Boolean)); setG({ k, pasos, i: 0, ok: false }); };
    window.addEventListener('orbe-guiame', f);
    return () => window.removeEventListener('orbe-guiame', f);
  });
  const sig = () => { const x = gR.current; if (!x) return; if (x.i >= x.pasos.length - 1) { terminarGuia(clave(x.k)); setG(null); return; } setG(Object.assign({}, x, { i: x.i + 1, ok: false })); };
  // Un paso “toca” se cumple cuando la persona toca lo iluminado (el toque sigue su camino normal).
  useEffect(() => {
    if (!g) return;
    const p = Object.assign({}, g.pasos[g.i]); p.sel = selDe(p);
    if (!p.toca) return;
    let listo = false, faltaDesde = 0;
    const toque = e => { if (listo) return; const el = e.target && e.target.closest && e.target.closest(p.sel); if (el) { listo = true; setTimeout(sig, 550); } };
    document.addEventListener('click', toque, true);
    // Si lo que hay que tocar no aparece (se cerró una hoja, no hay productos…), se puede seguir con “Siguiente”.
    const reloj = setInterval(() => { if (document.querySelector(p.sel)) { faltaDesde = 0; return; } if (!faltaDesde) faltaDesde = Date.now(); else if (Date.now() - faltaDesde > 1600) { setG(x => x && x.i === g.i ? Object.assign({}, x, { ok: true }) : x); } }, 400);
    return () => { document.removeEventListener('click', toque, true); clearInterval(reloj); };
  }, [g && g.k, g && g.i]);
  const vista = g ? g.pasos.map((p, k) => Object.assign({}, p, { sel: selDe(p), texto: typeof p.texto === 'function' ? p.texto(app) : p.texto, espera: p.toca, ok: k === g.i ? g.ok : false })) : null;
  usePortal(g ? html`<${GuiaVivo} pasos=${vista} i=${g.i} onSig=${sig} onSalir=${() => setG(null)} />` : null);
  return null;
}

// ---------- la frase de cada pantalla ----------
// Una sola idea, con los números del momento; lo urgente primero.
export function Frase({ children }) {
  return html`<p class="frase-viva entra" aria-live="polite">${children}</p>`;
}
