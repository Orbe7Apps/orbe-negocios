"""Genera el HTML de las 6 láminas del carrusel "5 cosas que tu bio de Instagram necesita".
Uso: python3 generar.py  (crea fuente/html/01.html ... 06.html); luego node renderizar.js para los PNG.
Paleta y letras de la marca Orbe Apps (servicios/): Sora para títulos, Manrope para texto."""
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, 'html')
os.makedirs(SALIDA, exist_ok=True)

NOCHE, MORADO, LILA, LILA2, VERDE, AMBAR, CLARO, TINTA, GRIS = '#0b0a14', '#6a5cf2', '#8f84ff', '#c9c0ff', '#3ddc9f', '#f0a020', '#f4f3fb', '#1a1733', '#5f5c7a'


def logo(s, fondo):
    """Planeta de Orbe Apps con su anillo y el satélite verde (el mismo de servicios/logo.svg)."""
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 120 120" aria-hidden="true"><g transform="rotate(-22 60 60)">'
            f'<path d="M6 60 A54 17 0 0 1 114 60" fill="none" stroke="{LILA2}" stroke-width="6" stroke-linecap="round"/>'
            f'<circle cx="60" cy="60" r="30" fill="{LILA}"/>'
            f'<path d="M25.3 73 A54 17 0 0 0 94.7 73" fill="none" stroke="{fondo}" stroke-width="14"/>'
            f'<path d="M6 60 A54 17 0 0 0 114 60" fill="none" stroke="{LILA2}" stroke-width="6" stroke-linecap="round"/>'
            f'<circle cx="78.5" cy="76" r="11" fill="{fondo}"/><circle cx="78.5" cy="76" r="7.5" fill="{VERDE}"/></g></svg>')


def ico(d, s=44, color='currentColor', w=2.2):
    return f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{d}</svg>'


I = {
    'bolsa': '<path d="M5 8h14l-1.3 11.2a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    'pin': '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.6"/>',
    'chat': '<path d="M4 5.5h16v10H9l-5 4Z"/><path d="M8 9.5h8M8 12.5h5"/>',
    'reloj': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    'enlace': '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    'flecha': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'x': '<path d="M7 7l10 10M17 7 7 17"/>',
    'ok': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    'calendario': '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
}

CSS = f'''
* {{ box-sizing: border-box; margin: 0; }}
html, body {{ width: 1080px; height: 1350px; overflow: hidden; }}
body {{ font-family: "Manrope", sans-serif; -webkit-font-smoothing: antialiased; }}
.lamina {{ position: relative; width: 1080px; height: 1350px; padding: 96px 92px; display: flex; flex-direction: column; overflow: hidden; }}
.oscura {{ background: radial-gradient(900px 640px at 82% 18%, #2a2462 0%, transparent 62%), radial-gradient(700px 520px at 0% 100%, #1d1a40 0%, transparent 60%), {NOCHE}; color: #efeefe; }}
.clara {{ background: {CLARO}; color: {TINTA}; }}
h1, h2, .sora {{ font-family: "Sora", sans-serif; letter-spacing: -.04em; line-height: 1.02; font-weight: 800; }}
.pie {{ position: absolute; left: 92px; right: 92px; bottom: 76px; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 28px; }}
.marca {{ display: flex; align-items: center; gap: 14px; font: 800 32px "Sora"; letter-spacing: -.03em; }}
.puntos {{ display: flex; gap: 10px; align-items: center; }}
.puntos i {{ width: 12px; height: 12px; border-radius: 99px; background: {LILA2}; }}
.puntos i.on {{ width: 40px; background: {MORADO}; }}
.oscura .puntos i {{ background: rgba(255,255,255,.22); }} .oscura .puntos i.on {{ background: {VERDE}; }}
.paso {{ display: inline-flex; align-items: center; gap: 14px; align-self: flex-start; font-weight: 800; font-size: 28px; color: {MORADO}; background: #fff; border: 2px solid #e2e0f2; border-radius: 999px; padding: 12px 24px 12px 14px; }}
.paso b {{ width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: {MORADO}; color: #fff; font: 800 26px "Sora"; }}
.num {{ position: absolute; right: 70px; top: 610px; font: 800 300px/1 "Sora"; letter-spacing: -.06em; color: transparent; -webkit-text-stroke: 3px #d6d1f7; pointer-events: none; }}
.titulo {{ font-size: 108px; margin-top: 56px; max-width: 880px; position: relative; }}
.bajada {{ font-size: 40px; line-height: 1.38; color: {GRIS}; margin-top: 34px; max-width: 820px; position: relative; font-weight: 500; }}
.tarjeta {{ position: relative; margin-top: auto; margin-bottom: 120px; background: #fff; border: 2px solid #e2e0f2; border-radius: 36px; padding: 34px 38px; box-shadow: 0 30px 60px -40px rgba(26,23,51,.45); }}
.tarjeta small {{ display: block; font-size: 24px; font-weight: 700; color: {GRIS}; margin-bottom: 18px; }}
.ej {{ display: flex; align-items: center; gap: 20px; font-size: 38px; font-weight: 700; line-height: 1.25; }}
.ej .i {{ width: 74px; height: 74px; border-radius: 22px; display: grid; place-items: center; flex-shrink: 0; color: #fff; }}
.vs {{ display: flex; flex-direction: column; gap: 14px; }}
.vs div {{ display: flex; align-items: center; gap: 16px; font-size: 34px; font-weight: 600; }}
.vs .mal {{ color: #a39fbf; text-decoration: line-through; text-decoration-thickness: 3px; text-decoration-color: #e8436a; }}
.vs span.m {{ width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; }}
'''

