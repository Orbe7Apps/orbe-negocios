// Tutoriales: recorridos cortos que se hacen tocando las pantallas de verdad.
// La guía (motor de js/guia.js) oscurece todo, señala con un dedo lo que hay que tocar y avanza cuando la persona lo toca.
// El “Recorrido por la app” de la primera entrada es uno más de la lista.
// Cada perfil ve solo los tutoriales de lo que su rol le permite y de las funciones encendidas.
// Lo que mueve dinero es práctica: se llega al último botón pero no se toca (no se cobra ni se guarda), y al salir la venta queda como estaba.
import { html, useState, useEffect, useRef } from './lib/preact-htm.js';
import { useApp } from './ctx.js';
import { GuiaVivo, usePortal } from './guia.js';
import { empezarGuia } from './guias.js';
import { Icono, avisar } from './ui.js';
import { listaProductos, guardarPerfil } from './datos.js';
import { tomarCarrito, ponerCarrito } from './pantallas/vender.js';

const hay = s => !!document.querySelector(s);
const cuadros = n => new Promise(ok => { const f = k => k ? requestAnimationFrame(() => f(k - 1)) : ok(); f(n); });
// Cierra la hoja abierta (directo: “atrás” en algunas hojas vuelve un paso dentro de ella).
const cerrarHoja = () => { if (hay('.hoja')) window.dispatchEvent(new Event('orbe-cerrar-hoja')); };

// ---------- cómo llegar a cada lugar, tocando ----------
// Teléfono: la barra de abajo, o el botón Orbe para lo que no cabe en ella. Computadora: el menú de la izquierda.
function llegar(x, s, nombre) {
  if (!x.tel) return [{ sel: '.lateral [data-nav="' + s + '"]', toca: true, titulo: 'Ve a ' + nombre, texto: 'Toca “' + nombre + '” en el menú de la izquierda.' }];
  if (hay('.nav-tel [data-nav="' + s + '"]')) return [{ sel: '.nav-tel [data-nav="' + s + '"]', toca: true, titulo: 'Ve a ' + nombre, texto: 'Toca “' + nombre + '” abajo.' }];
  return [
    { sel: '[data-tour=boton-orbe]', toca: true, titulo: 'Abre el botón Orbe', texto: 'El logo del centro, abajo. Ahí está lo que no cabe en la barra.' },
    { sel: '.orbe-panel [data-ir="' + s + '"]', toca: true, titulo: nombre, texto: 'Toca “' + nombre + '”.' }
  ];
}
// Un tema de Ajustes (Más en el teléfono).
function llegarAjuste(x, k, nombre) {
  return llegar(x, 'mas', x.tel ? 'Más' : 'Ajustes').concat([{ sel: (x.tel ? '.menu-lista' : '.ajustes-temas') + ' [data-tema="' + k + '"]', toca: true, titulo: nombre, texto: 'Toca “' + nombre + '”.' }]);
}
const nombreVender = x => x.tel || x.T.vender === 'Cobrar' ? x.T.vender : 'Caja';
const nombreInv = x => x.T.inv ? 'Inventario' : 'Servicios';
const prod = () => hay('.productos .prod[data-directo]:not(.agotado)') ? '.productos .prod[data-directo]:not(.agotado)' : '.productos .prod:not(.agotado)';

// Sumar algo a la venta y abrir el cobro (base de los tutoriales de vender).
function hastaCobrar(x, texto) {
  const cosa = x.T.inv ? 'producto' : 'servicio';
  return llegar(x, 'vender', nombreVender(x)).concat([
    { sel: prod, toca: true, titulo: 'Toca lo que se lleva', texto: texto || 'Toca un ' + cosa + '. Cada toque suma uno; si lleva dos, tocas dos veces.' },
    { sel: '[data-tour=cobrar]', toca: true, titulo: 'Cobrar', texto: 'El botón te dice el total' + (x.D.dual ? ', en $ y en Bs' : '') + '. Tócalo.' }
  ]);
}
const practicaCobrar = (texto, boton) => ({ sel: '[data-guia=cobrar-listo]', practica: true, titulo: 'Con este botón terminas', texto: texto || 'En una venta de verdad lo tocas y listo. Ahora es práctica: no se cobra nada.', boton, despues: cerrarHoja });
const fin = (titulo, texto) => ({ fin: true, titulo, texto });

