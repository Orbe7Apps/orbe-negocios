# Reel: Demo Orbe Negocios (agenda del miércoles)

`reel.mp4`: 1080x1920, 17 s, con música original. `reel-portada.png` es la portada sugerida.

## Escenas
1. Mira cómo va tu día (pantalla Hoy).
2. Cobra con las formas de pago de tu país (Nueva venta).
3. Inventario con aviso de lo que se acaba.
4. Reportes y cierre del día.
5. ¿Algo así para tu negocio? App a medida desde $149, pago único. Escríbenos por DM, @orbe.apps.

## Texto del post (actualizado con los precios y el enlace vigentes)
Esta es Orbe Negocios, una app que hicimos para negocios pequeños: cobras con las formas de pago de tu país, llevas los fiados, el inventario y el cierre del día. Funciona sin internet.

Pruébala gratis: orbe7apps.github.io/orbe-negocios

¿Tu negocio necesita algo así, a tu medida? Hacemos apps a medida desde $149, pago único. Escríbenos por DM.

#appparanegocios #pymes #emprendedoreslatinos

## Música
Base electrónica suave hecha con código (`herramientas/musica.py`), sin canciones de terceros, con un whoosh y una campanita en cada cambio de escena. Volumen de unos −15 LUFS, el habitual en Instagram. Si prefieres una canción de moda, súbelo y agrégala desde Instagram bajando el volumen del audio original.

## Cómo regenerarlo
Desde `servicios/posts/`: `node herramientas/grabar-reel.js reel-demo-orbe-negocios/fuente/reel.html reel-demo-orbe-negocios/reel.mp4 17 2.4`.
Para la música: `python3 herramientas/musica.py musica.wav 17 4.0,6.9,9.8,13.4 --final 13.4` y luego `ffmpeg -i reel-demo-orbe-negocios/reel.mp4 -i musica.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest salida.mp4`.
