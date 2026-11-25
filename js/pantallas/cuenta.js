// Cuenta y nube: crear cuenta, iniciar sesión, recuperar la contraseña, unir el negocio a la cuenta,
// ver si todo está guardado y la suscripción (pagar y avisar «Ya pagué»).
import { html, useState, useEffect } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { cambiarNegocio, leer, empezarDeNuevo, borrarTodoLocal, exportar } from '../datos.js';
import { descargar, ventasCSV } from './reportes.js';
import { Hoja, Icono, avisar, hace, LogoOrbe, Interruptor } from '../ui.js';
import { numero } from './pagos.js';
import { useNube, iniciarNube, olvidarNegocioLocal, verificandoCuenta, estadoNube, crearCuenta, entrarCuenta, entrarUsuario, ponerUsuario, usuarioOk, olvideClave, nuevaClave, terminarRecuperar, cerrarSesion, misNegocios, subirNegocio, bajarNegocio, sincronizar, configCobro, misPagos, reportarPago, estadoPlan, borrarMiCuenta, faltaAceptar, aceptarTerminos, negocioPropio } from '../nube.js';

// Campo de contraseña con «Ver» para revisar lo que se escribió.
export function CampoClave({ titulo, valor, onCambio, nueva, onEnter }) {
  const [ver, setVer] = useState(false);
  return html`<label class="campo"><span>${titulo}</span><span class="clave-caja">
    <input type=${ver ? 'text' : 'password'} autocomplete=${nueva ? 'new-password' : 'current-password'} autocapitalize="off" autocorrect="off" spellcheck="false" value=${valor} placeholder="••••••••" onInput=${e => onCambio(e.target.value)} onKeyDown=${e => e.key === 'Enter' && onEnter && onEnter()} />
    <button type="button" class="clave-ver toca" aria-label=${ver ? 'Ocultar contraseña' : 'Ver contraseña'} onClick=${e => { e.preventDefault(); setVer(!ver); }}>${ver ? 'Ocultar' : 'Ver'}</button></span></label>`;
}
// Usuario para iniciar sesión (lo usan el dueño y su equipo; el correo es solo del dueño).
export function CampoUsuario({ valor, onCambio, crear, onEnter }) {
  return html`<label class="campo"><span>${crear ? 'Usuario (con esto entran tú y tu equipo)' : 'Usuario'}</span>
    <input type="text" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" value=${valor} placeholder=${crear ? 'Ej.: ferreteria.tornillo' : 'Tu usuario'} onInput=${e => onCambio(crear ? e.target.value.toLowerCase().replace(/\s+/g, '') : e.target.value)} onKeyDown=${e => e.key === 'Enter' && onEnter && onEnter()} />
    ${crear && html`<span class="sub faint" style="font-size:12px">De 3 a 30 letras o números, sin espacios. Puede llevar punto o guion.</span>`}</label>`;
}
export const CampoCorreoDueno = ({ valor, onCambio, crear }) => html`<label class="campo"><span>${crear ? 'Correo del dueño (solo para recuperar la contraseña)' : 'Correo del dueño'}</span><input type="email" inputmode="email" autocomplete="email" autocapitalize="off" value=${valor} placeholder="tu@correo.com" onInput=${e => onCambio(e.target.value)} /></label>`;
// Revisa los datos de una cuenta nueva.
const cuentaMala = f => !correoOk(f.correo) ? 'Escribe un correo válido' : !usuarioOk(f.usuario) ? 'El usuario lleva de 3 a 30 letras o números, sin espacios' : claveMala(f.clave, f.clave2) || (!f.acepto ? 'Para crear la cuenta acepta los Términos de uso y la Política de privacidad' : '');
// Casilla para aceptar los términos (con enlaces que abren aparte).
export const AceptoLegal = ({ on, onCambio }) => html`<label class="fila acepto-legal" style="gap:10px;align-items:flex-start;cursor:pointer">
  <input type="checkbox" checked=${on} onChange=${e => onCambio(e.target.checked)} style="width:22px;height:22px;margin:1px 0 0;accent-color:var(--accent);flex:none" />
  <span class="sub" style="line-height:1.45;color:var(--ink)">Acepto los <a href="terminos.html" target="_blank" rel="noopener">Términos de uso</a> y la <a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a>. Orbe no emite facturas fiscales.</span></label>`;
// Revisa la contraseña nueva: largo y que las dos coincidan.
export const claveMala = (a, b) => a.length < 8 ? 'La contraseña debe tener al menos 8 caracteres' : a !== b ? 'Las contraseñas no coinciden: escríbelas igual' : '';

// Formulario de correo y contraseña (crear, entrar u olvidé).
function FormCuenta({ modo, setModo, f, pon }) {
  return html`<div class="pila" style="gap:12px">
    <div class="segmento" style="width:100%">${[['crear', 'Crear cuenta'], ['entrar', 'Ya tengo cuenta']].map(o => html`<button type="button" style="flex:1" class=${modo === o[0] || (modo === 'olvido' && o[0] === 'entrar') ? 'on' : ''} onClick=${() => setModo(o[0])}>${o[1]}</button>`)}</div>
    ${modo === 'crear' && html`<${CampoCorreoDueno} valor=${f.correo} crear onCambio=${v => pon({ correo: v })} />`}
    ${modo !== 'olvido' && html`<${CampoUsuario} valor=${f.usuario} crear=${modo === 'crear'} onCambio=${v => pon({ usuario: v })} />`}
    ${modo === 'olvido' && html`<${CampoCorreoDueno} valor=${f.correo} onCambio=${v => pon({ correo: v })} />`}
    ${modo !== 'olvido' && html`<${CampoClave} titulo=${'Contraseña' + (modo === 'crear' ? ' (al menos 8 caracteres)' : '')} valor=${f.clave} nueva=${modo === 'crear'} onCambio=${v => pon({ clave: v })} />`}
    ${modo === 'crear' && html`<${CampoClave} titulo="Repite la contraseña" valor=${f.clave2} nueva onCambio=${v => pon({ clave2: v })} />`}
    ${modo === 'crear' && f.clave2 && f.clave !== f.clave2 && html`<span class="sub" style="color:var(--out-text);margin-top:-4px">Las contraseñas no coinciden</span>`}
    ${modo === 'crear' && html`<${AceptoLegal} on=${!!f.acepto} onCambio=${v => pon({ acepto: v })} />`}
    ${modo === 'entrar' && html`<button type="button" class="olvide-pin toca" style="align-self:flex-start;padding-left:0" onClick=${() => setModo('olvido')}>Olvidé mi contraseña</button>`}
    ${modo === 'olvido' && html`<span class="sub" style="line-height:1.45">Le mandamos al correo del dueño un enlace para poner una contraseña nueva.</span>`}
  </div>`;
}
// Para distinguir negocios con el mismo nombre: cuándo se creó y su plan.
const datoNegocio = g => { const ep = estadoPlan(g); return 'Creado el ' + new Date(g.creado).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) + (ep ? ' · ' + ep.txt.toLowerCase() : ''); };
const correoOk = x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.trim());