// ---------- la lista ----------
// req: quién lo ve (permisos y funciones). pasos: se arman al empezar, con lo que hay en pantalla.
export const TUTORIALES = [
  { id: 'recorrido', g: 'Para empezar', t: 'Recorrido por la app', d: '2 min', i: 'sig', req: () => true, pasos: x => {
    const yo = x.yo, n = x.S.negocio, vende = x.ver('vender') && listaProductos().length > 0;
    return [
      { titulo: 'Hola, ' + yo.n.split(' ')[0], texto: 'Te enseño ' + n.nombre + ' con tus propios dedos: yo te señalo, tú tocas. Son 2 minutos y nada de lo que hagas aquí se guarda.', boton: 'Empezar' },
      { sec: 'hoy', sel: '.frase-viva', titulo: 'Así va el día', texto: 'Esta frase te cuenta lo importante de hoy. Cambia sola cada vez que vendes o cobras.' },
      ...(vende ? hastaCobrar(x).concat([
        { sel: '[data-guia=formas]', toca: true, titulo: '¿Cómo te pagó?', texto: 'Toca una forma de pago.' + (x.D.dual ? ' Fíjate que con Pago Móvil el monto pasa a bolívares.' : '') },
        practicaCobrar()
      ]) : []),
      ...(x.ver('clientes') ? llegar(x, 'clientes', 'Clientes').concat([{ sel: '[data-tour=deben], [data-guia=cliente], [data-guia=nuevo-cliente]', titulo: 'Tus clientes', texto: x.T.mod('fiado') ? 'Quien te debe sale de primero, y en rojo si lleva tiempo. Con un toque le recuerdas por WhatsApp.' : 'Cada cliente con lo que te ha comprado. Desde aquí le mandas el recibo o un mensaje.' }]) : []),
      ...(x.tel ? llegar(x, 'mas', 'Más').concat([{ sel: '.menu-lista [data-tema=tutoriales]', toca: true, titulo: 'Tutoriales', texto: 'Aquí aprendes lo demás cuando quieras, también tocando. Ábrelo.' }])
        : llegar(x, 'tutoriales', 'Tutoriales')),
      { sel: '[data-guia=tut-lista]', titulo: 'Lo que puedes aprender', texto: 'Solo ves lo que tu perfil puede hacer. Lo que termines queda con su ✓.' },
      fin('¡Listo, ' + yo.n.split(' ')[0] + '!', 'Ya sabes vender, cobrar y dónde aprender lo demás. Si te pierdes, el “?” de cada pantalla te guía.')
    ];
  } },
  { id: 'perfil', g: 'Para empezar', t: 'Tu perfil y tu PIN', d: '1 min', i: 'candado', req: () => true, pasos: x => llegarAjuste(x, 'perfil', 'Tu perfil').concat([
    { sel: x.tel ? '.pantalla section.tarjeta' : '.ajustes-tema', titulo: 'Tu perfil', texto: 'Aquí cambias tu nombre y tu PIN de 4 números. Nadie más lo ve.' },
    fin('¡Listo!', x.tel ? 'Para pasarle el aparato a otra persona, toca “Cambiar de perfil” aquí mismo.' : 'Para pasarle el aparato a otra persona, toca el ícono de personas junto a tu nombre, abajo a la izquierda.')
  ]) },

  { id: 'venta', g: 'Vender', t: 'Hacer una venta', d: '1 min', i: 'carrito', req: x => x.ver('vender'), pasos: x => hastaCobrar(x).concat([
    { sel: '[data-guia=formas]', toca: true, titulo: '¿Cómo te pagó?', texto: 'Toca la forma de pago. Con efectivo, Orbe te calcula el vuelto.' },
    practicaCobrar('Este botón cobra y abre el recibo para mandarlo por WhatsApp. Es práctica: no se guarda.'),
    fin('¡Ya sabes vender!', 'Lo que se lleva, cobrar y cómo te pagó. Con eso haces casi todas tus ventas.')
  ]) },
  { id: 'dividir', g: 'Vender', t: 'Cobrar con dos formas de pago', d: '1 min', i: 'dividir', req: x => x.ver('vender') && x.S.negocio.pays.length > 1, pasos: x => hastaCobrar(x).concat([
    { sel: '[data-atajo=dividir]', toca: true, titulo: 'Dividir pago', texto: 'Si te paga una parte de una forma y otra parte de otra, toca “Dividir pago”.' },
    { sel: '[data-guia=formas]', titulo: 'Cuánto por cada forma', texto: 'Eliges las formas y escribes cuánto va por cada una. Orbe te dice cuánto falta.' },
    practicaCobrar(),
    fin('¡Listo!', 'Cuando falte $0,00, cobras. Todo queda en la caja de hoy, cada parte con su forma.')
  ]) },
  { id: 'recibo', g: 'Vender', t: 'Mandar el recibo por WhatsApp', d: '30 s', i: 'movil', req: x => x.ver('vender'), pasos: x => hastaCobrar(x).concat([
    practicaCobrar('Al cobrar se abre el recibo. Es práctica: no se cobra.'),
    { titulo: 'El recibo', texto: 'Ahí tocas “Enviar por WhatsApp” y le llega con lo que compró, el total y tu tasa. También lo puedes imprimir.' },
    fin('¡Listo!', x.tel ? 'Los recibos viejos están en Hoy, en “Últimas ventas”: toca una venta.' : 'Los recibos viejos están en Caja, en “Últimas ventas”: toca una venta.')
  ]) },
  { id: 'fiar', g: 'Vender', t: 'Fiar una venta', d: '1 min', i: 'reloj', req: x => x.ver('vender') && x.T.mod('fiado') && x.puede('fiado'), pasos: x => hastaCobrar(x).concat([
    { sel: '[data-guia=formas]', toca: true, titulo: 'Toca “Fiado”', texto: 'Fiado va como una forma de pago más. Al tocarla, Orbe te pide a quién.' },
    practicaCobrar('Con el cliente elegido, este botón deja la venta fiada. Es práctica: no se guarda.'),
    fin('¡Listo!', 'Lo fiado sale en Clientes, con los días que lleva. Cuando te pague, anotas el abono ahí.')
  ]) },
  { id: 'cuotas', g: 'Vender', t: 'Vender en cuotas o apartar', d: '1 min', i: 'calendario', req: x => x.ver('vender') && x.T.mod('cuotas') && x.puede('fiado'), pasos: x => hastaCobrar(x).concat([
    { sel: '[data-guia=formas]', titulo: 'En cuotas o Apartado', texto: 'Entre las formas de pago están “En cuotas” y “Apartado”. Eliges la inicial, cuántas cuotas o cuántos días se lo guardas.' },
    practicaCobrar(),
    fin('¡Listo!', 'Lo vendido en cuotas sale en Cuotas: quién está atrasado y a quién cobrarle esta semana.')
  ]) },
  { id: 'cotizar', g: 'Vender', t: 'Mandar una cotización', d: '1 min', i: 'doc', req: x => x.ver('vender') && x.T.mod('cotizaciones'), pasos: x => llegar(x, 'vender', nombreVender(x)).concat([
    { sel: prod, toca: true, titulo: 'Lo que quiere', texto: 'Toca lo que el cliente quiere saber el precio.' },
    { sel: '[data-guia=cotizar]', practica: true, titulo: 'Cotizar', texto: 'En vez de cobrar, tocas “Cotizar”: escribes el cliente y hasta cuándo valen los precios, y se la mandas en PDF.' },
    fin('¡Listo!', 'Si acepta, la cotización se vuelve venta con los mismos precios.')
  ]) },
  { id: 'anular', g: 'Vender', t: 'Anular o devolver una venta', d: '1 min', i: 'deshacer', req: x => x.puede('anular'), pasos: x => [
    { sec: x.tel ? 'hoy' : 'vender', titulo: 'Anular o devolver', texto: 'Abre la venta en “Últimas ventas” (' + (x.tel ? 'en Hoy' : 'en Caja') + ') y toca su recibo.' },
    { titulo: 'En el recibo', texto: '“Anular venta” si fue un error; “Devolver productos” si el cliente trajo algo. Vuelve al inventario y queda en el registro con tu nombre.' },
    fin('¡Listo!', 'Por seguridad, anular no se puede deshacer.')
  ] },

  { id: 'abono', g: 'Clientes', t: 'Cobrarle a quien te debe', d: '1 min', i: 'personas', req: x => x.ver('clientes') && x.T.mod('fiado') && x.puede('clientes'), pasos: x => llegar(x, 'clientes', 'Clientes').concat([
    { sel: '[data-tour=deben]', titulo: 'Quién te debe', texto: 'El que lleva más tiempo sale de primero. En rojo, los de más de 15 días.' },
    { sel: '[data-guia=recordar]', titulo: 'Recordarle', texto: 'Se abre WhatsApp con el mensaje armado: cuánto debe y desde cuándo. Solo lo envías.' },
    { sel: '[data-guia=abono]', titulo: 'Cuando te pague', texto: 'Tocas aquí, escribes cuánto te dio y cómo. Entra a la caja de hoy y baja su deuda.' },
    fin('¡Listo!', 'Orbe te avisa en Hoy cuando alguien se atrasa.')
  ]) },
  { id: 'cliente', g: 'Clientes', t: 'Agregar un cliente', d: '1 min', i: 'personas', req: x => x.ver('clientes') && x.puede('clientes'), pasos: x => llegar(x, 'clientes', 'Clientes').concat([
    { sel: '[data-guia=nuevo-cliente]', toca: true, titulo: 'Cliente nuevo', texto: 'Toca aquí.' },
    { sel: '.hoja', titulo: 'Sus datos', texto: 'Nombre, teléfono y cédula o RIF. El teclado se abre cuando tocas cada campo. Si lo guardas y te equivocas, lo borras con “Deshacer”.' },
    fin('¡Listo!', 'También puedes crearlo al cobrar, con “Cliente”.')
  ]) },
  { id: 'recordatorios', g: 'Clientes', t: 'Recordatorios por WhatsApp', d: '30 s', i: 'campana', req: x => x.puede('vender') || x.puede('clientes'), pasos: x => [
    { sec: 'hoy', sel: '[data-tour=recordatorios]', titulo: 'Mensajes listos', texto: 'Orbe te deja escritos los recordatorios de hoy. Tocas “Enviar” y se abre WhatsApp.' },
    fin('¡Listo!', 'En ' + (x.tel ? 'Más' : 'Ajustes') + ' → Recordatorios eliges qué se recuerda.')
  ] },

  { id: 'caja', g: 'Dinero', t: 'Abrir y cerrar tu turno', d: '1 min', i: 'billete', req: x => x.puede('vender') && x.T.mod('caja'), pasos: x => (x.tel ? [
    { sel: '[data-tour=boton-orbe]', toca: true, titulo: 'Abre el botón Orbe', texto: 'El logo del centro, abajo.' },
    { sel: '.orbe-panel [data-crear=caja]', toca: true, titulo: 'Caja', texto: 'Toca “Caja”.' }
  ] : [{ titulo: 'La caja', texto: 'Te abro la caja para verla juntos.', antes: x => x.abrir('caja') }]).concat([
    { sel: '[data-guia=caja-estado]', titulo: 'Abrir la caja', texto: 'Al empezar, “Abrir caja” y anotas con cuánto efectivo empiezas.' },
    { sel: '[data-guia=caja-efectivo]', titulo: 'Lo que debe haber', texto: 'Orbe suma el fondo y lo vendido en efectivo, y resta retiros y gastos.' },
    { sel: '[data-guia=caja-mov]', titulo: 'Sacar o meter efectivo', texto: 'Si te llevas dinero o traes sencillo, anótalo aquí. Así la caja sigue cuadrando.' },
    { sel: '[data-guia=caja-turno]', titulo: 'Cerrar tu turno', texto: 'Al irte, cuentas el efectivo y dejas el fondo para quien sigue.', despues: cerrarHoja },
    fin('¡Listo!', 'Abre al empezar y cierra al terminar. Lo demás lo suma Orbe.')
  ]) },
  { id: 'gasto', g: 'Dinero', t: 'Anotar un gasto', d: '1 min', i: 'dinero', req: x => x.puede('gastos'), pasos: x => (x.tel ? llegarAjuste(x, 'gastos', 'Gastos y por pagar') : llegar(x, 'gastos', 'Gastos y por pagar')).concat([
    { sel: '[data-guia=por-pagar]', titulo: 'Lo que debes pagar', texto: 'Alquiler, luz, proveedores… con su fecha. Orbe te avisa en Hoy cuando se acerca.' },
    { sel: '[data-guia=nuevo-gasto]', toca: true, titulo: 'Anotar un gasto', texto: 'Toca “+ Gasto”.' },
    { sel: '.hoja', titulo: 'Cuánto y cómo', texto: 'Escribes cuánto, en qué y cómo lo pagaste. Si es para después, lo marcas “por pagar” con su fecha.', despues: cerrarHoja },
    fin('¡Listo!', 'Anota cada gasto el día que pasa: así tu ganancia es la real.')
  ]) },
  { id: 'cierre', g: 'Dinero', t: 'Hacer el cierre del día', d: '2 min', i: 'candado', req: x => x.puede('cierre'), pasos: x => (x.tel ? llegarAjuste(x, 'cierre', 'Cierre del día') : [{ titulo: 'Cierre del día', texto: 'Te abro el cierre para verlo juntos.', antes: x => x.abrir('cierre') }]).concat([
    { sel: '[data-guia=cierre-resumen]', titulo: 'Lo de hoy', texto: 'Lo vendido, con el fiado y los gastos del día.' },
    { sel: '[data-guia=cierre-contar]', titulo: 'Cuenta el efectivo', texto: 'Escribe lo que contaste o usa + y −.' },
    { sel: '[data-guia=cierre-resultado]', titulo: '¿Cuadra?', texto: 'Aquí ves al momento si falta o sobra.' },
    { sel: '[data-guia=cierre-listo]', practica: true, titulo: 'Cerrar', texto: 'Cuando esté bien, lo tocas y queda guardado y firmado. Es práctica: no se cierra.', despues: cerrarHoja },
    fin('¡Listo!', 'Hazlo todos los días: así ves a tiempo si algo falta.')
  ]) },
  { id: 'tasa', g: 'Dinero', t: 'Cambiar la tasa del dólar', d: '30 s', i: 'sube', req: x => x.puede('tasas') && x.D.dual, pasos: x => (x.tel ? [{ sec: 'hoy', sel: '.hero-tasa', toca: true, titulo: 'La tasa de hoy', texto: 'Toca la tasa.' }] : [{ titulo: 'Las tasas', texto: 'Te abro las tasas para verlas juntos.', antes: x => x.abrir('tasa') }]).concat([
    { sel: '[data-guia=tasas-uso]', titulo: 'Las tasas que usas', texto: 'Se leen solas de internet. Si hace falta, toca una y escríbela a mano.' },
    { sel: '[data-guia=tasas-formas]', titulo: 'La tasa de cada forma', texto: 'Cada forma en bolívares puede cobrar con BCV $, BCV € u otra tasa.', despues: cerrarHoja },
    fin('¡Listo!', 'Todo lo que ves en Bs sale de estas tasas.')
  ]) },
  { id: 'anteriores', g: 'Dinero', t: 'Registrar días anteriores', d: '1 min', i: 'calendario', req: x => x.puede('anteriores'), pasos: x => [
    { titulo: 'Lo del cuaderno', texto: 'Para pasar ventas, gastos y abonos de días que ya pasaron. Te lo abro.', antes: x => x.abrir('anteriores') },
    { sel: '[data-guia=ant-dias]', titulo: '¿Qué día?', texto: 'Ayer, antier o cualquier día de las últimas semanas. El punto marca los días que ya tienen algo.' },
    { sel: '[data-guia=ant-tasa]', titulo: 'La tasa de ese día', texto: 'Orbe usa la tasa que había ese día. La caja de hoy no se mueve.', despues: cerrarHoja },
    fin('¡Listo!', 'Todo queda en el registro de cambios con tu nombre.')
  ] },

  { id: 'producto', g: 'Inventario', t: 'Agregar un producto', d: '2 min', i: 'etiqueta', req: x => x.ver('inventario') && x.puede('productos'), pasos: x => llegar(x, 'inventario', nombreInv(x)).concat([
    { sel: '[data-guia=agregar]', toca: true, titulo: 'Agregar', texto: 'Toca aquí.' },
    { fin: true, titulo: 'Sigo contigo en la hoja', texto: 'Te acompaño campo por campo: qué es, nombre, precio y cantidad.', boton: 'Seguir', luego: () => setTimeout(() => empezarGuia('producto'), 350) }
  ]) },
  { id: 'reponer', g: 'Inventario', t: 'Anotar la mercancía que llegó', d: '1 min', i: 'caja', req: x => x.T.inv && x.ver('inventario') && x.puede('reponer'), pasos: x => llegar(x, 'inventario', 'Inventario').concat([
    { sel: '[data-guia=pestanas]', titulo: 'Por reponer', texto: 'Aquí ves solo lo que se está acabando.' },
    { sel: '[data-guia=producto]', titulo: 'Reponer', texto: 'Toca el producto y luego “Reponer”: cuántos llegaron y a cuánto los compraste.' },
    fin('¡Listo!', 'La existencia sube y el costo se actualiza.')
  ]) },
  { id: 'herramientas', g: 'Inventario', t: 'Factura con foto y promociones', d: '1 min', i: 'camara', req: x => x.T.inv && x.ver('inventario') && (x.T.mod('compras') || x.T.mod('promos')) && x.puede('productos'), pasos: x => llegar(x, 'inventario', 'Inventario').concat([
    { sel: '[data-tour=escanear]', titulo: 'Tus herramientas', texto: (x.T.mod('compras') ? 'Con “Factura” le tomas foto a la factura del proveedor y Orbe suma lo que llegó. ' : '') + (x.T.mod('promos') ? 'Con “Promos” creas 2x1 y descuentos que se aplican solos.' : '') },
    fin('¡Listo!', 'Revisa siempre lo que Orbe leyó antes de sumar.')
  ]) },

  { id: 'cita', g: 'Agenda y órdenes', t: 'Agendar una cita', d: '1 min', i: 'calendario', req: x => x.ver('agenda'), pasos: x => llegar(x, 'agenda', 'Agenda').concat([
    { sel: '[data-guia=dias]', titulo: 'Tus días', texto: 'Toca un día para ver sus citas.' },
    { sel: '[data-guia=nueva-cita]', toca: true, titulo: 'Nueva cita', texto: 'Toca aquí.' },
    { sel: '.hoja', titulo: 'La cita', texto: 'Cliente, servicios, con quién, el día y una hora libre. Al guardar le avisas por WhatsApp.', despues: cerrarHoja },
    fin('¡Listo!', 'Con el link de reservas tus clientes agendan solos.')
  ]) },
  { id: 'orden', g: 'Agenda y órdenes', t: 'Recibir y entregar una orden', d: '1 min', i: 'orden', req: x => x.ver('ordenes'), pasos: x => llegar(x, 'ordenes', 'Órdenes').concat([
    { sel: '[data-tour=ordenes]', titulo: 'Tus órdenes', texto: 'Recibido, en proceso y listo. Toca una para avanzarla o avisarle al cliente.' },
    { sel: '[data-tour=nueva-orden]', titulo: 'Orden nueva', texto: 'Qué es, el cliente, la fecha de entrega y el anticipo.' },
    fin('¡Listo!', 'Al entregar cobras lo que falta, y el PDF va por WhatsApp.')
  ]) },

  { id: 'reportes', g: 'Reportes y equipo', t: 'Leer tus reportes', d: '1 min', i: 'grafico', req: x => x.ver('reportes'), pasos: x => llegar(x, 'reportes', 'Reportes').concat([
    { sel: '[data-guia=periodo]', titulo: 'El período', texto: 'Hoy, la semana, el mes o el que quieras.' },
    { sel: '[data-guia=cifras]', titulo: 'Lo que importa', texto: 'Cuánto vendiste, cuánto ganaste después de gastos y contra antes.' },
    { sel: '[data-guia=exportar]', titulo: 'Para el contador', texto: 'Descarga en Excel o PDF.' },
    fin('¡Listo!', 'Revísalo una vez por semana.')
  ]) },
  { id: 'empleado', g: 'Reportes y equipo', t: 'Agregar a un empleado', d: '1 min', i: 'escudo', req: x => x.ver('equipo'), pasos: x => (x.tel ? llegarAjuste(x, 'equipo', 'Equipo y permisos') : llegar(x, 'equipo', 'Equipo y permisos')).concat([
    { sel: '[data-guia=nuevo-perfil]', toca: true, titulo: 'Perfil nuevo', texto: 'Toca aquí.' },
    { sel: '.hoja', titulo: 'Sus datos', texto: 'Nombre, su rol y un PIN de 4 números. Entra tocando su nombre y escribiendo su PIN.', despues: cerrarHoja },
    fin('¡Listo!', 'Solo ve lo que su rol permite. Si te equivocas, lo borras con “Deshacer”.')
  ]) },
  { id: 'roles', g: 'Reportes y equipo', t: 'Qué puede hacer cada rol', d: '1 min', i: 'escudo', req: x => x.ver('equipo'), pasos: x => (x.tel ? llegarAjuste(x, 'equipo', 'Equipo y permisos') : llegar(x, 'equipo', 'Equipo y permisos')).concat([
    { sel: '[data-guia=roles]', titulo: 'Los permisos', texto: 'Enciende o apaga cada permiso por rol. Los delicados (anular, descuentos, ganancias) piden confirmación y quedan en el registro.' },
    fin('¡Listo!', 'Cuando le das un permiso a alguien, su tutorial le aparece aquí.')
  ]) },

  { id: 'funciones', g: 'Ajustes', t: 'Encender o apagar funciones', d: '1 min', i: 'ajustes', req: x => x.puede('ajustes'), pasos: x => llegarAjuste(x, 'funciones', 'Funciones').concat([
    { sel: x.tel ? '.pantalla section.tarjeta' : '.ajustes-tema', titulo: 'Tus funciones', texto: 'Enciende lo que necesites y apaga lo que no uses. Mantén presionada una para ver qué hace. Tus datos no se borran.' },
    fin('¡Listo!', 'Cuando enciendes algo, su tutorial aparece aquí.')
  ]) },
  { id: 'copias', g: 'Ajustes', t: 'Copias de seguridad', d: '30 s', i: 'guardar', req: x => x.puede('ajustes'), pasos: x => llegarAjuste(x, 'copias', 'Copias y Excel').concat([
    { sel: x.tel ? '.pantalla section.tarjeta' : '.ajustes-tema', titulo: 'Tus copias', texto: 'Orbe guarda una copia cada día en este aparato. Aquí la descargas o restauras una.' },
    fin('¡Listo!', 'Guarda la descarga en tu correo o en la nube.')
  ]) }
];
const GRUPOS = ['Vender', 'Clientes', 'Dinero', 'Inventario', 'Agenda y órdenes', 'Reportes y equipo', 'Ajustes', 'Para empezar'];
const COLOR = { 'Para empezar': 'var(--primary)', Vender: 'var(--in)', Clientes: 'var(--blue, #3b8ef0)', Dinero: 'var(--amber, #f0a020)', Inventario: 'var(--accent)', 'Agenda y órdenes': 'var(--blue, #3b8ef0)', 'Reportes y equipo': 'var(--out)', Ajustes: 'var(--muted)' };
export const tutorialesPara = x => TUTORIALES.filter(t => t.req(x));
export const hechos = yo => (yo && yo.tuts) || {};
export const empezarTutorial = id => window.dispatchEvent(new CustomEvent('orbe-tutorial', { detail: id }));

