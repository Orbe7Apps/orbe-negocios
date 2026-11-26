# Orbe Negocios · instrucciones para Claude

Lee primero **`docs/CONTEXTO.md`** (qué es, cómo está hecha, decisiones, pendientes) y **`docs/ESTILO.md`** (diseño y reglas del dueño).

Reglas que no se rompen:
- Responder en español, claro y corto.
- Después de cada cambio: subir `VERSION` en `sw.js`, commit (en español) y push.
- La app se publica desde la rama principal `claude/nice-davinci-3ovhvv`. Al terminar un cambio, abrir un pull request hacia esa rama (o fusionarlo ahí si el dueño lo autoriza); si no llega ahí, no se publica.
- Antes de un cambio grande de diseño: maqueta primero y esperar el visto bueno.
- Nunca abrir el teclado solo. Animaciones fluidas. Sin líneas horizontales entre filas. Comillas “ ”, nunca « ».
- Deshacer solo en lo que no mueve dinero. Colores por zona solo en Ajustes.
- Probar antes de decir que funciona (`python3 -m http.server 8765` + `pruebas/barrido.js`).
- No editar `apps/`, `catalogos/` ni `servicios/` (son desvíos al repositorio orbe-apps).
- No escribir en las páginas “Puente” ni “Pendientes” de Notion.
- Si algo del contexto cambia (decisión, pendiente hecho), actualizar `docs/CONTEXTO.md`.
