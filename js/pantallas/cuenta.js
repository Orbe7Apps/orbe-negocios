// Cuenta y nube: crear cuenta, iniciar sesión, recuperar la contraseña, unir el negocio a la cuenta,
// ver si todo está guardado y la suscripción (pagar y avisar «Ya pagué»).
import { html, useState, useEffect } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { cambiarNegocio, leer } from '../datos.js';
import { Hoja, Icono, avisar, hace } from '../ui.js';
import { numero } from './pagos.js';
import { useNube, crearCuenta, entrarCuenta, olvideClave, nuevaClave, cerrarSesion, misNegocios, subirNegocio, bajarNegocio, sincronizar, configCobro, misPagos, reportarPago, estadoPlan } from '../nube.js';

// Formulario de correo y contraseña (crear, entrar u olvidé).
function FormCuenta({ modo, setModo, f, pon }) {
  return html`<div class="pila" style="gap:12px">
    <div class="segmento" style="width:100%">${[['crear', 'Crear cuenta'], ['entrar', 'Ya tengo cuenta']].map(o => html`<button type="button" style="flex:1" class=${modo === o[0] || (modo === 'olvido' && o[0] === 'entrar') ? 'on' : ''} onClick=${() => setModo(o[0])}>${o[1]}</button>`)}</div>
    <label class="campo"><span>Correo</span><input type="email" inputmode="email" autocomplete="email" value=${f.correo} placeholder="tu@correo.com" onInput=${e => pon({ correo: e.target.value })} /></label>
    ${modo !== 'olvido' && html`<label class="campo"><span>Contraseña${modo === 'crear' ? ' (al menos 8 caracteres)' : ''}</span><input type="password" autocomplete=${modo === 'crear' ? 'new-password' : 'current-password'} value=${f.clave} placeholder="••••••••" onInput=${e => pon({ clave: e.target.value })} /></label>`}
    ${modo === 'entrar' && html`<button type="button" class="olvide-pin toca" style="align-self:flex-start;padding-left:0" onClick=${() => setModo('olvido')}>Olvidé mi contraseña</button>`}
    ${modo === 'olvido' && html`<span class="sub" style="line-height:1.45">Te mandamos un enlace a tu correo para poner una contraseña nueva.</span>`}
  </div>`;
}
const correoOk = x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.trim());