// ---------- la guía que corre el tutorial ----------
export function CorrerTutorial({ id, onFin }) {
  const x = useApp();
  const tut = TUTORIALES.find(t => t.id === id) || TUTORIALES[0];
  const pasos = useRef(null);
  if (!pasos.current) pasos.current = tut.pasos(x).filter(Boolean);
  const venta = useRef(null);
  if (!venta.current) venta.current = tomarCarrito();
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(false);
  const [ver, setVer] = useState(false);
  const iR = useRef(0); iR.current = i;
  const xR = useRef(x); xR.current = x;
  const p = pasos.current[i];
  const selDe = q => typeof q.sel === 'function' ? q.sel() : q.sel;

  // Mientras dura, las pantallas aparecen sin animación de entrada (así lo iluminado no se mueve).
  useEffect(() => { document.documentElement.classList.add('en-recorrido'); return () => document.documentElement.classList.remove('en-recorrido'); }, []);

  function terminar(completo) {
    const n = pasos.current, ult = n[n.length - 1];
    // La venta de práctica no queda: se deja la que había antes de empezar.
    if (n.some(q => q.practica || q.toca)) ponerCarrito(venta.current);
    if (!(completo && ult && ult.luego)) cerrarHoja();
    if (completo) {
      const yo = xR.current.yo;
      guardarPerfil({ id: yo.id, tuts: Object.assign({}, hechos(yo), { [tut.id]: Date.now() }) });
      if (ult && ult.luego) ult.luego();
    }
    onFin(completo, tut.id, !!(ult && ult.luego));
  }
  function sig() {
    const k = iR.current, q = pasos.current[k];
    if (q && q.despues) q.despues(xR.current);
    if (k >= pasos.current.length - 1) { terminar(true); return; }
    setI(k + 1);
  }
  // Cada paso: va a su sección si hace falta, abre lo que haga falta y espera a que lo iluminado esté en pantalla.
  // Si no aparece: un paso de tocar deja seguir con “Siguiente”; uno de explicar se salta.
  useEffect(() => {
    let vivo = true;
    setOk(false); setVer(false);
    (async () => {
      if (p.sec && location.hash !== '#' + p.sec) {
        cerrarHoja(); xR.current.ir(p.sec);
        for (let k = 0; k < 60 && vivo && location.hash !== '#' + p.sec; k++) await cuadros(1);
        await cuadros(2);
      }
      if (p.antes) { p.antes(xR.current); await new Promise(r => setTimeout(r, 400)); }
      if (!vivo) return;
      const s = p.sel && selDe(p);
      if (!s) { setVer(true); return; }
      const t0 = Date.now();
      while (vivo && !hay(s) && Date.now() - t0 < (p.toca ? 1800 : 1200)) await cuadros(2);
      if (!vivo) return;
      if (hay(s)) { setVer(true); return; }
      if (p.toca) { setOk(true); setVer(true); } else sig();
    })();
    return () => { vivo = false; };
  }, [i]);
  // Un paso “toca” se cumple cuando la persona toca lo iluminado (el toque hace lo suyo de verdad).
  useEffect(() => {
    if (!p.toca) return;
    let listo = false;
    const toque = e => { if (listo) return; const s = selDe(p), el = s && e.target && e.target.closest && e.target.closest(s); if (el) { listo = true; setTimeout(() => { if (iR.current === i) sig(); }, 450); } };
    document.addEventListener('click', toque, true);
    return () => document.removeEventListener('click', toque, true);
  }, [i]);
  // Tecla Esc: salir.
  useEffect(() => { const k = e => { if (e.key === 'Escape') { e.preventDefault(); terminar(false); } }; addEventListener('keydown', k, true); return () => removeEventListener('keydown', k, true); }, []);

  const vista = pasos.current.map((q, k) => Object.assign({}, q, { sel: k === i && ver ? selDe(q) : (k === i ? null : q.sel), espera: q.toca, ok: k === i ? ok : false }));
  usePortal(html`<${GuiaVivo} pasos=${vista} i=${i} onSig=${sig} onSalir=${() => terminar(false)} />`);
  return null;
}

