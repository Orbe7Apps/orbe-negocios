// Ayuda de Orbe: el botón “?” de cada pantalla y hoja, y el centro de ayuda con guías paso a paso.
// Para que cada persona entienda la app sola, sin que nadie se la explique.
import { html, useState, useEffect } from './lib/preact-htm.js';
import { useApp } from './ctx.js';
import { Icono } from './ui.js';
import { tieneGuia } from './guias.js';

// ---------- ayuda de cada pantalla y hoja ----------
// q: qué es · p: pasos · c: consejos · g: guías relacionadas (ids de GUIAS)
// Cada ayuda puede ser un objeto o una función que recibe la app (S, T, P…) para hablar con las palabras del negocio:
// los ejemplos usan sus propios productos y cambian según el rubro y las funciones encendidas.
// img: captura en img/ayuda/<img>.webp (se ve arriba de los pasos).
const ejemplo = x => { const p = (x.S.productos || []).find(y => !y.borrado); return p ? p.n : x.T.inv ? 'un producto' : 'un servicio'; };
const conCitas = x => x.T.mod('agenda');
const esTaller = x => ['taller', 'indep'].includes(x.S.negocio.rubro) || x.T.id === 'citas';
export const AYUDAS = {
  hoy: x => ({ t: 'Hoy (tu panel)', img: 'hoy', q: 'El resumen de tu día en ' + x.S.negocio.nombre + ': lo que vendiste, lo que ganaste y lo que tienes pendiente.',
    p: ['Arriba ves lo vendido hoy y cómo vas contra tu promedio. Las barras muestran a qué hora vendes más.', 'Toca las cifras (ganancia, lo que te deben, por pagar) para ir al detalle.', '“Para hacer hoy” te dice qué atender primero: tócalo y te lleva directo.'].concat(conCitas(x) ? ['“Citas de hoy” muestra quién viene y a qué hora.'] : [], x.T.mod('cuotas') ? ['Si hay cuotas por cobrar o un apartado vencido, sale arriba con su botón.'] : []),
    c: ['El botón del centro (el logo de Orbe) crea una venta, un gasto, un cliente y más desde cualquier pantalla.', 'Los “Recordatorios por enviar” tienen el mensaje de WhatsApp listo: tócalo y se abre.'], g: ['empezar', 'cierre', 'recordatorios'] }),
  vender: x => ({ t: x.T.vender === 'Pedido' ? 'Tomar pedidos' : x.T.vender === 'Cobrar' ? 'Cobrar' : 'Vender y cobrar', img: x.T.inv ? 'vender' : 'vender-servicios', q: 'Aquí armas ' + (x.T.vender === 'Pedido' ? 'el pedido' : 'la venta') + ' tocando lo que lleva el cliente y la cobras.',
    p: ['Toca “' + ejemplo(x) + '” (o lo que lleve) para sumarlo. Tócalo otra vez para sumar uno más.', 'Toca una línea de abajo para cambiar la cantidad, el precio o darle un descuento.']
      .concat(x.T.mod('medidas') ? ['Lo que se vende por kilo, metro o litro te pregunta cuánto lleva (o cuánto quiere gastar).'] : [], x.T.mod('variantes') ? ['Si tiene tallas, colores o sabores, eliges cuál.'] : [], ['Usa “+ Servicio o cargo” para cobrar algo que no está en tu lista (una mano de obra, un envío).', 'Toca “Cobrar”, elige cómo te pagaron y listo.']),
    c: ['Busca por nombre' + (x.T.mod('escaner') ? ' o con la cámara (lee códigos de barras)' : '') + '.', 'Si el cliente paga de dos formas, toca “Dividir pago”.'].concat(x.T.mod('cotizaciones') ? ['Si el cliente solo quiere el precio, toca “Cotizar” y se la mandas en PDF.'] : [], x.tel ? [] : ['En la computadora: F1 busca, F12 cobra y Esc vacía la venta.']),
    g: ['venta', 'combinar', 'fiar', 'cuotas', 'recibo'] }),
  cobrar: x => ({ t: 'Cobrar', img: 'cobrar', q: 'Eliges cómo te pagó el cliente y Orbe guarda la venta.',
    p: ['Elige la forma de pago.', 'Si es en efectivo, toca con cuánto te pagó y Orbe te dice el vuelto.', 'Si pagó de dos formas, toca “Dividir pago” y reparte el monto.']
      .concat(x.T.mod('fiado') ? ['Para fiar, elige “Fiado” y el cliente.'] : [], x.T.mod('cuotas') ? ['Para vender en cuotas o apartar, elige “En cuotas” o “Apartado”: pones la inicial, las cuotas o los días.'] : [], ['Toca “Cobrar”. Después mandas el recibo por WhatsApp o lo imprimes.']),
    c: ['Puedes dejar el vuelto como saldo a favor del cliente.', 'Los pagos en dólares y bolívares se convierten solos con la tasa del día.'], g: ['combinar', 'fiar', 'cuotas', 'apartar'] }),
  agenda: x => ({ t: 'Agenda de citas', img: 'agenda', q: 'Tus citas por día' + (x.S.perfiles.filter(p => !p.borrado).length > 1 ? ' y por persona del equipo' : '') + '.',
    p: ['Arriba eliges el día. El número debajo de la fecha son las citas de ese día.', 'Toca “+” para agendar: el cliente, los servicios, con quién y la hora (las ocupadas no salen).', 'Toca una cita para avisarle por WhatsApp, marcar que llegó o cobrarle con los servicios ya puestos.'],
    c: ['Con el link de reservas, tus clientes agendan solos desde Instagram o WhatsApp (Más → Link de reservas).', 'El horario y las vacaciones de cada persona se ponen en su perfil.', 'Si el cliente no vino, márcalo: así sabes quién falta seguido.'], g: ['cita', 'cobrarCita', 'reservas'] }),
  nuevaCita: { t: 'Agendar una cita', q: 'Apartas el día y la hora de un cliente.', p: ['Escribe el nombre del cliente (si ya existe, tócalo en la lista).', 'Pon su teléfono para avisarle por WhatsApp.', 'Elige los servicios, con quién, el día y la hora.', 'Toca “Guardar cita” o “Guardar y avisar por WhatsApp”.'], c: ['La duración se calcula sola con los servicios que elijas.'], g: ['cita'] },
  cita: { t: 'Una cita', q: 'Todo lo de esta cita y lo que puedes hacer con ella.', p: ['“Llegó”: el cliente está esperando.', '“Recordar por WhatsApp”: le manda el día y la hora.', '“Cobrar”: abre el cobro con los servicios ya puestos.', '“Cambiar día u hora”, “No vino” o “Cancelar cita” si hace falta.'], c: [], g: ['cobrarCita'] },
  inventario: x => ({ t: 'Inventario', img: 'inventario', q: 'Lo que vendes, cuánto tienes de cada cosa y lo que se está acabando.',
    p: ['Toca “+” para agregar un producto con su precio, lo que te cuesta y cuánto tienes.', 'Toca un producto (por ejemplo “' + ejemplo(x) + '”) para cambiarlo, ponerle foto o borrarlo.', '“Por reponer” te muestra lo que está por debajo del mínimo.'],
    c: [].concat(x.T.mod('escaner') ? ['“Escanear” suma o cuenta mercancía con la cámara.'] : [], x.T.mod('compras') ? ['“Factura”: le tomas foto a la factura del proveedor y Orbe suma lo que llegó.'] : [], x.T.mod('promos') ? ['“Promos” crea 2x1, descuentos y precios por cantidad.'] : [], x.T.mod('medidas') ? ['Si se vende por kilo o metro, elígelo en “Se vende por”.'] : [], ['Si borras algo por error, toca “Deshacer” en el aviso.']),
    g: ['productos', 'reponer', 'factura', 'medidas', 'promo', 'deshacer'] }),
  servicios: { t: 'Tus servicios', img: 'servicios', q: 'Lo que cobras, con su precio y lo que dura.', p: ['Toca “+ Agregar” para crear un servicio.', 'Toca uno para cambiar su precio, su duración o su foto.'], c: ['La duración se usa en la agenda para saber cuánto tiempo apartar.'], g: ['productos', 'cita'] },
  producto: x => ({ t: x.T.inv ? 'Agregar un producto' : 'Agregar un servicio', guiame: 'producto', q: 'Primero eliges qué es y después llenas lo esencial. Lo demás está en “Más opciones”.',
    p: ['Elige qué vas a agregar' + (x.T.mod('personalizados') ? ' (también “Para armar a la medida” para lo personalizado; una pieza o un extra es un producto o servicio normal con su interruptor)' : '') + '.', 'Escribe el nombre y el precio: es lo único obligatorio.', 'El costo es opcional: con él, Orbe te dice cuánto ganas.'].concat(x.T.inv ? ['En “Cantidad” va cuánto tienes; en “Avisar al quedar”, cuándo quieres que Orbe te avise.'] : [], ['Toca “Guardar”.']),
    c: ['Ponle foto: así lo reconoces rápido al vender.', (x.S.negocio.taxOn ? 'El ' + (x.P && x.P.tax ? x.P.tax[0] : 'impuesto') + ' de cada producto se elige debajo de la cantidad (general, reducido o exento). ' : '') + 'En “Más opciones” cada fila se abre sola: grupo' + (x.T.mod('variantes') ? ', variantes' : '') + (x.T.inv ? ', código' : '') + (x.T.mod('garantia') ? ', garantía' : '') + '.'], g: ['productos', 'medidas'] }),
  clientes: x => ({ t: 'Clientes', img: 'clientes', q: 'Tus clientes con su teléfono, lo que te han comprado' + (x.T.mod('fiado') ? ' y lo que te deben.' : '.'),
    p: ['Toca “+ Cliente” para agregar uno (o anótalo al cobrar).', 'Toca un cliente para ver su historial, mandarle un mensaje' + (x.T.mod('fiado') ? ' o anotar un abono.' : '.')].concat(x.T.mod('fiado') ? ['Arriba ves cuánto te deben en total y quién debe desde hace más tiempo.'] : []),
    c: ['Con su teléfono le mandas el recibo y los recordatorios por WhatsApp.', 'Si un cliente te pide borrar sus datos, ábrelo y toca “Borrar”: sus compras quedan en los reportes sin su nombre.'], g: ['fiar', 'recordatorios'] }),
  cliente: { t: 'Un cliente', q: 'Lo que te ha comprado, lo que te debe y cómo contactarlo.', p: ['“Anotar abono” registra lo que te pagó (puede ser combinado).', '“Recordar” le manda por WhatsApp lo que debe.', '“Editar” cambia su nombre o teléfono.'], c: [], g: ['fiar'] },
  nuevoCliente: { t: 'Nuevo cliente', q: 'Guardas a un cliente para fiarle, mandarle recibos o agendarle citas.', p: ['Escribe el nombre y su cédula o RIF.', 'Pon su WhatsApp para mandarle recibos y recordatorios.', 'Toca “Guardar”.'], c: [] },
  cotizaciones: { t: 'Cotizaciones y presupuestos', img: 'cotizaciones', q: 'Una lista con precios que le mandas al cliente antes de que compre.', p: ['En Vender agrega lo que el cliente quiere y toca “Cotizar”.', 'Escribe el cliente, hasta cuándo valen los precios y una nota si hace falta.', 'Toca “Enviar PDF por WhatsApp” para mandársela.', 'Si acepta, abre la cotización y toca “El cliente aceptó: vender”: la lista pasa a Vender con los mismos precios.'], c: ['Los precios quedan fijos aunque después los cambies en el inventario.', 'Dos días antes de que venza, Orbe te prepara un recordatorio para preguntarle si la revisó.'], g: ['cotizar'] },
  cotizar: { t: 'Nueva cotización', q: 'Le preparas al cliente una lista con precios, sin vender todavía.', p: ['Escribe para quién es.', 'Elige hasta cuándo valen los precios.', 'Toca “Guardar y enviar”.'], c: ['El PDF sale con tu logo y tus datos.'], g: ['cotizar'] },
  cotizacion: { t: 'Una cotización', q: 'La cotización que le mandaste al cliente.', p: ['“Enviar por WhatsApp” la manda de nuevo.', '“El cliente aceptó: vender” la pasa a Vender.', '“No la aceptó” la cierra.'], c: [], g: ['cotizar'] },
  ordenes: x => ({ t: esTaller(x) ? 'Órdenes de trabajo' : 'Pedidos y encargos', img: 'ordenes', q: esTaller(x) ? 'Los equipos o trabajos que recibes, con fecha de entrega, anticipo y su estado.' : 'Lo que te encargan, con fecha de entrega y anticipo.',
    p: ['Toca “+ ' + (esTaller(x) ? 'Orden' : 'Pedido') + '” y escribe qué es, para quién y cuándo se entrega.', 'Si te dejan un anticipo, anótalo al crearla.', 'Ve cambiando el estado: recibida, en proceso, lista.', 'Al entregar, cobras lo que falta.'],
    c: ['Cuando la marcas “Lista”, Orbe te prepara el aviso por WhatsApp para el cliente.', 'Las atrasadas salen en rojo y en “Para hacer hoy”.', 'Puedes mandarla en PDF o imprimirla para que la firmen.'], g: ['orden'] }),
  orden: { t: 'Una orden', q: 'Todo lo de esta orden: qué es, el cliente, lo que se cobra y su historial.', p: ['Cambia el estado con los botones de arriba.', '“Abono” anota un pago adelantado.', '“Entregar y cobrar” cobra lo que falta y la cierra.'], c: ['Cada cambio queda en su historial con quién lo hizo.'], g: ['orden'] },
  nuevaOrden: { t: 'Nueva orden', q: 'Lo que te dejan para reparar o te encargan.', p: ['Escribe qué es y para quién.', 'Pon la fecha de entrega y, si te dejan, el anticipo.', 'Agrega lo que vas a cobrar (puedes completarlo después).'], c: [], g: ['orden'] },
  abonoOrden: { t: 'Abono a una orden', q: 'Un pago adelantado de la orden.', p: ['Escribe cuánto abona.', 'Elige cómo pagó.', 'Toca “Anotar abono”: entra a la caja de hoy.'], c: [] },
  cuotas: { t: 'Cuotas y apartados', img: 'cuotas', q: 'Las ventas en cuotas y los productos apartados: cuánto te deben, quién está atrasado y cuándo es el próximo pago.', p: ['Para crear uno: al cobrar elige “En cuotas” (se lleva el producto y paga en partes) o “Apartado” (lo paga y se lo lleva al terminar).', 'Toca un plan para ver su calendario, registrar un pago o mandarle un recordatorio.', 'Usa los filtros para ver los de esta semana, los atrasados o los apartados.'], c: ['La caja solo suma lo que de verdad entró: la inicial y cada abono.', 'Si un apartado vence, Orbe no lo libera solo: te pregunta qué hacer.'], g: ['cuotas', 'apartar', 'apartadoVencido'] },
  plan: { t: 'Un plan de cuotas o apartado', img: 'plan', q: 'El calendario de pagos, lo abonado y lo que falta.', p: ['“Registrar pago” anota lo que pagó (puede abonar solo una parte de una cuota).', '“Recordar” le manda por WhatsApp lo que falta y la próxima fecha.', '“Acuerdo” imprime el documento para que lo firme.'], c: ['Después de cada pago puedes mandarle el comprobante por WhatsApp.', 'Un apartado pagado completo se entrega con “Entregar y hacer la venta”.'], g: ['cuotas', 'apartar'] },
  abonoPlan: { t: 'Pago de cuotas', q: 'Lo que el cliente paga de su plan.', p: ['Toca “Lo atrasado”, “La cuota” o “Todo”, o escribe otro monto.', 'Elige cómo pagó.', 'Toca “Anotar pago”.'], c: [] },
  apartadoVencido: { t: 'Apartado vencido', q: 'El plazo terminó y el cliente no completó el pago. Tú decides qué hacer.', p: ['“Darle más tiempo”: 7, 15 o 30 días más.', '“Escribirle primero”: le mandas un WhatsApp y Orbe te lo recuerda mañana.', '“Pasarlo a cuotas”: se lo lleva y paga lo que falta en cuotas.', '“Liberar el producto”: vuelve al inventario y eliges qué pasa con lo abonado.'], c: ['Retener el abono solo si así lo acordaron al apartar (sale en el acuerdo).'], g: ['apartadoVencido'] },
  gastos: { t: 'Gastos y por pagar', img: 'gastos', q: 'Lo que gastas y las cuentas que pagas después.', p: ['Toca “+ Gasto” y escribe el monto, en qué fue y cómo pagaste.', 'Si lo pagas después, márcalo como “por pagar” con su fecha: Orbe te avisa antes de que venza.'], c: ['Los gastos se restan en Reportes para mostrarte tu ganancia real.'], g: ['gasto'] },
  reportes: { t: 'Reportes', img: 'reportes', q: 'Cómo te va: ventas, ganancia real, lo que más vendes y tus mejores horas.', p: ['Arriba eliges el período: 7 días, 30 días o este mes.', 'Las cifras comparan con el período anterior.', '“Excel” descarga tus ventas y “PDF” guarda el reporte.'], c: ['La ganancia real ya tiene restados los gastos.', '“Si repones lo vendido a lo que cuesta hoy” te avisa cuando los precios se quedaron atrás.'], g: [] },
  equipo: x => ({ t: 'Equipo y permisos', img: 'equipo', q: 'Las personas que usan Orbe y lo que cada una puede hacer.', p: ['Toca “+ Perfil” para agregar a alguien con su rol y su PIN de 4 números.', 'Toca una persona para cambiarle el nombre, el rol o el PIN.', 'En “Qué puede hacer cada rol” das o quitas permisos.'],
    c: ['Dar un permiso delicado (anular ventas, descuentos, ver ganancias) pide confirmación y queda en el registro de cambios.', 'Cada uno entra con su PIN y Orbe guarda quién hizo cada venta.'].concat(x.T.mod('comisiones') ? ['La comisión de cada persona se pone en su perfil y la ves en Reportes.'] : []), g: ['empleado', 'pinOlvidado', 'roles'] }),
  perfil: { t: 'Perfil de una persona', q: 'Su nombre, su rol y su PIN.', p: ['El rol decide qué puede ver y hacer.', 'El PIN son 4 números que solo esa persona debe saber.'], c: ['Si deja de trabajar contigo, desactívalo: sus ventas quedan en el historial.'], g: ['empleado', 'pinOlvidado'] },
  rol: { t: 'Nuevo rol', q: 'Un grupo de permisos para varias personas (por ejemplo, Repartidor o Contador).', p: ['Escribe el nombre.', 'Después, en Equipo, enciendes lo que puede hacer.'], c: [], g: ['roles'] },
  rolBorrar: { t: 'Borrar un rol', q: 'Quitas un rol que ya no usas.', p: ['Si alguien lo tiene, eliges a qué rol pasa.', 'Toca “Borrar el rol”.'], c: ['Si fue un error, toca “Deshacer” en el aviso.'], g: ['roles'] },
  pin: { t: 'PIN', q: 'Los 4 números con los que cada persona entra a Orbe.', p: ['Escribe el PIN nuevo dos veces.', 'Si es tu propio PIN, primero escribe el actual.'], c: ['Si a un empleado se le olvida, el dueño le pone uno nuevo desde aquí.'], g: ['pinOlvidado'] },
  mas: { t: 'Más (ajustes)', q: 'Todo lo demás: dinero, tu negocio, cómo cobras y la app.', p: ['Toca un tema para abrirlo.', 'En “Funciones” enciendes o apagas partes de la app según lo que uses.'], c: ['En “Ayuda y recorrido” están todas las guías paso a paso y el recorrido guiado.'], g: ['funciones', 'copias'] },
  caja: { t: 'Caja y turnos', img: 'caja', q: 'El efectivo que entra y sale de tu caja.', p: ['Al empezar, anota con cuánto efectivo abres (el fondo).', 'Si sacas dinero, anótalo como retiro.', 'Al terminar el turno, cuenta y ciérralo: Orbe te dice si falta o sobra.'], c: [], g: ['caja', 'cierre'] },
  movCaja: { t: 'Movimiento de caja', q: 'Dinero que entra o sale de la caja sin ser una venta.', p: ['Elige si es un retiro, un ingreso o el fondo.', 'Escribe el monto y el motivo.'], c: ['Queda en el registro con quién lo hizo.'], g: ['caja'] },
  cierre: { t: 'Cierre del día', img: 'cierre', q: 'Cuentas lo que hay en caja y comparas con lo que Orbe dice que debería haber.', p: ['Escribe cuánto contaste de cada forma de pago.', 'Orbe te muestra la diferencia.', 'Al cerrar queda guardado y firmado: no se puede cambiar después.'], c: ['Hazlo todos los días: así detectas faltantes a tiempo.'], g: ['cierre'] },
  gasto: { t: 'Anotar un gasto', q: 'Lo que pagaste (o debes pagar) para el negocio.', p: ['Escribe el monto y en qué fue.', 'Elige la categoría y cómo lo pagaste.', 'Si lo pagas después, márcalo “por pagar” con su fecha.'], c: [], g: ['gasto'] },
  abono: { t: 'Anotar un abono', q: 'Lo que un cliente te pagó de lo que te debe.', p: ['Escribe cuánto pagó.', 'Elige cómo pagó (puedes combinar).', 'Toca “Anotar abono”.'], c: ['Si paga de más, queda como saldo a favor.'], g: ['fiar'] },
  recordatorios: { t: 'Recordatorios por WhatsApp', img: 'recordatorios', q: 'Los mensajes que Orbe te prepara: citas de mañana, fiado atrasado, órdenes listas y cotizaciones por vencer.', p: ['Toca “Enviar”: se abre WhatsApp con el mensaje listo.', 'Si no hace falta, toca la ✕ y no vuelve a salir.', 'En Más → Recordatorios eliges qué se recuerda y cada cuántos días.'], c: ['Se mandan desde tu propio WhatsApp: nadie más ve tus clientes.'], g: ['recordatorios'] },
  sugerencias: { t: 'Lo típico de tu rubro', q: 'Productos o servicios que suelen tener negocios como el tuyo, para empezar rápido.', p: ['Desmarca lo que no vendes.', 'Cambia el precio a tu gusto y, si es un producto, cuánto tienes.', 'Toca “Agregar”.'], c: ['Después los cambias o borras cuando quieras.'], g: ['productos'] },
  escaner: { t: 'Escáner con la cámara', q: 'Lee códigos de barras para vender o para contar tu inventario.', p: ['Apunta la cámara al código, dentro del recuadro.', 'Si el producto existe, suma o resta existencia (o se agrega a la venta).', 'Si es nuevo, toca “Agregar producto”.'], c: ['Con poca luz, enciende la linterna.'], g: ['reponer'] },
  factura: { t: 'Factura del proveedor', q: 'Tomas una foto de la factura y Orbe suma lo que llegó.', p: ['Toma la foto de frente, con buena luz.', 'Revisa lo que Orbe leyó y corrige si hace falta.', 'Toca “Sumar” para agregarlo al inventario.'], c: [], g: ['factura'] },
  tasa: { t: 'Tasas del dólar', q: 'La tasa con la que Orbe convierte tus precios.', p: ['Orbe la lee sola cada día si tienes internet.', 'Si prefieres, escríbela a mano.'], c: ['Cada venta guarda la tasa de su día.'], g: ['tasa'] },
  recibo: { t: 'Recibo', q: 'La venta que acabas de hacer.', p: ['“Enviar por WhatsApp” manda el recibo al cliente.', '“Imprimir ticket” lo imprime.', '“Anular” o “Devolver” si hubo un error.'], c: ['Los recibos de Orbe son comprobantes no fiscales.'], g: ['recibo', 'anular'] },
  anular: { t: 'Anular una venta', q: 'Si la venta fue un error: deja de contar y lo vendido vuelve al inventario.', p: ['Escribe el motivo.', 'Toca “Anular”.'], c: ['Queda en el historial marcada como anulada, con quién y por qué.'], g: ['anular'] },
  devolver: { t: 'Devolución', q: 'El cliente devolvió parte de lo que compró.', p: ['Marca lo que devolvió.', 'Elige cómo le devuelves el dinero (o si va a lo que debe).', 'Escribe el motivo y toca “Devolver”.'], c: ['Lo devuelto vuelve al inventario.'], g: ['anular'] },
  promos: { t: 'Promociones', q: 'Descuentos automáticos al vender.', p: ['Elige el tipo: 2x1 (o 3x2), un porcentaje o un precio por cantidad.', 'Elige a qué productos aplica y hasta cuándo.'], c: ['Se aplican solas al vender.'], g: ['promo'] },
  precios: { t: 'Cuidar precios', q: 'Los productos cuyo precio quedó por debajo de tu meta de ganancia.', p: ['Revisa la lista.', 'Toca “Subir” para ponerle el precio sugerido o escribe otro.'], c: [], g: [] },
  grupos: { t: 'Grupos', q: 'Ordenan tus productos (víveres, bebidas, dulces…) y les dan color.', p: ['Crea un grupo con su nombre.', 'Elige qué productos van en él.'], c: ['Al vender y en el inventario filtras por grupo con un toque.'], g: ['productos'] },
  negocio: { t: 'Datos del negocio', q: 'Tu nombre, logo, teléfono y datos fiscales: salen en tus recibos y PDF.', p: ['Toca “Subir logo” para poner tu imagen.', 'Completa teléfono y dirección.'], c: [], g: ['logo'] },
  copias: { t: 'Copias de seguridad', q: 'Orbe guarda una copia cada día en este aparato.', p: ['Elige una copia para restaurarla.', 'Lo que tenías antes queda guardado por si te arrepientes.'], c: [], g: ['copias'] },
  pagar: { t: 'Pagar la suscripción', q: 'Pagas tu plan y nos avisas con la referencia.', p: ['Elige el plan y si es por mes o por año.', 'Haz el pago con los datos que salen.', 'Escribe la referencia y toca “Ya pagué”.'], c: ['Te avisamos cuando lo confirmemos.'] }
};
// La ayuda de una pantalla u hoja, ya con las palabras de este negocio.
export const ayudaDe = (k, x) => { const a = AYUDAS[k]; return typeof a === 'function' ? a(x) : a || null; };

