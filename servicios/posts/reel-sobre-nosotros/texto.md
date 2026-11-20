# Reel: Sobre nosotros

`reel.mp4`: 1080x1920, 23 s, con música original. `reel-portada.png` es la portada sugerida.

## Escenas (cortes al ritmo de la música, con barrida de color en cada uno)
1. 0 a 3,5 s: salto al hiperespacio, el planeta entra girando con el satélite en órbita, "Hola, somos" palabra por palabra y "Orbe Apps" letra por letra.
2. 3,5 a 7,2 s: "Apps para que tu negocio venda más", el teléfono con Orbe Negocios entra girando, "Vendido hoy" cuenta hasta $67,05 y salta "+3 pedidos nuevos".
3. 7,2 a 10,9 s: "Catálogos con pedidos por WhatsApp", el teléfono entra desde un lado con toques en pantalla, llega el pedido por WhatsApp y "Pago único $49".
4. 10,9 a 14,6 s: "Microapps listas desde" y un $17 gigante que cuenta y late, con Inventario, Agenda, Fiados y Presupuesto apareciendo en cascada.
5. 14,6 a 18,3 s: "Pago único. Sin mensualidad." y los precios entrando por lados alternos: $17, $49, $89, desde $149.
6. 18,3 a 23 s: planeta con órbita, "¿Hablamos de tu negocio?", botón "Escríbenos por DM" que late al ritmo y @orbe.apps.

## Texto del post
Hola, somos Orbe Apps 👋 Hacemos apps para negocios pequeños de toda Latinoamérica: catálogos con pedidos por WhatsApp, páginas de negocio, microapps listas y apps a medida.

Pago único y sin mensualidad: microapps desde $17, catálogo con pedidos $49, página de negocio $89 y app a medida desde $149.

¿Tu negocio necesita algo así? Escríbenos por DM y te decimos qué te sirve.

#emprendimiento #negocioslatinos #appsparanegocios #ventasporwhatsapp #pymes

## Música
Base electrónica suave hecha con código (`herramientas/musica.py`), sin canciones de terceros, con un whoosh y una campanita en cada cambio de escena. Volumen de unos −15 LUFS, el habitual en Instagram. Si prefieres una canción de moda, súbelo y agrégala desde Instagram bajando el volumen del audio original.

## Cómo regenerarlo
Desde `servicios/posts/`: `node herramientas/grabar-reel.js reel-sobre-nosotros/fuente/reel.html reel-sobre-nosotros/reel.mp4 23 2.8` (necesita Playwright y ffmpeg). El reel usa `herramientas/motor2.js`.
Para la música: `python3 herramientas/musica.py musica.wav 23 3.5,7.2,10.9,14.6,18.3 --final 18.3` y luego `ffmpeg -i reel-sobre-nosotros/reel.mp4 -i musica.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest salida.mp4`.
