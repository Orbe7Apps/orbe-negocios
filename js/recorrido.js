// Tarjeta de la primera entrada: ofrece el recorrido, que ahora se hace tocando (tutorial “recorrido” de js/tutoriales.js).
import { html } from './lib/preact-htm.js';
import { useApp } from './ctx.js';
import { LogoOrbe } from './ui.js';

// Tarjeta que ofrece el recorrido la primera vez que alguien entra con su perfil.
export function OfertaRecorrido() {
  const { yo, verRecorrido, omitirRecorrido } = useApp();
  if (!yo || yo.tour) return null;
  return html`<section class="tarjeta entra oferta-tour" data-tour-oferta>
    <span class="oferta-logo"><${LogoOrbe} t=${44} orbita /></span>
    <span style="display:flex;flex-direction:column;gap:2px;min-width:0"><b style="font-size:15px">¿Primera vez, ${yo.n.split(' ')[0]}?</b><span class="sub" style="line-height:1.4">Te enseño la app tocando, en 2 minutos.</span></span>
    <span class="oferta-btns">
      <button type="button" class="btn2 chico toca" onClick=${omitirRecorrido}>Ahora no</button>
      <button type="button" class="btn2 chico lleno toca" onClick=${verRecorrido}>Ver recorrido</button>
    </span>
  </section>`;
}
