# Estilo de Orbe (para Orbe Negocios)

Orbe Negocios tiene que verse y sentirse como Orbe personal. Esta guía recoge lo que ya está hecho y probado en `index.html`. **Ante la duda, copia el código de `index.html` en vez de inventar.**

## 1. Colores

Se definen como variables en `:root` y cambian solas entre modo claro y oscuro: `prefers-color-scheme`, `data-theme="dark"` y `data-theme="light"`.

| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#f4f3fb` | `#0b0a14` | Fondo de la app |
| `--surface` | `#ffffff` | `#16142a` | Tarjetas, hojas, barra |
| `--ink` | `#1a1733` | `#efeefe` | Texto principal |
| `--muted` | `#625f7d` | `#9a97b8` | Texto secundario |
| `--line` | `#dedcf0` | `#2a2745` | Separadores |
| `--accent` | `#8f84ff` | `#8f84ff` | Morado de Orbe: selección, enlaces |
| `--accent-ink` | `#ffffff` | `#ffffff` | Texto sobre morado |
| `--in` | `#12a37a` | `#3ddc9f` | Ingresos, “todo bien” |
| `--out` | `#e8436a` | `#ff6b8b` | Gastos, errores, vencido |
| `--fill` | tinta al 7 % | tinta al 7 % | Fondo de campos y botones secundarios |

- Botón principal: morado lleno (`#6a5cf2` en las maquetas, `--accent` en la app).
- Ámbar `#f0a020` para avisos y "por cobrar"; amarillo Binance `#f0b90b` solo para cosas de Binance.
- Logo de Orbe Negocios: tres círculos que se cruzan (morado `#8f84ff`, verde `#3ddc9f`, ámbar `#f0a020`), grandes dentro de un cuadro redondeado oscuro. Orbe personal usa los anillos concéntricos; Orbe Negocios usa este.

## 2. Letra

- **Inter** (Google Fonts), pesos 400, 500, 600 y 700. Si no carga, se usa la letra del sistema de Apple.
- Títulos: 700, `letter-spacing: -0.02em`.
- Montos: `font-variant-numeric: tabular-nums`, para que las cifras queden alineadas.
- Etiquetas pequeñas: 12–13 px en `--muted`.
- Campos de texto: 16 px, para que el iPhone no haga zoom.

## 3. Formas

- **Hojas** (ventanas que suben desde abajo): bordes de 28 px arriba, rayita para arrastrar, título y ✕ arriba.
  - El botón de confirmar va fijo abajo (`.sheet-foot`), separado por una línea suave.
- **Tarjetas:** borde de 16 px con un filete suave (`--shadow` es un borde de 1 px casi invisible, sin sombra grande), fondo `--surface`. La tarjeta del día (`.hero`) va con 18 px y sin sombra.
- **Menos ruido (v130):** el color es solo para el dinero (verde entra, rojo sale o está atrasado). Los íconos (`.ic`) y las iniciales de productos van en gris (`--fill` + tinta); los íconos de colores solo en Ajustes y en el menú del botón central. El botón central de la barra es un “+” (mismo menú Orbe); el logo queda para la carga y el ícono. “Guíame paso a paso” vive solo en el “?”. La cabecera de Hoy es nombre + “?” (la píldora sale solo “Sin internet”) y la tarjeta del día va primero.
- **Campo de porcentaje** (`.pago-monto.campo-pct`): caja fija de 96 px con el número y el “%” centrados juntos, nunca el “%” pegado al borde.
- **Botones:**
  - Principal: lleno, alto mínimo 48–54 px, ancho completo.
  - Secundario: fondo `--fill` y forma de píldora.
  - Todo lo que se toca mide al menos 44 px.
- **Barra de abajo:** flotante, en píldora, con fondo semitransparente y desenfoque. Se achica al bajar.
- **Botón +:** redondo de 58 px, morado.
- **Interruptores, chips y fichas de cuenta** con logo (`.mv-acc .ap`), con borde morado cuando están elegidos.
- **Logos de cuentas:** círculo con el color de la cuenta al 15 % y el ícono o las iniciales en ese color.
- **Íconos:** de línea, grosor 2, puntas redondeadas. Nunca emojis en la interfaz.

## 3b. En la computadora

- **Menú lateral** de 252 px con grupos (Día a día, Operación, Gestión) y contadores; debajo, el estado de conexión y la persona que usa la app.
- **Barra de arriba fija** y semitransparente: título, buscador (Ctrl K), selector de sucursal en píldora y el botón principal.
- **Tarjetas** de 16 px de borde en rejilla (4 cifras, luego 2/3 + 1/3, luego 3 columnas). Por debajo de 1180 px pasan a una columna, y por debajo de 820 px el menú se pone arriba.
- **Tablas** dentro de una tarjeta: encabezado en `--muted` de 12 px, filas de 14 px que se aclaran al pasar el ratón y estados en píldoras de color.
- **Ventanas centradas** de 460 px como máximo, en lugar de hojas. Entran subiendo un poco y aclarándose; el fondo se oscurece.
- **Atajos de teclado** a la vista, en pequeñas teclas con borde.
- La regla del teclado sigue igual: **ningún campo se enfoca solo**, tampoco el buscador.

## 4. Movimiento

