/* Motor de reels v2 de Orbe Apps: más movimiento.
   Atributos (tiempos en segundos):
   data-a="sube|baja|izq|der|escala|zoom|giro|fade"  entrada · data-in · data-d (duración, 0,55 por defecto)
   data-out + data-sal="zoom|izq|der|sube|fade"         salida (0,4 s)
   data-rot="-6"                                         giro fijo
   data-mueve="dx,dy,drot,dscale"                        movimiento continuo por segundo desde data-in
   data-flota="fase"                                     vaivén suave
   data-scroll="px/s" data-scrollmax="px"                desplaza la imagen dentro del teléfono
   data-palabras / data-letras                           reparte el texto en palabras o letras que entran en cascada
   data-cuenta="49" data-pre="$" data-dur="0.8"          número que cuenta hasta su valor
   data-latido                                           pequeño golpe al ritmo (BPM en body[data-bpm])
   .cortina[data-cortes="3.5,7.2"]                       barrida de color en cada corte
   .estrellas                                             salto al hiperespacio al inicio y deriva lenta
   window.pintar(t) dibuja el cuadro del segundo t. */
(function () {
  const lim = x => Math.max(0, Math.min(1, x));
  const suave = x => 1 - Math.pow(1 - x, 3);
  const rebote = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const bpm = +document.body.dataset.bpm || 104, beat = 60 / bpm;

  // Repartir palabras o letras en spans animados
  document.querySelectorAll('[data-palabras],[data-letras]').forEach(el => {
    const letras = el.hasAttribute('data-letras'), base = +el.dataset.in || 0, paso = letras ? 0.045 : 0.09;
    const tipo = el.dataset.palabras || el.dataset.letras || 'sube';
    const partes = [];
    (function recorrer(nodo, envoltura) {
      [...nodo.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const trozos = letras ? [...n.textContent] : n.textContent.split(/(\s+)/);
          trozos.forEach(tx => {
            if (!tx) return;
            if (/^\s+$/.test(tx)) { envoltura.appendChild(document.createTextNode(tx)); return; }
            const s = document.createElement('span'); s.textContent = tx; s.style.display = 'inline-block';
            if (letras && tx === ' ') s.style.width = '.28em';
            envoltura.appendChild(s); partes.push(s);
          });
        } else {
          const copia = n.cloneNode(false); envoltura.appendChild(copia); recorrer(n, copia);
        }
      });
    })(el.cloneNode(true), (el.innerHTML = '', el));
    partes.forEach((s, i) => { s.dataset.a = tipo; s.dataset.in = (base + i * paso).toFixed(3); s.dataset.d = '0.5'; if (el.dataset.out) { s.dataset.out = el.dataset.out; s.dataset.sal = el.dataset.sal || 'fade'; } });
    el.removeAttribute('data-a'); el.style.opacity = 1;
  });

  const els = [...document.querySelectorAll('[data-a]')];
  const cuentas = [...document.querySelectorAll('[data-cuenta]')];
  const scrolls = [...document.querySelectorAll('[data-scroll]')];
  const cortinas = [...document.querySelectorAll('.cortina')];
  const estrellas = document.querySelector('.estrellas');
  const sats = [...document.querySelectorAll('[data-orbita]')];

  window.pintar = function (t) {
    for (const e of els) {
      const tipo = e.dataset.a, ini = +e.dataset.in || 0, d = +e.dataset.d || 0.55;
      const fin = e.dataset.out ? +e.dataset.out : 1e9, sal = e.dataset.sal || 'fade';
      const pe = lim((t - ini) / d), ps = lim((t - fin) / 0.4);
      const a = (tipo === 'escala' || tipo === 'giro') ? rebote(pe) : suave(pe), s = suave(ps);
      let op = lim(pe * 1.6) * (1 - s), tx = 0, ty = 0, rot = 0, sc = 1;
      if (tipo === 'sube') ty = (1 - a) * 110;
      if (tipo === 'baja') ty = (a - 1) * 110;
      if (tipo === 'izq') tx = (1 - a) * 260;
      if (tipo === 'der') tx = (a - 1) * 260;
      if (tipo === 'escala') sc = 0.4 + 0.6 * a;
      if (tipo === 'zoom') sc = 1.7 - 0.7 * a;
      if (tipo === 'giro') { rot = (1 - a) * -28; sc = 0.5 + 0.5 * a; ty = (1 - a) * 160; }
      if (sal === 'zoom') sc *= 1 + s * 0.6;
      if (sal === 'izq') tx -= s * 320;
      if (sal === 'der') tx += s * 320;
      if (sal === 'sube') ty -= s * 160;
      if (e.dataset.mueve && t > ini) { const [dx, dy, dr, ds] = e.dataset.mueve.split(',').map(Number), k = t - ini; tx += dx * k; ty += dy * k; rot += dr * k; sc *= 1 + ds * k; }
      if (e.dataset.flota) ty += Math.sin(t * 2.1 + +e.dataset.flota) * 12;
      if (e.dataset.latido !== undefined && t > ini + d) { const f = ((t - ini) % beat) / beat; sc *= 1 + 0.045 * Math.exp(-f * 7); }
      rot += +(e.dataset.rot || 0);
      e.style.opacity = op;
      e.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sc})`;
    }
    for (const c of cuentas) {
      const ini = +c.closest('[data-in]')?.dataset.in || +c.dataset.in || 0, dur = +c.dataset.dur || 0.8;
      const v = +c.dataset.cuenta * suave(lim((t - ini - 0.1) / dur)), dec = +(c.dataset.dec || 0);
      c.textContent = (c.dataset.pre || '') + v.toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (c.dataset.suf || '');
    }
    for (const sc of scrolls) {
      const ini = +sc.closest('[data-in]').dataset.in || 0, k = Math.max(0, t - ini - 0.5);
      sc.style.transform = `translateY(${-Math.min(+sc.dataset.scrollmax || 400, k * +sc.dataset.scroll)}px)`;
    }
    for (const c of cortinas) {
      const cortes = c.dataset.cortes.split(',').map(Number), cerca = cortes.find(x => Math.abs(t - x) < 0.3);
      if (cerca === undefined) { c.style.opacity = 0; continue; }
      const p = (t - (cerca - 0.3)) / 0.6;
      c.style.opacity = 1; c.style.transform = `translateX(${-130 + p * 260}%) skewX(-14deg)`;
    }
    if (estrellas) {
      const warp = Math.max(0, 1.1 - t) / 1.1;
      estrellas.style.transform = `scale(${1 + warp * warp * 4}) rotate(${t * 1.2}deg)`;
      estrellas.style.filter = warp > 0.05 ? `blur(${warp * 2}px)` : 'none';
    }
    for (const g of sats) {  // satélite girando alrededor del planeta
      const a = t * 2.4 + +(g.dataset.orbita || 0), x = 60 + 54 * Math.cos(a), y = 60 + 17 * Math.sin(a);
      const detras = Math.sin(a) < 0 && Math.abs(x - 60) < 31;
      g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`); g.style.opacity = detras ? 0 : 1;
    }
    document.querySelectorAll('[data-gira]').forEach(g => g.style.transform = `rotate(${t * +g.dataset.gira}deg)`);
  };
  window.pintar(0);
})();