// ---------- hoja: guardar el negocio en la nube (crear cuenta o iniciar sesión) ----------
export function Cuenta({ d, cerrar }) {
  const { S } = useApp();
  const N = useNube();
  const [modo, setModo] = useState(d.modo || 'crear');
  const [f, setF] = useState({ correo: '', clave: '' });
  const [paso, setPaso] = useState(N.sesion ? 'unir' : 'form'); // form · confirmar · unir · listo
  const [cuenta, setCuenta] = useState(null); // negocios que ya tiene la cuenta
  const [ocupado, setOcupado] = useState(false);
  const pon = o => setF(x => Object.assign({}, x, o));
  useEffect(() => { if (paso === 'unir') misNegocios().then(setCuenta).catch(er => avisar(er.message)); }, [paso]);
  const hacer = async fn => { setOcupado(true); try { await fn(); } catch (er) { avisar(er.message); } finally { setOcupado(false); } };
  const enviar = () => hacer(async () => {
    if (!correoOk(f.correo)) throw new Error('Escribe un correo válido');
    if (modo === 'olvido') { await olvideClave(f.correo); avisar('Listo: revisa tu correo'); setModo('entrar'); return; }
    if (f.clave.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
    if (modo === 'crear') { const r = await crearCuenta(f.correo, f.clave); if (r.confirmar) { setPaso('confirmar'); return; } }
    else await entrarCuenta(f.correo, f.clave);
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
      : html`<span class="sub" style="line-height:1.45">Sesión iniciada como <b>${N.correo}</b>.</span>
        <button type="button" class=${'guia-btn toca' + (ocupado ? ' apagado' : '')} onClick=${() => subir(c)}><${Icono} n="subir" t=${18} /><span class="crece"><b>Guardar «${S.negocio.nombre}» en mi cuenta</b><br /><span class="sub" style="font-weight:500">Sube lo que tienes en este aparato</span></span></button>
        ${cuenta.length > 0 && html`<span class="titulo-funciones">O usar uno que ya está en tu cuenta</span>${cuenta.map(g => html`<button type="button" key=${g.id} class=${'guia-btn toca' + (ocupado ? ' apagado' : '')} onClick=${() => bajar(c, g)}><${Icono} n="descarga" t=${18} /><span class="crece"><b>${g.nombre}</b><br /><span class="sub" style="font-weight:500">Reemplaza lo de este aparato (se guarda una copia antes)</span></span></button>`)}`}`}`
    : html`
      ${d.inicio && html`<div class="pila" style="gap:8px">${[['escudo', 'Si pierdes o cambias el teléfono, no pierdes nada'], ['movil', 'Úsalo en varios aparatos con los mismos datos'], ['wifi', 'Sigue funcionando sin internet: se guarda al volver la conexión']].map(x => html`<span class="fila" style="gap:10px;font-size:14px"><span class="ic t-ver" style="width:30px;height:30px;border-radius:10px"><${Icono} n=${x[0]} t=${15} /></span>${x[1]}</span>`)}</div>`}
      <${FormCuenta} modo=${modo} setModo=${setModo} f=${f} pon=${pon} />`,
    pie: paso === 'form' ? html`<button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${enviar}>${ocupado ? 'Un momento…' : modo === 'crear' ? 'Crear cuenta' : modo === 'olvido' ? 'Mandar el enlace' : 'Iniciar sesión'}</button>
        <button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => omitir(c)}>Ahora no</button>`
      : html`<button type="button" class="btn2 toca" style="min-height:50px;border-radius:25px" onClick=${() => paso === 'confirmar' ? (setModo('entrar'), setPaso('form')) : c()}>${paso === 'confirmar' ? 'Ya lo confirmé: iniciar sesión' : 'Listo'}</button>`
  })} />`;
}

// ---------- hoja: contraseña nueva (al volver del enlace del correo) ----------
export function NuevaClave({ cerrar }) {
  const [clave, setClave] = useState('');
  const guardar = async c => { if (clave.length < 8) { avisar('Usa al menos 8 caracteres'); return; } try { await nuevaClave(clave); c(() => avisar('Contraseña cambiada')); } catch (er) { avisar(er.message); } };
  return html`<${Hoja} titulo="Contraseña nueva" onCerrar=${cerrar} contenido=${c => ({
    cuerpo: html`<label class="campo"><span>Escribe tu contraseña nueva (al menos 8 caracteres)</span><input type="password" autocomplete="new-password" value=${clave} onInput=${e => setClave(e.target.value)} /></label>`,
    pie: html`<button type="button" class="btn toca" onClick=${() => guardar(c)}>Guardar</button>`
  })} />`;
}

// ---------- Ajustes → Cuenta y nube ----------
export function CuentaTema() {
  const { S, abrir } = useApp();
  const N = useNube(), unido = S.negocio && S.negocio.nubeId;
  const ESTADO = { 'al día': ['Todo guardado en la nube', 'var(--in-text)'], sincronizando: ['Guardando…', 'var(--accent-text)'], pendiente: ['Faltan cambios por subir', 'var(--amber-text)'], 'sin internet': ['Sin internet: se sube al volver', 'var(--amber-text)'], error: [N.error || 'No se pudo guardar', 'var(--out-text)'], 'sin sesión': ['Inicia sesión para seguir guardando', 'var(--amber-text)'], apagada: ['Solo en este aparato', 'var(--muted)'] };
  const e = ESTADO[N.estado] || ESTADO.apagada;
  if (!N.sesion || !unido) return html`
    <p class="sub" style="margin:0 0 10px;line-height:1.5">${unido ? 'Inicia sesión para seguir guardando tu negocio en la nube.' : 'Hoy tu negocio está guardado solo en este aparato. Con una cuenta queda en la nube: no se pierde si cambias de teléfono y lo usas en varios aparatos.'}</p>
    <div class="chips"><button type="button" class="btn2 chico lleno toca" onClick=${() => abrir('cuenta', { modo: N.sesion || unido ? 'entrar' : 'crear' })}>${N.sesion ? 'Guardar este negocio en mi cuenta' : unido ? 'Iniciar sesión' : 'Crear cuenta o iniciar sesión'}</button></div>`;
  return html`
    <div class="fila" style="gap:12px;padding:4px 0 10px"><span class="ic t-ver" style="width:42px;height:42px;border-radius:13px"><${Icono} n=${N.estado === 'al día' ? 'check' : 'wifi'} t=${19} /></span>
      <span class="crece" style="display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">${N.correo}</b><span class="sub" style=${{ color: e[1], fontWeight: 600 }}>${e[0]}</span></span></div>
    <div class="fila" style="justify-content:space-between;padding:10px 0;border-top:1px solid var(--line);font-size:14px"><span class="muted">Última vez</span><b style="font-weight:600">${N.ultima ? hace(N.ultima) + ' · ' + new Date(N.ultima).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' }) : '—'}</b></div>
    <div class="fila" style="justify-content:space-between;padding:10px 0;border-top:1px solid var(--line);font-size:14px"><span class="muted">Cambios por subir</span><b style="font-weight:600">${N.pendientes}</b></div>
    <div class="chips" style="margin-top:10px"><button type="button" class="btn2 chico acento toca" onClick=${() => { sincronizar(); avisar('Guardando en la nube…'); }}>Guardar ahora</button>
      <button type="button" class="btn2 chico toca" onClick=${() => abrir('confirmar', { titulo: '¿Cerrar sesión?', texto: 'Este aparato deja de guardar en la nube hasta que vuelvas a entrar. Lo que hay aquí se queda.', boton: 'Cerrar sesión', si: () => cerrarSesion().then(() => avisar('Sesión cerrada')) })}>Cerrar sesión</button></div>`;
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
    ${cfg && html`<div class="chips" style="margin-top:10px"><button type="button" class="btn2 chico lleno toca" onClick=${() => abrir('pagar', { cfg, plan: planSug })}>Pagar mi suscripción</button></div>`}
    ${cfg && html`<span class="titulo-funciones" style="margin-top:14px">Precios</span>
      ${['negocio', 'empresa'].map(k => cfg.precios[k] && html`<div class="fila" style="justify-content:space-between;padding:10px 0;border-top:1px solid var(--line);font-size:14px"><span><b>${PLANES[k]}</b><span class="sub"> · ${k === 'negocio' ? 'un local' : 'varias sedes'}</span></span><span class="num"><b>US$ ${cfg.precios[k].mes}</b>/mes · US$ ${cfg.precios[k].anio}/año</span></div>`)}`}
    ${pagos && pagos.length > 0 && html`<span class="titulo-funciones" style="margin-top:14px">Tus pagos</span>
      ${pagos.map(p => html`<div class="fila" key=${p.id} style="justify-content:space-between;padding:10px 0;border-top:1px solid var(--line);font-size:13px"><span>${new Date(p.creado).toLocaleDateString('es')} · ${p.metodo} · ${p.moneda} ${p.monto}</span><span class=${'pildora ' + (p.estado === 'aprobado' ? 't-ver' : p.estado === 'rechazado' ? 't-ros' : 't-amb')}>${p.estado === 'pendiente' ? 'Por confirmar' : p.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}</span></div>`)}`}`;
}

// ---------- hoja: pagar y avisar «Ya pagué» ----------
export function Pagar({ d, cerrar }) {
  const { D, P } = useApp();
  const cfg = d.cfg, pm = cfg.pago_movil || {};
  const [f, setF] = useState({ plan: d.plan || 'negocio', meses: 1, metodo: pm.telefono ? 'Pago Móvil' : cfg.binance ? 'Binance' : 'Efectivo', referencia: '', nota: '' });
  const pon = o => setF(x => Object.assign({}, x, o));
  const usd = (cfg.precios[f.plan] || {})[f.meses === 12 ? 'anio' : 'mes'] || 0;
  const enBs = P.id === 'VE' && pm.telefono ? D.redondo(usd * D.tasa) : 0;
  const monto = f.metodo === 'Pago Móvil' && enBs ? enBs : usd, moneda = f.metodo === 'Pago Móvil' && enBs ? 'VES' : f.metodo === 'Binance' ? 'USDT' : 'USD';
  const copiar = x => { try { navigator.clipboard.writeText(x); avisar('Copiado'); } catch (e) { avisar(x); } };
  const Dato = (k, v) => v ? html`<div class="fila" style="justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line)"><span class="sub">${k}</span><button type="button" class="fila toca" style="gap:6px;border:0;background:none;color:var(--ink);font:inherit;font-weight:600" onClick=${() => copiar(v)}>${v}<${Icono} n="doc" t=${14} c="var(--accent-text)" /></button></div>` : null;
  const enviar = async c => {
    if (f.metodo !== 'Efectivo' && !f.referencia.trim()) { avisar('Escribe la referencia del pago'); return; }
    try { await reportarPago({ plan: f.plan, meses: f.meses, monto, moneda, metodo: f.metodo, referencia: f.referencia, nota: f.nota }); c(() => avisar('Listo: te avisamos cuando lo confirmemos')); }
    catch (er) { avisar(er.message); }
  };
  return html`<${Hoja} titulo="Pagar mi suscripción" onCerrar=${cerrar} contenido=${c => ({
    cuerpo: html`
      <div class="segmento" style="width:100%">${[['negocio', 'Negocio'], ['empresa', 'Empresa']].map(o => html`<button type="button" style="flex:1" class=${f.plan === o[0] ? 'on' : ''} onClick=${() => pon({ plan: o[0] })}>${o[1]}</button>`)}</div>
      <div class="segmento" style="width:100%">${[[1, 'Un mes'], [12, 'Un año (2 meses gratis)']].map(o => html`<button type="button" style="flex:1" class=${f.meses === o[0] ? 'on' : ''} onClick=${() => pon({ meses: o[0] })}>${o[1]}</button>`)}</div>
      <div class="tasa-hoy" style="padding:14px"><span class="sub">A pagar</span><b class="num">US$ ${usd}</b>${enBs ? html`<span class="sub num">o Bs ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(enBs)} por Pago Móvil (tasa BCV de hoy)</span>` : null}</div>
      <div class="campo"><span>¿Cómo pagas?</span><div class="chips">${['Pago Móvil', 'Binance', 'Efectivo'].filter(m => m !== 'Pago Móvil' || pm.telefono).filter(m => m !== 'Binance' || cfg.binance).map(m => html`<button type="button" class=${'chip chico toca' + (f.metodo === m ? ' on' : '')} onClick=${() => pon({ metodo: m })}>${m}</button>`)}</div></div>
      ${f.metodo === 'Pago Móvil' && html`<div class="pila" style="gap:0">${Dato('Banco', pm.banco)}${Dato('Teléfono', pm.telefono)}${Dato('Cédula o RIF', pm.documento)}${Dato('Monto', 'Bs ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(enBs))}</div>`}
      ${f.metodo === 'Binance' && html`<div class="pila" style="gap:0">${Dato('Binance Pay ID', cfg.binance)}${Dato('Monto', usd + ' USDT')}</div>`}
      ${f.metodo === 'Efectivo' && html`<span class="sub" style="line-height:1.45">Págalo en persona y avisa aquí para que lo registremos.</span>`}
      ${f.metodo !== 'Efectivo' && html`<label class="campo"><span>Referencia del pago</span><input type="text" value=${f.referencia} placeholder=${f.metodo === 'Binance' ? 'ID de la orden' : 'Últimos 4 a 6 números'} autocomplete="off" onInput=${e => pon({ referencia: e.target.value })} /></label>`}
      <label class="campo"><span>Nota (opcional)</span><input type="text" value=${f.nota} autocomplete="off" onInput=${e => pon({ nota: e.target.value })} /></label>`,
    pie: html`<button type="button" class="btn toca" onClick=${() => enviar(c)}>Ya pagué</button>`
  })} />`;
}

// ---------- bienvenida → «Ya tengo cuenta»: abrir mi negocio en este aparato ----------
export function EntrarInicio({ volver }) {
  const [modo, setModo] = useState('entrar');
  const [f, setF] = useState({ correo: '', clave: '' });
  const [lista, setLista] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const pon = o => setF(x => Object.assign({}, x, o));
  const hacer = async fn => { setOcupado(true); try { await fn(); } catch (er) { avisar(er.message); } finally { setOcupado(false); } };
  const enviar = () => hacer(async () => {
    if (!correoOk(f.correo)) throw new Error('Escribe un correo válido');
    if (modo === 'olvido') { await olvideClave(f.correo); avisar('Listo: revisa tu correo'); setModo('entrar'); return; }
    if (modo === 'crear') { setModo('entrar'); throw new Error('Para crear una cuenta nueva toca «Empezar»'); }
    await entrarCuenta(f.correo, f.clave);
    setLista(await misNegocios());
  });
  const abrirNeg = g => hacer(async () => { await bajarNegocio(g.id); avisar('Listo: ' + g.nombre); });
  return html`<div class="pila entra" style="gap:16px">
    <button type="button" class="icono-btn toca" aria-label="Atrás" onClick=${volver}><${Icono} n="atras" /></button>
    <h1 style="font-size:26px">${lista ? 'Elige tu negocio' : 'Entra a tu cuenta'}</h1>
    ${lista ? html`${lista.length ? lista.map(g => html`<button type="button" key=${g.id} class=${'guia-btn toca' + (ocupado ? ' apagado' : '')} onClick=${() => abrirNeg(g)}><${Icono} n="tienda" t=${18} /><span class="crece"><b>${g.nombre}</b></span><${Icono} n="sig" t=${15} c="var(--faint)" /></button>`)
      : html`<p class="vacio">Esta cuenta todavía no tiene negocios. Vuelve y toca «Empezar» para crear el tuyo.</p>`}
      ${ocupado && html`<p class="sub">Bajando tus datos…</p>`}`
    : html`<span class="sub" style="line-height:1.45">Con tu cuenta abres tu negocio en este aparato, con todas tus ventas, productos y clientes.</span>
      <label class="campo"><span>Correo</span><input type="email" inputmode="email" autocomplete="email" value=${f.correo} placeholder="tu@correo.com" onInput=${e => pon({ correo: e.target.value })} /></label>
      ${modo !== 'olvido' && html`<label class="campo"><span>Contraseña</span><input type="password" autocomplete="current-password" value=${f.clave} onInput=${e => pon({ clave: e.target.value })} /></label>`}
      <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${enviar}>${ocupado ? 'Un momento…' : modo === 'olvido' ? 'Mandar el enlace' : 'Entrar'}</button>
      <button type="button" class="olvide-pin toca" onClick=${() => setModo(modo === 'olvido' ? 'entrar' : 'olvido')}>${modo === 'olvido' ? 'Volver' : 'Olvidé mi contraseña'}</button>`}
  </div>`;
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
