# Orbe Negocios

Tú vendes. Orbe hace lo repetitivo. App web instalable para negocios pequeños y empresas, en el teléfono y en la computadora.

**Demo:** https://orbe7apps.github.io/orbe-negocios/ (abre sola la versión de teléfono o de computadora).

Todo el contexto del proyecto (qué hace, arquitectura, decisiones, pendientes y cómo probar) está en **`docs/CONTEXTO.md`**. El estilo y las reglas de diseño, en `docs/ESTILO.md`.

Para probar en local: `python3 -m http.server` y abrir http://localhost:8000. Se puede forzar la vista con `?vista=telefono` o `?vista=pc`.

## La web de servicios y las microapps se mudaron

La página de ventas (`servicios/`), las microapps (`apps/`) y los catálogos (`catalogos/`) ahora viven solo en **https://orbe7apps.github.io/orbe-apps/** (repositorio `Orbe7Apps/orbe-apps`). Aquí quedan páginas de desvío para que los enlaces viejos sigan funcionando; los cambios se hacen solo en orbe-apps.
