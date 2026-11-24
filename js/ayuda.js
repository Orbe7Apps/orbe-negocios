// Ayuda de Orbe: el botón «?» de cada pantalla y hoja, y el centro de ayuda con guías paso a paso.
// Para que cada persona entienda la app sola, sin que nadie se la explique.
import { html, useState, useEffect } from './lib/preact-htm.js';
import { useApp } from './ctx.js';
import { Icono } from './ui.js';

// ---------- ayuda de cada pantalla y hoja ----------
// q: qué es · p: pasos · c: consejos · g: guías relacionadas (ids de GUIAS)
export const AYUDAS = {
  hoy: { t: 'Hoy (tu panel)', q: 'El resumen de tu día: lo que vendiste, lo que ganaste y lo que tienes pendiente.', p: ['Arriba ves lo vendido hoy y, si tienes historial, cómo vas contra tu promedio.', 'Toca las cifras de abajo (ganancia, lo que te deben, por pagar) para ir al detalle.', '«Para hacer hoy» te dice qué atender primero: tócalo y te lleva directo.'], c: ['Si tu país usa dos monedas, toca la tasa para revisarla o cambiarla.', 'El botón del centro (el logo de Orbe) crea una venta, un gasto, un cliente y más desde cualquier pantalla.'], g: ['empezar', 'cierre'] },
  vender: { t: 'Vender y cobrar', q: 'Aquí armas la venta tocando tus productos o servicios y la cobras.', p: ['Toca un producto para sumarlo. Tócalo otra vez para sumar uno más.', 'Toca una línea de la venta para cambiar la cantidad, el precio o darle un descuento.', 'Usa «+ Servicio o cargo» para cobrar algo que no está en tu lista (por ejemplo, una mano de obra).', 'Toca «Cobrar», elige cómo te pagaron y listo.'], c: ['Puedes buscar por nombre o con la cámara (lee códigos de barras).', 'Si el cliente paga con dos formas (una parte en efectivo y otra por transferencia), elige «Combinar formas de pago».', 'En la computadora: F1 para buscar, F12 para cobrar y Esc para vaciar.'], g: ['venta', 'combinar', 'fiar', 'recibo'] },
  cobrar: { t: 'Cobrar', q: 'Eliges cómo te pagó el cliente y Orbe guarda la venta.', p: ['Elige la forma de pago.', 'Si es en efectivo, toca con cuánto te pagó y Orbe te dice el vuelto.', 'Si te pagó de dos formas, toca «Combinar formas de pago» y reparte el monto.', 'Toca «Cobrar». Después puedes imprimir el recibo o mandarlo por WhatsApp.'], c: ['Si fías, Orbe te pide a qué cliente se lo anotas.', 'Puedes dejar el vuelto como saldo a favor del cliente.'], g: ['combinar', 'fiar'] },
  agenda: { t: 'Agenda de citas', q: 'Tus citas por día y por persona del equipo.', p: ['Arriba eliges el día. El número debajo de la fecha son las citas de ese día.', 'Toca «+» para agendar: el cliente, los servicios, con quién y la hora (las horas tachadas ya están ocupadas).', 'Toca una cita para avisarle por WhatsApp, marcar que llegó o cobrarle.'], c: ['Al cobrar una cita, los servicios ya van puestos y queda guardado quién atendió.', 'Si el cliente no vino, márcalo: así sabes quién falta seguido.'], g: ['cita', 'cobrarCita'] },
  nuevaCita: { t: 'Agendar una cita', q: 'Apartas el día y la hora de un cliente.', p: ['Escribe el nombre del cliente (si ya existe, tócalo en la lista).', 'Pon su teléfono para avisarle por WhatsApp.', 'Elige los servicios, con quién, el día y la hora.', 'Toca «Guardar cita» o «Guardar y avisar por WhatsApp».'], c: ['La duración se calcula sola con los servicios que elijas.'], g: ['cita'] },
  cita: { t: 'Una cita', q: 'Todo lo de esta cita y lo que puedes hacer con ella.', p: ['«Llegó»: el cliente está esperando.', '«Recordar por WhatsApp»: le manda el día y la hora.', '«Cobrar»: abre el cobro con los servicios ya puestos.', '«Cambiar día u hora», «No vino» o «Cancelar cita» si hace falta.'], c: [], g: ['cobrarCita'] },
  inventario: { t: 'Inventario', q: 'Lo que vendes, cuánto tienes de cada cosa y lo que se está acabando.', p: ['Toca «+» para agregar un producto con su precio, lo que te cuesta y cuánto tienes.', 'Toca un producto para cambiarlo, ponerle foto o borrarlo.', '«Por reponer» te muestra lo que está por debajo del mínimo.'], c: ['«Escanear» y «Factura» suman mercancía rápido con la cámara.', 'Si un producto se vende por kilo o por metro, elígelo en «Se vende por».'], g: ['productos', 'reponer', 'factura', 'medidas', 'promo'] },
  servicios: { t: 'Tus servicios', q: 'Lo que cobras, con su precio y lo que dura.', p: ['Toca «+ Agregar» para crear un servicio.', 'Toca uno para cambiar su precio, su duración o su foto.'], c: ['La duración se usa en la agenda para saber cuánto tiempo apartar.'], g: ['productos', 'cita'] },
  producto: { t: 'Producto o servicio', q: 'Los datos de lo que vendes.', p: ['Nombre y precio son lo único obligatorio.', '«Te cuesta» sirve para que Orbe calcule tu ganancia.', '«Tienes» y «Avísame con menos de» llevan tu existencia y te avisan cuando se acaba.'], c: ['Ponle foto: así lo reconoces rápido al vender.', 'Si tiene tallas o colores, usa «Variantes».', 'Si lees códigos de barras, escríbelo o pásalo por el lector.'], g: ['productos', 'medidas'] },
  clientes: { t: 'Clientes', q: 'Tus clientes con su teléfono, lo que te han comprado y, si fías, lo que te deben.', p: ['Toca «+ Cliente» para agregar uno (o anótalo al cobrar).', 'Toca un cliente para ver su historial, mandarle un mensaje o anotar un abono.'], c: ['Con su teléfono le mandas el recibo y los recordatorios por WhatsApp.'], g: ['fiar'] },
  ordenes: { t: 'Órdenes de trabajo y pedidos', q: 'Lo que recibes para reparar o te encargan, con fecha de entrega y anticipo.', p: ['Toca «+ Orden» y escribe qué es, para quién y cuándo se entrega.', 'Si te dejan un anticipo, anótalo al crearla.', 'Ve cambiando el estado: recibida, en proceso, lista.', 'Al entregar, cobras lo que falta.'], c: ['Puedes mandar la orden en PDF por WhatsApp o imprimirla.', 'Las atrasadas salen en rojo y en «Para hacer hoy».'], g: ['orden'] },
  gastos: { t: 'Gastos y por pagar', q: 'Lo que gastas y las cuentas que pagas después.', p: ['Toca «+ Gasto» y escribe el monto, en qué fue y cómo pagaste.', 'Si lo pagas después, márcalo como «por pagar» con su fecha: Orbe te avisa antes de que venza.'], c: ['Los gastos se restan en Reportes para mostrarte tu ganancia real.'], g: ['gasto'] },
  reportes: { t: 'Reportes', q: 'Cómo te va: ventas, ganancia real, lo que más vendes y tus mejores horas.', p: ['Arriba eliges el período: 7 días, 30 días o este mes.', 'Las cifras comparan con el período anterior.', '«Excel» descarga tus ventas y «PDF» guarda el reporte.'], c: ['La ganancia real ya tiene restados los gastos.'], g: [] },
  equipo: { t: 'Equipo y permisos', q: 'Las personas que usan Orbe y lo que cada una puede hacer.', p: ['Toca «+ Perfil» para agregar a alguien con su rol y su PIN de 4 números.', 'Toca una persona para cambiarle el nombre, el rol o el PIN.', 'Abajo cambias lo que puede hacer cada rol (cajero, encargado, administrador).'], c: ['Cada uno entra con su PIN y Orbe guarda quién hizo cada venta.'], g: ['empleado', 'pinOlvidado', 'roles'] },
  perfil: { t: 'Perfil de una persona', q: 'Su nombre, su rol y su PIN.', p: ['El rol decide qué puede ver y hacer.', 'El PIN son 4 números que solo esa persona debe saber.'], c: ['Si deja de trabajar contigo, desactívalo: sus ventas quedan en el historial.'], g: ['empleado', 'pinOlvidado'] },
  pin: { t: 'PIN', q: 'Los 4 números con los que cada persona entra a Orbe.', p: ['Escribe el PIN nuevo dos veces.', 'Si es tu propio PIN, primero escribe el actual.'], c: ['Si a un empleado se le olvida, el dueño le pone uno nuevo desde aquí.'], g: ['pinOlvidado'] },
  mas: { t: 'Más (ajustes)', q: 'Todo lo demás: dinero, tu negocio, cómo cobras y la app.', p: ['Toca un tema para abrirlo.', 'En «Funciones» enciendes o apagas partes de la app según lo que uses.'], c: ['En «Ayuda y recorrido» están todas las guías paso a paso.'], g: ['funciones', 'copias'] },
  caja: { t: 'Caja y turnos', q: 'El efectivo que entra y sale de tu caja.', p: ['Al empezar, anota con cuánto efectivo abres (el fondo).', 'Si sacas dinero, anótalo como retiro.', 'Al terminar el turno, cuenta y ciérralo: Orbe te dice si falta o sobra.'], c: [], g: ['caja', 'cierre'] },
  cierre: { t: 'Cierre del día', q: 'Cuentas lo que hay en caja y comparas con lo que Orbe dice que debería haber.', p: ['Escribe cuánto contaste de cada forma de pago.', 'Orbe te muestra la diferencia.', 'Al cerrar queda guardado y firmado: no se puede cambiar después.'], c: ['Hazlo todos los días: así detectas faltantes a tiempo.'], g: ['cierre'] },
  gasto: { t: 'Anotar un gasto', q: 'Lo que pagaste (o debes pagar) para el negocio.', p: ['Escribe el monto y en qué fue.', 'Elige la categoría y cómo lo pagaste.', 'Si lo pagas después, márcalo «por pagar» con su fecha.'], c: [], g: ['gasto'] },
  sugerencias: { t: 'Lo típico de tu rubro', q: 'Productos o servicios que suelen tener negocios como el tuyo, para empezar rápido.', p: ['Desmarca lo que no vendes.', 'Cambia el precio a tu gusto y, si es un producto, cuánto tienes.', 'Toca «Agregar».'], c: ['Después los cambias o borras cuando quieras.'], g: ['productos'] },
  escaner: { t: 'Escáner con la cámara', q: 'Lee códigos de barras para vender o para contar tu inventario.', p: ['Apunta la cámara al código, dentro del recuadro.', 'Si el producto existe, suma o resta existencia (o se agrega a la venta).', 'Si es nuevo, toca «Agregar producto».'], c: ['Con poca luz, enciende la linterna.'], g: ['reponer'] },
  factura: { t: 'Factura del proveedor', q: 'Tomas una foto de la factura y Orbe suma lo que llegó.', p: ['Toma la foto de frente, con buena luz.', 'Revisa lo que Orbe leyó y corrige si hace falta.', 'Toca «Sumar» para agregarlo al inventario.'], c: [], g: ['factura'] },
  tasa: { t: 'Tasas del dólar', q: 'La tasa con la que Orbe convierte tus precios.', p: ['Orbe la lee sola cada día si tienes internet.', 'Si prefieres, escríbela a mano.'], c: ['Cada venta guarda la tasa de su día.'], g: ['tasa'] },
  recibo: { t: 'Recibo', q: 'La venta que acabas de hacer.', p: ['«Enviar por WhatsApp» manda el recibo al cliente.', '«Imprimir ticket» lo imprime.', '«Anular» o «Devolver» si hubo un error.'], c: [], g: ['recibo', 'anular'] },
  nuevaOrden: { t: 'Nueva orden', q: 'Lo que te dejan para reparar o te encargan.', p: ['Escribe qué es y para quién.', 'Pon la fecha de entrega y, si te dejan, el anticipo.', 'Agrega lo que vas a cobrar (puedes completarlo después).'], c: [], g: ['orden'] },
  promos: { t: 'Promociones', q: 'Descuentos automáticos al vender.', p: ['Elige el tipo: 2x1 (o 3x2), un porcentaje o un precio por cantidad.', 'Elige a qué productos aplica y hasta cuándo.'], c: ['Se aplican solas al vender.'], g: ['promo'] },
  precios: { t: 'Cuidar precios', q: 'Los productos cuyo precio quedó por debajo de tu meta de ganancia.', p: ['Revisa la lista.', 'Toca «Subir» para ponerle el precio sugerido o escribe otro.'], c: [], g: [] }
};