// ---------- guías paso a paso (centro de ayuda) ----------
// m: solo si la función está encendida · ir: sección a la que lleva · abrir: hoja que abre
export const GUIAS = [
  { id: 'empezar', g: 'Empezar', t: 'Deja tu negocio listo en 5 minutos', p: ['En Hoy, sigue la tarjeta “Deja tu negocio listo”.', 'Agrega tus productos o servicios (con “Lo típico de tu rubro” es un toque).', 'Pon tu logo y teléfono en Ajustes → Datos y logo.', 'Haz tu primera venta de prueba.', 'Suma a tu equipo con su PIN.'], ir: 'hoy' },
  { id: 'productos', g: 'Empezar', t: 'Agregar productos o servicios', p: ['Ve a Inventario (o Servicios) y toca “+”.', 'Elige qué vas a agregar.', 'Escribe el nombre y el precio. Si es un producto, también el costo y la cantidad.', 'Toca “Guardar”.', 'En “Nuevo producto”, toca “?” y luego “Guíame paso a paso” para que Orbe te acompañe.'], ir: 'inventario' },
  { id: 'logo', g: 'Empezar', t: 'Poner tu logo y tus datos', p: ['Toca el nombre de tu negocio arriba (en Hoy) o ve a Ajustes → Datos y logo.', 'Toca “Subir logo” y elige la imagen.', 'Escribe tu teléfono y dirección: salen en tus recibos.'], abrir: 'negocio' },
  { id: 'venta', g: 'Vender', t: 'Hacer una venta', p: ['Ve a Vender.', 'Toca los productos que lleva el cliente.', 'Toca “Cobrar”.', 'Elige cómo te pagó y toca “Cobrar” otra vez.', 'Manda el recibo por WhatsApp o imprímelo si quieres.'], ir: 'vender' },
  { id: 'combinar', g: 'Vender', t: 'Cobrar con dos formas de pago', p: ['Al cobrar, toca “Dividir pago”.', 'Elige la primera forma y escribe cuánto pagó así.', 'Toca la segunda forma: Orbe completa el resto.', 'Toca “Cobrar”.'], ir: 'vender' },
  { id: 'fiar', g: 'Vender', m: 'fiado', t: 'Fiar y cobrar después', p: ['Al cobrar, elige “Fiado” como forma de pago.', 'Elige el cliente (o créalo con “+ Nuevo”).', 'Cuando te pague, ve a Clientes, tócalo y toca “Anotar abono”.', 'Para recordarle, toca “Recordar”: le llega por WhatsApp lo que debe.'], ir: 'clientes' },
  { id: 'recibo', g: 'Vender', t: 'Mandar o imprimir el recibo', p: ['Después de cobrar se abre el recibo.', 'Toca “Enviar por WhatsApp” o “Imprimir ticket”.', 'Para ver recibos viejos: en Hoy toca una venta de “Últimas ventas”.'], ir: 'hoy' },
  { id: 'anular', g: 'Vender', t: 'Anular una venta o hacer una devolución', p: ['Abre el recibo de la venta (en Hoy, “Últimas ventas”).', 'Toca “Anular venta” si fue un error, o “Devolver productos” si el cliente devolvió algo.', 'Escribe el motivo: queda en el registro.'], ir: 'hoy' },
  { id: 'cita', g: 'Agenda', m: 'agenda', t: 'Agendar una cita', p: ['Ve a Agenda y toca “+”.', 'Escribe el cliente y su teléfono.', 'Elige los servicios, con quién, el día y una hora libre.', 'Toca “Guardar y avisar por WhatsApp” para confirmarle.'], ir: 'agenda' },
  { id: 'cobrarCita', g: 'Agenda', m: 'agenda', t: 'Cobrar una cita', p: ['En Agenda (o en “Citas de hoy”), toca la cita.', 'Toca “Cobrar”: los servicios ya van puestos.', 'Elige quién atendió y cómo pagó.', 'La cita queda como “Atendida”.'], ir: 'agenda' },
  { id: 'orden', g: 'Órdenes', m: 'ordenes', t: 'Recibir y entregar una orden', p: ['Toca “+ Orden” (o el botón Orbe → Orden).', 'Escribe qué es, el cliente, la fecha de entrega y el anticipo.', 'Ve cambiando su estado hasta “Lista”.', 'Al entregar, toca “Entregar y cobrar”.'], ir: 'ordenes' },
  { id: 'reponer', g: 'Inventario', m: 'inventario', t: 'Anotar la mercancía que llegó', p: ['En Inventario, toca el producto.', 'Toca “Reponer” y escribe cuántos llegaron y a cuánto los compraste.', 'También puedes usar “Escanear” y pasar los códigos.'], ir: 'inventario' },
  { id: 'factura', g: 'Inventario', m: 'compras', t: 'Leer la factura del proveedor con una foto', p: ['En Inventario, toca “Factura”.', 'Toma la foto de frente y con buena luz.', 'Revisa lo que Orbe leyó y toca “Sumar”.'], abrir: 'factura' },
  { id: 'medidas', g: 'Inventario', m: 'medidas', t: 'Vender por kilo, metro o m²', p: ['Al crear el producto, en “Se vende por” elige Kilo, Metro, Metro² u otra medida.', 'El precio es por esa medida.', 'Si lo vendes entero o por mitad (medio pollo, media torta), elige “Medio” (o “Cuarto” para venderlo por cuartos): cada toque suma esa parte.', 'Al vender, Orbe te pregunta cuánto lleva (o cuánto quiere gastar).'], ir: 'inventario' },
  { id: 'promo', g: 'Inventario', m: 'promos', t: 'Crear una promoción', p: ['En Inventario, toca “Promos”.', 'Elige el tipo (2x1, porcentaje o precio por cantidad).', 'Elige los productos y hasta cuándo dura.', 'Se aplica sola al vender.'], abrir: 'promos' },
  { id: 'caja', g: 'Dinero', m: 'caja', t: 'Abrir y cerrar la caja', p: ['Al empezar el día: botón Orbe → Caja → “Abrir caja” y anota el fondo.', 'Si sacas efectivo, anótalo como “Retiro”.', 'Al terminar: “Cerrar turno” y cuenta lo que hay.'], abrir: 'caja' },
  { id: 'cierre', g: 'Dinero', t: 'Hacer el cierre del día', p: ['En Hoy, toca “Cierre del día” (o Más → Cierre del día).', 'Cuenta lo que hay de cada forma de pago y escríbelo.', 'Revisa la diferencia y toca “Cerrar el día”.'], abrir: 'cierre' },
  { id: 'gasto', g: 'Dinero', t: 'Anotar un gasto o una cuenta por pagar', p: ['Botón Orbe → Gasto (o Más → Gastos → “+ Gasto”).', 'Escribe el monto, en qué fue y cómo pagaste.', 'Si es para después, márcalo “por pagar” con su fecha.'], abrir: 'gasto' },
  { id: 'tasa', g: 'Dinero', t: 'Cambiar la tasa del dólar', p: ['Toca la tasa en Hoy (o Más → Tasas y monedas).', 'Toca “Actualizar de internet”, o toca una tasa para escribirla a mano.', 'Para cobrar una forma con otra tasa, toca BCV $, BCV € u Otra junto a ella.', 'Toca “Guardar”.'], abrir: 'tasa' },
  { id: 'empleado', g: 'Equipo', t: 'Agregar a un empleado con su PIN', p: ['Ve a Equipo (o Más → Equipo y permisos).', 'Toca “+ Perfil”.', 'Escribe su nombre, elige su rol y ponle un PIN de 4 números.', 'Ese empleado entra tocando su nombre y escribiendo su PIN.'], abrir: 'perfil' },
  { id: 'pinOlvidado', g: 'Equipo', t: 'Si un empleado olvida su PIN', p: ['El empleado toca “Olvidé mi PIN” en la pantalla de entrada.', 'Al dueño le llega el aviso en “Para hacer hoy” (y por WhatsApp o correo, si el empleado lo manda).', 'El dueño toca el aviso, escribe un PIN nuevo y se lo dice al empleado.'], ir: 'equipo' },
  { id: 'roles', g: 'Equipo', t: 'Qué puede hacer cada rol', p: ['Ve a Equipo.', 'Abajo, en “Qué puede hacer cada rol”, elige el rol.', 'Enciende o apaga cada permiso (por ejemplo, que el cajero no pueda dar descuentos).'], ir: 'equipo' },
  { id: 'comisiones', g: 'Equipo', m: 'comisiones', t: 'Comisiones por persona', p: ['Al cobrar, elige quién atendió.', 'En el perfil de cada persona pon su porcentaje de comisión.', 'En Reportes ves lo que le toca a cada uno.'], ir: 'reportes' },
  { id: 'cuotas', g: 'Vender', m: 'cuotas', t: 'Vender en cuotas', p: ['Al cobrar, elige “En cuotas”.', 'Toca la inicial (10, 20, 30 %…) o escríbela arriba.', 'Elige cuántas cuotas, cada cuánto y, si quieres, un recargo.', 'Elige el cliente y toca “Cobrar y crear plan”.', 'Imprime el acuerdo para que lo firme.'], ir: 'cuotas' },
  { id: 'apartar', g: 'Vender', m: 'cuotas', t: 'Apartar un producto', p: ['Al cobrar, elige “Apartado”.', 'Pon el abono inicial y cuántos días se lo guardas.', 'Elige qué pasa con lo abonado si no completa el pago.', 'El producto queda separado del inventario hasta que lo entregues.'], ir: 'cuotas' },
  { id: 'apartadoVencido', g: 'Vender', m: 'cuotas', t: 'Si un apartado vence', p: ['En Hoy sale “Un apartado venció” con el botón “Decidir”.', 'Elige: más tiempo, escribirle primero, pasarlo a cuotas o liberarlo.', 'Si lo liberas, eliges si lo abonado queda como saldo a favor, se devuelve o se retiene.'], ir: 'cuotas' },
  { id: 'cotizar', g: 'Vender', m: 'cotizaciones', t: 'Mandar una cotización', p: ['En Vender agrega lo que el cliente quiere.', 'Toca “Cotizar”.', 'Escribe el cliente y hasta cuándo valen los precios.', 'Mándala en PDF por WhatsApp.'], ir: 'vender' },
  { id: 'reservas', g: 'Agenda', m: 'agenda', t: 'Que tus clientes reserven solos', p: ['Ve a Más → Link de reservas.', 'Toca “Activar mi link de reservas”.', 'Copia el link y ponlo en tu Instagram o mándalo por WhatsApp.', 'Las citas que reservan entran solas a tu agenda.'], ir: 'mas' },
  { id: 'recordatorios', g: 'Clientes', t: 'Recordatorios por WhatsApp', p: ['En Hoy, “Recordatorios por enviar” trae los mensajes listos.', 'Toca “Enviar” y se abre WhatsApp.', 'En Más → Recordatorios eliges qué se recuerda.'], ir: 'hoy' },
  { id: 'deshacer', g: 'Ajustes', t: 'Si borraste algo por error', p: ['Al borrar un producto, gasto, cliente, perfil, rol, grupo, cotización o promoción sale un aviso con “Deshacer”.', 'Tócalo en los siguientes segundos y vuelve todo como estaba.', 'Las ventas, abonos, caja y órdenes no se deshacen así: se anulan o se corrigen y queda en el registro.'] },
  { id: 'funciones', g: 'Ajustes', t: 'Encender o apagar funciones', p: ['Ve a Más → Funciones.', 'Enciende lo que necesites (agenda, fiado, garantía…) y apaga lo que no uses.', 'Lo apagado desaparece de la app, pero tus datos no se borran.'], ir: 'mas' },
  { id: 'copias', g: 'Ajustes', t: 'Copias de seguridad', p: ['Orbe guarda una copia cada día en este aparato.', 'En Más → Copias y Excel puedes descargarla o restaurar una.', 'Guarda la descarga en un lugar seguro (correo, nube).'], ir: 'mas' }
];