- **Curva de Orbe:** `cubic-bezier(0.32, 0.72, 0, 1)` (`--spring`), con duraciones de 0,3 a 0,6 s. El rebote (`--bounce`) solo para detalles.
- **Al aparecer:** subir 8 px y aclararse (`fadeUp`). Las listas aparecen en cascada, con 25 ms entre filas.
- **Hojas:** suben desde abajo y la app de atrás se achica un poco.
- **Gráficos:** se dibujan en la pantalla y los anillos se llenan. Los repartos (formas de pago, gastos, sucursales, productos) usan **orbes**: anillos concéntricos como en `ringsSvg` de Orbe personal, con pista al 18 % y puntas redondeadas, más una lista con el símbolo de cada parte en un círculo de su color.
- **Al tocar:** el elemento se encoge un poco (`scale(0.96)`).
- **Al elegir algo:** cambia el borde o el fondo con una transición. Nunca se redibuja la lista entera.
- Respetar `prefers-reduced-motion`.

## 5. Reglas que el dueño ya pidió (no romperlas)

- Todo en **español**.
- **El teclado nunca se abre solo.** Ningún `focus()` automático al abrir hojas o pantallas.
- **Animaciones fluidas**, nunca lentas ni desfasadas.
- **Hojas:**
  - Solo se mueven en vertical.
  - Las filas que se deslizan de lado (cuentas, chips) se mueven solas, sin mover la hoja.
  - Para cerrar arrastrando hace falta un gesto claro hacia abajo: 14 px, o 28 px si empieza sobre una fila lateral.
- **Historial:** sin cambios de color al entrar. Deslizar muestra la papelera, pero no borra deslizando hasta el final.
- **Mostrar la tasa del día** junto a los montos en bolívares ($ y Bs).
- **Selección de cuenta:** con fichas que llevan el logo de la cuenta, nunca con listas desplegables.
- **Contraseñas:** se piden dos veces al crear la cuenta, con el ojito para verlas.
- Nada que aparezca solo para vender algo. Las guías opcionales, como la de Binance, se abren desde un menú.
- **Antes de un cambio grande de diseño, primero una maqueta.**
- **Textos cortos:** ninguna ayuda bajo una opción pasa de una línea; palabras del mostrador (“Costo”, “Cantidad”, “inventario”), no de sistema (“existencia”, “conciliar”). Lo poco usado va en “Más opciones”; las explicaciones largas, en el “?” de la pantalla.
- **Sin barras de colores** en listas ni rankings (formas de pago, gastos, quién debe, lo que más vendes, sucursales): círculo de color con el símbolo o el puesto, el % y el monto (`Reparto` y `BarrasH` en `js/graficos.js`). Las barras de avance (lo que queda en inventario, en qué va una orden, cuánto pagó un plan) sí se quedan.
- **Filtros que aplican:** las fichas de filtro solo muestran lo que tiene algo (o la que está elegida); nunca “Canceladas 0”.
- **Nada nativo del teléfono:** ni `select`, ni `datalist`, ni calendario o reloj del sistema, ni `confirm()`/`alert()`. Se usan `js/elegir.js`, fichas de sugerencia y preguntas dentro de la misma pantalla. (Solo `admin.html` conserva lo suyo.)
- **Equis con Deshacer** en todo lo que se puede quitar de una lista sin mover dinero (Para hacer hoy, recordatorios por enviar, plantillas).
- **Toque cómodo:** en el teléfono los botones chicos (36 px) responden en 44 px o más sin verse más grandes.
- **Centrado:** un botón o una píldora que queda solo en su fila va centrado, nunca pegado a un borde con espacio vacío al otro lado (salvo enlaces de “Volver” y textos que siguen la alineación del párrafo).
- **Filas que se deslizan de lado** solo se mueven en horizontal (`overflow-y: hidden`).
- **Animar con `transform` y `opacity`**, no con `width`, `left`, `filter` ni sombras: así va fluido en teléfonos sencillos.
- **Sin líneas horizontales** separando filas en las listas (perfiles, Para hacer hoy, últimas ventas, órdenes, gastos…).
- **Comillas:** usar “ ” en toda la app, nunca « ».
- **Deshacer:** al borrar algo aparece un aviso con "Deshacer" por 7 s, solo en lo que no mueve dinero (gasto, producto, cliente, perfil, rol). Nunca en ventas, abonos, órdenes de trabajo ni nada que pueda servir para estafar.
- **Colores por zona** (violeta cuenta, verde dinero, azul negocio, ámbar ventas, gris app) **solo en Ajustes**. Se probó en toda la app y el dueño pidió revertirlo.
- **iPhone:**
  - Respetar las zonas seguras (`env(safe-area-inset-*)`).
  - Arreglo de la franja de abajo en la app instalada: `@media (display-mode: standalone){ html{ min-height: min(100lvh, calc(100% + env(safe-area-inset-top))) } }`.

## 5b. Documentos en PDF

- Todos los PDF usan `js/papel.js`: papel formal en blanco y negro (nada del morado ni de las tarjetas de la app), letra Inter, filetes finos, tabla con cebra, total en $ y Bs con la tasa del día, monto en letras, firmas y “Página 1 de N”. Un documento nuevo se arma con sus piezas (`membrete`, `partes`, `tabla`, `totales`, `parrafo`, `cifras`, `firmas`, `cerrar`); nunca imprimiendo la pantalla.

## 6. Maquetas

- Lienzo original “Orbe Negocios” (fase 1, octubre 2026): https://claude.ai/artifact/G5XgQd56oAYGYSxnKFB5j4. Es historia: la app ya superó esas maquetas.
- Contexto completo del proyecto: `docs/CONTEXTO.md`.