// ---------- guías paso a paso (centro de ayuda) ----------
// m: solo si la función está encendida · ir: sección a la que lleva · abrir: hoja que abre
export const GUIAS = [
  { id: 'empezar', g: 'Empezar', t: 'Deja tu negocio listo en 5 minutos', p: ['En Hoy, sigue la tarjeta «Deja tu negocio listo».', 'Agrega tus productos o servicios (con «Lo típico de tu rubro» es un toque).', 'Pon tu logo y teléfono en Ajustes → Datos y logo.', 'Haz tu primera venta de prueba.', 'Suma a tu equipo con su PIN.'], ir: 'hoy' },
  { id: 'productos', g: 'Empezar', t: 'Agregar productos o servicios', p: ['Ve a Inventario (o Servicios).', 'Toca «+».', 'Escribe el nombre y el precio. Si es un producto, también lo que te cuesta y cuánto tienes.', 'Toca «Guardar».'], ir: 'inventario' },
  { id: 'logo', g: 'Empezar', t: 'Poner tu logo y tus datos', p: ['Toca el nombre de tu negocio arriba (en Hoy) o ve a Ajustes → Datos y logo.', 'Toca «Subir logo» y elige la imagen.', 'Escribe tu teléfono y dirección: salen en tus recibos.'], abrir: 'negocio' },
  { id: 'venta', g: 'Vender', t: 'Hacer una venta', p: ['Ve a Vender.', 'Toca los productos que lleva el cliente.', 'Toca «Cobrar».', 'Elige cómo te pagó y toca «Cobrar» otra vez.', 'Manda el recibo por WhatsApp o imprímelo si quieres.'], ir: 'vender' },
  { id: 'combinar', g: 'Vender', t: 'Cobrar con dos formas de pago', p: ['Al cobrar, toca «Combinar formas de pago».', 'Elige la primera forma y escribe cuánto pagó así.', 'Toca la segunda forma: Orbe completa el resto.', 'Toca «Cobrar».'], ir: 'vender' },
  { id: 'fiar', g: 'Vender', m: 'fiado', t: 'Fiar y cobrar después', p: ['Al cobrar, elige «Fiado» como forma de pago.', 'Elige el cliente (o créalo con «+ Nuevo»).', 'Cuando te pague, ve a Clientes, tócalo y toca «Anotar abono».', 'Para recordarle, toca «Recordar»: le llega por WhatsApp lo que debe.'], ir: 'clientes' },
  { id: 'recibo', g: 'Vender', t: 'Mandar o imprimir el recibo', p: ['Después de cobrar se abre el recibo.', 'Toca «Enviar por WhatsApp» o «Imprimir ticket».', 'Para ver recibos viejos: en Hoy toca una venta de «Últimas ventas».'], ir: 'hoy' },
  { id: 'anular', g: 'Vender', t: 'Anular una venta o hacer una devolución', p: ['Abre el recibo de la venta (en Hoy, «Últimas ventas»).', 'Toca «Anular venta» si fue un error, o «Devolver productos» si el cliente devolvió algo.', 'Escribe el motivo: queda en el registro.'], ir: 'hoy' },
  { id: 'cita', g: 'Agenda', m: 'agenda', t: 'Agendar una cita', p: ['Ve a Agenda y toca «+».', 'Escribe el cliente y su teléfono.', 'Elige los servicios, con quién, el día y una hora libre.', 'Toca «Guardar y avisar por WhatsApp» para confirmarle.'], ir: 'agenda' },
  { id: 'cobrarCita', g: 'Agenda', m: 'agenda', t: 'Cobrar una cita', p: ['En Agenda (o en «Citas de hoy»), toca la cita.', 'Toca «Cobrar»: los servicios ya van puestos.', 'Elige quién atendió y cómo pagó.', 'La cita queda como «Atendida».'], ir: 'agenda' },
  { id: 'orden', g: 'Órdenes', m: 'ordenes', t: 'Recibir y entregar una orden', p: ['Toca «+ Orden» (o el botón Orbe → Orden).', 'Escribe qué es, el cliente, la fecha de entrega y el anticipo.', 'Ve cambiando su estado hasta «Lista».', 'Al entregar, toca «Entregar y cobrar».'], ir: 'ordenes' },
  { id: 'reponer', g: 'Inventario', m: 'inventario', t: 'Anotar la mercancía que llegó', p: ['En Inventario, toca el producto.', 'Toca «Reponer» y escribe cuántos llegaron y a cuánto los compraste.', 'También puedes usar «Escanear» y pasar los códigos.'], ir: 'inventario' },
  { id: 'factura', g: 'Inventario', m: 'compras', t: 'Leer la factura del proveedor con una foto', p: ['En Inventario, toca «Factura».', 'Toma la foto de frente y con buena luz.', 'Revisa lo que Orbe leyó y toca «Sumar».'], abrir: 'factura' },
  { id: 'medidas', g: 'Inventario', m: 'medidas', t: 'Vender por kilo, metro o m²', p: ['Al crear el producto, en «Se vende por» elige Kilo, Metro, Metro² u otra medida.', 'El precio es por esa medida.', 'Al vender, Orbe te pregunta cuánto lleva (o cuánto quiere gastar).'], ir: 'inventario' },
  { id: 'promo', g: 'Inventario', m: 'promos', t: 'Crear una promoción', p: ['En Inventario, toca «Promos».', 'Elige el tipo (2x1, porcentaje o precio por cantidad).', 'Elige los productos y hasta cuándo dura.', 'Se aplica sola al vender.'], abrir: 'promos' },
  { id: 'caja', g: 'Dinero', m: 'caja', t: 'Abrir y cerrar la caja', p: ['Al empezar el día: botón Orbe → Caja → «Abrir caja» y anota el fondo.', 'Si sacas efectivo, anótalo como «Retiro».', 'Al terminar: «Cerrar turno» y cuenta lo que hay.'], abrir: 'caja' },
  { id: 'cierre', g: 'Dinero', t: 'Hacer el cierre del día', p: ['En Hoy, toca «Cierre del día» (o Más → Cierre del día).', 'Cuenta lo que hay de cada forma de pago y escríbelo.', 'Revisa la diferencia y toca «Cerrar el día».'], abrir: 'cierre' },
  { id: 'gasto', g: 'Dinero', t: 'Anotar un gasto o una cuenta por pagar', p: ['Botón Orbe → Gasto (o Más → Gastos → «+ Gasto»).', 'Escribe el monto, en qué fue y cómo pagaste.', 'Si es para después, márcalo «por pagar» con su fecha.'], abrir: 'gasto' },
  { id: 'tasa', g: 'Dinero', t: 'Cambiar la tasa del dólar', p: ['Toca la tasa en Hoy (o Más → Tasas y monedas).', 'Escribe la tasa nueva o toca «Leer de internet».', 'Toca «Guardar».'], abrir: 'tasa' },
  { id: 'empleado', g: 'Equipo', t: 'Agregar a un empleado con su PIN', p: ['Ve a Equipo (o Más → Equipo y permisos).', 'Toca «+ Perfil».', 'Escribe su nombre, elige su rol y ponle un PIN de 4 números.', 'Ese empleado entra tocando su nombre y escribiendo su PIN.'], abrir: 'perfil' },
  { id: 'pinOlvidado', g: 'Equipo', t: 'Si un empleado olvida su PIN', p: ['El empleado toca «Olvidé mi PIN» en la pantalla de entrada.', 'Al dueño le llega el aviso en «Para hacer hoy» (y por WhatsApp o correo, si el empleado lo manda).', 'El dueño toca el aviso, escribe un PIN nuevo y se lo dice al empleado.'], ir: 'equipo' },
  { id: 'roles', g: 'Equipo', t: 'Qué puede hacer cada rol', p: ['Ve a Equipo.', 'Abajo, en «Qué puede hacer cada rol», elige el rol.', 'Enciende o apaga cada permiso (por ejemplo, que el cajero no pueda dar descuentos).'], ir: 'equipo' },
  { id: 'comisiones', g: 'Equipo', m: 'comisiones', t: 'Comisiones por persona', p: ['Al cobrar, elige quién atendió.', 'En el perfil de cada persona pon su porcentaje de comisión.', 'En Reportes ves lo que le toca a cada uno.'], ir: 'reportes' },
  { id: 'funciones', g: 'Ajustes', t: 'Encender o apagar funciones', p: ['Ve a Más → Funciones.', 'Enciende lo que necesites (agenda, fiado, garantía…) y apaga lo que no uses.', 'Lo apagado desaparece de la app, pero tus datos no se borran.'], ir: 'mas' },
  { id: 'copias', g: 'Ajustes', t: 'Copias de seguridad', p: ['Orbe guarda una copia cada día en este aparato.', 'En Más → Copias y Excel puedes descargarla o restaurar una.', 'Guarda la descarga en un lugar seguro (correo, nube).'], ir: 'mas' }
];