// Botón “?” que abre la ayuda de esta pantalla (o de la que se pase en k).
export function BotonAyuda({ k, chico }) {
  const app = useApp();
  const clave = k || (app && app.sec);
  const a = app && ayudaDe(clave, app);
  if (!a) return null;
  return html`<button type="button" class=${'boton-ayuda toca' + (chico ? ' chico' : '')} aria-label=${'Ayuda: ' + a.t} title="¿Cómo se usa?" onClick=${e => { e.stopPropagation(); app.ayuda(clave); }}>?</button>`;
}

// Panel de ayuda: sube por encima de todo (también de una hoja abierta, sin cerrarla).
export function PanelAyuda({ k, cerrar }) {
  const app = useApp(), { T, ir, abrir } = app;
  // Si la pantalla tiene guía en vivo, primero se ofrece esa; la guía escrita queda en la lista.
  const [guia, setGuia] = useState(GUIAS.find(x => x.id === k) && !tieneGuia(k) ? k : null);
  const [sale, setSale] = useState(false);
  const fin = despues => { setSale(true); setTimeout(() => { cerrar(); if (typeof despues === 'function') despues(); }, 260); };
  useEffect(() => {
    // Escape cierra solo la ayuda (no la hoja que está debajo).
    const tecla = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); fin(); } };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, []);
  const a = ayudaDe(k, app), G = guia && GUIAS.find(x => x.id === guia);
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
        ${!G && a && (a.guiame || tieneGuia(k)) && html`<button type="button" class="btn toca guia-ayuda-btn" onClick=${() => fin(() => window.dispatchEvent(new CustomEvent('orbe-guiame', { detail: a.guiame || k })))}><${Icono} n="info" t=${18} />Guíame paso a paso</button>`}
        ${G ? html`${Pasos(G.p)}${(G.ir || G.abrir) && html`<button type="button" class="btn2 lleno toca" style="align-self:center" onClick=${() => llevar(G)}>Llévame ahí</button>`}`
        : a ? html`
          <p class="ayuda-que">${a.q}</p>
          ${a.img && html`<div class="ayuda-img"><img src=${'img/ayuda/' + a.img + '.webp'} alt=${'Así se ve: ' + a.t} loading="lazy" onError=${e => { e.target.parentNode.style.display = 'none'; }} /></div>`}
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
