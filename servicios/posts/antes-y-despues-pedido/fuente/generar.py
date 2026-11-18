"""Carrusel "Antes y después de un pedido" (3 láminas de 1080x1350).
Usa las mismas piezas que la publicación de la bio (paleta, letras, logo y pie).
Uso: python3 generar.py && node renderizar.js"""
import os, sys
AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(AQUI, '..', '..', 'consejo-bio-instagram', 'fuente', 'generar.py')
codigo = open(BASE).read().split('laminas = {}')[0].replace("SALIDA = os.path.join(AQUI, 'html')", "SALIDA = os.path.join(AQUI_RAIZ, 'html')")
AQUI_RAIZ = AQUI
exec(codigo.replace("AQUI = os.path.dirname(os.path.abspath(__file__))", "AQUI = AQUI_RAIZ"))
os.makedirs(SALIDA, exist_ok=True)


def puntos3(n, oscura=False):
    bg = 'rgba(255,255,255,.22)' if oscura else LILA2
    on = VERDE if oscura else MORADO
    return '<div class="puntos">' + ''.join(f'<i style="background:{on if k == n else bg};width:{40 if k == n else 12}px"></i>' for k in (1, 2, 3)) + '</div>'


def pie3(n, oscura=False):
    return f'<div class="pie" style="color:{"#efeefe" if oscura else TINTA}"><div class="marca">{logo(56, NOCHE if oscura else CLARO)}Orbe Apps</div>{puntos3(n, oscura)}</div>'


def burbuja(texto, mia=False, extra=''):
    fondo = '#d9fdd3' if mia else '#ffffff'
    lado = 'flex-end' if mia else 'flex-start'
    return f'<div style="align-self:{lado};background:{fondo};color:#111b21;border-radius:22px;padding:14px 20px;font-size:27px;line-height:1.3;max-width:560px;box-shadow:0 2px 0 rgba(0,0,0,.08);{extra}">{texto}</div>'


def nota_voz(seg, mia=False):
    fondo = '#d9fdd3' if mia else '#ffffff'
    lado = 'flex-end' if mia else 'flex-start'
    ondas = ''.join(f'<i style="width:5px;height:{h}px;border-radius:3px;background:#7b8a8f"></i>' for h in (14, 24, 18, 30, 12, 26, 20, 28, 16, 22, 12, 26, 18))
    return f'<div style="align-self:{lado};background:{fondo};border-radius:22px;padding:14px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 0 rgba(0,0,0,.08)"><span style="width:0;height:0;border-left:18px solid #54656f;border-top:11px solid transparent;border-bottom:11px solid transparent"></span><span style="display:flex;align-items:center;gap:4px">{ondas}</span><span style="font-size:22px;color:#667781">{seg}</span></div>'


laminas = {}
chat = ''.join([
    burbuja('Hola, ¿precio de la torta de chocolate?'), burbuja('Hola, $28 la de 20 porciones', True),
    burbuja('¿Y la de vainilla?'), nota_voz('0:42'), burbuja('¿Hacen envíos?'), burbuja('Sí, ¿a qué zona?', True),
    nota_voz('1:05'), burbuja('Mándame foto de los cupcakes'), '<div style="align-self:flex-end;background:#d9fdd3;border-radius:22px;padding:8px;box-shadow:0 2px 0 rgba(0,0,0,.08)"><div style="width:220px;height:150px;border-radius:16px;background:linear-gradient(135deg,#f7c6d0,#e89aac 60%,#c2335a)"></div></div>',
    burbuja('Ok, quiero 12. ¿Me repites el total?'), nota_voz('0:31'), burbuja('¿Y cómo te pago?')])
laminas['01'] = f'''<div class="lamina oscura">{estrellas()}
<span style="position:relative;align-self:flex-start;font-weight:800;font-size:30px;color:#ff8fa8;background:rgba(232,67,106,.14);border:2px solid rgba(232,67,106,.4);padding:10px 24px;border-radius:999px">Antes</span>
<h2 style="position:relative;font-size:96px;margin-top:34px;max-width:880px">12 mensajes para un solo pedido</h2>
<div style="position:relative;margin-top:44px;height:690px;overflow:hidden;border-radius:36px;background:#efe7dd;padding:26px;display:flex;flex-direction:column;gap:12px;-webkit-mask:linear-gradient(#000 78%,transparent)">{chat}</div>
{pie3(1, True)}</div>'''

pedido = ('<b>Hola, quiero hacer este pedido:</b><br><br>1 × Torta de chocolate (20 porciones), $28<br>12 × Cupcakes decorados, $15<br><br>'
          '<b>Total: $43</b><br>Entrega: sábado 21, 4 p. m.<br>Zona: El Poblado<br>Pago: transferencia')
laminas['02'] = f'''<div class="lamina clara">
<span style="align-self:flex-start;font-weight:800;font-size:30px;color:#12a37a;background:rgba(18,163,122,.12);border:2px solid rgba(18,163,122,.35);padding:10px 24px;border-radius:999px">Después</span>
<h2 style="font-size:96px;margin-top:34px;max-width:880px">1 mensaje con todo listo</h2>
<p class="bajada" style="margin-top:22px;font-size:36px">Tu cliente arma el pedido en tu catálogo y te llega así:</p>
<div style="margin-top:40px;border-radius:36px;background:#efe7dd;padding:34px;display:flex;flex-direction:column">
<div style="align-self:flex-end;background:#d9fdd3;color:#111b21;border-radius:26px 26px 6px 26px;padding:28px 32px;font-size:33px;line-height:1.38;max-width:800px;box-shadow:0 2px 0 rgba(0,0,0,.08)">{pedido}<div style="text-align:right;font-size:22px;color:#667781;margin-top:6px">10:24 ✓✓</div></div></div>
{pie3(2)}</div>'''

laminas['03'] = f'''<div class="lamina clara">
<h2 style="font-size:100px;max-width:880px">Tu catálogo con pedidos por WhatsApp</h2>
<div style="margin-top:56px;display:flex;flex-direction:column;gap:22px">
<div class="tarjeta" style="margin:0;display:flex;justify-content:space-between;align-items:center;border:3px solid {MORADO}"><span style="font-size:40px;font-weight:700">Pago único</span><b style="font:800 76px Sora;letter-spacing:-.04em">$49</b></div>
<div class="vs" style="margin-top:12px;gap:22px">
<div><span class="m" style="background:{MORADO}">{ico(I['ok'],26,'#fff',3)}</span>Listo en 5 días</div>
<div><span class="m" style="background:{MORADO}">{ico(I['ok'],26,'#fff',3)}</span>Cambias los precios desde el teléfono</div>
<div><span class="m" style="background:{MORADO}">{ico(I['ok'],26,'#fff',3)}</span>Sin comisiones por pedido</div></div></div>
<div style="margin-top:auto;margin-bottom:130px;background:{MORADO};color:#fff;border-radius:30px;padding:28px 34px;display:flex;align-items:center;gap:20px;font-size:34px;font-weight:700;line-height:1.3">{ico(I['chat'],48,'#fff')}<span>Cupo para 3 negocios esta semana. Escríbenos por DM.</span></div>
{pie3(3)}</div>'''

for k, html in laminas.items():
    with open(os.path.join(SALIDA, f'{k}.html'), 'w') as f:
        f.write(HEAD + html + '</body></html>')
print('Listo:', ', '.join(sorted(laminas)))