// ---------- hoja: guardar el negocio en la nube (crear cuenta o iniciar sesión) ----------
export function Cuenta({ d, cerrar }) {
  const { S } = useApp();
  const N = useNube();
  const [modo, setModo] = useState(d.modo || 'crear');
  const [f, setF] = useState({ correo: '', usuario: '', clave: '', clave2: '' });
  const [paso, setPaso] = useState(N.sesion ? 'unir' : 'form'); // form · confirmar · unir · listo
  const [cuenta, setCuenta] = useState(null); // negocios que ya tiene la cuenta
  const [ocupado, setOcupado] = useState(false);
  const pon = o => setF(x => Object.assign({}, x, o));
  useEffect(() => { if (paso === 'unir') misNegocios().then(setCuenta).catch(er => avisar(er.message)); }, [paso]);
  const hacer = async fn => { setOcupado(true); try { await fn(); } catch (er) { avisar(er.message); } finally { setOcupado(false); } };
  const enviar = () => hacer(async () => {
    if (modo === 'olvido') { if (!correoOk(f.correo)) throw new Error('Escribe un correo válido'); await olvideClave(f.correo); avisar('Listo: revisa el correo del dueño'); setModo('entrar'); return; }
    if (modo === 'crear') { const m = cuentaMala(f); if (m) throw new Error(m); const r = await crearCuenta(f.correo, f.clave, f.usuario); if (r.confirmar) { setPaso('confirmar'); return; } }
    else await entrarUsuario(f.usuario, f.clave);
    setPaso('unir');
  });
  const subir = c => hacer(async () => { await subirNegocio(); c(() => avisar('Tu negocio quedó guardado en la nube')); });
  const bajar = (c, g) => hacer(async () => { await bajarNegocio(g.id); c(() => avisar('Listo: ' + g.nombre + ' en este aparato')); });
  const omitir = c => { if (d.inicio) cambiarNegocio({ nubeOmitida: Date.now() }); c(); };
  const yaUnido = S.negocio && S.negocio.nubeId;
  return html`<${Hoja} titulo=${paso === 'confirmar' ? 'Confirma tu correo' : 'Guarda tu negocio en la nube'} onCerrar=${cerrar} contenido=${c => ({
    cuerpo: paso === 'confirmar' ? html`
      <div class="pila" style="align-items:center;text-align:center;gap:10px;padding:10px 0"><span class="vacio-ic" style="width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-text)"><${Icono} n="campana" t=${28} /></span>
        <b style="font-size:17px">Revisa tu correo</b><span class="sub" style="line-height:1.5;max-width:320px">Te mandamos un enlace a <b>${f.correo}</b>. Tócalo para confirmar y vuelve aquí: inicia sesión y tu negocio queda guardado. Mientras tanto, puedes seguir usando Orbe normal.</span></div>`
    : paso === 'unir' ? html`
      ${cuenta == null ? html`<p class="vacio">Revisando tu cuenta…</p>`
      : yaUnido ? html`<p class="vacio">Este negocio ya está en tu cuenta.</p>`
      : negocioPropio(cuenta, N.sesion) ? html`<span class="sub" style="line-height:1.5">Tu cuenta ya tiene su negocio: <b>${negocioPropio(cuenta, N.sesion).nombre}</b>. Cada cuenta es para un solo negocio, así que no se puede guardar «${S.negocio.nombre}» en ella.</span>
        <button type="button" class=${'guia-btn toca' + (ocupado ? ' apagado' : '')} onClick=${() => bajar(c, negocioPropio(cuenta, N.sesion))}><${Icono} n="descarga" t=${18} /><span class="crece"><b>Abrir «${negocioPropio(cuenta, N.sesion).nombre}» en este aparato</b><br /><span class="sub" style="font-weight:500">Lo que hay ahora en este aparato queda en una copia</span></span></button>
        <span class="sub" style="line-height:1.45">Para guardar «${S.negocio.nombre}» crea una cuenta nueva: cierra sesión y elige «Crear cuenta».</span>`
      : html`<span class="sub" style="line-height:1.45">Sesión iniciada${N.usuario ? html` como <b>${N.usuario}</b>` : ''}.</span>
        <button type="button" class=${'guia-btn toca' + (ocupado ? ' apagado' : '')} onClick=${() => subir(c)}><${Icono} n="subir" t=${18} /><span class="crece"><b>Guardar «${S.negocio.nombre}» en mi cuenta</b><br /><span class="sub" style="font-weight:500">Sube lo que tienes en este aparato</span></span></button>
        ${cuenta.length > 0 && html`<span class="titulo-funciones">O usar uno que ya está en tu cuenta</span>${cuenta.map(g => html`<button type="button" key=${g.id} class=${'guia-btn toca' + (ocupado ? ' apagado' : '')} onClick=${() => bajar(c, g)}><${Icono} n="descarga" t=${18} /><span class="crece"><b>${g.nombre}</b><br /><span class="sub" style="font-weight:500">${datoNegocio(g)} · reemplaza lo de este aparato (se guarda una copia)</span></span></button>`)}`}`}`
    : html`
      ${d.inicio && html`<div class="pila" style="gap:8px">${[['escudo', 'Si pierdes o cambias el teléfono, no pierdes nada'], ['movil', 'Úsalo en varios aparatos con los mismos datos'], ['wifi', 'Sigue funcionando sin internet: se guarda al volver la conexión']].map(x => html`<span class="fila" style="gap:10px;font-size:14px"><span class="ic t-ver" style="width:30px;height:30px;border-radius:10px"><${Icono} n=${x[0]} t=${15} /></span>${x[1]}</span>`)}</div>`}
      <${FormCuenta} modo=${modo} setModo=${setModo} f=${f} pon=${pon} />`,
    pie: paso === 'form' ? html`<button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${enviar}>${ocupado ? 'Un momento…' : modo === 'crear' ? 'Crear cuenta' : modo === 'olvido' ? 'Mandar el enlace' : 'Iniciar sesión'}</button>
        <button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => omitir(c)}>Ahora no</button>`
      : html`<button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => paso === 'confirmar' ? (setModo('entrar'), setPaso('form')) : c()}>${paso === 'confirmar' ? 'Ya lo confirmé: iniciar sesión' : 'Listo'}</button>`
  })} />`;
}

