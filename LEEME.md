# Orbe Negocios

Tú vendes. Orbe hace lo repetitivo. App web instalable para negocios pequeños y empresas, en el teléfono y en la computadora.

**Demo:** https://orbe7apps.github.io/orbe-negocios/ (abre sola la versión de teléfono o de computadora).

## Qué hace (muestra funcional)
- Primer uso: país, tipo de negocio, tamaño (negocio o empresa) y datos. Puede llenarse con un mes de ventas de ejemplo.
- Vender o cobrar con las formas de pago del país, vuelto, pago mixto, fiado y recibo por WhatsApp.
- Clientes y lo que deben, recordatorios con el mensaje listo y abonos.
- Inventario con mínimo y reposición, o servicios con duración.
- Gastos, cuentas por pagar y cierre del día.
- Reportes con gráficos animados, exportar a Excel (CSV) y PDF.
- Todo se guarda en el aparato y funciona sin internet. Modo claro, oscuro o automático.
- En Venezuela lee la tasa BCV del día cuando hay internet.

## Archivos
- `index.html`, `manifest.webmanifest`, `sw.js`, `icons/`: la app instalable.
- `css/orbe.css`: colores, piezas, movimiento y las dos distribuciones (teléfono y computadora).
- `js/paises.js`: países, monedas, formas de pago e impuestos.
- `js/datos.js`: datos guardados, ejemplo y cálculos.
- `js/graficos.js`: barras, línea, dona, anillo y barras horizontales.
- `js/ui.js`: íconos, hojas, avisos e interruptores.
- `js/app.js`: arranque y navegación. `js/pantallas/`: cada pantalla y las hojas.
- `js/lib/`: Preact y htm (sin paso de compilación).
- `docs/`: plan y guía de estilo. `maquetas/`: las maquetas aprobadas.

## Orbe Sellos (`fidelidad/`)
Tarjeta de fidelidad de sellos sin app, pensada para vender en cualquier país. El cliente escanea el QR del cartel y el negocio sella desde su teléfono.
- `fidelidad/index.html`: app del negocio (crear en 3 pasos, sellar, clientes, cartel, ajustes).
- `fidelidad/t.html`: tarjeta del cliente, en español, inglés o portugués.
- `fidelidad/supabase/esquema.sql`: la base en la nube. Mientras `fidelidad/js/config.js` esté vacío, funciona en modo demostración.
- Investigación y plan: `docs/FIDELIDAD.md`.

Para probar en local: `python3 -m http.server` y abrir http://localhost:8000. Se puede forzar la vista con `?vista=telefono` o `?vista=pc`.
