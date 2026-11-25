// Primer uso: país, tipo de negocio, tamaño y datos. Al final se arma el negocio.
import { html, useState, useEffect } from '../lib/preact-htm.js';
import { PAISES, TIPOS, pais, paisActivo } from '../paises.js';
import { RUBROS, rubro, adivinarRubro, modulosDe } from '../rubros.js';
import { ListaFunciones } from './funciones.js';
import { EntrarInicio, CrearCuentaInicio, CuentaConfirmada } from './cuenta.js';
import { useNube, subirNegocio } from '../nube.js';
import { crearNegocio, nombreSugerido, cambiarNegocio } from '../datos.js';
import { Icono, LogoOrbe, Interruptor, avisar, Bandera } from '../ui.js';

const PASOS = ['pais', 'tipo', 'tam', 'datos', 'listo'];
const SUCS = [['Uno solo', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5]];
export const NOMBRES_SUC = ['Centro', 'Norte', 'Este', 'Oeste', 'Sur'];
const TONO = { vio: 't-vio', amb: 't-amb', ver: 't-ver', ros: 't-ros', azu: 't-azu' };

export function Inicio({ tel }) {
  // Al dejar otro negocio desde «Entra a tu cuenta» se llega directo a crear la cuenta o a armar el negocio.
  const [paso, setPaso] = useState(() => { try { const x = sessionStorage.getItem('orbe-inicio-paso'); sessionStorage.removeItem('orbe-inicio-paso'); return x || -1; } catch (e) { return -1; } });
  const [busca, setBusca] = useState('');
  const [c, setC] = useState({ mods: {}, pais: '', rubro: '', tipo: '', escala: 'negocio', nombre: '', razon: '', fiscal: '', sucN: 1, sucNombres: [], dueno: '', pin: '', pin2: '', pays: null, taxOn: null, taxIncl: true });
  // La cuenta nueva empieza vacía. Con «?demo» en la dirección se llena con un mes de ejemplo (para mostrar la app).
  const demo = /[?&]demo\b/.test(location.search);
  const [ejemplo, setEjemplo] = useState(demo);
  // Sin cuenta no se arma el negocio (salvo la demostración con «?demo»).
  const N = useNube();
  // Volvió del enlace de confirmación con la sesión abierta: se muestran sus negocios (o se arma uno).
  useEffect(() => { if (N.sesion && !demo && paso === -1) setPaso('entrar'); }, [N.sesion]);
  const P = pais(c.pais || 'VE');
  const pon = o => setC(x => Object.assign({}, x, o));
  const i = PASOS.indexOf(paso);
  // El dueño crea su PIN al armar el negocio (en la demostración no hace falta).
  const pinOk = demo || (/^\d{4}$/.test(c.pin) && c.pin === c.pin2);
  const puede = paso === 'pais' ? !!c.pais : paso === 'tipo' ? !!c.rubro : paso === 'datos' ? pinOk : true;
  const R = rubro(c.rubro), mods = modulosDe({ rubro: c.rubro, tipo: c.tipo, mods: c.mods });
  const siguiente = () => {
    if (!puede) return;
    if (paso === 'listo') {
      crearNegocio(Object.assign({}, c, { nombre: c.nombre || nombreSugerido(c.tipo, c.escala, c.rubro) }), ejemplo);
      avisar(ejemplo ? 'Listo. Cargamos un mes de ventas de ejemplo' : '¡Bienvenido! Tu negocio está listo');
      // Con sesión: el negocio nuevo se guarda en la cuenta de una vez.
      if (!ejemplo && N.sesion) { cambiarNegocio({ pedirNube: false }); subirNegocio().catch(er => avisar(er.message)); }
      return;
    }
    setPaso(PASOS[i + 1]);
  };
  const atras = () => setPaso(i <= 0 ? (N.sesion && !demo ? 'entrar' : -1) : PASOS[i - 1]);
  const pays = c.pays || P.pays;
  const taxOn = c.taxOn ?? P.tax[1] > 0;
  const E = c.escala === 'empresa';

  // compacto: la tarjeta toma el alto de lo que lleva (entrar y crear cuenta), sin espacio en blanco de sobra.
  const marco = (contenido, compacto) => html`<div style=${tel ? '' : 'min-height:100vh;display:grid;place-items:center;padding:32px 16px'}>
    <div class=${tel ? '' : 'tarjeta'} style=${tel ? 'min-height:100dvh;display:flex;flex-direction:column' : 'width:min(520px,100%);' + (compacto ? 'max-height:calc(100vh - 64px)' : 'height:min(820px,calc(100vh - 64px))') + ';padding:0;display:flex;flex-direction:column;overflow:hidden;border-radius:28px'}>${contenido}</div></div>`;

  if (N.confirmado && N.sesion && !demo) return marco(html`<div style="flex:1;padding:calc(20px + var(--sa-top)) 22px 28px;overflow-y:auto;display:flex;flex-direction:column;justify-content:center"><${CuentaConfirmada} armar=${() => setPaso('pais')} /></div>`, true);
  if (paso === 'entrar') return marco(html`<div style="flex:1;padding:calc(20px + var(--sa-top)) 22px 28px;overflow-y:auto"><${EntrarInicio} volver=${() => setPaso(-1)} crear=${() => setPaso('pais')} /></div>`, true);
  if (paso === 'cuenta') return marco(html`<div style="flex:1;padding:calc(20px + var(--sa-top)) 22px 28px;overflow-y:auto"><${CrearCuentaInicio} volver=${() => setPaso(-1)} entrar=${() => setPaso('entrar')} listo=${() => setPaso('pais')} /></div>`, true);
  if (paso === -1) return marco(html`<div class="entra" style="flex:1;display:flex;flex-direction:column;gap:16px;padding:calc(72px + var(--sa-top)) 26px calc(28px + var(--sa-bottom))">
    <span class="entra"><${LogoOrbe} t=${88} orbita /></span>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px"><h1 style="font-size:34px">Orbe Negocios</h1><span style="font-size:18px;color:var(--muted)">Tú vendes. Orbe hace lo repetitivo.</span></div>
    <div class="pila" style="margin-top:14px;gap:14px">
      ${[['carrito', 'Vende y cobra con las formas de pago de tu país', 't-vio'], ['grafico', 'Mira cuánto vendes y cuánto ganas de verdad', 't-ver'], ['wifi', 'Funciona sin internet, en el teléfono y en la computadora', 't-amb']].map((x, k) => html`
        <div class="fila entra" style=${{ '--i': 4 + k * 3 }}><span class=${'ic ' + x[2]}><${Icono} n=${x[0]} t=${19} /></span><span style="font-size:15px;line-height:1.35">${x[1]}</span></div>`)}
    </div>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px">
      <button type="button" class="btn toca" onClick=${() => setPaso(demo || N.sesion ? 'pais' : 'cuenta')}>Empezar</button>
      <button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => setPaso('entrar')}>Ya tengo cuenta</button>
      <span class="sub" style="text-align:center">3 días gratis, sin tarjeta. Nunca se borra nada.</span>
      <span class="sub faint" style="text-align:center;font-size:12px"><a href="terminos.html" target="_blank" rel="noopener" style="color:inherit">Términos de uso</a> · <a href="privacidad.html" target="_blank" rel="noopener" style="color:inherit">Privacidad</a></span>
    </div>
  </div>`);

  const titulos = {
    pais: ['¿Dónde está tu negocio?', 'Así ponemos tu moneda, las formas de pago de tu país y tus impuestos.'],
    tipo: ['¿A qué se dedica tu negocio?', 'Escríbelo o elígelo. Orbe se arma para tu rubro y lo demás lo activas cuando quieras.'],
    tam: ['¿De qué tamaño es?', 'Si es una empresa, tus recibos llevan razón social y número fiscal.'],
    datos: [E ? 'Tu empresa' : 'Tu negocio', 'Ya lo llenamos según ' + P.n + '. Cambia lo que quieras.'],
    listo: ['Elige tus funciones', 'Encendimos lo recomendado para ' + (R ? R.n.toLowerCase() : 'tu negocio') + '. Activa o apaga lo que quieras: también se cambia después en Ajustes.']
  }[paso];

  let cuerpo;
  if (paso === 'pais') cuerpo = html`<div class="pila" style="gap:8px">${PAISES.filter(p => paisActivo(p.id)).map((p, k) => { const on = c.pais === p.id; return html`
    <button type="button" key=${p.id} class=${'chip toca' + (on ? ' on' : '')} aria-pressed=${on ? 'true' : 'false'} onClick=${() => pon({ pais: p.id, pays: null, taxOn: null })} style="min-height:58px;border-radius:18px;justify-content:flex-start;gap:12px;color:var(--ink);background:${on ? '' : 'var(--surface)'}">
      <${Bandera} id=${p.id} t=${30} />
      <span style="flex:1;display:flex;flex-direction:column;text-align:left;gap:1px"><b style="font-size:15px">${p.n}</b><span class="sub" style="font-weight:500">${p.id === 'VE' ? 'Dólares y bolívares, con la tasa BCV' : p.usd2 ? p.cur.charAt(0).toUpperCase() + p.cur.slice(1) + ' y dólares' : p.cur.charAt(0).toUpperCase() + p.cur.slice(1) + ' · ' + p.pays.slice(0, 2).join(', ')}</span></span>
      ${on && html`<span style="width:24px;height:24px;border-radius:12px;background:var(--accent);display:grid;place-items:center;animation:pop .4s var(--spring)"><${Icono} n="check" t=${14} g=${3} c="#0b0a14" /></span>`}
    </button>`; })}<span class="sub" style="text-align:center;margin-top:6px">Por ahora Orbe está disponible solo en Venezuela. Pronto en más países.</span></div>`;
  if (paso === 'tipo') {
    // Lo que escribe la persona ordena la lista: primero lo que se parece a su negocio.
    const sug = adivinarRubro(busca), resto = RUBROS.filter(r => !sug.includes(r));
    const Tarjeta = (r, k) => { const on = c.rubro === r.id; return html`
      <button type="button" key=${r.id} class=${'chip toca entra rubro-op' + (on ? ' on' : '')} style=${{ '--i': k }} aria-pressed=${on ? 'true' : 'false'} onClick=${() => pon({ rubro: r.id, tipo: r.t, mods: {} })}>
        <span class=${'ic ' + TONO[r.c]} style="width:42px;height:42px;border-radius:13px"><${Icono} n=${r.i} t=${21} /></span>
        <span style="flex:1;display:flex;flex-direction:column;gap:2px;text-align:left;min-width:0"><b style="font-size:15px">${r.n}</b><span class="sub corta" style="font-weight:500">${r.ex}</span></span>
        ${on && html`<span style="width:24px;height:24px;border-radius:12px;background:var(--accent);display:grid;place-items:center;flex:none;animation:pop .4s var(--spring)"><${Icono} n="check" t=${14} g=${3} c="#fff" /></span>`}
      </button>`; };
    cuerpo = html`<div class="pila" style="gap:10px">
      <label class="buscador" style="background:var(--surface);min-height:54px;border-radius:18px"><${Icono} n="buscar" t=${18} c="var(--muted)" /><input type="search" value=${busca} placeholder="Ej.: barbería, vendo neveras, ferretería…" aria-label="A qué se dedica tu negocio" autocomplete="off" onInput=${e => { setBusca(e.target.value); const g = adivinarRubro(e.target.value); if (g.length && g[0].id !== c.rubro) pon({ rubro: g[0].id, tipo: g[0].t, mods: {} }); }} /></label>
      ${busca.trim().length >= 3 && html`<span class="sub entra" style="padding:0 4px">${sug.length ? 'Te sugerimos:' : 'No lo encontré: elige el más parecido. Todo se ajusta después.'}</span>`}
      ${sug.map(Tarjeta)}
      ${sug.length > 0 && html`<span class="sub" style="padding:6px 4px 0">Otros rubros</span>`}
      ${resto.map((r, k) => Tarjeta(r, k + sug.length))}
    </div>`;
  }
  if (paso === 'tam') cuerpo = html`<div class="pila">${[['negocio', 'Negocio', 'Un solo local, con tu equipo', 'tienda', 't-vio', ['Vender, clientes, gastos y cierre del día', 'Dueño y algunos empleados']], ['empresa', 'Empresa', 'Varias sucursales o un equipo grande', 'edificio', 't-ver', ['Razón social y número fiscal en tus recibos', 'Ventas y caja por sucursal', 'Reportes por sucursal']]].map((z, k) => { const on = c.escala === z[0]; return html`
    <button type="button" key=${z[0]} class=${'chip toca entra' + (on ? ' on' : '')} style=${{ '--i': k * 3, flexDirection: 'column', alignItems: 'stretch', gap: '14px', borderRadius: '22px', padding: '16px', color: 'var(--ink)', background: on ? '' : 'var(--surface)' }} aria-pressed=${on ? 'true' : 'false'} onClick=${() => pon({ escala: z[0], sucN: z[0] === 'empresa' ? Math.max(2, c.sucN) : 1 })}>
      <span class="fila"><span class=${'ic ' + z[4]} style="width:46px;height:46px;border-radius:14px"><${Icono} n=${z[3]} t=${22} /></span><span style="flex:1;display:flex;flex-direction:column;gap:3px;text-align:left"><b style="font-size:17px">${z[1]}</b><span class="sub" style="font-weight:500">${z[2]}</span></span></span>
      <span class="pila" style="gap:8px;padding-left:4px">${z[5].map(f => html`<span class="fila" style="gap:10px;font-size:13px;font-weight:500"><${Icono} n="check" t=${14} g=${3} c="var(--in)" />${f}</span>`)}</span>
    </button>`; })}</div>`;
  if (paso === 'datos') cuerpo = html`<div class="pila" style="gap:18px">
    <label class="campo"><span>Tu nombre (serás el dueño)</span><input type="text" value=${c.dueno} placeholder="Ej.: Ana Ruiz" onInput=${e => pon({ dueno: e.target.value })} autocomplete="name" /></label>
    ${!demo && html`<div class="campo"><span>Tu PIN de dueño (4 números): lo marcas cada vez que abres Orbe</span>
      <div class="rejilla-2" style="gap:8px">
        <input class="num" type="password" inputmode="numeric" autocomplete="new-password" maxlength="4" value=${c.pin} placeholder="PIN" aria-label="PIN de dueño" onInput=${e => pon({ pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
        <input class="num" type="password" inputmode="numeric" autocomplete="new-password" maxlength="4" value=${c.pin2} placeholder="Repítelo" aria-label="Repite el PIN" onInput=${e => pon({ pin2: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
      </div>
      ${c.pin2.length === 4 && c.pin !== c.pin2 ? html`<span class="sub" style="color:var(--out-text)">Los PIN no coinciden</span>` : html`<span class="sub faint">Tu equipo tendrá su propio PIN; este es solo tuyo.</span>`}
    </div>`}
    <label class="campo"><span>${E ? 'Nombre comercial' : 'Nombre del negocio'}</span><input type="text" value=${c.nombre} placeholder=${nombreSugerido(c.tipo, c.escala, c.rubro)} onInput=${e => pon({ nombre: e.target.value })} autocomplete="organization" /></label>
    ${E && html`<div class="pila entra" style="gap:18px">
      <label class="campo"><span>Razón social</span><input type="text" value=${c.razon} placeholder=${(c.nombre || nombreSugerido(c.tipo, c.escala, c.rubro)) + ' ' + (P.suf || 'S.A.')} onInput=${e => pon({ razon: e.target.value })} /></label>
      <label class="campo"><span>${P.fiscal[0]} (sale en tus recibos)</span><input type="text" value=${c.fiscal} placeholder=${P.fiscal[1] || 'Tu número fiscal'} onInput=${e => pon({ fiscal: e.target.value })} /></label>
    </div>`}
    ${E && html`    <div class="campo"><span>${E ? '¿Cuántas sucursales tienes?' : '¿Cuántos locales tienes?'}</span>
      <div class="chips">${SUCS.map(s => html`<button type="button" class=${'chip toca' + (c.sucN === s[1] ? ' on' : '')} aria-pressed=${c.sucN === s[1] ? 'true' : 'false'} onClick=${() => pon({ sucN: s[1] })}>${s[1] === 1 && c.escala === 'empresa' ? 'Una sola' : s[0]}</button>`)}</div>
      <span class="sub faint">${c.sucN === 1 ? 'Si abres otro, lo agregas en Ajustes y Orbe separa las ventas y la caja de cada uno.' : 'Cada uno tendrá su caja, sus ventas y su inventario. Ponles nombre:'}</span>
      ${c.sucN > 1 && html`<div class="rejilla-2 entra" style="gap:8px">${Array.from({ length: c.sucN }, (_, k) => html`<label class="campo" key=${k}><span class="sr">Nombre del local ${k + 1}</span><input type="text" value=${c.sucNombres[k] || ''} placeholder=${NOMBRES_SUC[k]} onInput=${e => { const ns = c.sucNombres.slice(); ns[k] = e.target.value; pon({ sucNombres: ns }); }} /></label>`)}</div>`}
    </div>`}
    <div class="tarjeta fila"><${Bandera} id=${P.id} t=${34} /><span class="crece" style="display:flex;flex-direction:column;gap:2px"><b style="font-size:14px">Moneda</b><span class="sub">${P.id === 'VE' ? 'Precios en dólares y su valor en bolívares con la tasa BCV del día' : P.usd2 ? 'Precios en ' + P.cur + ' y su valor en dólares' : 'Todo en ' + P.cur + '.'}</span></span></div>
    <div class="campo"><span>Formas de pago que aceptas · ${pays.length} activas</span>
      <div class="chips">${P.pays.map(n => { const on = pays.includes(n); return html`<button type="button" class=${'chip toca' + (on ? ' on' : '')} aria-pressed=${on ? 'true' : 'false'} onClick=${() => pon({ pays: on ? (pays.length > 1 ? pays.filter(x => x !== n) : pays) : P.pays.filter(x => x === n || pays.includes(x)) })}>${on && html`<${Icono} n="check" t=${14} g=${3} c="var(--accent)" />`}${n}</button>`; })}</div></div>
    <div class="tarjeta" style="padding:4px 16px 12px">
      <${Interruptor} on=${taxOn && P.tax[1] > 0} onCambio=${v => P.tax[1] ? pon({ taxOn: v }) : avisar('Pon el porcentaje en Ajustes')} titulo=${'Cobrar ' + P.tax[0] + (P.tax[1] ? ' ' + P.tax[1] + ' %' : '')} sub=${P.tax[1] ? 'Lo puedes cambiar o apagar cuando quieras' : 'Varía según tu zona'} />
      ${taxOn && P.tax[1] > 0 && html`<div class="segmento" style="width:100%;margin-top:4px">${[[true, 'En el precio'], [false, 'Aparte']].map(o => html`<button type="button" style="flex:1" class=${c.taxIncl === o[0] ? 'on' : ''} onClick=${() => pon({ taxIncl: o[0] })}>${o[1]}</button>`)}</div>`}
    </div>
  </div>`;
  if (paso === 'listo') cuerpo = html`<div class="pila" style="gap:12px">
    <div class="tarjeta" style="padding:14px 16px"><span class="sub" style="display:block;margin-bottom:10px">Siempre incluido</span>
      <div class="chips">${[['carrito', 'Vender y cobrar'], ['personas', 'Clientes'], ['dinero', 'Gastos'], ['candado', 'Cierre del día'], ['grafico', 'Reportes']].map(x => html`<span class="chip chico" style="cursor:default;color:var(--ink)"><${Icono} n=${x[0]} t=${14} c="var(--in)" />${x[1]}</span>`)}</div></div>
    <${ListaFunciones} on=${mods} reco=${R ? R.mods : []} rubroN=${R ? R.n : ''} onCambio=${(m, v) => pon({ mods: Object.assign({}, c.mods, { [m.k]: v }) })} />
    ${demo && html`<div class="tarjeta" style="padding:4px 16px"><${Interruptor} on=${ejemplo} onCambio=${setEjemplo} titulo="Llenar con un mes de ventas de ejemplo" sub="Solo para mostrar la app: trae ventas, clientes y dos empleados inventados (Carla, PIN 1111, y Luis, PIN 2222)." /></div>`}
  </div>`;

  return marco(html`
    <div class="fila" style="padding:calc(14px + var(--sa-top)) 14px 0;gap:10px">
      <button type="button" class="icono-btn toca" aria-label="Atrás" onClick=${atras}><${Icono} n="atras" /></button>
      <div style="flex:1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding-right:54px">${PASOS.map((_, k) => html`<span style=${{ height: '4px', borderRadius: '2px', background: k <= i ? 'var(--accent)' : 'var(--line)', transition: 'background-color .35s ease' }}></span>`)}</div>
    </div>
    <div class="entra" key=${paso} style="flex:1;min-height:0;display:flex;flex-direction:column">
      <div style="padding:20px 22px 12px;display:flex;flex-direction:column;gap:6px"><h1 style="font-size:26px">${titulos[0]}</h1><span style="font-size:15px;color:var(--muted);line-height:1.4">${titulos[1]}</span></div>
      <div style="flex:1;overflow-y:auto;padding:6px 18px 130px">${cuerpo}</div>
    </div>
    <div style=${{ position: tel ? 'fixed' : 'relative', left: 0, right: 0, bottom: 0, marginTop: tel ? 0 : '-110px', padding: '16px 18px calc(24px + var(--sa-bottom))', background: 'linear-gradient(to top, var(' + (tel ? '--bg' : '--surface') + ') 70%, transparent)' }}>
      <button type="button" class=${'btn toca' + (puede ? '' : ' apagado')} aria-disabled=${puede ? 'false' : 'true'} onClick=${() => { if (!puede && paso === 'datos') avisar('Crea tu PIN de dueño: 4 números, dos veces igual'); siguiente(); }}>${paso === 'listo' ? (E ? 'Abrir mi empresa' : 'Abrir mi negocio') : 'Continuar'}</button>
    </div>`);
}