// ---------- pantalla: contraseña nueva (al volver del enlace «Olvidé mi contraseña») ----------
// Pantalla completa: aparece sola, antes que todo lo demás, también en el panel de administración.
export function ClaveNueva() {
  const N = useNube();
  const [f, setF] = useState({ a: '', b: '' }), [ocupado, setOcupado] = useState(false);
  const guardar = async () => {
    const m = claveMala(f.a, f.b); if (m) { avisar(m); return; }
    setOcupado(true);
    try { await nuevaClave(f.a); terminarRecuperar(); avisar('Listo: tu contraseña quedó cambiada'); }
    catch (er) { avisar(er.message); } finally { setOcupado(false); }
  };
  return html`<div class="clave-nueva entra">
    <div class="tarjeta pila" style="gap:16px;padding:26px;max-width:420px;width:100%">
      <${LogoOrbe} t=${44} />
      <span style="display:flex;flex-direction:column;gap:4px"><b style="font-size:21px">Pon tu contraseña nueva</b><span class="sub">${N.usuario ? 'Para el usuario ' + N.usuario : 'Escríbela dos veces para no equivocarte'}</span></span>
      <${CampoClave} titulo="Contraseña nueva (al menos 8 caracteres)" valor=${f.a} nueva onCambio=${v => setF(x => Object.assign({}, x, { a: v }))} />
      <${CampoClave} titulo="Repite la contraseña" valor=${f.b} nueva onCambio=${v => setF(x => Object.assign({}, x, { b: v }))} onEnter=${guardar} />
      ${f.b && f.a !== f.b && html`<span class="sub" style="color:var(--out-text);margin-top:-6px">Las contraseñas no coinciden</span>`}
      <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${guardar}>${ocupado ? 'Guardando…' : 'Guardar contraseña'}</button>
      <button type="button" class="olvide-pin toca" onClick=${terminarRecuperar}>Ahora no</button>
    </div></div>`;
}

// Cuentas creadas antes de que existiera el usuario: se pone una vez.
function PonerUsuario() {
  const [u, setU] = useState(''), [ocupado, setOcupado] = useState(false);
  const guardar = async () => {
    if (!usuarioOk(u)) { avisar('El usuario lleva de 3 a 30 letras o números, sin espacios'); return; }
    setOcupado(true);
    try { const v = await ponerUsuario(u); avisar('Listo: ahora entras con el usuario ' + v); } catch (er) { avisar(er.message); } finally { setOcupado(false); }
  };
  return html`<div class="tarjeta pila" style="box-shadow:none;background:var(--amber-soft);gap:10px;margin-bottom:10px">
    <b style="font-size:14px">Crea el usuario del negocio</b>
    <span class="sub" style="line-height:1.45;color:var(--ink)">Con el usuario y la contraseña entran tú y tu equipo. Así el correo queda solo para ti.</span>
    <${CampoUsuario} valor=${u} crear onCambio=${setU} onEnter=${guardar} />
    <button type="button" class=${'btn2 chico lleno toca' + (ocupado ? ' apagado' : '')} style="align-self:flex-start" onClick=${guardar}>Guardar usuario</button>
  </div>`;
}

// Cerrar sesión (con confirmación): después, en este aparato se pide el usuario y la contraseña.
export const pedirCerrarSesion = abrir => abrir('confirmar', { titulo: '¿Cerrar sesión?', texto: 'Para volver a abrir Orbe en este aparato vas a necesitar el usuario y la contraseña. Lo que hay aquí no se borra.', boton: 'Cerrar sesión', si: () => cerrarSesion().then(() => avisar('Sesión cerrada')) });

// ---------- Ajustes → Cuenta y nube ----------
export function CuentaTema() {
  const { S, abrir, yo } = useApp();
  const N = useNube(), unido = S.negocio && S.negocio.nubeId;
  const ESTADO = { 'al día': ['Todo guardado en la nube', 'var(--in-text)'], sincronizando: ['Guardando…', 'var(--accent-text)'], pendiente: ['Faltan cambios por subir', 'var(--amber-text)'], 'sin internet': ['Sin internet: se sube al volver', 'var(--amber-text)'], error: [N.error || 'No se pudo guardar', 'var(--out-text)'], 'sin sesión': ['Inicia sesión para seguir guardando', 'var(--amber-text)'], apagada: ['Solo en este aparato', 'var(--muted)'] };
  const e = ESTADO[N.estado] || ESTADO.apagada;
  if (!N.sesion || !unido) return html`
    <p class="sub" style="margin:0 0 10px;line-height:1.5">${unido ? 'Inicia sesión para seguir guardando tu negocio en la nube.' : 'Hoy tu negocio está guardado solo en este aparato. Con una cuenta queda en la nube: no se pierde si cambias de teléfono y lo usas en varios aparatos.'}</p>
    <div class="chips"><button type="button" class="btn2 chico lleno toca" onClick=${() => abrir('cuenta', { modo: N.sesion || unido ? 'entrar' : 'crear' })}>${N.sesion ? 'Guardar este negocio en mi cuenta' : unido ? 'Iniciar sesión' : 'Crear cuenta o iniciar sesión'}</button></div>`;
  return html`
    <div class="fila" style="gap:12px;padding:4px 0 10px"><span class="ic t-ver" style="width:42px;height:42px;border-radius:13px"><${Icono} n=${N.estado === 'al día' ? 'check' : 'wifi'} t=${19} /></span>
      <span class="crece" style="display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">${N.usuario ? 'Usuario: ' + N.usuario : 'Cuenta del negocio'}</b><span class="sub" style=${{ color: e[1], fontWeight: 600 }}>${e[0]}</span></span></div>
    ${!N.usuario && html`<${PonerUsuario} />`}
    <div class="fila" style="justify-content:space-between;padding:10px 0;font-size:14px"><span class="muted">Última vez</span><b style="font-weight:600">${N.ultima ? hace(N.ultima) + ' · ' + new Date(N.ultima).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' }) : '—'}</b></div>
    <div class="fila" style="justify-content:space-between;padding:10px 0;font-size:14px"><span class="muted">Cambios por subir</span><b style="font-weight:600">${N.pendientes}</b></div>
    <div class="chips" style="margin-top:10px"><button type="button" class="btn2 chico acento toca" onClick=${() => { sincronizar(); avisar('Guardando en la nube…'); }}>Guardar ahora</button>
      <button type="button" class="btn2 chico toca" onClick=${() => pedirCerrarSesion(abrir)}><${Icono} n="salir" t=${14} />Cerrar sesión</button></div>
    ${yo && yo.rol === 'dueno' && html`<span class="titulo-funciones" style="margin-top:18px">Zona delicada</span>
      <p class="sub" style="margin:0 0 8px;line-height:1.5">Antes de borrar, descarga tu copia en Excel (Más → Copias y Excel) si quieres guardar tu historial.</p>
      <div class="chips"><button type="button" class="btn2 chico rojo toca" onClick=${() => abrir('borrarCuenta', {})}>Borrar mi cuenta y mis datos</button></div>`}`;
}

