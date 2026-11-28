// Teclado del teléfono. En iPhone y en Android (Chrome 108+) el teclado tapa la pantalla sin achicarla:
// se mide cuánto tapa (visualViewport) para que las hojas suban justo encima, la pantalla de fondo se acorte
// hasta el teclado y las barras flotantes (abajo, botón Orbe, carrito) se escondan mientras se escribe.
// Además, el campo que se está llenando siempre queda a la vista, con un desplazamiento suave y sin saltos:
// ni debajo del teclado, ni debajo del botón de la hoja, ni debajo del buscador pegado arriba.
// Nunca enfoca nada por su cuenta: el teclado solo se abre cuando la persona toca un campo.
const raiz = document.documentElement;
const ESCRIBE = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=button]):not([type=submit]):not([type=color]), textarea, [contenteditable=""], [contenteditable=true]';
const escribe = el => !!(el && el.matches && el.matches(ESCRIBE) && !el.readOnly && !el.disabled);
const quieto = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function iniciarTeclado() {
  const vv = window.visualViewport;
  if (!vv) return;
  // Alto de la pantalla sin teclado (para navegadores que sí la achican al salir el teclado).
  let ancho = innerWidth, base = innerHeight, abierto = false, tapaAntes = -1, espera = 0, cuadro = 0;
  const medir = () => {
    cuadro = 0;
    if (innerWidth !== ancho) { ancho = innerWidth; base = innerHeight; } // se giró el teléfono
    if (!escribe(document.activeElement)) base = Math.max(base, innerHeight);
    const tapa = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
    const achica = base - innerHeight;
    const ahora = tapa > 80 || (achica > 120 && escribe(document.activeElement));
    raiz.style.setProperty('--teclado', tapa > 80 ? tapa + 'px' : '0px');
    raiz.style.setProperty('--alto-visible', Math.round(vv.height) + 'px');
    raiz.style.setProperty('--arriba-visible', Math.round(vv.offsetTop) + 'px');
    if (ahora !== abierto) { abierto = ahora; raiz.classList.toggle('con-teclado', ahora); }
    // iPhone corre toda la página hacia arriba para mostrar el campo (y la deja corrida): se devuelve a su
    // lugar y el campo se acomoda dentro de su propia lista, que es lo que no salta.
    if (abierto && vv.offsetTop > 0 && raiz.classList.contains('tel') && (document.scrollingElement || raiz).scrollHeight <= innerHeight + 2) window.scrollTo(0, 0);
    if (abierto && Math.abs(tapa - tapaAntes) > 4) acomodar(70);
    tapaAntes = tapa;
  };
  const pedir = () => { if (!cuadro) cuadro = requestAnimationFrame(medir); };
  // Espera a que el teclado termine de subir (o a que se cambie de campo) y acomoda una sola vez.
  const acomodar = ms => { clearTimeout(espera); espera = setTimeout(() => { if (abierto && escribe(document.activeElement)) mostrarCampo(document.activeElement); }, ms); };
  vv.addEventListener('resize', pedir); vv.addEventListener('scroll', pedir); addEventListener('resize', pedir);
  document.addEventListener('focusin', e => {
    if (!escribe(e.target)) return;
    pedir();
    // Con el teclado ya abierto (se pasó a otro campo) se acomoda enseguida; si no, cuando termine de subir.
    acomodar(abierto ? 60 : 450);
  });
  document.addEventListener('focusout', () => setTimeout(pedir, 60));
  medir();
}

// Las listas que se desplazan y contienen al campo, de la más cercana a la de afuera.
const listas = el => {
  const out = [];
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) out.push(p);
  }
  const doc = document.scrollingElement || raiz;
  if (doc.scrollHeight > doc.clientHeight + 1) out.push(doc);
  return out;
};

// Deja el campo a la vista: un poco de aire arriba (para ver su nombre) y abajo (para no rozar el teclado).
export function mostrarCampo(el) {
  const vv = window.visualViewport;
  if (!el || !el.getBoundingClientRect || !vv) return;
  const r = el.getBoundingClientRect();
  let arriba = r.top, abajo = r.bottom;
  // Si el campo es parte de una fila con su etiqueta, se intenta mostrar también la etiqueta.
  const etiqueta = el.closest('label');
  if (etiqueta) { const e = etiqueta.getBoundingClientRect(); if (e.bottom - e.top < vv.height * 0.45) { arriba = Math.min(arriba, e.top); abajo = Math.max(abajo, e.bottom); } }
  const AIRE_ARRIBA = 14, AIRE_ABAJO = 18;
  const verArriba = vv.offsetTop, verAbajo = vv.offsetTop + vv.height;
  let corrido = 0;
  for (const sc of listas(el)) {
    const doc = sc === document.scrollingElement || sc === raiz;
    const c = doc ? { top: 0, bottom: innerHeight } : sc.getBoundingClientRect();
    let tope = Math.max(c.top, verArriba), fondo = Math.min(c.bottom, verAbajo);
    // Lo que queda pegado arriba dentro de la pantalla (buscador y grupos de Vender o Inventario).
    const pegada = !doc && sc.querySelector(':scope .cabeza-pegada');
    if (pegada && !pegada.contains(el)) { const pc = getComputedStyle(pegada); if (pc.position === 'sticky') tope = Math.max(tope, c.top + (parseFloat(pc.top) || 0) + pegada.offsetHeight); }
    if (fondo - tope < 60) continue;
    const a = arriba - corrido, b = abajo - corrido;
    let d = 0;
    if (b + AIRE_ABAJO > fondo) d = b + AIRE_ABAJO - fondo;
    if (a - d - AIRE_ARRIBA < tope) d = a - AIRE_ARRIBA - tope; // si no cabe todo, manda lo de arriba
    const max = sc.scrollHeight - sc.clientHeight;
    const nuevo = Math.max(0, Math.min(max, sc.scrollTop + d));
    const real = nuevo - sc.scrollTop;
    if (Math.abs(real) < 2) continue;
    try { sc.scrollTo({ top: nuevo, behavior: quieto() ? 'auto' : 'smooth' }); } catch (e) { sc.scrollTop = nuevo; }
    corrido += real;
  }
}