HEAD = ('<!doctype html><html lang="es"><head><meta charset="utf-8">'
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@500;600;700;800&display=swap">'
        f'<style>{CSS}</style></head><body>')


def puntos(n):
    return '<div class="puntos">' + ''.join(f'<i class="{"on" if k == n else ""}"></i>' for k in range(1, 7)) + '</div>'


def pie(n, oscura=False):
    return f'<div class="pie"><div class="marca">{logo(56, NOCHE if oscura else CLARO)}Orbe Apps</div>{puntos(n)}</div>'


def estrellas():
    import random
    r = random.Random(7)
    return ''.join(f'<i style="position:absolute;left:{r.randint(0,1080)}px;top:{r.randint(0,1350)}px;width:{s}px;height:{s}px;border-radius:50%;background:#e6e3ff;opacity:{r.uniform(.25,.9):.2f}"></i>'
                   for s in [r.choice([2, 2, 3, 3, 4]) for _ in range(90)])


laminas = {}

# 1 · Portada
laminas['01'] = f'''<div class="lamina oscura">{estrellas()}
<div style="position:absolute;right:-150px;top:150px;opacity:.95">{logo(560, NOCHE)}</div>
<span style="position:relative;align-self:flex-start;display:inline-flex;align-items:center;gap:12px;font-weight:800;font-size:30px;color:{VERDE};background:rgba(61,220,159,.12);border:2px solid rgba(61,220,159,.35);padding:12px 26px;border-radius:999px">{ico(I['bolsa'],30,VERDE)} Consejo para tu negocio</span>
<h1 style="position:relative;font-size:178px;margin-top:300px;max-width:820px">¿Tu bio<br><span style="background:linear-gradient(90deg,{LILA2},{VERDE} 55%,{AMBAR});-webkit-background-clip:text;background-clip:text;color:transparent">vende?</span></h1>
<p style="position:relative;font-size:46px;line-height:1.3;color:#c9c5ea;margin-top:40px;max-width:760px;font-weight:600">5 cosas que tu bio de Instagram necesita</p>
<div class="pie" style="color:#efeefe"><div class="marca">{logo(56, NOCHE)}Orbe Apps</div><span style="display:flex;align-items:center;gap:12px;color:{LILA2}">Desliza {ico(I['flecha'],34,LILA2,2.6)}</span></div></div>'''


def consejo(n, num, titulo, bajada, mal, bien, icono, color):
    return f'''<div class="lamina clara"><div class="num">{num}</div>
<span class="paso"><b>{num}</b>de 5</span>
<h2 class="titulo">{titulo}</h2>
<p class="bajada">{bajada}</p>
<div class="tarjeta"><small>En tu bio</small><div class="vs">
<div class="mal"><span class="m" style="background:#fde3ea">{ico(I['x'],26,'#e8436a',3)}</span>{mal}</div>
<div><span class="m" style="background:{color}">{ico(I['ok'],26,'#fff',3)}</span>{bien}</div></div></div>
{pie(n)}</div>'''


laminas['02'] = consejo(2, 1, 'Qué vendes, en pocas palabras', 'Quien entra decide en segundos. Dilo claro en la primera línea.', 'Bienvenidos a mi cuenta', 'Tortas y postres por encargo', I['bolsa'], MORADO)
laminas['03'] = consejo(3, 2, 'Tu ciudad o zona de entrega', 'Así sabe si le puedes vender antes de escribirte.', 'Envíos a todos lados', 'Medellín, envíos en El Poblado y Laureles', I['pin'], '#12a37a')
laminas['04'] = consejo(4, 3, 'Cómo pedir', 'WhatsApp, DM o cita: un solo camino, bien escrito.', 'Info al privado', 'Pedidos por WhatsApp o DM', I['chat'], '#2bb5a8')
laminas['05'] = consejo(5, 4, 'Tu horario o días de entrega', 'Evita la pregunta de siempre: “¿hoy entregan?”.', 'Pregunta disponibilidad', 'Lunes a sábado, 9 a. m. a 6 p. m.', I['reloj'], AMBAR)