// ---------- hoja: borrar la cuenta y todos los datos ----------
export function BorrarCuenta({ cerrar }) {
  const { S } = useApp();
  const [f, setF] = useState({ clave: '', palabra: '' }), [ocupado, setOcupado] = useState(false);
  const listo = f.clave.length >= 6 && f.palabra.trim().toUpperCase() === 'BORRAR';
  const borrar = async c => {
    if (!listo || ocupado) { avisar(f.palabra.trim().toUpperCase() !== 'BORRAR' ? 'Escribe BORRAR para confirmar' : 'Escribe tu contraseña'); return; }
    setOcupado(true);
    try { await borrarMiCuenta(f.clave); await borrarTodoLocal(); c(() => { location.hash = ''; avisar('Tu cuenta y tus datos se borraron'); }); }
    catch (er) { avisar(er.message); setOcupado(false); }
  };
  return html`<${Hoja} titulo="Borrar mi cuenta" onCerrar=${cerrar} contenido=${c => ({
    cuerpo: html`
      <div class="tarjeta pila" style="box-shadow:none;background:var(--out-soft);gap:6px">
        <b style="color:var(--out-text)">Esto no se puede deshacer</b>
        <span class="sub" style="line-height:1.5;color:var(--ink)">Se borran tu cuenta, tu usuario y ${S.negocio ? html`<b>${S.negocio.nombre}</b>` : 'tus negocios'} con todo lo que tiene: productos, ventas, clientes, gastos, equipo, citas y reservas, en la nube y en este aparato. Tus empleados ya no podrán entrar.</span>
        <span class="sub" style="line-height:1.5;color:var(--ink)">Lo que pagaste por la suscripción no se devuelve. Solo guardamos el registro de esos pagos, porque la ley nos pide llevar la contabilidad.</span>
      </div>
      <${CampoClave} titulo="Tu contraseña" valor=${f.clave} onCambio=${v => setF(Object.assign({}, f, { clave: v }))} />
      <label class="campo"><span>Escribe BORRAR para confirmar</span><input type="text" value=${f.palabra} autocomplete="off" autocapitalize="characters" onInput=${e => setF(Object.assign({}, f, { palabra: e.target.value }))} /></label>`,
    pie: html`<button type="button" class=${'btn toca' + (listo && !ocupado ? '' : ' apagado')} style="background:var(--out)" onClick=${() => borrar(c)}>${ocupado ? 'Borrando…' : 'Borrar todo para siempre'}</button>`
  })} />`;
}

// ---------- Ajustes → Mi suscripción ----------
const PLANES = { negocio: 'Negocio', empresa: 'Empresa' };
export function Suscripcion() {
  const { S, D, abrir } = useApp();
  const N = useNube(), unido = S.negocio && S.negocio.nubeId;
  const [cfg, setCfg] = useState(null), [pagos, setPagos] = useState(null);
  useEffect(() => { if (N.sesion && unido) { configCobro().then(setCfg).catch(() => setCfg(false)); misPagos().then(setPagos).catch(() => setPagos([])); } }, [N.sesion, unido]);
  if (!N.sesion || !unido) return html`<p class="sub" style="margin:0 0 10px;line-height:1.5">La suscripción va con tu cuenta. Crea tu cuenta (o inicia sesión) para ver tu plan y pagar.</p>
    <div class="chips"><button type="button" class="btn2 chico lleno toca" onClick=${() => abrir('cuenta', {})}>Crear cuenta o iniciar sesión</button></div>`;
  const ep = estadoPlan(N.plan), planSug = S.negocio.escala === 'empresa' ? 'empresa' : 'negocio';
  const COLOR = { activa: 'var(--in-text)', prueba: 'var(--accent-text)', gracia: 'var(--amber-text)', vencida: 'var(--out-text)' };
  const pend = (pagos || []).filter(p => p.estado === 'pendiente');
  return html`
    ${ep && html`<div class="tarjeta pila" style="box-shadow:none;background:var(--fill2);gap:4px">
      <span class="sub">Plan ${PLANES[N.plan.plan] || (N.plan.plan === 'prueba' ? 'de prueba' : N.plan.plan)}</span>
      <b style=${{ fontSize: '18px', color: COLOR[ep.k] }}>${ep.txt}</b>
      ${ep.hasta && html`<span class="sub">${ep.k === 'vencida' ? 'Venció el ' : 'Hasta el '}${new Date(ep.hasta).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}${ep.dias ? ' · ' + ep.dias + (ep.dias === 1 ? ' día' : ' días') : ''}</span>`}
      ${ep.k === 'vencida' && html`<span class="sub" style="line-height:1.45;margin-top:4px">Puedes ver todo, pero no se guardan ventas nuevas en la nube hasta que pagues. Nunca se borra nada.</span>`}
    </div>`}
    ${pend.length > 0 && html`<div class="tarjeta fila" style="box-shadow:none;background:var(--amber-soft);gap:10px"><${Icono} n="reloj" t=${18} /><span class="sub" style="line-height:1.4;color:var(--ink)">Tienes ${pend.length === 1 ? 'un pago' : pend.length + ' pagos'} por confirmar. Te avisamos al aprobarlo.</span></div>`}
    ${cfg && html`<div class="chips" style="margin-top:10px"><button type="button" class="btn2 chico lleno toca" onClick=${() => abrir('pagar', { cfg, plan: planSug, listo: () => misPagos().then(setPagos).catch(() => {}) })}>Pagar mi suscripción</button></div>`}
    ${cfg && html`<span class="titulo-funciones" style="margin-top:14px">Precios</span>
      ${['negocio', 'empresa'].map(k => cfg.precios[k] && html`<div class="fila" style="justify-content:space-between;padding:10px 0;font-size:14px"><span><b>${PLANES[k]}</b><span class="sub"> · ${k === 'negocio' ? 'un local' : 'varias sedes'}</span></span><span class="num"><b>US$ ${cfg.precios[k].mes}</b>/mes · US$ ${cfg.precios[k].anio}/año</span></div>`)}`}
    ${pagos && pagos.length > 0 && html`<span class="titulo-funciones" style="margin-top:14px">Tus pagos</span>
      ${pagos.map(p => html`<div class="fila" key=${p.id} style="justify-content:space-between;padding:10px 0;font-size:13px"><span>${new Date(p.creado).toLocaleDateString('es')} · ${p.metodo} · ${p.moneda} ${p.monto}</span><span class=${'pildora ' + (p.estado === 'aprobado' ? 't-ver' : p.estado === 'rechazado' ? 't-ros' : 't-amb')}>${p.estado === 'pendiente' ? 'Por confirmar' : p.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}</span></div>`)}`}`;
}