// Botón «?» que abre la ayuda de esta pantalla (o de la que se pase en k).
export function BotonAyuda({ k, chico }) {
  const app = useApp();
  const clave = k || (app && app.sec);
  if (!app || !AYUDAS[clave]) return null;
  return html`<button type="button" class=${'boton-ayuda toca' + (chico ? ' chico' : '')} aria-label=${'Ayuda: ' + AYUDAS[clave].t} title="¿Cómo se usa?" onClick=${e => { e.stopPropagation(); app.ayuda(clave); }}>?</button>`;
}

// Panel de ayuda: sube por encima de todo (también de una hoja abierta, sin cerrarla).
export function PanelAyuda({ k, cerrar }) {
  const { T, ir, abrir } = useApp();
  const [guia, setGuia] = useState(GUIAS.find(x => x.id === k) ? k : null);
  const [sale, setSale] = useState(false);
  const fin = despues => { setSale(true); setTimeout(() => { cerrar(); if (typeof despues === 'function') despues(); }, 260); };
  useEffect(() => {
    // Escape cierra solo la ayuda (no la hoja que está debajo).
    const tecla = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); fin(); } };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, []);
  const a = AYUDAS[k], G = guia && GUIAS.find(x => x.id === guia);
  const visibles = id => { const x = GUIAS.find(y => y.id === id); return x && (!x.m || T.mod(x.m)); };
  const Pasos = ps => html`<ol class="pasos-ayuda">${ps.map((x, i) => html`<li key=${i} class="entra" style=${{ '--i': i }}><span>${i + 1}</span><p>${x}</p></li>`)}</ol>`;
  const llevar = x => fin(() => { if (x.abrir) abrir(x.abrir, {}); else if (x.ir) ir(x.ir); });
  return html`<div class=${'velo velo-ayuda' + (sale ? ' sale' : '')} onClick=${() => fin()}></div>
    <div class=${'hoja hoja-ayuda' + (sale ? ' sale' : '')} role="dialog" aria-modal="true" aria-label="Ayuda">
      <div class="hoja-cab"><span class="rayita"></span>
        <div class="fila">${G && a ? html`<button type="button" class="icono-btn chico toca" aria-label="Volver" onClick=${() => setGuia(null)}><${Icono} n="atras" t=${16} /></button>` : html`<span class="ayuda-ic">?</span>`}
          <h2>${G ? G.t : a ? a.t : 'Ayuda'}</h2><button type="button" class="icono-btn chico toca" aria-label="Cerrar la ayuda" onClick=${() => fin()}><${Icono} n="cerrar" t=${16} g=${2.4} /></button></div>
      </div>
      <div class="hoja-cuerpo">
        ${G ? html`${Pasos(G.p)}${(G.ir || G.abrir) && html`<button type="button" class="btn2 lleno toca" style="align-self:flex-start" onClick=${() => llevar(G)}>Llévame ahí</button>`}`
        : a ? html`
          <p class="ayuda-que">${a.q}</p>
          ${a.p.length > 0 && html`<span class="titulo-funciones">Cómo se usa</span>${Pasos(a.p)}`}
          ${a.c.length > 0 && html`<span class="titulo-funciones">Consejos</span><ul class="consejos-ayuda">${a.c.map(x => html`<li><${Icono} n="rayo" t=${14} />${x}</li>`)}</ul>`}
          ${a.g.filter(visibles).length > 0 && html`<span class="titulo-funciones">Paso a paso</span><div class="pila" style="gap:6px">${a.g.filter(visibles).map(id => { const x = GUIAS.find(y => y.id === id); return html`<button type="button" key=${id} class="guia-btn toca" onClick=${() => setGuia(id)}><${Icono} n="lista" t=${16} /><span class="crece">${x.t}</span><${Icono} n="sig" t=${15} c="var(--faint)" /></button>`; })}</div>`}`
        : null}
      </div>
    </div>`;
}