def perfil(bien):
    """Mockup de un perfil de Instagram inventado: Dulce Hogar Repostería."""
    av = f'<div style="width:96px;height:96px;border-radius:50%;padding:5px;background:linear-gradient(135deg,{AMBAR},#e8436a,{MORADO});flex-shrink:0"><div style="width:100%;height:100%;border-radius:50%;background:#fff;padding:4px"><div style="width:100%;height:100%;border-radius:50%;background:#c2335a;display:grid;place-items:center;color:#fff;font:800 30px Sora">DH</div></div></div>'
    cifras = ''.join(f'<div style="text-align:center;min-width:0"><b style="display:block;font:800 25px Sora;letter-spacing:-.02em">{a}</b><span style="font-size:17px;color:{GRIS}">{b}</span></div>' for a, b in [('128', 'posts'), ('2.340', 'seguidores'), ('310', 'seguidos')])
    if bien:
        bio = (f'<b style="font-size:25px">Dulce Hogar Repostería</b>'
               f'<span>Tortas y postres por encargo</span><span>Medellín, envíos en El Poblado y Laureles</span>'
               f'<span>Pedidos por WhatsApp o DM</span><span>Lunes a sábado, 9 a. m. a 6 p. m.</span>'
               f'<span style="display:flex;align-items:center;gap:8px;color:#2b4fd8;font-weight:800">{ico(I["enlace"],24,"#2b4fd8",2.4)}Catálogo y precios</span>')
    else:
        bio = (f'<b style="font-size:25px">Dulce Hogar</b><span>Bienvenidos a mi cuenta</span>'
               f'<span>Hecho con amor</span><span>Info al privado</span>')
    borde = f'4px solid {VERDE}' if bien else '2px solid #e2e0f2'
    return f'''<div style="width:434px;background:#fff;border-radius:36px;border:{borde};padding:24px 24px 24px;box-shadow:0 30px 60px -36px rgba(26,23,51,.5)">
<div style="display:flex;align-items:center;gap:18px"><span style="font:800 23px Sora;letter-spacing:-.02em">dulcehogar.reposteria</span></div>
<div style="display:flex;align-items:center;gap:16px;margin-top:22px">{av}<div style="flex:1;min-width:0;display:grid;grid-template-columns:repeat(3,auto);justify-content:space-between;gap:6px">{cifras}</div></div>
<div style="display:flex;flex-direction:column;gap:5px;margin-top:18px;font-size:22px;line-height:1.3;color:{TINTA}">{bio}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px"><span style="background:#efedf8;border-radius:14px;padding:12px 0;text-align:center;font-weight:800;font-size:21px">Seguir</span><span style="background:#efedf8;border-radius:14px;padding:12px 0;text-align:center;font-weight:800;font-size:21px">Mensaje</span></div></div>'''


laminas['06'] = f'''<div class="lamina clara" style="padding-top:84px">
<span class="paso"><b>5</b>de 5</span>
<h2 class="titulo" style="font-size:80px;margin-top:36px;max-width:900px">UN enlace claro a tus productos y precios</h2>
<div style="position:relative;display:flex;gap:40px;justify-content:center;margin-top:44px;align-items:flex-start">
<div><p style="font:800 30px Sora;color:#e8436a;margin:0 0 16px 8px">Antes</p>{perfil(False)}</div>
<div><p style="font:800 30px Sora;color:#12a37a;margin:0 0 16px 8px">Después</p>{perfil(True)}</div></div>
<div style="position:relative;margin-top:34px;background:{MORADO};color:#fff;border-radius:30px;padding:24px 32px;display:flex;align-items:center;gap:20px;font-size:30px;font-weight:700;line-height:1.3">{ico(I['chat'],44,'#fff')}<span>¿Te falta el punto 5? Escríbenos por DM y lo revisamos contigo.</span></div>
{pie(6)}</div>'''

for k, html in laminas.items():
    with open(os.path.join(SALIDA, f'{k}.html'), 'w') as f:
        f.write(HEAD + html + '</body></html>')
print('Listo:', ', '.join(sorted(laminas)))