// ---------- hoja: pagar y avisar «Ya pagué» ----------
// Por ahora solo se cobra por Binance (Pago Móvil y efectivo vuelven a esta lista cuando se activen).
const METODOS_PAGO = ['Binance'];
// La factura a nombre del negocio se activa cuando Orbe tenga imprenta digital.
const PEDIR_FACTURA = false;
export function Pagar({ d, cerrar }) {
  const { S, D, P } = useApp();
  const cfg = d.cfg, pm = cfg.pago_movil || {};
  const conSedes = !!S.negocio && (S.negocio.escala === 'empresa' || (S.negocio.sucursales || []).length > 1);
  const fac0 = (S.negocio && S.negocio.facturaOrbe) || {};
  const [f, setF] = useState({ plan: conSedes ? 'empresa' : d.plan || 'negocio', meses: 1, metodo: 'Binance', referencia: '', nota: '', fac: PEDIR_FACTURA && !!fac0.rif, rif: fac0.rif || '', razon: fac0.razon || (S.negocio && S.negocio.nombre) || '', dir: fac0.dir || '' });
  const pon = o => setF(x => Object.assign({}, x, o));
  const usd = (cfg.precios[f.plan] || {})[f.meses === 12 ? 'anio' : 'mes'] || 0;
  const enBs = P.id === 'VE' && pm.telefono ? D.redondo(usd * D.tasa) : 0;
  const monto = f.metodo === 'Pago Móvil' && enBs ? enBs : usd, moneda = f.metodo === 'Pago Móvil' && enBs ? 'VES' : f.metodo === 'Binance' ? 'USDT' : 'USD';
  const copiar = x => { try { navigator.clipboard.writeText(x); avisar('Copiado'); } catch (e) { avisar(x); } };
  const Dato = (k, v) => v ? html`<div class="fila" style="justify-content:space-between;gap:10px;padding:8px 0;"><span class="sub">${k}</span><button type="button" class="fila toca" style="gap:6px;border:0;background:none;color:var(--ink);font:inherit;font-weight:600" onClick=${() => copiar(v)}>${v}<${Icono} n="doc" t=${14} c="var(--accent-text)" /></button></div>` : null;
  const enviar = async c => {
    if (f.metodo !== 'Efectivo' && !f.referencia.trim()) { avisar('Escribe la referencia del pago'); return; }
    if (f.fac && (f.rif.trim().length < 5 || f.razon.trim().length < 2)) { avisar('Para la factura escribe el RIF o cédula y el nombre o razón social'); return; }
    const factura = f.fac ? { rif: f.rif.trim().toUpperCase(), razon: f.razon.trim(), dir: f.dir.trim() } : {};
    try {
      await reportarPago({ plan: f.plan, meses: f.meses, monto, moneda, metodo: f.metodo, referencia: f.referencia, nota: f.nota, factura });
      if (f.fac) cambiarNegocio({ facturaOrbe: factura }, 'Guardó sus datos de facturación');
      if (d.listo) d.listo();
      c(() => avisar('Listo: te avisamos cuando lo confirmemos'));
    }
    catch (er) { avisar(er.message); }
  };
  return html`<${Hoja} titulo="Pagar mi suscripción" onCerrar=${cerrar} contenido=${c => ({
    cuerpo: html`
      <div class="segmento" style="width:100%">${[['negocio', 'Negocio · un local'], ['empresa', 'Empresa · varias sedes']].map(o => html`<button type="button" style=${{ flex: 1, opacity: o[0] === 'negocio' && conSedes ? 0.45 : 1 }} class=${f.plan === o[0] ? 'on' : ''} onClick=${() => { if (o[0] === 'negocio' && conSedes) { avisar('Tienes varias sedes: te corresponde el plan Empresa'); return; } pon({ plan: o[0] }); }}>${o[1]}</button>`)}</div>
      ${conSedes && html`<span class="sub" style="line-height:1.45;margin-top:-4px">Las sedes van con el plan Empresa. El plan Negocio es para un solo local.</span>`}
      <div class="segmento" style="width:100%">${[[1, 'Un mes'], [12, 'Un año (2 meses gratis)']].map(o => html`<button type="button" style="flex:1" class=${f.meses === o[0] ? 'on' : ''} onClick=${() => pon({ meses: o[0] })}>${o[1]}</button>`)}</div>
      <div class="tasa-hoy" style="padding:14px"><span class="sub">A pagar</span><b class="num">US$ ${usd}</b>${enBs ? html`<span class="sub num">o Bs ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(enBs)} por Pago Móvil (tasa BCV de hoy)</span>` : null}</div>
      <div class="campo"><span>¿Cómo pagas?</span><div class="chips">${METODOS_PAGO.filter(m => m !== 'Binance' || cfg.binance).map(m => html`<button type="button" class=${'chip chico toca' + (f.metodo === m ? ' on' : '')} onClick=${() => pon({ metodo: m })}>${m}</button>`)}</div></div>
      ${f.metodo === 'Pago Móvil' && html`<div class="pila" style="gap:0">${Dato('Banco', pm.banco)}${Dato('Teléfono', pm.telefono)}${Dato('Cédula o RIF', pm.documento)}${Dato('Monto', 'Bs ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(enBs))}</div>`}
      ${f.metodo === 'Binance' && (cfg.binance ? html`<div class="pila" style="gap:0">${Dato('Binance Pay ID', cfg.binance)}${Dato('Monto', usd + ' USDT')}</div><span class="sub" style="line-height:1.45">Envía el monto exacto en USDT por Binance Pay y escribe abajo el ID de la orden.</span>` : html`<span class="sub" style="line-height:1.45">Escríbenos para darte los datos de pago${cfg.soporte ? ': ' + cfg.soporte : '.'}</span>`)}
      ${f.metodo === 'Efectivo' && html`<span class="sub" style="line-height:1.45">Págalo en persona y avisa aquí para que lo registremos.</span>`}
      ${f.metodo !== 'Efectivo' && html`<label class="campo"><span>Referencia del pago</span><input type="text" value=${f.referencia} placeholder=${f.metodo === 'Binance' ? 'ID de la orden' : 'Últimos 4 a 6 números'} autocomplete="off" onInput=${e => pon({ referencia: e.target.value })} /></label>`}
      <label class="campo"><span>Nota (opcional)</span><input type="text" value=${f.nota} autocomplete="off" onInput=${e => pon({ nota: e.target.value })} /></label>
      ${PEDIR_FACTURA && html`<${Interruptor} on=${f.fac} onCambio=${v => pon({ fac: v })} titulo="Necesito factura a nombre de mi negocio" sub="Guardamos tus datos para emitirla" />`}
      ${f.fac && html`<div class="pila" style="gap:12px">
        <label class="campo"><span>RIF o cédula</span><input type="text" value=${f.rif} placeholder="J-12345678-9" autocomplete="off" autocapitalize="characters" onInput=${e => pon({ rif: e.target.value })} /></label>
        <label class="campo"><span>Nombre o razón social</span><input type="text" value=${f.razon} autocomplete="organization" onInput=${e => pon({ razon: e.target.value })} /></label>
        <label class="campo"><span>Dirección fiscal (opcional)</span><input type="text" value=${f.dir} autocomplete="street-address" onInput=${e => pon({ dir: e.target.value })} /></label></div>`}`,
    pie: html`<button type="button" class="btn toca" onClick=${() => enviar(c)}>Ya pagué</button>`
  })} />`;
}

