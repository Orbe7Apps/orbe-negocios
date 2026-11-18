# Reel: Sobre nosotros

`reel.mp4`: 1080x1920, 23 s, con música original. `reel-portada.png` es la portada sugerida.

## Escenas
1. Hola, somos Orbe Apps (planeta de la marca).
2. Apps para que tu negocio venda más (Orbe Negocios en el teléfono).
3. Catálogos con pedidos por WhatsApp, listo en 5 días, $49.
4. Microapps listas desde $17 (Inventario simple y Agenda de citas).
5. Pago único, sin mensualidad: microapp $17, catálogo $49, página $89, app a medida desde $149.
6. ¿Hablamos de tu negocio? Escríbenos por DM, @orbe.apps.

## Texto del post
Hola, somos Orbe Apps 👋 Hacemos apps para negocios pequeños de toda Latinoamérica: catálogos con pedidos por WhatsApp, páginas de negocio, microapps listas y apps a medida.

Pago único y sin mensualidad: microapps desde $17, catálogo con pedidos $49, página de negocio $89 y app a medida desde $149.

¿Tu negocio necesita algo así? Escríbenos por DM y te decimos qué te sirve.

#emprendimiento #negocioslatinos #appsparanegocios #ventasporwhatsapp #pymes

## Música
Base electrónica suave hecha con código (`herramientas/musica.py`), sin canciones de terceros, con un whoosh y una campanita en cada cambio de escena. Volumen de unos −15 LUFS, el habitual en Instagram. Si prefieres una canción de moda, súbelo y agrégala desde Instagram bajando el volumen del audio original.

## Cómo regenerarlo
Desde `servicios/posts/`: `node herramientas/grabar-reel.js reel-sobre-nosotros/fuente/reel.html reel-sobre-nosotros/reel.mp4 23 2.6` (necesita Playwright y ffmpeg).
Para la música: `python3 herramientas/musica.py musica.wav 23 3.4,7.6,11.6,15.6,19.4 --final 19.4` y luego `ffmpeg -i reel-sobre-nosotros/reel.mp4 -i musica.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest salida.mp4`.
