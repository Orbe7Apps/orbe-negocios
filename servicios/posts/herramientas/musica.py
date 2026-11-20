"""Música original para los reels de Orbe Apps, sintetizada desde cero con numpy (sin muestras ni canciones de terceros).
Base electrónica suave (pad, arpegio, bajo y batería ligera) con un "whoosh" y una campanita en cada cambio de escena.

Uso: python3 musica.py <salida.wav> <segundos> <cambios de escena separados por coma> [--final <segundo del cierre>]
Ej.: python3 musica.py musica.wav 23 3.4,7.6,11.6,15.6,19.4 --final 19.4
"""
import sys, wave
import numpy as np

SR = 44100
BPM = 104
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)


def nota(n):  # número MIDI a Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def env(n, a, d, s=0.0, r=None):
    """Envolvente simple: ataque, caída hasta s, y (opcional) salida al final."""
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4))
    e = np.where(t > a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)), e)
    if r:
        e *= np.clip((n / SR - t) / r, 0, 1)
    return e


def sierra(f, n, armonicos=7, desafine=0.0):
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k in range(1, armonicos + 1):
        y += np.sin(2 * np.pi * f * (1 + desafine) * k * t) / k
    return y


def paso_bajo(x, corte):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (fr / corte) ** 4)
    return np.fft.irfft(X, len(x))


def paso_alto(x, corte):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (corte / np.maximum(fr, 1)) ** 4)
    return np.fft.irfft(X, len(x))


def poner(pista, sonido, t, ganancia=1.0):
    i = int(t * SR)
    if i >= len(pista) or i + len(sonido) <= 0:
        return
    j = min(len(pista), i + len(sonido))
    pista[max(i, 0):j] += ganancia * sonido[max(0, -i):j - i]


def generar(segundos, cambios, final=None):
    n = int(segundos * SR)
    L, R = np.zeros(n), np.zeros(n)
    # Do mayor 7 · La menor 7 · Fa mayor 7 · Sol (sus): luminoso y tranquilo
    acordes = [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]]
    compases = int(np.ceil(segundos / BAR)) + 1
    m = int(BAR * SR)
    for c in range(compases):
        t0 = c * BAR
        ac = acordes[c % 4]
        # Pad: sierras desafinadas, una por lado para dar amplitud
        pad_l, pad_r = np.zeros(m), np.zeros(m)
        for k in ac:
            f = nota(k + 12)
            pad_l += sierra(f, m, 6, -0.004)
            pad_r += sierra(f, m, 6, 0.004)
        e = env(m, 0.35, 1.2, 0.55, 0.3)
        poner(L, pad_l * e, t0, 0.028); poner(R, pad_r * e, t0, 0.028)
        # Bajo en el 1 y el 3
        for b in (0, 2):
            k = int(BEAT * 1.8 * SR)
            tt = np.arange(k) / SR
            s = (np.sin(2 * np.pi * nota(ac[0] - 12) * tt) + 0.3 * np.sin(4 * np.pi * nota(ac[0] - 12) * tt)) * env(k, 0.01, 0.5, 0.4, 0.08)
            poner(L, s, t0 + b * BEAT, 0.22); poner(R, s, t0 + b * BEAT, 0.22)
        if c == 0:
            continue  # el primer compás solo lleva pad y bajo
        # Arpegio en corcheas
        orden = [0, 1, 2, 3, 2, 1, 2, 3]
        for i8, idx in enumerate(orden):
            k = int(0.45 * SR)
            tt = np.arange(k) / SR
            f = nota(ac[idx] + 24)
            s = (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)) * env(k, 0.004, 0.18)
            lado = 0.65 if i8 % 2 else 1.0
            poner(L, s, t0 + i8 * BEAT / 2, 0.06 * lado); poner(R, s, t0 + i8 * BEAT / 2, 0.06 * (1.65 - lado))
        # Bombo en 1 y 3, palmada suave en 2 y 4, platillo en contratiempo
        for b in range(4):
            tb = t0 + b * BEAT
            if b in (0, 2):
                k = int(0.35 * SR); tt = np.arange(k) / SR
                fase = 2 * np.pi * np.cumsum(45 + 90 * np.exp(-tt * 28)) / SR
                s = np.sin(fase) * env(k, 0.002, 0.12)
                poner(L, s, tb, 0.5); poner(R, s, tb, 0.5)
            else:
                k = int(0.18 * SR)
                s = paso_alto(rng.standard_normal(k), 900) * env(k, 0.002, 0.05)
                poner(L, s, tb, 0.05); poner(R, s, tb, 0.05)
            k = int(0.06 * SR)
            h = paso_alto(rng.standard_normal(k), 7000) * env(k, 0.001, 0.015)
            poner(L, h, tb + BEAT / 2, 0.06); poner(R, h, tb + BEAT / 2, 0.04)
    # Efectos en cada cambio de escena: whoosh que sube y una campanita
    def whoosh():
        k = int(0.55 * SR); tt = np.arange(k) / SR
        ruido = paso_bajo(rng.standard_normal(k), 2500) * (tt / tt[-1]) ** 2.2 * np.clip((0.55 - tt) / 0.06, 0, 1)
        return ruido / np.max(np.abs(ruido))

    def campana(base=88):
        k = int(1.2 * SR); tt = np.arange(k) / SR
        s = sum(a * np.sin(2 * np.pi * nota(base) * r * tt) * np.exp(-tt * dcy) for a, r, dcy in ((1, 1, 3.5), (0.5, 2.01, 5), (0.25, 3.0, 7)))
        return s * env(k, 0.003, 10)

    for t in cambios:
        w = whoosh()
        poner(L, w, t - 0.5, 0.10); poner(R, w, t - 0.5, 0.10)
        cb = campana(88 if t != final else 84)
        poner(L, cb, t, 0.09); poner(R, cb, t + 0.012, 0.09)
    if final is not None:  # acorde brillante en el cierre
        for k in (72, 76, 79, 83):
            cb = campana(k)
            poner(L, cb, final + 0.15, 0.05); poner(R, cb, final + 0.17, 0.05)
    # Entrada y salida suaves, y nivel final a -1 dBFS
    fade = np.ones(n)
    fi, fo = int(0.4 * SR), int(1.6 * SR)
    fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
    est = np.stack([L * fade, R * fade], axis=1)
    est = np.tanh(est * 1.2) / np.tanh(1.2)  # saturación suave para que suene más lleno
    est *= 10 ** (-1 / 20) / np.max(np.abs(est))
    return est


def guardar(ruta, est):
    datos = (est * 32767).astype('<i2')
    with wave.open(ruta, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(datos.tobytes())


if __name__ == '__main__':
    salida, segs, cambios = sys.argv[1], float(sys.argv[2]), [float(x) for x in sys.argv[3].split(',') if x]
    final = float(sys.argv[sys.argv.index('--final') + 1]) if '--final' in sys.argv else None
    guardar(salida, generar(segs, cambios, final))
    print('Listo:', salida)