// ---------- bienvenida → «Empezar»: primero la cuenta (correo y contraseña), después se arma el negocio ----------
export function CrearCuentaInicio({ volver, entrar, listo }) {
  const N = useNube();
  const [f, setF] = useState({ correo: '', usuario: '', clave: '', clave2: '' });
  const [paso, setPaso] = useState('form'); // form · confirmar
  const [ocupado, setOcupado] = useState(false);
  const pon = o => setF(x => Object.assign({}, x, o));
  const hacer = async fn => { setOcupado(true); try { await fn(); } catch (er) { avisar(er.message); } finally { setOcupado(false); } };
  // Si confirmó el correo con el enlace (o ya entró), se sigue solo.
  useEffect(() => { if (N.sesion) listo(); }, [N.sesion]);
  const crear = () => hacer(async () => {
    const m = cuentaMala(f); if (m) throw new Error(m);
    const r = await crearCuenta(f.correo, f.clave, f.usuario);
    if (r.confirmar) setPaso('confirmar'); else listo();
  });
  const yaConfirme = () => hacer(async () => { await entrarCuenta(f.correo, f.clave); listo(); });
  if (paso === 'confirmar') return html`<div class="pila entra" style="gap:16px">
    <button type="button" class="icono-btn toca" aria-label="Atrás" onClick=${() => setPaso('form')}><${Icono} n="atras" /></button>
    <span class="vacio-ic" style="width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-text)"><${Icono} n="campana" t=${28} /></span>
    <h1 style="font-size:26px">Confirma tu correo</h1>
    <span class="sub" style="line-height:1.5;font-size:15px">Te mandamos un enlace a <b>${f.correo}</b>. Ábrelo y toca el enlace: después vuelve aquí y toca el botón de abajo. Si no lo ves, busca en Spam o Promociones.</span>
    <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${yaConfirme}>${ocupado ? 'Un momento…' : 'Ya lo confirmé: seguir'}</button>
    <button type="button" class="olvide-pin toca" onClick=${entrar}>¿Ese correo ya tenía cuenta? Inicia sesión</button>
  </div>`;
  return html`<div class="pila entra" style="gap:16px">
    <button type="button" class="icono-btn toca" aria-label="Atrás" onClick=${volver}><${Icono} n="atras" /></button>
    <h1 style="font-size:26px">Crea tu cuenta</h1>
    <span class="sub" style="line-height:1.45;font-size:15px">Tu negocio queda guardado en la nube. Tú y tu equipo entran con el <b>usuario</b> y la contraseña; el correo es solo tuyo, para recuperar la contraseña.</span>
    <${CampoCorreoDueno} valor=${f.correo} crear onCambio=${v => pon({ correo: v })} />
    <${CampoUsuario} valor=${f.usuario} crear onCambio=${v => pon({ usuario: v })} />
    <${CampoClave} titulo="Contraseña (al menos 8 caracteres)" valor=${f.clave} nueva onCambio=${v => pon({ clave: v })} />
    <${CampoClave} titulo="Repite la contraseña" valor=${f.clave2} nueva onCambio=${v => pon({ clave2: v })} onEnter=${crear} />
    ${f.clave2 && f.clave !== f.clave2 && html`<span class="sub" style="color:var(--out-text);margin-top:-6px">Las contraseñas no coinciden</span>`}
    <${AceptoLegal} on=${!!f.acepto} onCambio=${v => pon({ acepto: v })} />
    <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${crear}>${ocupado ? 'Un momento…' : 'Crear cuenta'}</button>
    <button type="button" class="olvide-pin toca" onClick=${entrar}>Ya tengo cuenta: iniciar sesión</button>
  </div>`;
}

// ---------- bienvenida → «Ya tengo cuenta»: abrir mi negocio en este aparato ----------
export function EntrarInicio({ volver, crear }) {
  const N = useNube();
  const [modo, setModo] = useState('entrar');
  const [f, setF] = useState({ correo: '', usuario: '', clave: '' });
  const [lista, setLista] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const pon = o => setF(x => Object.assign({}, x, o));
  const hacer = async fn => { setOcupado(true); try { await fn(); } catch (er) { avisar(er.message); } finally { setOcupado(false); } };
  // Con la sesión ya abierta (por ejemplo, al volver del enlace del correo) se muestran sus negocios directo.
  useEffect(() => { if (N.sesion && !lista) misNegocios().then(setLista).catch(er => avisar(er.message)); }, [N.sesion]);
  const enviar = () => hacer(async () => {
    if (modo === 'olvido') { if (!correoOk(f.correo)) throw new Error('Escribe un correo válido'); await olvideClave(f.correo); avisar('Listo: revisa el correo del dueño'); setModo('entrar'); return; }
    await entrarUsuario(f.usuario, f.clave);
    setLista(await misNegocios());
  });
  const abrirNeg = g => hacer(async () => { await bajarNegocio(g.id); avisar('Listo: ' + g.nombre); });
  const salir = () => hacer(async () => { await cerrarSesion(); setLista(null); });
  return html`<div class="pila entra" style="gap:16px">
    <button type="button" class="icono-btn toca" aria-label="Atrás" onClick=${lista ? salir : volver}><${Icono} n="atras" /></button>
    <h1 style="font-size:26px">${lista ? (lista.length ? 'Elige tu negocio' : 'Arma tu negocio') : 'Entra a tu cuenta'}</h1>
    ${lista ? html`<span class="sub">Sesión iniciada${N.usuario ? html` como <b>${N.usuario}</b>` : ''}</span>
      ${lista.length ? lista.map(g => html`<button type="button" key=${g.id} class=${'guia-btn toca' + (ocupado ? ' apagado' : '')} onClick=${() => abrirNeg(g)}><${Icono} n="tienda" t=${18} /><span class="crece"><b>${g.nombre}</b><br /><span class="sub" style="font-weight:500">${datoNegocio(g)}</span></span><${Icono} n="sig" t=${15} c="var(--faint)" /></button>`)
        : html`<span class="sub" style="line-height:1.45;font-size:15px">Tu cuenta está lista. Ahora contesta unas preguntas y Orbe se arma para tu negocio.</span>`}
      ${ocupado && html`<p class="sub">Bajando tus datos…</p>`}
      ${negocioPropio(lista, N.sesion) ? html`<span class="sub" style="line-height:1.45;text-align:center">Cada cuenta es para un solo negocio. Si tienes varias sedes, agrégalas dentro de tu negocio con el plan Empresa.</span>`
        : html`<button type="button" class=${lista.length ? 'btn2 toca' : 'btn toca'} style=${lista.length ? 'min-height:50px;border-radius:25px' : ''} onClick=${crear}>Crear mi negocio</button>`}
      <button type="button" class="olvide-pin toca" onClick=${salir}>Usar otra cuenta</button>`
    : N.sesion ? html`<p class="vacio">Revisando tu cuenta…</p>`
    : html`<span class="sub" style="line-height:1.45">Con tu cuenta abres tu negocio en este aparato, con todas tus ventas, productos y clientes.</span>
      ${modo !== 'olvido' ? html`<${CampoUsuario} valor=${f.usuario} onCambio=${v => pon({ usuario: v })} />` : html`<${CampoCorreoDueno} valor=${f.correo} onCambio=${v => pon({ correo: v })} />`}
      ${modo !== 'olvido' && html`<${CampoClave} titulo="Contraseña" valor=${f.clave} onCambio=${v => pon({ clave: v })} onEnter=${enviar} />`}
      ${modo === 'olvido' && html`<span class="sub" style="line-height:1.45">Le mandamos al correo del dueño un enlace para poner una contraseña nueva.</span>`}
      <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${enviar}>${ocupado ? 'Un momento…' : modo === 'olvido' ? 'Mandar el enlace' : 'Entrar'}</button>
      <button type="button" class="olvide-pin toca" onClick=${() => setModo(modo === 'olvido' ? 'entrar' : 'olvido')}>${modo === 'olvido' ? 'Volver' : 'Olvidé mi contraseña'}</button>`}
  </div>`;
}