// Centro de ayuda (Ajustes → Ayuda): todas las guías, con buscador.
export function CentroAyuda() {
  const { T, ayuda } = useApp();
  const [q, setQ] = useState('');
  const plano = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lista = GUIAS.filter(x => (!x.m || T.mod(x.m)) && (!q.trim() || plano(x.t + ' ' + x.p.join(' ')).includes(plano(q.trim()))));
  const grupos = [...new Set(lista.map(x => x.g))];
  return html`<div class="pila" style="gap:10px">
    <label class="buscador" style="background:var(--fill2)"><${Icono} n="buscar" t=${16} c="var(--muted)" /><input type="search" value=${q} placeholder="¿Qué quieres hacer? Ej.: fiar, cierre, PIN" aria-label="Buscar en la ayuda" autocomplete="off" onInput=${e => setQ(e.target.value)} /></label>
    ${grupos.map(g => html`<div class="pila" style="gap:6px"><span class="titulo-funciones">${g}</span>${lista.filter(x => x.g === g).map(x => html`<button type="button" key=${x.id} class="guia-btn toca" onClick=${() => ayuda(x.id)}><${Icono} n="lista" t=${16} /><span class="crece">${x.t}</span><${Icono} n="sig" t=${15} c="var(--faint)" /></button>`)}</div>`)}
    ${!lista.length && html`<p class="vacio">No encontré esa guía. Prueba con otra palabra.</p>`}
  </div>`;
}
