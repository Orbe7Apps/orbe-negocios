// Guía en vivo: oscurece todo menos lo que hay que tocar y explica ese paso.
// Avanza cuando la persona lo hace de verdad (escribe el nombre, elige una opción, toca “Guardar”).
// Nunca enfoca un campo: ilumina y la persona toca. Se dibuja encima de todo (también de las hojas).
import { html, render, useState, useEffect, useLayoutEffect, useRef } from './lib/preact-htm.js';
import { Icono } from './ui.js';

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Lo que se dibuja fuera del árbol de la app (encima de la hoja, que tiene su propia capa).
export function usePortal(vnode) {
  const host = useRef(null);
  useEffect(() => () => { if (host.current) { render(null, host.current); host.current.remove(); host.current = null; } }, []);
  // En la fase de dibujo (no después): si se dibuja dentro de un efecto, los efectos de la guía no llegan a correr.
  useLayoutEffect(() => {
    if (!vnode) { if (host.current) render(null, host.current); return; }
    if (!host.current) { host.current = document.createElement('div'); host.current.className = 'guia-host'; document.body.appendChild(host.current); }
    render(vnode, host.current);
  });
}

// pasos: [{ sel, titulo, texto, espera, ok, toca, practica }]
//  practica: lo iluminado se ve pero no se toca (p. ej. “Cobrar” en un tutorial: no se cobra de verdad).
//  espera: hace falta hacer algo para seguir (ok dice si ya se hizo). toca: el paso se cumple tocando lo iluminado (no hay “Siguiente”).
export function GuiaVivo({ pasos, i, onSig, onSalir }) {
  const paso = pasos[i] || {};
  const [luz, setLuz] = useState(null);
  const [alto, setAlto] = useState(0);
  const caja = useRef(null), ultimo = useRef(""), altoR = useRef(0);
  // Lo iluminado se sigue cuadro a cuadro: la hoja se desplaza, aparece el teclado o se abre una opción.
  useEffect(() => {
    let vivo = true, n = 0, movido = 0;
    const mira = () => {
      if (!vivo) return;
      const el = paso.sel && document.querySelector(paso.sel);
      let r = null;
      if (el) {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.height > 0) r = { top: b.top - 6, left: b.left - 6, w: b.width + 12, h: b.height + 12 };
        // Si lo iluminado no se ve completo (está más abajo en la hoja o recién se abrió), se desplaza hasta él.
        const vv = window.visualViewport, alto = vv ? vv.height : innerHeight;
        if (r && (b.top < 8 || b.bottom > alto - 8) && Date.now() - movido > 450) { movido = Date.now(); try { el.scrollIntoView({ block: 'center', behavior: quieto() ? 'auto' : 'smooth' }); } catch (e) { /* viejo */ } }
      }
      const clave = r ? [r.top, r.left, r.w, r.h].map(Math.round).join(',') : '-';
      if (clave !== ultimo.current) { ultimo.current = clave; setLuz(r); }
      if (caja.current && caja.current.offsetHeight !== altoR.current) { altoR.current = caja.current.offsetHeight; setAlto(altoR.current); }
      n = requestAnimationFrame(mira);
    };
    mira();
    return () => { vivo = false; cancelAnimationFrame(n); };
  }, [i, paso.sel]);

  const vv = window.visualViewport, vw = vv ? vv.width : innerWidth, vh = vv ? vv.height : innerHeight, oy = vv ? vv.offsetTop : 0;
  const ancho = Math.min(380, vw - 32), m = 14, h = alto || 190;
  let top, left = (vw - ancho) / 2, flecha = null;
  if (!luz) top = oy + Math.max(16, (vh - h) / 2);
  else {
    if (vw > 700) left = Math.min(Math.max(16, luz.left + luz.w / 2 - ancho / 2), vw - ancho - 16);
    const x = Math.min(Math.max(luz.left + luz.w / 2 - left, 26), ancho - 26);
    if (luz.top + luz.h + m + h <= oy + vh - 12) { top = luz.top + luz.h + m; flecha = { lado: 'arriba', x }; }
    else if (luz.top - m - h >= oy + 12) { top = luz.top - m - h; flecha = { lado: 'abajo', x }; }
    else top = oy + vh - h - 12;
  }
  top = Math.min(Math.max(top, oy + 12), oy + vh - h - 12);
  // Lo de afuera no se puede tocar mientras dura la guía; lo iluminado sí.
  // Si toca fuera, la tarjeta se sacude: así se nota que hay que tocar lo iluminado.
  const tapa = e => { e.preventDefault(); e.stopPropagation(); if (e.type !== 'pointerdown') return; const c = caja.current; if (c) { c.classList.remove('sacude'); void c.offsetWidth; c.classList.add('sacude'); } };
  const bloques = luz ? [
    { top: 0, left: 0, width: '100vw', height: Math.max(0, luz.top) + 'px' },
    { top: luz.top + luz.h + 'px', left: 0, width: '100vw', bottom: 0 },
    { top: luz.top + 'px', left: 0, width: Math.max(0, luz.left) + 'px', height: luz.h + 'px' },
    { top: luz.top + 'px', left: luz.left + luz.w + 'px', right: 0, height: luz.h + 'px' }
  ] : [{ inset: 0 }];
  const n = pasos.length, puedeSeguir = !paso.espera || paso.ok;
  return html`<div class="guia" role="dialog" aria-label=${'Guía: ' + (paso.titulo || '')}>
    ${bloques.map((b, k) => html`<div key=${k} class="guia-tapa" style=${b} onPointerDown=${tapa} onClick=${tapa}></div>`)}
    ${luz && paso.practica && html`<div class="guia-tapa sin-velo" style=${{ top: luz.top + 'px', left: luz.left + 'px', width: luz.w + 'px', height: luz.h + 'px' }} onPointerDown=${tapa} onClick=${tapa}></div>`}
    <div class=${'guia-luz' + (luz ? '' : ' sin')} style=${luz ? { top: luz.top + 'px', left: luz.left + 'px', width: luz.w + 'px', height: luz.h + 'px' } : null}>${luz && paso.toca && !paso.ok && html`<i class="guia-pulso"></i>`}</div>
    ${luz && paso.toca && !paso.ok && html`<span class="guia-dedo" key=${'d' + i} style=${{ left: luz.left + Math.min(luz.w / 2, 60) + 'px', top: luz.top + luz.h / 2 + 'px' }} aria-hidden="true"><i></i><svg width="30" height="36" viewBox="0 0 34 40"><path d="M12 4.5a3 3 0 0 1 6 0V18l7.4 1.6a3.6 3.6 0 0 1 2.8 4L27 33a5 5 0 0 1-5 4.4h-6.6a5 5 0 0 1-4-2l-6.2-8.3a2.6 2.6 0 0 1 3.9-3.4L12 26.5z" fill="#fff" stroke="#1a1733" stroke-width="2" stroke-linejoin="round"/></svg></span>`}
    <div class="guia-tarjeta" key=${i} ref=${caja} style=${{ top: top + 'px', left: left + 'px', width: ancho + 'px' }}>
      ${flecha && html`<span class=${'guia-flecha ' + flecha.lado} style=${{ left: flecha.x - 8 + 'px' }}></span>`}
      <div class="guia-paso">${paso.fin ? '¡Listo!' : 'Paso ' + (i + 1) + ' de ' + n}${n > 1 && html`<span class="guia-puntos">${pasos.map((_, k) => html`<i key=${k} class=${k === i ? 'on' : k < i ? 'ya' : ''}></i>`)}</span>`}</div>
      <h3>${paso.titulo}</h3>
      <p>${paso.texto}</p>
      ${paso.practica && html`<span class="guia-practica"><${Icono} n="reloj" t=${13} />Práctica: no se guarda</span>`}
      <div class="guia-acc">
        <button type="button" class="guia-salir toca" onClick=${onSalir}>Salir</button>
        ${paso.espera && paso.ok && !paso.toca && html`<span class="guia-ok entra"><${Icono} n="check" t=${14} g=${2.6} />Bien</span>`}
        ${paso.toca && !paso.ok ? html`<span class="guia-sig apagado">${paso.boton || 'Toca lo iluminado'}</span>`
          : html`<button type="button" class=${'guia-sig toca' + (puedeSeguir ? '' : ' apagado')} disabled=${!puedeSeguir} onClick=${onSig}>${paso.boton || (i === n - 1 ? 'Terminar' : 'Siguiente')}</button>`}
      </div>
    </div>
  </div>`;
}

// Cuántas veces se ofreció la guía de algo en este aparato (la invitación sale las primeras veces).
export function vecesGuia(id) { try { return +localStorage.getItem('orbe-guia-' + id) || 0; } catch (e) { return 9; } }
export function contarGuia(id) { try { localStorage.setItem('orbe-guia-' + id, String(vecesGuia(id) + 1)); } catch (e) { /* sin espacio */ } }
// La guía se completó: la invitación ya no sale más en este aparato.
export function terminarGuia(id) { try { localStorage.setItem('orbe-guia-' + id, '9'); } catch (e) { /* sin espacio */ } }

// Ilumina una sola cosa en pantalla con su explicación (p. ej. el producto recién creado en Vender).
// Devuelve false si no está en pantalla.
export function iluminar(sel, titulo, texto) {
  if (!document.querySelector(sel)) return false;
  const host = document.createElement('div'); host.className = 'guia-host'; document.body.appendChild(host);
  const fin = () => { render(null, host); host.remove(); };
  render(html`<${GuiaVivo} pasos=${[{ sel, titulo, texto, fin: true }]} i=${0} onSig=${fin} onSalir=${fin} />`, host);
  return true;
}