// ---------- pantalla: el negocio está en este aparato pero el navegador no tiene sesión ----------
// Sin cuenta no se entra: se pide correo y contraseña. Lo que hay en el aparato no se toca.
export function EntrarDeNuevo({ tel }) {
  const { S } = { S: leer() };
  const [f, setF] = useState({ correo: '', usuario: '', clave: '' }), [olvido, setOlvido] = useState(false), [ocupado, setOcupado] = useState(false);
  const [modo, setModo] = useState('entrar'); // entrar · otra (entrar con otra cuenta) · nueva (crear una cuenta)
  const pon = o => setF(x => Object.assign({}, x, o));
  // Dejar este negocio en el aparato (queda en la nube y con una copia aquí) y empezar con otra cuenta o una nueva.
  const dejar = async destino => { olvidarNegocioLocal(); try { sessionStorage.setItem('orbe-inicio-paso', destino); } catch (e) { /* sin almacenamiento */ } await empezarDeNuevo(); };
  const pendientes = estadoNube().pendientes || 0;
  if (modo !== 'entrar') return html`<div class="clave-nueva entra">
    <div class="tarjeta pila" style="gap:14px;padding:26px;max-width:420px;width:100%">
      <span class="ic t-vio" style="width:52px;height:52px;border-radius:16px"><${Icono} n="personas" t=${24} /></span>
      <b style="font-size:20px">${modo === 'otra' ? '¿Entrar con otra cuenta?' : '¿Crear una cuenta nueva?'}</b>
      <span class="sub" style="line-height:1.5">Este aparato deja de mostrar <b>${S.negocio ? S.negocio.nombre : 'este negocio'}</b> y ${modo === 'otra' ? 'entras con el usuario y la contraseña de tu negocio' : 'empiezas un negocio nuevo con tu propia cuenta'}. ${S.negocio && S.negocio.nubeId ? 'Ese negocio sigue guardado en la nube: vuelve a aparecer entrando con su usuario.' : ''} Además queda una copia en este aparato (Más → Copias y Excel).</span>
      ${pendientes > 0 && html`<span class="aviso-plan ambar" style="cursor:default"><${Icono} n="alerta" t=${16} /><span class="crece">Hay ${pendientes} ${pendientes === 1 ? 'cambio' : 'cambios'} sin subir a la nube: solo quedarán en la copia de este aparato.</span></span>`}
      <button type="button" class="btn toca" onClick=${() => dejar(modo === 'otra' ? 'entrar' : 'cuenta')}>${modo === 'otra' ? 'Sí, entrar con otra cuenta' : 'Sí, crear una cuenta nueva'}</button>
      <button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => setModo('entrar')}>Volver</button>
    </div></div>`;
  const enviar = async () => {
    if (olvido && !correoOk(f.correo)) { avisar('Escribe un correo válido'); return; }
    setOcupado(true);
    try {
      if (olvido) { await olvideClave(f.correo); avisar('Listo: revisa el correo del dueño'); setOlvido(false); return; }
      verificandoCuenta(true);
      await entrarUsuario(f.usuario, f.clave);
      // Solo entra una cuenta de este negocio: otra cuenta no ve lo que hay en el aparato.
      const nid = S.negocio && S.negocio.nubeId;
      if (nid) { const lista = await misNegocios(); if (!lista.some(g => g.id === nid)) { await cerrarSesion(); throw new Error('Esa cuenta no es de ' + S.negocio.nombre + '. Toca «Entrar con otra cuenta»'); } }
      iniciarNube();
    } catch (er) { avisar(er.message); } finally { verificandoCuenta(false); setOcupado(false); }
  };
  return html`<div class="clave-nueva entra">
    <div class="tarjeta pila" style="gap:16px;padding:26px;max-width:420px;width:100%">
      <${LogoOrbe} t=${44} />
      <span style="display:flex;flex-direction:column;gap:4px"><b style="font-size:21px">Entra a tu cuenta</b><span class="sub" style="line-height:1.45">${S.negocio ? 'Para abrir ' + S.negocio.nombre + ' en este navegador, entra con el usuario y la contraseña del negocio.' : 'Entra con tu usuario y contraseña.'}</span></span>
      ${!olvido ? html`<${CampoUsuario} valor=${f.usuario} onCambio=${v => pon({ usuario: v })} />` : html`<${CampoCorreoDueno} valor=${f.correo} onCambio=${v => pon({ correo: v })} />`}
      ${!olvido && html`<${CampoClave} titulo="Contraseña" valor=${f.clave} onCambio=${v => pon({ clave: v })} onEnter=${enviar} />`}
      ${olvido && html`<span class="sub" style="line-height:1.45">Le mandamos al correo del dueño un enlace para poner una contraseña nueva.</span>`}
      <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${enviar}>${ocupado ? 'Un momento…' : olvido ? 'Mandar el enlace' : 'Entrar'}</button>
      <button type="button" class="olvide-pin toca" onClick=${() => setOlvido(!olvido)}>${olvido ? 'Volver' : 'Olvidé mi contraseña'}</button>
      ${!olvido && html`<div class="pila" style="gap:8px;padding-top:14px;margin-top:2px;align-items:stretch">
        <span class="sub" style="text-align:center">¿No es tu negocio?</span>
        <div class="pila" style="gap:8px">
          <button type="button" class="btn2 toca" style="min-height:46px;border-radius:23px" onClick=${() => setModo('otra')}>Entrar con otra cuenta</button>
          <button type="button" class="btn2 toca" style="min-height:46px;border-radius:23px" onClick=${() => setModo('nueva')}>Crear cuenta nueva</button>
        </div></div>`}
    </div></div>`;
}

