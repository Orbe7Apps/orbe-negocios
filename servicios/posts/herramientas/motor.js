/* Motor de reels de Orbe Apps (se carga dentro de la página del reel).
   Cada elemento con data-a="tipo" aparece en data-in (segundos) y se va en data-out.
   Tipos: sube, baja, escala, izq, der, fade. data-d = duración de la transición (0,6 s por defecto).
   window.pintar(t) dibuja el cuadro del segundo t; el grabador lo llama cuadro por cuadro. */
(function () {
  const suave = x => 1 - Math.pow(1 - x, 3);          // salida suave
  const rebote = x => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const lim = x => Math.max(0, Math.min(1, x));
  const els = [...document.querySelectorAll('[data-a]')];
  const estrellas = document.querySelectorAll('.estrella');
  window.pintar = function (t) {
    for (const e of els) {
      const tipo = e.dataset.a, ini = +e.dataset.in || 0, fin = e.dataset.out ? +e.dataset.out : 1e9, d = +e.dataset.d || 0.6;
      const pe = lim((t - ini) / d), ps = lim((t - fin) / 0.45);
      const a = (tipo === 'escala' ? rebote(pe) : suave(pe)), s = suave(ps);
      const op = lim(pe * 1.4) * (1 - s);
      let tr = '';
      if (tipo === 'sube') tr = `translateY(${(1 - a) * 90 - s * 40}px)`;
      if (tipo === 'baja') tr = `translateY(${(a - 1) * 90 + s * 40}px)`;
      if (tipo === 'escala') tr = `scale(${0.6 + 0.4 * a - s * 0.1})`;
      if (tipo === 'izq') tr = `translateX(${(1 - a) * 140 - s * 80}px)`;
      if (tipo === 'der') tr = `translateX(${(a - 1) * 140 + s * 80}px)`;
      const extra = e.dataset.rot ? ` rotate(${e.dataset.rot}deg)` : '';
      const flota = e.dataset.flota ? ` translateY(${Math.sin(t * 1.6 + (+e.dataset.flota)) * 10}px)` : '';
      e.style.opacity = op; e.style.transform = tr + extra + flota;
    }
    estrellas.forEach((s, i) => { s.style.opacity = 0.35 + 0.55 * Math.abs(Math.sin(t * 0.9 + i * 1.7)); });
    document.querySelectorAll('[data-gira]').forEach(g => g.style.transform = `rotate(${t * +g.dataset.gira}deg)`);
  };
  window.pintar(0);
})();