// ---------- la pantalla “Tutoriales” ----------
export function Tutoriales() {
  const x = useApp();
  const lista = tutorialesPara(x), h = hechos(x.yo), n = lista.filter(t => h[t.id]).length;
  const sugerido = lista.find(t => !h[t.id] && t.g !== 'Para empezar') || lista.find(t => !h[t.id]);
  const rec = lista.find(t => t.id === 'recorrido');
  const C = 2 * Math.PI * 22, grupos = GRUPOS.filter(g => g !== 'Para empezar' || lista.some(t => t.g === g && t.id !== 'recorrido'));
  // Los que aparecieron después de un permiso o una función nueva llevan “Nuevo” (solo si ya había terminado otros).
  const visto = useRef(null);
  if (!visto.current) { try { visto.current = JSON.parse(localStorage.getItem('orbe-tuts-vistos-' + x.yo.id) || 'null'); } catch (e) { visto.current = null; } }
  useEffect(() => { try { localStorage.setItem('orbe-tuts-vistos-' + x.yo.id, JSON.stringify(lista.map(t => t.id))); } catch (e) { /* sin espacio */ } }, [lista.length]);
  const esNuevo = t => visto.current && !visto.current.includes(t.id) && !h[t.id];
  const Fila = t => html`<button type="button" key=${t.id} class="opcion-menu toca" data-tut=${t.id} onClick=${() => empezarTutorial(t.id)}>
    <span class="ic" style=${{ width: '36px', height: '36px', borderRadius: '11px', background: 'color-mix(in srgb, ' + COLOR[t.g] + ' 15%, transparent)', color: COLOR[t.g] }}><${Icono} n=${t.i} t=${17} g=${2.2} /></span>
    <span class="crece" style="display:flex;flex-direction:column;gap:1px;min-width:0"><b>${t.t}${esNuevo(t) ? html` <span class="tut-nuevo">Nuevo</span>` : null}</b><span class="sub">${t.d}</span></span>
    ${h[t.id] ? html`<span class="tut-hecho" aria-label="Hecho"><${Icono} n="check" t=${14} g=${2.6} /></span>` : html`<${Icono} n="sig" t=${16} c="var(--faint)" />`}</button>`;
  return html`
    ${x.tel && html`<div class="fila entra"><h1 class="titulo crece">Tutoriales</h1></div>`}
    <section class="tarjeta fila entra tut-progreso" style="--i:1">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="22" fill="none" stroke="var(--fill)" stroke-width="6" /><circle class="tut-anillo" cx="28" cy="28" r="22" fill="none" stroke="var(--in)" stroke-width="6" stroke-linecap="round" stroke-dasharray=${C} stroke-dashoffset=${C * (1 - n / lista.length)} transform="rotate(-90 28 28)" /><text x="28" y="33" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${n}/${lista.length}</text></svg>
      <span class="crece" style="display:flex;flex-direction:column;gap:2px;min-width:0"><b style="font-size:16px">${n === lista.length ? '¡Los hiciste todos!' : n ? 'Llevas ' + n + ' de ' + lista.length : 'Aprende tocando'}</b>
        <span class="sub" style="line-height:1.4">${sugerido ? 'Te sugiero: “' + sugerido.t + '”. ' : 'Puedes repetir cualquiera. '}Cada uno se hace en tus pantallas, paso a paso.</span></span>
    </section>
    ${rec && html`<button type="button" class="tut-estrella toca entra" style="--i:2" data-tut="recorrido" onClick=${() => empezarTutorial('recorrido')}>
      <span class="ic"><${Icono} n="sig" t=${18} g=${2.4} c="#fff" /></span>
      <span class="crece" style="display:flex;flex-direction:column;gap:1px;min-width:0"><b>Recorrido por la app</b><span>2 min · lo principal, tocando</span></span>
      ${h.recorrido ? html`<span class="tut-hecho claro"><${Icono} n="check" t=${14} g=${2.6} /></span>` : null}</button>`}
    <div data-guia="tut-lista" class="pila" style="gap:14px">${grupos.map(g => { const de = lista.filter(t => t.g === g && t.id !== 'recorrido'); return de.length ? html`<div key=${g} class="pila entra" style="gap:6px"><span class="titulo-funciones">${g}</span><section class="tarjeta menu-lista">${de.map(Fila)}</section></div>` : null; })}</div>
    <p class="sub" style="text-align:center;line-height:1.45;padding:2px 12px 8px">Ves los tutoriales de lo que tu perfil puede hacer${x.yo.rol !== 'dueno' ? '. Si te dan más permisos, aparecen más' : ''}.</p>`;
}

// Al saltar el recorrido de la primera entrada.
export const avisoSaltado = () => avisar('Lo encuentras en Más → Tutoriales');
