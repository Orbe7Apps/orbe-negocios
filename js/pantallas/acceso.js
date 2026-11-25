// ¿Quién está usando Orbe? Cada persona entra con su perfil y su PIN.
// El PIN se marca en un teclado en pantalla: el teclado del teléfono nunca se abre solo.
import { html, useState, useEffect } from '../lib/preact-htm.js';
import { useDatos, entrar, pinValido, pedirPinNuevo, cambiarPin } from '../datos.js';
import { enlaceWA } from '../ordenpdf.js';
import { pais } from '../paises.js';
import { rolDe } from '../permisos.js';
import { Icono, LogoOrbe, iniciales, TONOS, avisar, Bienvenida, tomarBienvenida } from '../ui.js';
import { useNube, entrarCuenta, entrarUsuario, cerrarSesion } from '../nube.js';
import { CampoClave, CampoUsuario } from './cuenta.js';

export function Teclado({ largo = 4, onListo, error }) {
  const [v, setV] = useState('');
  const [mal, setMal] = useState(false);
  const toca = d => {
    if (v.length >= largo) return;
    const nv = v + d; setV(nv);
    if (nv.length === largo) setTimeout(() => { if (!onListo(nv)) { setMal(true); setTimeout(() => { setMal(false); setV(''); }, 450); } }, 120);
  };
  const borra = () => setV(v.slice(0, -1));
  useEffect(() => {
    // En la computadora también se puede escribir con el teclado físico (solo cuando la persona teclea).
    const k = e => { if (/^\d$/.test(e.key)) toca(e.key); else if (e.key === 'Backspace') borra(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  return html`<div class="pila" style="align-items:center;gap:22px">
    <div class=${'puntos-pin' + (mal ? ' mal' : '')} role="status" aria-label=${v.length + ' de ' + largo + ' números'}>${Array.from({ length: largo }, (_, i) => html`<i class=${i < v.length ? 'on' : ''}></i>`)}</div>
    ${error && html`<span class="sub out">${error}</span>`}
    <div class="teclado">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'].map(d => d === '' ? html`<span></span>` : html`<button type="button" class="toca" aria-label=${d === '<' ? 'Borrar' : d} onClick=${() => d === '<' ? borra() : toca(d)}>${d === '<' ? html`<${Icono} n="atras" t=${22} />` : d}</button>`)}</div>
  </div>`;
}

export function Acceso({ tel }) {
  const S = useDatos();
  const activos = S.perfiles.filter(p => !p.inactivo);
  const [elegido, setElegido] = useState(null);
  // Recién iniciada la sesión: primero la bienvenida con el nombre del negocio y luego se desvanece sobre los perfiles.
  const [bienv, setBienv] = useState(() => tomarBienvenida());
  // Solo en la demostración: un único perfil sin PIN entra directo. En un negocio de verdad siempre se pide el PIN.
  useEffect(() => { if ((S.negocio.demo || /[?&]demo\b/.test(location.search)) && activos.length === 1 && !activos[0].pin) entrar(activos[0].id); }, []);
  // Dueño sin PIN: para que nadie entre como dueño se pide la contraseña de la cuenta y luego crea su PIN.
  // Empleado sin PIN: no entra; se le avisa al dueño para que le ponga uno.
  const N = useNube();
  const demo = S.negocio.demo || /[?&]demo\b/.test(location.search);
  const [conClave, setConClave] = useState(null), [cl, setCl] = useState({ usuario: '', clave: '' }), [ocupado, setOcupado] = useState(false);
  const [nuevoPin, setNuevoPin] = useState(null); // { p, primero }
  const tocar = p => {
    if (!p.pin && !demo) {
      if (p.rol === 'dueno') { setConClave(p); setCl({ usuario: '', clave: '' }); return; }
      pedirPinNuevo(p.id); avisar('Todavía no tienes PIN: le avisamos al dueño para que te ponga uno'); return;
    }
    if (!p.pin) { entrar(p.id); avisar('Hola, ' + p.n.split(' ')[0]); } else { setElegido(p); setFallos(0); setOlvido(false); }
  };
  const entrarConClave = async () => {
    setOcupado(true);
    try {
      if (N.correo) await entrarCuenta(N.correo, cl.clave); else await entrarUsuario(cl.usuario, cl.clave);
      setNuevoPin({ p: conClave, primero: '' }); setConClave(null);
    } catch (er) { avisar(er.message); } finally { setOcupado(false); }
  };
  const marcarNuevo = pin => {
    if (!nuevoPin.primero) { setNuevoPin({ p: nuevoPin.p, primero: pin }); return true; }
    if (pin !== nuevoPin.primero) { avisar('No coinciden: márcalo otra vez'); setNuevoPin({ p: nuevoPin.p, primero: '' }); return false; }
    cambiarPin(nuevoPin.p.id, pin); entrar(nuevoPin.p.id); avisar('Listo: desde ahora entras con tu PIN'); return true;
  };
  const caja = contenido => html`<div style=${tel ? 'min-height:100dvh;display:flex;flex-direction:column;padding:calc(56px + var(--sa-top)) 22px calc(24px + var(--sa-bottom))' : 'min-height:100vh;display:grid;place-items:center;padding:32px 16px'}>
    <div class=${tel ? 'pila' : 'tarjeta pila'} style=${tel ? 'flex:1;gap:18px' : 'width:min(480px,100%);padding:32px;gap:18px;border-radius:28px'}>${contenido}</div></div>`;

  // Intentos: a los 5 errores, espera de 30 s (y más si sigue fallando).
  const [fallos, setFallos] = useState(0);
  const [hasta, setHasta] = useState(0);
  const [olvido, setOlvido] = useState(false);
  const [, tic] = useState(0);
  useEffect(() => { if (hasta <= Date.now()) return; const r = setInterval(() => { tic(x => x + 1); if (Date.now() >= hasta) clearInterval(r); }, 500); return () => clearInterval(r); }, [hasta]);
  const espera = Math.max(0, Math.ceil((hasta - Date.now()) / 1000));
  const probar = pin => {
    if (espera) return false;
    if (pinValido(elegido, pin)) { setFallos(0); entrar(elegido.id); avisar('Hola, ' + elegido.n.split(' ')[0]); return true; }
    const n = fallos + 1; setFallos(n);
    if (n >= 5) setHasta(Date.now() + 30000 * Math.pow(2, Math.min(4, Math.floor((n - 5) / 5))));
    return false;
  };
  const dueno = S.perfiles.find(p => p.rol === 'dueno') || {}, neg = S.negocio;
  const msg = 'Hola' + (dueno.n ? ' ' + dueno.n.split(' ')[0] : '') + ', soy ' + (elegido ? elegido.n : '') + '. Olvidé mi PIN de Orbe Negocios (' + neg.nombre + '). ¿Me pones uno nuevo? Lo cambias en Equipo, tocando mi nombre.';

  if (elegido && olvido) return caja(html`
    <button type="button" class="icono-btn toca" aria-label="Volver" onClick=${() => setOlvido(false)}><${Icono} n="atras" /></button>
    <div class="pila entra" style="align-items:center;gap:10px;text-align:center">
      <span style="width:72px;height:72px;border-radius:50%;background:var(--in);display:grid;place-items:center;animation:pop .5s var(--spring) both"><${Icono} n="check" t=${34} g=${2.8} c="#0b0a14" /></span>
      <h1 style="font-size:23px">Listo, le avisamos al dueño</h1>
      <span class="sub" style="line-height:1.45;max-width:320px">Le aparece en Orbe que necesitas un PIN nuevo. Cuando te lo dé, entras con él. Si quieres que se entere ya, mándale un mensaje:</span>
    </div>
    <div class="pila" style="gap:10px;margin-top:6px">
      ${neg.tel && html`<a class="btn2 verde toca" style="min-height:50px;border-radius:25px;justify-content:center;text-decoration:none" href=${enlaceWA(neg.tel, msg, pais(neg.pais).id)} target="_blank" rel="noopener">Avisarle por WhatsApp</a>`}
      ${neg.correo && html`<a class="btn2 toca" style="min-height:50px;border-radius:25px;justify-content:center;text-decoration:none" href=${'mailto:' + encodeURIComponent(neg.correo) + '?subject=' + encodeURIComponent('PIN nuevo en Orbe Negocios') + '&body=' + encodeURIComponent(msg)}>Avisarle por correo</a>`}
      <button type="button" class="btn toca" onClick=${() => { setOlvido(false); setElegido(null); }}>Entendido</button>
    </div>`);

  if (nuevoPin) return caja(html`
    <div class="pila entra" style="align-items:center;gap:8px;text-align:center">
      <span class=${'logo redondo ' + TONOS[S.perfiles.indexOf(nuevoPin.p) % 5]} style="width:72px;height:72px;font-size:24px">${iniciales(nuevoPin.p.n)}</span>
      <h1 style="font-size:24px">${nuevoPin.primero ? 'Repite tu PIN' : 'Crea tu PIN de dueño'}</h1>
      <span class="sub" style="line-height:1.45;max-width:320px">${nuevoPin.primero ? 'Márcalo otra vez para confirmar.' : '4 números que solo sepas tú. Con él entras cada vez que abras Orbe.'}</span>
    </div>
    <div class="entra" style="--i:2;margin-top:8px" key=${nuevoPin.primero ? 'b' : 'a'}><${Teclado} onListo=${marcarNuevo} /></div>`);

  if (conClave) return caja(html`
    <button type="button" class="icono-btn toca" aria-label="Volver" onClick=${() => setConClave(null)}><${Icono} n="atras" /></button>
    <div class="pila entra" style="align-items:center;gap:8px;text-align:center">
      <span class=${'logo redondo ' + TONOS[S.perfiles.indexOf(conClave) % 5]} style="width:72px;height:72px;font-size:24px">${iniciales(conClave.n)}</span>
      <h1 style="font-size:24px">Hola, ${conClave.n.split(' ')[0]}</h1>
      <span class="sub" style="line-height:1.45;max-width:340px">Todavía no tienes PIN. Para entrar como dueño, escribe la contraseña de la cuenta Orbe y después creas tu PIN.</span>
    </div>
    ${!N.correo && html`<${CampoUsuario} valor=${cl.usuario} onCambio=${v => setCl(Object.assign({}, cl, { usuario: v }))} />`}
    ${N.correo && N.usuario && html`<span class="sub" style="text-align:center">Usuario: ${N.usuario}</span>`}
    <${CampoClave} titulo="Contraseña" valor=${cl.clave} onCambio=${v => setCl(Object.assign({}, cl, { clave: v }))} onEnter=${entrarConClave} />
    <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${entrarConClave}>${ocupado ? 'Un momento…' : 'Entrar'}</button>`);

  if (elegido) return caja(html`
    <button type="button" class="icono-btn toca" aria-label="Volver" onClick=${() => setElegido(null)}><${Icono} n="atras" /></button>
    <div class="pila entra" style="align-items:center;gap:8px;text-align:center">
      <span class=${'logo redondo ' + TONOS[S.perfiles.indexOf(elegido) % 5]} style="width:72px;height:72px;font-size:24px">${iniciales(elegido.n)}</span>
      <h1 style="font-size:24px">Hola, ${elegido.n.split(' ')[0]}</h1><span class="sub">Escribe tu PIN</span>
    </div>
    <div class="entra" style="--i:2;margin-top:8px"><${Teclado} onListo=${probar} error=${espera ? 'Demasiados intentos. Espera ' + espera + ' s' : fallos ? 'Ese no es tu PIN' + (fallos >= 3 && fallos < 5 ? ' · te quedan ' + (5 - fallos) + ' intentos' : '') : ''} /></div>
    ${elegido.rol !== 'dueno' ? html`<button type="button" class="olvide-pin toca" style="align-self:center" onClick=${() => { pedirPinNuevo(elegido.id); setOlvido(true); }}>Olvidé mi PIN</button>`
      : html`<span class="sub faint" style="text-align:center">¿Olvidaste tu PIN de dueño? Inicia sesión con tu correo para ponerte uno nuevo (Ajustes → Cuenta).</span>`}`);

  return caja(html`
    ${bienv && html`<${Bienvenida} b=${Object.assign({}, bienv, { logo: bienv.logo || S.negocio.logo || '' })} listo=${() => setBienv(null)} />`}
    <div class="fila entra" style="gap:12px"><${LogoOrbe} t=${44} orbita /><span style="display:flex;flex-direction:column"><b style="font-size:17px">${S.negocio.nombre}</b><span class="sub">Orbe Negocios</span></span></div>
    <h1 class="entra" style="--i:2;font-size:26px;margin-top:10px">¿Quién está usando Orbe?</h1>
    <div class="perfiles">${activos.map((p, i) => { const r = rolDe(S, p); return html`
      <button type="button" key=${p.id} class="tarjeta toca entra perfil-btn" style=${{ '--i': 3 + i }} onClick=${() => tocar(p)}>
        <span class=${'logo redondo ' + TONOS[S.perfiles.indexOf(p) % 5]} style="width:56px;height:56px;font-size:18px">${iniciales(p.n)}</span>
        <b>${p.n}</b><span class="sub">${r ? r.n : ''}${p.pin ? '' : ' · sin PIN'}</span>
      </button>`; })}</div>
    <span class="sub faint" style="margin-top:auto;text-align:center">Cada persona ve solo lo que el dueño le permite.</span>
    ${!demo && html`<div class="pila" style="gap:6px;align-items:center;padding-top:6px">
      <span class="sub">¿No es tu negocio?</span>
      <button type="button" class="btn2 chico toca" style="gap:6px" onClick=${() => { if (confirm('¿Cambiar de cuenta? Se cierra la sesión de “' + S.negocio.nombre + '” en este aparato. Después puedes entrar con otra cuenta o crear una nueva.')) cerrarSesion().then(() => avisar('Sesión cerrada')); }}><${Icono} n="salir" t=${15} />Cambiar de cuenta</button>
    </div>`}`);
}
