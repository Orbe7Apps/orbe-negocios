# Orbe Negocios · contexto completo del proyecto

Última actualización: 26 nov 2026 (app en la versión **v95** del service worker).
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
- **Rubros y funciones**: `js/rubros.js` define 12 rubros y 16 módulos que se encienden o apagan por negocio (`T.mod('cuotas')`).
- **Service worker** (`sw.js`): guarda cada versión completa y abre siempre desde esa copia. **Cada cambio publicado debe subir `VERSION`** (hoy `orbe-negocios-v91`). Los archivos nuevos se agregan a `ARCHIVOS`.
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
| `js/recorrido.js` | Tutorial que se adapta al rubro, funciones, permisos y aparato |
| `js/recordatorios.js`, `js/horario.js`, `js/reservar.js` | Recordatorios por WhatsApp, horarios, reservas públicas |
| `js/admin.js` + `admin.html` | Panel de administración |
| `js/pantallas/*.js` | Cada pantalla: hoy, vender, clientes, inventario, gastos, caja, reportes, agenda, órdenes, cotizaciones, cuotas, equipo, cuenta (inicio de sesión, planes, pago), funciones, mas (Ajustes)… |
| `supabase/001…008_*.sql` | Migraciones de la base de datos, en orden |
| `pruebas/` | Script de barrido con Playwright (ver sección 9) |
| `docs/ESTILO.md` | Guía de estilo y reglas de diseño del dueño |
| `docs/al-formalizar.md` | Lo que hay que cambiar cuando Orbe tenga RIF |

## 4. Rubros y funciones

12 rubros: Bodega o minimarket, Ferretería, Electrodomésticos, Ropa y calzado, Farmacia, Restaurante o comida rápida, Panadería o cafetería, Barbería, Salón de belleza, Taller o servicio técnico, Venta en línea, Independiente.

16 funciones (Ajustes → Funciones, cada rubro trae las suyas encendidas): inventario, servicios, venta por peso o medida, variantes (tallas/colores), garantía y serial, escáner con cámara, factura del proveedor con foto (OCR), cuidar precios, agenda de citas, comisiones, cotizaciones, órdenes de trabajo, **cuotas y apartados** (encendido en electro), fiado, promociones, caja con fondo y turnos.

## 5. Lo que ya está hecho (resumen)

- Vender y cobrar en $ y Bs con tasa BCV, pago mixto, vuelto, fiado, recibo por WhatsApp, impresora térmica, escáner.
- Clientes, deudas y abonos; inventario con mínimos; gastos y cuentas por pagar; caja con turnos y cierre; reportes con gráficos, CSV y PDF.
- Agenda con horario por profesional, link público de reservas, recordatorios por WhatsApp (con un toque, opción “A” gratuita).
- Órdenes de trabajo con anticipo y PDF; cotizaciones que se convierten en venta.
- **Cuotas y apartados**: recargo por venta, calendario de cuotas, abonos, recordatorios; al vencer un apartado pregunta qué hacer (más tiempo, escribir primero, pasar a cuotas o liberar → saldo a favor / devolver / retener).
- Equipo: perfiles con PIN, roles y permisos (crear, borrar rol, aviso al dar permisos delicados), registro de cambios.
- Cuentas en la nube: registro, confirmación por correo con pantalla “Tu cuenta se confirmó”, “Olvidé mi usuario o contraseña”, aceptar términos, borrar cuenta, cuenta suspendida.
- Contraseñas: al crearla o cambiarla se pide 8 o más caracteres con letras y números. Si Supabase la rechaza (filtrada, débil o igual a la anterior) o falta confirmar el correo, el aviso sale en español junto al formulario, con “Mandar el enlace otra vez” para el correo. Prueba: `node pruebas/contrasenas.js` (simula Supabase, no toca la nube).
- Un negocio por cuenta: al iniciar sesión entra directo con animación de bienvenida y luego la pantalla de perfiles/PIN.
- Deshacer (7 s) al borrar gasto, producto, cliente, perfil o rol.
- Ayudas “?” con imágenes en cada pantalla y tutorial adaptado.
- Panel admin: negocios, activar planes, aprobar pagos, historial mensual con CSV para el contador, suspender/reactivar cuentas, datos de cobro.

## 6. Decisiones de negocio vigentes

- **Planes:** Negocio US$25/mes o 250/año (1 sede, 4 perfiles). Empresa US$35/mes o 350/año (varias sedes, 10 perfiles). Los límites hoy los controla la app; falta que el servidor también los controle.
- **Un solo negocio por cuenta** (índice único en Supabase). La cuenta admin no ve negocios ajenos al iniciar sesión.
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
- Activar en Supabase **“Leaked password protection”**, contraseña mínima de 8 con letras y números, y “Confirm email” (Authentication → Providers → Email), y la verificación en dos pasos (MFA) en la cuenta admin. La app ya muestra los avisos de estos rechazos.
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
- Migraciones aplicadas: 001 a 010 (esquema, privado y cobro, usuarios, reservas, legal, cobro solo Binance, un negocio por cuenta, suspender, seguridad, aparatos del equipo). Función del servidor `aparato` (Edge Function, `supabase/functions/aparato`): da de alta los aparatos del equipo.
- Seguridad: RLS en todas las tablas; `puede_escribir` exige suscripción al día y cuenta no suspendida; datos de cobro con permisos por columna (el admin los lee con `admin_config()`). Límite real de intentos al entrar, topes en el link de reservas, historial privado de cambios (30 días) y CSP en las páginas. Auditoría completa y reglas en `docs/SEGURIDAD.md`.
