# Orbe Negocios · contexto completo del proyecto

Última actualización: 28 nov 2026 (app en la versión **v126** del service worker).
Este documento es la fuente única de verdad: qué es la app, cómo está hecha, qué se decidió y qué falta. Si algo cambia, se actualiza aquí.

---

## 1. Qué es

**Orbe Negocios** es una app web instalable (PWA) para llevar un negocio pequeño o una empresa desde el teléfono o la computadora: vender y cobrar, clientes y fiado, inventario, gastos, caja, reportes, agenda, órdenes, cotizaciones, cuotas y equipo con permisos. Funciona sin internet y sincroniza con la nube cuando hay conexión.

- Lema: “Tú vendes. Orbe hace lo repetitivo.”
- Mercado actual: **solo Venezuela** (dólares y bolívares, tasa BCV del día). El código ya soporta otros países, pero están ocultos (`PAISES_ACTIVOS = ['VE']` en `js/paises.js`).
- Marca: **Orbe Apps** (Venezuela), correo de soporte `orbeappsoficial@gmail.com`. Aún no está formalizada (sin RIF de empresa).
- Hay otra app hermana, **Orbe personal** (finanzas personales), en el repositorio `gllm57/misgastos`. Orbe Negocios copia su estética.
- La web de ventas, las microapps y los catálogos viven en otro repositorio: `Orbe7Apps/orbe-apps` (https://orbe7apps.github.io/orbe-apps/). En este repositorio solo quedan páginas de desvío (`apps/`, `catalogos/`, `servicios/`) para que no se rompan enlaces viejos ya compartidos con clientes. **No editarlas aquí.**

## 2. Enlaces

| Qué | Dónde |
|---|---|
| App | https://orbe7apps.github.io/orbe-negocios/ |
| Demo completa (ferretería, todo encendido) | https://orbe7apps.github.io/orbe-negocios/?demo |
| Demo paso a paso (elegir rubro) | https://orbe7apps.github.io/orbe-negocios/?demo=elegir |
| Panel de administración | https://orbe7apps.github.io/orbe-negocios/admin.html (instalable como “Orbe Admin”; también en Más → Panel de administración, solo para cuentas admin en el perfil dueño) |
| Términos / Privacidad | `terminos.html` / `privacidad.html` |
| Página pública de reservas | `reservar.html?n=<id del negocio>` |
| Repositorio | `Orbe7Apps/orbe-negocios` (antes `gllm57/orbe-negocios`; GitHub redirige). GitHub Pages publica la rama principal, que es `claude/nice-davinci-3ovhvv`. Los cambios de cualquier otra rama se publican solo al fusionarse en ella. |
| Supabase | proyecto `cwjmstctrxrcisfbknam` (https://cwjmstctrxrcisfbknam.supabase.co) |

Parámetros útiles: `?vista=telefono` / `?vista=pc` fuerzan la distribución; `?prueba` es para los scripts de prueba.

## 3. Cómo está hecha

- **Sin paso de compilación.** Preact + htm como módulos ES (`js/lib/preact-htm.js`). Se sirve tal cual con cualquier servidor estático: `python3 -m http.server` y abrir `http://localhost:8000`.
- **Estado** en un objeto `S` guardado en IndexedDB. Se cambia con `cambiar()`; cada cambio importante deja rastro con `nota(s, que)` en el registro (quién hizo qué).
- **Rutas** por hash (`#hoy`, `#vender`, `#clientes`…). Las secciones y sus permisos están en `SECCIONES`, `PERMISO_SEC` y `MODULO_SEC` de `js/app.js`.
- **Hojas** (ventanas que suben desde abajo; en PC son ventanas centradas) en el mapa `H` de `js/pantallas/hojas.js`. Contexto común con `useApp()` (`js/ctx.js`).
- **Rubros y funciones**: `js/rubros.js` define 12 rubros y 17 módulos que se encienden o apagan por negocio (`T.mod('cuotas')`).
- **Service worker** (`sw.js`): guarda cada versión completa y abre siempre desde esa copia. **Cada cambio publicado debe subir `VERSION`** (hoy `orbe-negocios-v126`). Desde v109 la versión nueva **no se activa sola**: se baja en silencio y se estrena la próxima vez que se abre la app, mientras se ve la pantalla de carga (app.js `versionLista` le manda `activar` al service worker y recarga una vez; la pantalla de carga sigue quieta, sin volver a empezar). Antes se recargaba sola ya mostrando los perfiles (“carga dos veces”). También se estrena al volver a la app tras más de 10 minutos fuera (el teléfono casi nunca la cierra del todo; v117). Y si la versión en uso es anterior a la v109 (su app no sabe pedir `activar`), la nueva se activa sola al instalarse: sin eso esos teléfonos se quedaban en la v108 (pasó el 27 nov 2026). Los archivos nuevos se agregan a `ARCHIVOS`.
- **Nube** (`js/nube.js`): Supabase Auth (correo + contraseña, o usuario), tablas por colección, cola sin conexión que sube sola, sincronización entre aparatos.

### Archivos principales

| Archivo | Qué tiene |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` | La app instalable |
| `css/orbe.css` | Todo el estilo: colores, piezas, animaciones, teléfono y PC |
| `js/app.js` | Arranque, navegación, barra lateral de PC, botón Orbe |
| `js/datos.js` | Datos, cálculos, demo, ventas, deudas, cuotas, copias, deshacer |
| `js/nube.js` | Supabase: cuentas, sincronización, planes, términos, límites |
| `js/ui.js` | Íconos, avisos (con botón de acción), bienvenida animada, piezas comunes |
| `js/rubros.js` | Rubros, módulos y catálogos de ejemplo |
| `js/paises.js` | Países, monedas, formas de pago, impuestos |
| `js/permisos.js` | Permisos por rol (con aviso en los delicados) |
| `js/ayuda.js` | Ayudas “?” por pantalla (con imágenes en `img/ayuda/`) y guías |
| `js/tutoriales.js` | Tutoriales (lista `TUTORIALES`, pantalla `Tutoriales`, guía `CorrerTutorial`): recorridos que se hacen tocando, filtrados por permisos y funciones; el “Recorrido por la app” es el tutorial `recorrido` |
| `js/recorrido.js` | Solo la tarjeta “¿Primera vez?” de Hoy que ofrece el recorrido |
| `js/guia.js` | Guía en vivo dentro de una hoja (`GuiaVivo`): ilumina lo que hay que tocar y avanza cuando la persona lo hace; `iluminar()` para una sola cosa |
| `js/guias.js` | “Guíame” de cada pantalla (`PASOS` por sección, `GuiaPantallas`, `BotonGuiame`) y la frase viva de arriba (`Frase`) |
| `js/recordatorios.js`, `js/horario.js`, `js/reservar.js` | Recordatorios por WhatsApp, horarios, reservas públicas |
| `js/admin.js` + `admin.html` | Panel de administración |
| `js/pantallas/*.js` | Cada pantalla: hoy, vender, clientes, inventario, gastos, caja, reportes, agenda, órdenes, cotizaciones, cuotas, equipo, cuenta (inicio de sesión, planes, pago), funciones, mas (Ajustes)… |
| `supabase/001…008_*.sql` | Migraciones de la base de datos, en orden |
| `pruebas/` | Script de barrido con Playwright (ver sección 9) |
| `docs/ESTILO.md` | Guía de estilo y reglas de diseño del dueño |
| `docs/al-formalizar.md` | Lo que hay que cambiar cuando Orbe tenga RIF |

## 4. Rubros y funciones

12 rubros: Bodega o minimarket, Ferretería, Electrodomésticos, Ropa y calzado, Farmacia, Restaurante o comida rápida, Panadería o cafetería, Barbería, Salón de belleza, Taller o servicio técnico, Venta en línea, Independiente.

17 funciones (Ajustes → Funciones, cada rubro trae las suyas encendidas): inventario, servicios, venta por peso o medida (también “Medio” y “Cuarto”: entero o por partes, cada toque suma ½ o ¼), **personalizados** (encendido en panadería), variantes (tallas/colores), garantía y serial, escáner con cámara, factura del proveedor con foto (OCR), cuidar precios, agenda de citas, comisiones, cotizaciones, órdenes de trabajo, **cuotas y apartados** (encendido en electro), fiado, promociones, caja con fondo y turnos.

## 5. Lo que ya está hecho (resumen)

- Vender y cobrar en $ y Bs con tasa BCV (formas de pago en Venezuela: Pago Móvil, **Punto de venta**, efectivo $ y Bs, USDT, Zelle, Binance Pay; Punto de venta se agregó solo una vez a los negocios que ya existían), pago mixto, vuelto, fiado, recibo por WhatsApp, impresora térmica, escáner.
- **Hoja de tasas sencilla (v111):** arriba solo las tasas que se usan hoy, cada una con su estado y para qué formas sirve (tocarla deja escribirla a mano) y “Actualizar de internet”; debajo, cada forma en bolívares (Pago Móvil, Punto de venta, Efectivo Bs) con fichas **BCV $ / BCV € / Otra** (Otra: paralela, USDT o propia, con su campo y “Leer”). Las formas en dólares van plegadas. La cajera solo las ve. Maqueta: https://claude.ai/artifact/5e1zQ9sgUN7CRrxbcfQ3x4 y `/mnt/project-files/tasas-sencillas/`.
- **Fechas, horas y listas propias (v111, `js/elegir.js`):** ya no se usan el calendario, el reloj ni las listas grises del teléfono. `CampoFecha` abre una capa con calendario grande (lunes primero, días pasados apagados) y, con hora, la rueda; `CampoHora` abre la **rueda** (hora, minutos y am/pm que se deslizan con el dedo; el número elegido queda grande en el centro; lo pidió el dueño); `CampoOpcion` muestra fichas (hasta 8), lista (hasta 12) o lista con buscador. La capa se dibuja encima de la hoja y el “atrás” del teléfono cierra solo la capa. Se usa en: entrega de órdenes, horario y almuerzo, vacaciones y días libres, fin de promociones, forma de pago al dividir el pago, país y producto de la factura. (`admin.html` conserva su lista de meses: es solo de computadora.)
- **Tasa de cada forma de pago** (Tasas de hoy, o Ajustes → Formas de pago → “Tasa de cada forma”): cada forma de cobro puede pasar a Bs con la tasa BCV del dólar (normal), la **tasa BCV del euro**, la paralela, la USDT o una propia (`S.negocio.tasaPago`). La del euro se lee de la misma fuente que la del dólar (dolarapi / pydolarve, BCV) y se usa aunque el negocio no tenga “Aceptar euros”; se lee sola una vez al día si alguna forma la usa (`usaEuro()`). Prueba: `node pruebas/tasa-euro.js` (`PC=1`).
- **Montos en la moneda de la forma de pago (27 nov):** en gasto, abono (“Otro monto”), anticipo y abono de órdenes, y pago de cuotas o apartados, el monto se escribe en la moneda de la forma elegida: Pago Móvil, Punto de venta y Efectivo Bs en **bolívares** (con la tasa de esa forma), las demás en $. Al cambiar de forma lo escrito se convierte (Bs 1.000 → $ 1,14 → Bs 1.000), y el botón $/Bs del campo cambia la moneda a mano. Debajo sale el equivalente con la tasa. El gasto escrito en Bs guarda lo pagado tal cual (`otra`, `tasa`) y se ve en Gastos como “Bs 1.000,00”. Pieza común: `useMonto` en `js/pantallas/pagos.js`. Prueba: `node pruebas/montos-bs.js` (`PC=1`).
- Clientes con **cédula o RIF obligatoria al agregarlos** (campo `doc`; se escribe “V-12345678”, no deja repetirla; a los clientes viejos se les puede completar al editarlos), deudas y abonos; inventario con mínimos; gastos y cuentas por pagar; caja con turnos y cierre; reportes con gráficos, CSV y PDF.
- Agenda con horario por profesional, link público de reservas, recordatorios por WhatsApp (con un toque, opción “A” gratuita).
- Órdenes de trabajo con anticipo y PDF; cotizaciones que se convierten en venta.
- **Personalizados** (`js/pantallas/personalizados.js`): un producto marcado “Para armar a la medida” (p. ej. Torta personalizada) se arma en Pedido en 3 pasos: piezas del inventario con cantidad (productos con el interruptor “Es una pieza” encendido, se venden por unidad), extras con precio (servicios con el interruptor “Es un extra”) y precio sugerido = piezas + extras, editable. Plantillas guardadas en el mismo producto (`pl`). “Ahora mismo” entra al pedido como una línea con sus piezas (`pz`), que bajan del inventario al cobrar; “Es un encargo” crea un Pedido en Órdenes: las piezas quedan apartadas (`apartadas()`, no se venden por error) y bajan al entregar. Las tortas se dibujan por pisos. Pensado para reusar en otros rubros (arreglos, combos, regalos, muebles a la medida).
- **Cuotas y apartados**: recargo por venta, calendario de cuotas, abonos, recordatorios; al vencer un apartado pregunta qué hacer (más tiempo, escribir primero, pasar a cuotas o liberar → saldo a favor / devolver / retener).
- Equipo: perfiles con PIN, roles y permisos (crear, borrar rol, aviso al dar permisos delicados), registro de cambios.
- Cuentas en la nube: registro, confirmación por correo con pantalla “Tu cuenta se confirmó”, “Olvidé mi usuario o contraseña”, aceptar términos, borrar cuenta, cuenta suspendida.
- Contraseñas: al crearla o cambiarla se pide 8 o más caracteres con letras y números. Si Supabase la rechaza (filtrada, débil o igual a la anterior) o falta confirmar el correo, el aviso sale en español junto al formulario, con “Mandar el enlace otra vez” para el correo. Prueba: `node pruebas/contrasenas.js` (simula Supabase, no toca la nube).
- Un negocio por cuenta: al iniciar sesión entra directo con animación de bienvenida y luego la pantalla de perfiles/PIN.
- PIN por ausencia (v113, pedido del dueño): ya no se pide al recargar, salir y volver rápido. Solo se pide otra vez si la app estuvo cerrada o fuera de la vista (otra app, otra pestaña, pantalla apagada) **más de 10 minutos**. `vigilarAusencia` en `js/app.js` anota la hora en `localStorage` (`orbe-ultimo-uso`) al ocultarse y cada 30 s mientras se ve. El botón “Cambiar de perfil” sigue saliendo al instante.
- **Registrar días anteriores (v112, 27 nov):** para pasar lo que el negocio anotó en su cuaderno. Hoja `anteriores` (`js/pantallas/anteriores.js`), desde Caja y desde Ajustes (Dinero; el buscador la encuentra con “cuaderno”, “libro”, “ayer”…). Se elige el día (Ayer, Antier, tira de 2 semanas con punto en los días que ya tienen algo, u “Otro día” con calendario) y se registra Venta (monto en la moneda de la forma de pago, una venta o el total del día; productos opcionales con “Bajar del inventario” apagado por defecto; lo no detallado queda como “Otros” o “Venta sin detalle”), Gasto, Abono o Fiado. Todo entra con la hora 12:00 de ese día (+1 min cada uno), la **tasa de ese día** (`tasasDelDia` lee `historialTasas`; se puede cambiar) y la marca `ant: { t, por }`; la caja y el cierre de hoy no se mueven. Funciones `ventaAnterior`, `gastoAnterior`, `abonoAnterior`, `movimientosDelDia` en `js/datos.js`; queda en el registro de cambios. Sin “Deshacer” (mueve dinero). Permiso `anteriores` (“Registrar ventas, gastos y abonos de días anteriores”, delicado): por defecto solo el dueño. Cada venta registrada después lleva su propia cadena de integridad (`dv: 'ant-<id>'`) porque la nube ordena por fecha; `sigNumero()` toma el número más alto. `useMonto`/`usePagos` usan `tasaM` del contexto si existe (la hoja pone la tasa del día elegido). Prueba: `node pruebas/anteriores.js` (`PC=1`). Maqueta: https://claude.ai/artifact/VvUWxyPVzLMo2jcdWdaLBb.
- Teclado del PIN (v109): en el celular las teclas miden hasta 88 px (según ancho y alto de la pantalla), responden al apoyar el dedo (`pointerdown`, no al soltar), cuentan dos toques muy seguidos y vibran un poco en Android. La pantalla del PIN usa menos margen arriba para que quepa.
- **Ventas de hoy (v110):** en “Últimas ventas” (Hoy y Caja en la PC) el botón “Ver todas las ventas de hoy” abre el desglose del día (`js/pantallas/ventasdia.js`): total, cómo pagaron, quién vendió, lo que se vendió y cada venta con quién la hizo (filtro por persona). Lo ve todo el equipo, cajeros incluidos; la ganancia solo con permiso de ganancias.
- Deshacer (7 s) al borrar gasto, producto, cliente, perfil o rol.
- Ayudas “?” con imágenes en cada pantalla y Tutoriales que se hacen tocando (ver abajo).
- **Textos claros (enfoque “lo esencial primero”, 26 nov):** textos de una línea con palabras de mostrador; opciones secundarias como botones con ícono (`Atajo` en `js/ui.js`, p. ej. Cobrar → Dividir pago / Atendió / Cliente); lo poco usado plegado en “Más opciones” (`MasOpciones`, p. ej. Nuevo producto); pistas que salen una sola vez por aparato (`Pista`, guardada en `localStorage`); Funciones en cuadrícula con nombre corto (`c` en `MODULOS`) y “mantén presionado” para ver qué hace. Maqueta: https://claude.ai/artifact/YUrbGvkrh2GuyuAZ5hEpge
- **Agregar productos sin abrumar (27 nov):** “Nuevo producto” pregunta primero “¿Qué vas a agregar?” (producto, por peso o por partes, servicio, para armar a la medida; solo los tipos que la cuenta usa, y si hay uno solo no pregunta). Desde v125 la pieza o el extra ya no es un tipo aparte (confundía): es un producto o servicio normal con un interruptor “Es una pieza · Sirve para armar algo” (o “Es un extra · Se suma al armar algo” en servicios), visible si “Personalizados” está encendido. Después, solo lo esencial: nombre y foto, precio (con Bs), costo opcional, cantidad y aviso, y el **IVA** a la vista (General / reducido / Exento) si el negocio cobra IVA en Ajustes → Impuesto (antes estaba plegado en “Más opciones” y el dueño creyó que se había quitado). “Más opciones” es una lista de filas (grupo, variantes, código, garantía, foto) y cada una se abre sola. **Guía en vivo** (`js/guia.js`): botón “Guíame” las 2 primeras veces por aparato y siempre en el “?” de la hoja (“Guíame paso a paso”); oscurece todo menos el campo, nunca abre el teclado, avanza cuando la persona lo llena, usa sus números y se adapta (tipo, inventario, duración, y un paso extra: garantía, variantes o código). Termina en “¡Listo!” con “Agregar otro” y “Ver dónde se vende” (ilumina el producto en Vender). Prueba: `node pruebas/producto.js` (`PC=1` para computadora). Maqueta: `/mnt/project-files/agregar-productos/` del proyecto.
- **Toda la app sencilla, con guías en vivo (aprobado el 27 nov, se aplica por partes):** cada pantalla abre con una **frase viva** que resume el momento con los números de hoy (lo urgente primero; sin internet lo dice), una acción grande y un botón **“Guíame”** que sale las 2 primeras visitas por aparato y después vive en el “?” (“Guíame paso a paso”). La guía oscurece todo, no deja tocar fuera de lo iluminado, avanza cuando la persona toca lo iluminado y se arma según funciones encendidas y permisos del perfil. Parte 1 (v104): motor, Hoy y Vender (hasta el recibo). Parte 2 (v105): Clientes (quién debe y desde cuándo, recordar, abono), Caja y Cierre del día; los pasos viven en `PASOS` de `js/guias.js` (clave = sección u hoja) y lo que se ilumina lleva `data-guia`. Donde hay guía en vivo, el “?” la ofrece primero. Parte 3 (v106): Inventario o Servicios (lo que se acaba, dinero en estantes, herramientas encendidas) y Gastos (lo que vence pronto, cuánto va del mes). Parte 4 (v107): Agenda (cuántas citas y quién viene ahora), Órdenes (atrasadas, listas y por cobrar; en PC, arrastrar entre columnas), Cotizaciones (lo que espera respuesta y lo que vence) y Cuotas (atrasados y a quién cobrar esta semana). `data-sec` en la pantalla dice qué sección se ve. Parte 5a (v108): Reportes (cuánto vendiste, contra antes y lo que te queda), Equipo (quién vende más, quién no tiene PIN) y Ajustes con buscador “¿Qué quieres cambiar?” (busca por nombre, descripción y palabras de `PALABRAS` en `js/pantallas/mas.js`); en la computadora todo lo anterior ya sale con su frase y su “Guíame” en la cabecera. Parte 5b (v108): **pantallas vacías que enseñan**: `Escena` en `js/pantallas/empezar.js` (Vender, Inventario, Clientes, Reportes, Órdenes, Agenda, Cuotas, Cotizaciones) con un dibujo corto animado (respeta “reducir movimiento”); con la pantalla vacía no salen la frase, cifras en cero, buscador ni filtros, y en la PC Órdenes y Agenda muestran la escena en vez del tablero vacío. Revisión de conjunto: en la PC el título, “?” y “Guíame” solo salen en la cabecera (no repetidos en Cotizaciones y Cuotas); al empezar una guía se saltan los pasos cuyo lugar no está en pantalla. La entrada (inicio, PIN, rubro) ya seguía el mismo estilo (pregunta como título, una línea, un botón grande) y no se tocó. Prueba de vacías: `node pruebas/vacias.js` (`PC=1`). Maqueta: https://claude.ai/artifact/E7UwH9c4BsBKHpVor2yygc y `/mnt/project-files/app-sencilla/`. Prueba: `node pruebas/guias.js` (`PC=1`).
- **Aprender tocando: recorrido y Tutoriales (27 nov, v122):** el recorrido de la primera entrada ya no se lee con “Siguiente”: la guía oscurece todo, muestra un dedo animado y avanza cuando la persona toca lo iluminado (Vender → un producto → Cobrar → forma de pago → Clientes → Más → Tutoriales); si toca fuera, la tarjeta se sacude. Nueva sección **Tutoriales** (`#tutoriales`, `js/tutoriales.js`): en el teléfono, Más → Tu negocio, debajo de “Equipo y permisos”; en la PC, menú lateral → Gestión, debajo de “Equipo y permisos”. Todos los perfiles la ven, cada uno con los tutoriales que su rol y las funciones encendidas permiten (`req` de cada uno en `TUTORIALES`). Arriba, cuántos lleva y cuál le conviene; cada tutorial corre en las pantallas reales y al terminar queda con ✓ **por persona** (`perfil.tuts`). Lo que mueve dinero es **práctica**: el último botón (Cobrar, Cerrar el día, Cotizar) se ilumina pero no se puede tocar (`practica` en el paso, aviso “Práctica: no se guarda”) y al salir la venta vuelve a como estaba (`tomarCarrito`/`ponerCarrito` en `vender.js`). Lo de crear (cliente, producto, empleado) sí se puede guardar (tiene “Deshacer”). “Agregar un producto” entrega a la guía de la hoja. Las guías escritas de “Ayuda y recorrido” pasaron a ser tutoriales; esa fila de Ajustes ahora es “Ayuda”. Lo que se toca se marca con `data-nav` (barra y menú), `data-ir`/`data-crear` (botón Orbe), `data-tema` (Ajustes) y `data-atajo`. Prueba: `node pruebas/tutoriales.js` (`PC=1`). Maqueta: https://claude.ai/artifact/AkCQtSqWfXbNfairAmz9pd y `/mnt/project-files/tutoriales/`.
- **Pagos por confirmar (27 nov):** en la hoja “Pagos por confirmar” cada pago por transferencia, Pago Móvil o punto tiene su botón “Confirmar”, que pide el número de referencia (obligatorio). Subir el estado de cuenta sigue confirmando solo los que coinciden. Mueve dinero: sin deshacer. En el Panel avisa de los pagos sin confirmar (con “Pedir referencia” activo).
- **Quitar avisos de “Para hacer hoy” (27 nov, v121):** cada aviso tiene una equis que lo quita **por hoy, en ese aparato** (`localStorage` `orbe-hoy-ocultos`), con “Deshacer” en el aviso. No borra ni cambia nada (deudas, órdenes, gastos siguen igual); si el aviso cambia (otra cifra, otro cliente) vuelve a salir, y mañana salen todos de nuevo.
- **Lo de hoy en toda la app (28 nov, v123):** los rankings (quién te debe, lo que más vendes, lo que más te deja, dónde está tu dinero, por sucursal) ya no tienen barras: círculo con el puesto, % del total y monto. Filtros de Órdenes, Cotizaciones, Cuotas y Clientes solo muestran lo que tiene algo. Nueva cotización: sugerencias de clientes en fichas (antes, lista del teléfono). “Cambiar de cuenta” pregunta dentro de la pantalla (antes, ventana gris). Equis de recordatorios y borrar plantilla con “Deshacer”. Botones chicos con área de toque de 44 px en el teléfono.
- **Vender y lo diario menos engorroso (28 nov, v124):** en el teléfono, al tocar un producto aparece una **barra flotante del carrito** encima de la barra de abajo (cuántos, total en $ y Bs, “Cobrar”); el producto “vuela” hasta ella y el total da un saltito (`CarroFlotante` en `vender.js`, `volarAlCarro` en `ui.js`). Se esconde cuando la tarjeta del carrito ya se ve, con el teclado abierto y durante guías. La tasa del día pasó a ser una píldora dentro de la frase de Vender (`ChipTasa chico`). En Vender e Inventario el buscador y los grupos quedan **pegados arriba** al bajar (`CabezaPegada` en `ui.js`; no cambia de alto para que nada salte). Formas de pago en **rejilla de dos columnas** en todo el teléfono (Cobrar, abonos, gastos…; `Chips rejilla`), y Cobrar trae marcada la forma de la última venta; el monto anima al cambiar. Inventario: botón **“+ Llegó”** en cada producto que abre Reponer sin pasar por Editar. Clientes (teléfono): la tarjeta “Te deben” solo dice el total y lo vencido; ya no repite a los deudores que salen en la lista. Ojo con Preact: un componente que devuelve un fragmento, o un fragmento que cambia de forma, desordena a los hermanos que vienen después; por eso `CabezaPegada` es un solo elemento y la barra flotante va arriba en el código.
- **Detalles visuales (28 nov, v125):** en el celular la cabecera pegada de Vender e Inventario ya no deja un espacio en blanco entre las pestañas y el buscador en teléfonos con cámara arriba (la zona segura se cubre con una franja al quedar pegada, no con relleno). Las filas que se deslizan de lado (grupos, días de agenda, profesionales, tasas) ya no se mueven en vertical (`overflow-y: hidden`; el área de toque de 44 px las desbordaba 2 px). Botones y píldoras que quedaban solos pegados a un borde ahora van centrados (tasa del día en la frase de Vender/Nuevo pedido, “+ Servicio o cargo”, “Borrar el rol”, “Llévame ahí”, “Agregar”, etc.; regla nueva en ESTILO.md). Animaciones más livianas: la app de atrás ya no se oscurece con `filter` al abrir una hoja (el velo ya oscurece), las escenas y el punto de “Guíame” se mueven con `transform`/`opacity`, y chips, pestañas e interruptores hacen un pequeño rebote al elegirse.
- Panel admin: negocios, activar planes, aprobar pagos, historial mensual con CSV para el contador, suspender/reactivar cuentas, datos de cobro.

## 6. Decisiones de negocio vigentes

- **Planes:** Negocio US$25/mes o 250/año (1 sede, 4 perfiles). Empresa US$35/mes o 350/año (varias sedes, 10 perfiles). Los límites hoy los controla la app; falta que el servidor también los controle.
- **Un solo negocio por cuenta** (índice único en Supabase). La cuenta admin no ve negocios ajenos al iniciar sesión.
- **El panel de administración exige verificación en dos pasos** (app de autenticación): la primera vez se configura con un QR.
- **El usuario y la contraseña son solo del dueño.** Cada aparato del equipo (caja, tablet) se conecta con un código de un solo uso (Ajustes → Cuenta y nube → Conectar un aparato, o enlace `?aparato=CODIGO`) y tiene su propia cuenta. Un aparato del equipo vende y cobra, pero el servidor no le deja cambiar permisos o perfiles ni borrar ventas, abonos o cierres. A los negocios que ya existían se les pregunta una vez por aparato “¿es tuyo o lo usa tu equipo?”. Detalle en `docs/SEGURIDAD.md`.
- **Prueba gratis: 3 días.**
- **Cobro solo por Binance.** Pago Móvil oculto y sus datos protegidos en el servidor. Factura desactivada (`PEDIR_FACTURA = false`): no se emite factura fiscal todavía.
- **Solo Venezuela** al registrarse.
- **Términos y privacidad** dicen “Orbe Apps, Venezuela”; los pagos se guardan para contabilidad aunque se borre la cuenta.
- Al restaurar una copia, se guardan solo las 3 copias “antes de” más recientes (no ocupa espacio en el servidor: vive en el aparato).

## 7. Reglas de trabajo con Claude (el dueño las pidió)

- Responder **en español**, claro y corto.
- **Después de cada cambio: subir `VERSION` en `sw.js`, commit y push.** Mensajes de commit en español.
- **Antes de un cambio grande de diseño, mostrar una maqueta** y esperar el visto bueno.
- Animaciones fluidas. **Nunca abrir el teclado solo** (ningún `focus()` automático).
- **Sin líneas horizontales** entre filas de listas.
- Comillas “ ” en la app, nunca « ».
- Deshacer solo en lo que no mueve dinero (nada de ventas, abonos, órdenes: riesgo de estafa).
- Colores por zona solo en Ajustes (se probó en toda la app y se revirtió).
- No escribir en las páginas “Puente” ni “Pendientes” de Notion.
- Probar de verdad antes de decir que algo funciona (capturas con Playwright y barrido de rubros).
- El resto de reglas de diseño: `docs/ESTILO.md`.

## 8. Lo que falta (en orden sugerido)

### Funciones
1. **Mesas y comandas** (restaurante): abrir mesa, sumar pedidos, comanda a cocina, propina. Hacer maqueta primero.
2. **Por rubro:**
   - Barbería y salón: ficha del cliente, paquetes y membresías, lista de espera.
   - Ferretería: precio mayorista, varias unidades de venta, proveedores y órdenes de compra, notas de entrega.
   - Electrodomésticos: seriales en depósito, garantías activas, entregas e instalaciones.
   - Ropa: nota de crédito, tallas por color, etiquetas con código de barras, rebajas por temporada.
   - Farmacia: lotes y vencimientos, principio activo, venta por blíster, récipe.
   - Restaurante y panadería: recetas, modificadores, delivery, producción y merma, foto del diseño de tortas.
   - Taller: ficha del vehículo o equipo, próximo servicio, revisión con fotos, presupuesto aprobado por WhatsApp.
   - Venta en línea: catálogo que entra a Órdenes, envíos, pagos por confirmar.
   - Independiente: proyectos por etapas, paquetes de horas, cotización con firma.
3. **Facturación fiscal** (Venezuela: imprenta digital o máquina fiscal del SENIAT). Hay que decidir con qué proveedor.

### Mejoras más chicas
4. Que el servidor controle los límites de sedes y perfiles (hoy solo la app).
5. Correo automático al dueño cuando un empleado olvida su PIN (necesita servicio de correo, p. ej. Resend con dominio propio).
6. En Vender e Inventario, que en “Todo” salgan juntos los productos del mismo grupo (preguntado, sin respuesta).
7. Paleta “Orbe sobrio” (el dueño la dejó para después).
8. Otros idiomas y países cuando se decida abrir fuera de Venezuela (el código ya tiene monedas, impuestos y formas de pago de varios países).

### Del lado del dueño
- En Supabase → Authentication → Sign In / Providers → Email: contraseña mínima de 8 con letras y números (*Letters and digits*) y “Confirm email”. “Leaked password protection” es solo del plan Pro (el proyecto está en el gratis): mientras tanto la app revisa por su cuenta las contraseñas filtradas y traduce los rechazos de Supabase. El panel admin ya exige verificación en dos pasos.
- Hablar con un contador: IVA, IGTF e imprenta digital.
- Formalizar Orbe Apps → seguir `docs/al-formalizar.md` (RIF y razón social en términos, factura, emisor en el panel, Pago Móvil, PDF de presentación).
- Dominio propio (p. ej. orbenegocios.com): mover la app y enviar los correos desde ahí.
- En Supabase → Authentication → Emails se pueden personalizar los textos de “Confirm signup” y “Reset password” (Claude puede redactarlos).

## 9. Cómo probar

- Servidor local: `python3 -m http.server 8765` en la raíz del repositorio.
- `pruebas/barrido.js` (Playwright): recorre los 12 rubros en teléfono y PC con la demo, abre todas las pantallas, los temas de Ajustes y las hojas principales, y hace una venta. Anota errores de consola, textos raros (`undefined`, `NaN`) y desbordes. Uso: `node pruebas/barrido.js "Ferretería,Barbería" tel,pc`. Tarda unos 10 min por cada 6 rubros; conviene partirlo en dos mitades.
- `pruebas/contrasenas.js`: avisos de contraseña y de correo sin confirmar, con respuestas de Supabase simuladas. `PC=1` para computadora.
- Último resultado (25 nov 2026): 12 rubros × teléfono y PC, **sin problemas**.
- Cuentas de prueba en la nube: usar correos `@orbeprueba.dev` y borrarlas al terminar.

## 10. Estado de la nube (26 nov 2026)

- Usuarios reales: 2 (el dueño y **Avenor**, primer cliente real; su prueba termina el 28 nov). 1 cuenta admin. 0 suspendidas.
- Migraciones aplicadas: 001 a 011 (esquema, privado y cobro, usuarios, reservas, legal, cobro solo Binance, un negocio por cuenta, suspender, seguridad, aparatos del equipo, panel admin con verificación en dos pasos). Función del servidor `aparato` (Edge Function, `supabase/functions/aparato`): da de alta los aparatos del equipo.
- Seguridad: RLS en todas las tablas; `puede_escribir` exige suscripción al día y cuenta no suspendida; datos de cobro con permisos por columna (el admin los lee con `admin_config()`). Límite real de intentos al entrar, topes en el link de reservas, historial privado de cambios (30 días) y CSP en las páginas. Auditoría completa y reglas en `docs/SEGURIDAD.md`.