// ---------- Hoy: aviso de la suscripción (solo cuando hace falta) ----------
export function AvisoPlan() {
  const { S, abrir, puede } = useApp();
  const N = useNube(), ep = S.negocio && S.negocio.nubeId ? estadoPlan(N.plan) : null;
  if (!ep || !puede('ajustes')) return null;
  const ver = (ep.k === 'prueba' && ep.dias <= 4) || ep.k === 'gracia' || ep.k === 'vencida' || (ep.k === 'activa' && ep.dias != null && ep.dias <= 3);
  if (!ver) return null;
  const txt = ep.k === 'vencida' ? 'Tu suscripción venció: ves todo, pero no se guardan cambios nuevos.' : ep.k === 'gracia' ? 'Tu suscripción venció. Te quedan ' + ep.dias + (ep.dias === 1 ? ' día' : ' días') + ' de gracia.' : ep.k === 'prueba' ? 'Tu prueba gratis termina en ' + ep.dias + (ep.dias === 1 ? ' día' : ' días') + '.' : 'Tu suscripción vence en ' + ep.dias + (ep.dias === 1 ? ' día' : ' días') + '.';
  return html`<button type="button" class=${'aviso-plan toca entra ' + (ep.k === 'vencida' ? 'rojo' : 'ambar')} onClick=${() => configCobro().then(cfg => abrir('pagar', { cfg, plan: S.negocio.escala === 'empresa' ? 'empresa' : 'negocio' })).catch(er => avisar(er.message))}>
    <${Icono} n="tarjeta" t=${18} /><span class="crece">${txt}</span><b>Pagar</b></button>`;
}

// Términos nuevos (o cuentas creadas antes de que existieran): el dueño los acepta una vez para seguir.
export function AceptarTerminos() {
  const { yo } = useApp();
  const N = useNube();
  const [ok, setOk] = useState(false), [ocupado, setOcupado] = useState(false);
  if (!faltaAceptar(N.sesion) || !yo || yo.rol !== 'dueno') return null;
  const primera = !(N.sesion.user_metadata || {}).acepto_terminos;
  const aceptar = async () => {
    if (!ok) { avisar('Marca la casilla para aceptar'); return; }
    setOcupado(true);
    try { await aceptarTerminos(); avisar('Gracias: términos aceptados'); } catch (er) { avisar(er.message); setOcupado(false); }
  };
  return html`<div class="velo-terminos entra" role="dialog" aria-modal="true" aria-label="Términos de uso">
    <div class="tarjeta pila" style="max-width:440px;width:100%;gap:14px;padding:24px">
      <span class="ic t-vio" style="width:46px;height:46px;border-radius:14px"><${Icono} n="escudo" t=${22} /></span>
      <b style="font-size:20px;letter-spacing:-0.02em">${primera ? 'Nuestros términos y privacidad' : 'Actualizamos nuestros términos'}</b>
      <span class="sub" style="line-height:1.5">Te contamos qué datos guarda Orbe, para qué y qué puedes hacer con ellos. En resumen: tus datos son tuyos, no los vendemos, puedes descargarlos o borrarlos cuando quieras, y los recibos de Orbe son comprobantes no fiscales.</span>
      <div class="chips"><a class="btn2 chico toca" style="text-decoration:none" href="terminos.html" target="_blank" rel="noopener">Leer los términos</a><a class="btn2 chico toca" style="text-decoration:none" href="privacidad.html" target="_blank" rel="noopener">Leer la privacidad</a></div>
      <label class="fila toca" style="gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" checked=${ok} onChange=${e => setOk(e.target.checked)} style="width:22px;height:22px;margin-top:1px;accent-color:var(--accent);flex:none" /><span style="font-size:14px;line-height:1.45">Leí y acepto los Términos de uso y la Política de privacidad</span></label>
      <button type="button" class=${'btn toca' + (ok && !ocupado ? '' : ' apagado')} onClick=${aceptar}>${ocupado ? 'Guardando…' : 'Aceptar y seguir'}</button>
    </div></div>`;
}

// Negocio suspendido por Orbe: no se puede usar ni guardar en la nube. Nada se borra; el dueño puede llevarse sus datos.
export function CuentaSuspendida() {
  const { S, yo } = useApp();
  const N = useNube(), motivo = N.plan && N.plan.suspendido_motivo;
  const dueno = yo && yo.rol === 'dueno';
  return html`<div class="velo-terminos entra" style="background:var(--bg)" role="alert">
    <div class="tarjeta pila" style="max-width:440px;width:100%;gap:14px;padding:26px;text-align:center;align-items:center">
      <span class="ic t-ros" style="width:56px;height:56px;border-radius:18px"><${Icono} n="candado" t=${26} /></span>
      <b style="font-size:21px;letter-spacing:-0.02em">Esta cuenta está suspendida</b>
      <span class="sub" style="line-height:1.5">${S.negocio.nombre} no puede usar Orbe por ahora.${motivo ? html`<br /><b style="color:var(--ink)">Motivo:</b> ${motivo}` : ''}</span>
      <span class="sub" style="line-height:1.5">Tus datos no se borraron. Escríbenos para resolverlo: <a href="mailto:orbeappsoficial@gmail.com" style="color:var(--accent-text);font-weight:600">orbeappsoficial@gmail.com</a></span>
      ${dueno && html`<div class="chips" style="justify-content:center"><button type="button" class="btn2 chico toca" onClick=${() => { descargar('orbe-negocios-copia-' + new Date().toISOString().slice(0, 10) + '.json', exportar(), 'application/json'); avisar('Copia descargada'); }}>Descargar mis datos</button><button type="button" class="btn2 chico toca" onClick=${() => { descargar('orbe-ventas.csv', ventasCSV(0, Date.now() + 1), 'text/csv;charset=utf-8'); avisar('Excel descargado'); }}>Ventas en Excel</button></div>`}
      <button type="button" class="olvide-pin toca" onClick=${() => cerrarSesion().then(() => avisar('Sesión cerrada'))}>Cerrar sesión</button>
    </div></div>`;
}
