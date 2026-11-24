// Orbe en la nube (Supabase): cuenta, sincronización entre aparatos y suscripción.
// La app sigue funcionando sin internet: cada cambio queda en una lista de pendientes y se sube al volver la conexión.
// La seguridad la pone el servidor: cada cuenta solo ve y cambia los negocios donde es miembro (y si la suscripción
// venció, solo puede ver). La clave de abajo es pública a propósito: sin una sesión válida no da acceso a nada.
import { useState, useEffect } from './lib/preact-htm.js';
import { leer, alCambiar, aplicarRemoto, restaurar, idDispositivo, cambiarNegocio, salir, guardarCita, citaActiva } from './datos.js';
import { pais, dinero } from './paises.js';
import { horarioDe } from './horario.js';
import { avisar } from './ui.js';

const URL_NUBE = 'https://cwjmstctrxrcisfbknam.supabase.co';
const CLAVE_PUBLICA = 'sb_publishable_x95K8o7WAhVtldQrU3fnGw_nbcVSEGE';
const LIB = new URL('./lib/supabase.min.js', import.meta.url).href;

// Lo que se sincroniza: colecciones (un registro por elemento) y datos sueltos del negocio.
// «ajustes» no se sube: el perfil que está usando el aparato y el tema son de cada aparato.
const COLS = ['productos', 'clientes', 'ventas', 'abonos', 'gastos', 'cierres', 'ordenes', 'cotizaciones', 'citas', 'solicitudes', 'movCaja', 'turnos', 'promos', 'perfiles', 'roles', 'grupos', 'registro', 'historialTasas'];
const OBJS = ['negocio', 'tasa', 'tasas'];
// En estas se recortan los viejos (no es que se borren): no se avisa borrado.
const SIN_BORRAR = ['registro', 'historialTasas'];
const idDe = (col, x) => col === 'registro' ? String(x.h || x.t) : col === 'historialTasas' ? x.dia + '|' + x.f : x && x.id != null ? String(x.id) : '';

// ---------- estado de la nube (para la pantalla) ----------
let E = { sesion: null, correo: '', usuario: '', negocioId: '', estado: 'apagada', pendientes: 0, ultima: 0, error: '', plan: null, admin: false, recuperar: false, avisoEnlace: '' };
const subs = new Set();
const poner = o => { E = Object.assign({}, E, o); subs.forEach(f => f(E)); };
export const estadoNube = () => E;
export function useNube() {
  const [, f] = useState(0);
  useEffect(() => { const g = () => f(x => x + 1); subs.add(g); return () => subs.delete(g); }, []);
  return E;
}

// ---------- cliente de Supabase (se carga solo cuando hace falta) ----------
let sb = null;
const cargar = src => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la nube')); document.head.appendChild(s); });
export async function cliente() {
  if (sb) return sb;
  if (!window.supabase) await cargar(LIB);
  sb = window.supabase.createClient(URL_NUBE, CLAVE_PUBLICA, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'orbe-negocios-sesion' } });
  sb.auth.onAuthStateChange((ev, s) => {
    poner({ sesion: s ? s.user : null, correo: s && s.user ? s.user.email : '', usuario: s && s.user ? ((s.user.user_metadata || {}).usuario || '') : '' });
    if (ev === 'PASSWORD_RECOVERY') poner({ recuperar: true });
  });
  return sb;
}
// Mensajes de error en palabras simples.
export function explicar(er) {
  const m = String((er && (er.message || er.error_description)) || er || '');
  if (/Invalid login credentials/i.test(m)) return 'El correo o la contraseña no coinciden';
  if (/Email not confirmed/i.test(m)) return 'Primero confirma tu correo: te mandamos un enlace';
  if (/already registered|already been registered/i.test(m)) return 'Ese correo ya tiene cuenta: inicia sesión';
  if (/Password should be at least|weak/i.test(m)) return 'La contraseña es muy corta: usa al menos 8 caracteres';
  if (/Database error saving new user|Ese usuario ya existe/i.test(m)) return 'Ese usuario ya existe: elige otro';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera unos minutos';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sin conexión con la nube. Revisa tu internet';
  if (/row-level security|permission denied/i.test(m)) return 'Tu suscripción no permite guardar cambios ahora';
  return m || 'Algo salió mal';
}

// ---------- cuenta ----------
const vuelta = () => location.origin + location.pathname;
// Al volver del enlace del correo: se abre la sesión que trae y, si es para cambiar la contraseña, se pide la nueva.
export async function leerEnlace() {
  let h = ''; try { h = sessionStorage.getItem('orbe-enlace') || ''; sessionStorage.removeItem('orbe-enlace'); } catch (e) { /* sin almacenamiento */ }
  if (!h) return null;
  const q = new URLSearchParams(h);
  if (q.get('error_description') || q.get('error')) {
    const venc = /expired|invalid/i.test(q.get('error_code') + ' ' + q.get('error_description'));
    const txt = venc ? 'Ese enlace ya venció o ya se usó. Pide uno nuevo con «Olvidé mi contraseña».' : 'No se pudo abrir el enlace: ' + q.get('error_description');
    poner({ avisoEnlace: txt }); return 'error';
  }
  const c = await cliente();
  const { error } = await c.auth.setSession({ access_token: q.get('access_token'), refresh_token: q.get('refresh_token') });
  if (error) { poner({ avisoEnlace: explicar(error) }); return 'error'; }
  if (q.get('type') === 'recovery') { poner({ recuperar: true }); return 'recuperar'; }
  poner({ avisoEnlace: 'Listo: tu correo quedó confirmado' });
  return 'confirmado';
}
export const yaHayEnlace = () => { try { return !!sessionStorage.getItem('orbe-enlace'); } catch (e) { return false; } };
// ¿Hay una sesión guardada en este navegador? (sirve sin internet: no pregunta al servidor)
export const haySesionGuardada = () => { try { return !!localStorage.getItem('orbe-negocios-sesion'); } catch (e) { return false; } };
// Este aparato deja de usar el negocio que tenía (para entrar con otra cuenta o crear una nueva): se olvida lo pendiente de subir.
export function olvidarNegocioLocal() { pend.clear(); guardarPend(); parar(); poner({ negocioId: '', pendientes: 0, plan: null }); try { localStorage.removeItem('orbe-nube-plan'); } catch (e) { /* sin almacenamiento */ } }
// Mientras se revisa que la cuenta sea de este negocio, la app sigue en «Entra a tu cuenta».
export const verificandoCuenta = v => poner({ verificando: !!v });
export const terminarRecuperar = () => poner({ recuperar: false });
export const quitarAvisoEnlace = () => poner({ avisoEnlace: '' });
// El usuario: de 3 a 30 letras, números, punto, guion o guion bajo (sin espacios ni acentos).
export const usuarioOk = u => /^[a-z0-9._-]{3,30}$/.test(String(u || '').trim().toLowerCase());
export async function crearCuenta(correo, clave, usuario) {
  const c = await cliente(), u = String(usuario || '').trim().toLowerCase();
  if (u) {
    const { data: libre, error: e1 } = await c.rpc('usuario_libre', { u });
    if (e1) throw new Error(explicar(e1));
    if (!libre) throw new Error('Ese usuario ya existe: elige otro');
  }
  const { data, error } = await c.auth.signUp({ email: correo.trim(), password: clave, options: { emailRedirectTo: vuelta(), data: Object.assign({ acepto_terminos: new Date().toISOString() }, u ? { usuario: u } : {}) } });
  if (error) throw new Error(explicar(error));
  // Si el proyecto pide confirmar el correo, no hay sesión todavía.
  return { confirmar: !data.session };
}
// Entrar con el usuario (o con el correo, si lo escribe el dueño): el servidor revisa la contraseña y no muestra el correo.
export async function entrarUsuario(usuario, clave) {
  const x = String(usuario || '').trim();
  if (!x) throw new Error('Escribe tu usuario');
  if (x.includes('@')) return entrarCuenta(x, clave);
  const c = await cliente();
  const { data, error } = await c.rpc('correo_para_entrar', { u: x, clave });
  if (error) throw new Error(explicar(error));
  return entrarCuenta(data, clave);
}
// Ponerle usuario a la cuenta (las cuentas creadas antes de que existiera).
export async function ponerUsuario(u) {
  const c = await cliente();
  const { data, error } = await c.rpc('poner_usuario', { u });
  if (error) throw new Error(explicar(error));
  await c.auth.refreshSession();
  poner({ usuario: data });
  return data;
}
export async function entrarCuenta(correo, clave) {
  const c = await cliente();
  const { error } = await c.auth.signInWithPassword({ email: correo.trim(), password: clave });
  if (error) throw new Error(explicar(error));
  // Después de la cuenta, cada persona elige su perfil y pone su PIN (nunca se entra directo con el último perfil).
  if (leer().negocio) salir();
  return true;
}
export async function olvideClave(correo) {
  const c = await cliente();
  const { error } = await c.auth.resetPasswordForEmail(correo.trim(), { redirectTo: vuelta() });
  if (error) throw new Error(explicar(error));
}
export async function nuevaClave(clave) {
  const c = await cliente();
  const { error } = await c.auth.updateUser({ password: clave });
  if (error) throw new Error(explicar(error));
}
export async function cerrarSesion() {
  const c = await cliente(); await c.auth.signOut();
  if (leer().negocio) salir();
  parar(); poner({ sesion: null, correo: '', negocioId: '', estado: 'apagada', plan: null, admin: false });
}
// Borrar la cuenta y todos sus datos en la nube (los negocios de los que es dueño, con todo lo que tienen).
// Antes se confirma la contraseña, para que nadie lo haga con un teléfono prestado.
export async function borrarMiCuenta(clave) {
  const c = await cliente(), { data: { session } } = await c.auth.getSession();
  if (!session) throw new Error('Inicia sesión primero');
  const { error: e1 } = await c.auth.signInWithPassword({ email: session.user.email, password: clave });
  if (e1) throw new Error('La contraseña no es correcta');
  const { error } = await c.rpc('borrar_mi_cuenta');
  if (error) throw new Error(explicar(error));
  parar(); pend.clear(); guardarPend();
  try { await c.auth.signOut({ scope: 'local' }); } catch (e) { /* la cuenta ya no existe */ }
  poner({ sesion: null, correo: '', usuario: '', negocioId: '', estado: 'apagada', plan: null, admin: false, pendientes: 0 });
}
// Los negocios de esta cuenta (para elegir cuál bajar en un aparato nuevo).
export async function misNegocios() {
  const c = await cliente();
  const { data, error } = await c.from('negocios').select('id, nombre, plan, prueba_hasta, pagado_hasta, creado').order('creado');
  if (error) throw new Error(explicar(error));
  return data || [];
}

// ---------- pendientes (lo que falta subir) ----------
// Se guarda solo qué cambió («ventas|v123»); al subir se toma el valor de ese momento.
const CLAVE_PEND = 'orbe-nube-pendientes';
let pend = new Set();
try { pend = new Set(JSON.parse(localStorage.getItem(CLAVE_PEND) || '[]')); } catch (e) { pend = new Set(); }
const guardarPend = () => { try { localStorage.setItem(CLAVE_PEND, JSON.stringify([...pend])); } catch (e) { /* sin espacio */ } poner({ pendientes: pend.size }); };
function marcarTodo() {
  const S = leer();
  COLS.forEach(col => (S[col] || []).forEach(x => { const id = idDe(col, x); if (id) pend.add(col + '|' + id); }));
  OBJS.forEach(k => { if (S[k]) pend.add('obj|' + k); });
  guardarPend();
}
// Al cambiar algo en la app: se anotan los registros que cambiaron (y los que se quitaron).
alCambiar((antes, ahora) => {
  if (!ahora.negocio || !ahora.negocio.nubeId) return;
  let hubo = false;
  COLS.forEach(col => {
    const a = antes[col] || [], b = ahora[col] || [];
    if (a === b) return;
    const previos = new Map(a.map(x => [idDe(col, x), x]));
    b.forEach(x => { const id = idDe(col, x); if (id && previos.get(id) !== x) { pend.add(col + '|' + id); hubo = true; } previos.delete(id); });
    if (!SIN_BORRAR.includes(col)) previos.forEach((x, id) => { if (id) { pend.add(col + '|' + id + '|x'); hubo = true; } });
  });
  OBJS.forEach(k => { if (antes[k] !== ahora[k]) { pend.add('obj|' + k); hubo = true; } });
  if (hubo) { guardarPend(); pronto(); }
});

// ---------- subir y bajar ----------
const cursorClave = nid => 'orbe-nube-cursor-' + nid;
let ocupado = false, reloj = 0, cadaRato = 0;
const pronto = () => { clearTimeout(reloj); reloj = setTimeout(sincronizar, 1500); };

async function subir(c, nid) {
  if (!pend.size) return;
  const S = leer(), dv = idDispositivo(), filas = [];
  [...pend].forEach(k => {
    const [col, id, x] = k.split('|');
    if (col === 'obj') { if (S[id] != null) filas.push({ k, fila: { negocio_id: nid, col: 'obj', id, datos: S[id], borrado: false, dispositivo: dv } }); else pend.delete(k); return; }
    const el = (S[col] || []).find(y => idDe(col, y) === id);
    if (x === 'x' || !el) filas.push({ k, fila: { negocio_id: nid, col, id, datos: el || {}, borrado: !el, dispositivo: dv } });
    else filas.push({ k, fila: { negocio_id: nid, col, id, datos: el, borrado: false, dispositivo: dv } });
  });
  // De a poco: lotes de hasta ~400 KB (las fotos y el logo pesan).
  let lote = [], peso = 0;
  const enviar = async () => {
    if (!lote.length) return;
    const { error } = await c.from('registros').upsert(lote.map(x => x.fila), { onConflict: 'negocio_id,col,id' });
    if (error) throw error;
    lote.forEach(x => pend.delete(x.k)); guardarPend(); lote = []; peso = 0;
  };
  for (const x of filas) {
    const p = JSON.stringify(x.fila.datos).length;
    if (lote.length && (peso + p > 400000 || lote.length >= 300)) await enviar();
    lote.push(x); peso += p;
  }
  await enviar();
}

async function bajar(c, nid) {
  const dv = idDispositivo();
  let cursor = '1970-01-01T00:00:00Z';
  try { cursor = localStorage.getItem(cursorClave(nid)) || cursor; } catch (e) { /* sin cursor */ }
  for (let vueltas = 0; vueltas < 50; vueltas++) {
    const { data, error } = await c.from('registros').select('col, id, datos, borrado, actualizado, dispositivo')
      .eq('negocio_id', nid).gt('actualizado', cursor).order('actualizado').limit(500);
    if (error) throw error;
    if (!data || !data.length) break;
    // Lo que subió este mismo aparato ya está aquí; lo que tiene pendiente aquí manda (se sube después).
    const ajenos = data.filter(r => r.dispositivo !== dv && !pend.has(r.col + '|' + r.id) && !pend.has(r.col + '|' + r.id + '|x') && !(r.col === 'obj' && pend.has('obj|' + r.id)));
    if (ajenos.length) aplicarRemoto(s => mezclar(s, ajenos));
    cursor = data[data.length - 1].actualizado;
    try { localStorage.setItem(cursorClave(nid), cursor); } catch (e) { /* sin espacio */ }
    if (data.length < 500) break;
  }
}
// Junta lo que llegó con lo que hay: por id, reemplaza, agrega o quita.
function mezclar(s, filas) {
  const out = {};
  filas.forEach(r => {
    if (r.col === 'obj') { if (OBJS.includes(r.id) && !r.borrado) out[r.id] = r.id === 'negocio' ? Object.assign({}, r.datos, { nubeId: (s.negocio && s.negocio.nubeId) || r.datos.nubeId }) : r.datos; return; }
    if (!COLS.includes(r.col)) return;
    const lista = out[r.col] || (out[r.col] = (s[r.col] || []).slice());
    const i = lista.findIndex(x => idDe(r.col, x) === r.id);
    if (r.borrado) { if (i >= 0) lista.splice(i, 1); }
    else if (i >= 0) lista[i] = r.datos; else lista.push(r.datos);
  });
  // Ventas, abonos, gastos y movimientos en orden de tiempo (pueden venir de varios aparatos).
  ['ventas', 'abonos', 'gastos', 'movCaja', 'registro', 'citas'].forEach(k => { if (out[k]) out[k].sort((a, b) => (a.t || 0) - (b.t || 0)); });
  return out;
}

// Plan y fechas de la suscripción (y si soy administrador de Orbe).
async function leerPlan(c, nid) {
  const { data } = await c.from('negocios').select('plan, prueba_hasta, pagado_hasta').eq('id', nid).maybeSingle();
  if (data) { poner({ plan: data }); try { localStorage.setItem('orbe-nube-plan', JSON.stringify(data)); } catch (e) { /* sin espacio */ } }
}

export async function sincronizar() {
  const S = leer(), nid = S.negocio && S.negocio.nubeId;
  if (!nid || ocupado) return;
  if (!navigator.onLine) { poner({ estado: 'sin internet' }); return; }
  ocupado = true; poner({ estado: 'sincronizando', negocioId: nid });
  try {
    const c = await cliente();
    const { data: { session } } = await c.auth.getSession();
    if (!session) { poner({ estado: 'sin sesión' }); return; }
    await subir(c, nid);
    await bajar(c, nid);
    await leerPlan(c, nid);
    await traerReservas(c, nid).catch(() => {});
    await publicarSiCambio(c, nid).catch(() => {});
    poner({ estado: pend.size ? 'pendiente' : 'al día', ultima: Date.now(), error: '' });
  } catch (er) {
    poner({ estado: 'error', error: explicar(er) });
  } finally { ocupado = false; }
}
function parar() { clearInterval(cadaRato); cadaRato = 0; }
function arrancar() {
  if (cadaRato) return;
  cadaRato = setInterval(() => { if (document.visibilityState === 'visible') sincronizar(); }, 25000);
  window.addEventListener('online', sincronizar);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
  sincronizar();
}

// ---------- link de reservas ----------
// Lo que ve la página pública: servicios, profesionales (solo el nombre), horarios, vacaciones y horas ocupadas.
// Nunca nombres ni teléfonos de los clientes.
export function datosReserva(S) {
  const n = S.negocio, P = pais(n.pais), D = dinero(P, S.tasa.valor), ahora = Date.now();
  const pros = S.perfiles.filter(p => !p.inactivo && !p.borrado && p.citas !== false);
  const srv = S.productos.filter(p => !p.borrado && p.q == null && p.dur > 0 && p.web !== false).slice(0, 80).map(p => ({ id: p.id, n: p.n, p: D.m(p.p), dur: p.dur || 30, g: p.g || '' }));
  return {
    nombre: n.nombre, logo: n.logo && n.logo.length < 120000 ? n.logo : '', tel: n.tel || '', pais: P.id, dir: n.dir || '',
    servicios: srv, pros: pros.map(p => ({ id: p.id, n: p.n.split(' ')[0], h: horarioDe(S, p.id), aus: (p.aus || []).filter(a => a.hasta + 86400000 > ahora).map(a => ({ desde: a.desde, hasta: a.hasta })) })),
    horario: horarioDe(S, ''),
    ocupado: (S.citas || []).filter(c => citaActiva(c) && c.t + (c.dur || 30) * 60000 > ahora && c.t < ahora + 62 * 86400000).map(c => ({ pro: c.pro || '', t: c.t, dur: c.dur || 30 }))
  };
}
export async function publicarReservas(conf) {
  const c = await cliente(), S = leer(), nid = S.negocio.nubeId;
  if (!nid) throw new Error('Primero guarda tu negocio en la nube (Más → Cuenta y nube)');
  const datos = datosReserva(S);
  const { data, error } = await c.rpc('publicar_reservas', { n: nid, slug: conf.slug, activa: conf.activa, datos });
  if (error) throw new Error(explicar(error));
  try { localStorage.setItem('orbe-reservas-firma', JSON.stringify(datos)); } catch (e) { /* sin espacio */ }
  return data;
}
// Si la página está activa y algo cambió (citas, servicios, horarios), se vuelve a publicar sola.
async function publicarSiCambio(c, nid) {
  const S = leer(), conf = S.negocio.reservas;
  if (!conf || !conf.activa || !conf.slug) return;
  const datos = datosReserva(S), firma = JSON.stringify(datos);
  let antes = ''; try { antes = localStorage.getItem('orbe-reservas-firma') || ''; } catch (e) { /* sin almacenamiento */ }
  if (firma === antes) return;
  const { error } = await c.rpc('publicar_reservas', { n: nid, slug: conf.slug, activa: true, datos });
  if (!error) try { localStorage.setItem('orbe-reservas-firma', firma); } catch (e) { /* sin espacio */ }
}
// Las reservas que llegaron por el link pasan a la agenda (con el mismo id en todos los aparatos) y se borran de la nube.
async function traerReservas(c, nid) {
  const S = leer(); if (!S.negocio.reservas || !S.negocio.reservas.slug) return;
  const { data, error } = await c.from('reservas').select('id, datos, creado').eq('negocio_id', nid).order('creado').limit(50);
  if (error || !data || !data.length) return;
  data.forEach(r => {
    const x = r.datos, id = 'rw' + r.id.replace(/-/g, '').slice(0, 14);
    if (!(leer().citas || []).some(ci => ci.id === id)) guardarCita({ id, t: Number(x.t), dur: Number(x.dur) || 30, srv: Array.isArray(x.srv) ? x.srv : [], pro: x.pro || '', nom: x.nom || 'Cliente', tel: x.tel || '', nota: x.nota || '', estado: 'pendiente', web: true });
  });
  await c.from('reservas').delete().in('id', data.map(r => r.id));
  const x = data[data.length - 1].datos;
  avisar(data.length === 1 ? 'Nueva reserva por tu link: ' + String(x.nom || '').split(' ')[0] + ' · ' + new Date(Number(x.t)).toLocaleString('es', { weekday: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : data.length + ' reservas nuevas por tu link', 'ok');
}

// ---------- unir este negocio con la cuenta ----------
// Sube el negocio de este aparato a la cuenta (crea el negocio en la nube y marca todo para subir).
export async function subirNegocio() {
  const c = await cliente(), S = leer();
  const { data, error } = await c.rpc('crear_negocio', { nombre: S.negocio.nombre });
  if (error) throw new Error(explicar(error));
  cambiarNegocio({ nubeId: data });
  try { localStorage.setItem(cursorClave(data), new Date().toISOString()); } catch (e) { /* sin cursor */ }
  marcarTodo(); poner({ negocioId: data });
  arrancar();
  return data;
}
// Baja un negocio de la nube a este aparato (aparato nuevo o teléfono perdido).
export async function bajarNegocio(nid) {
  const c = await cliente(), d = { negocio: null, ventas: [], productos: [], clientes: [] };
  let desde = 0;
  for (;;) {
    const { data, error } = await c.from('registros').select('col, id, datos, borrado').eq('negocio_id', nid).eq('borrado', false).order('actualizado').range(desde, desde + 999);
    if (error) throw new Error(explicar(error));
    (data || []).forEach(r => { if (r.col === 'obj') d[r.id] = r.datos; else if (COLS.includes(r.col)) (d[r.col] || (d[r.col] = [])).push(r.datos); });
    if (!data || data.length < 1000) break;
    desde += 1000;
  }
  if (!d.negocio) throw new Error('Ese negocio todavía no tiene datos en la nube');
  ['ventas', 'abonos', 'gastos', 'movCaja', 'registro', 'citas'].forEach(k => { if (d[k]) d[k].sort((a, b) => (a.t || 0) - (b.t || 0)); });
  d.negocio = Object.assign({}, d.negocio, { nubeId: nid });
  pend.clear(); guardarPend();
  const ok = await restaurar(d);
  if (!ok) throw new Error('No se pudo abrir ese negocio');
  try { localStorage.setItem(cursorClave(nid), new Date().toISOString()); } catch (e) { /* sin cursor */ }
  poner({ negocioId: nid });
  salir();
  arrancar();
}

// ---------- suscripción ----------
export async function configCobro() {
  const c = await cliente();
  const { data, error } = await c.from('config_orbe').select('precios, pago_movil, binance, soporte').eq('id', 1).maybeSingle();
  if (error) throw new Error(explicar(error));
  return data;
}
export async function misPagos() {
  const c = await cliente(), nid = leer().negocio.nubeId;
  const { data, error } = await c.from('pagos').select('id, plan, meses, monto, moneda, metodo, referencia, estado, creado, revisado').eq('negocio_id', nid).order('creado', { ascending: false }).limit(20);
  if (error) throw new Error(explicar(error));
  return data || [];
}
export async function reportarPago(p) {
  const c = await cliente(), nid = leer().negocio.nubeId;
  const { error } = await c.rpc('reportar_pago', { n: nid, plan: p.plan, meses: p.meses, monto: p.monto, moneda: p.moneda, metodo: p.metodo, referencia: p.referencia || '', nota: p.nota || '', factura: p.factura || {} });
  if (error) throw new Error(explicar(error));
}
// Estado de la suscripción en palabras: prueba, activa, en gracia (7 días) o vencida (solo lectura).
export function estadoPlan(plan) {
  if (!plan) return null;
  const ahora = Date.now(), prueba = new Date(plan.prueba_hasta).getTime(), pagado = plan.pagado_hasta ? new Date(plan.pagado_hasta).getTime() : 0, DIA = 86400000;
  if (plan.plan === 'cortesia') return { k: 'activa', txt: 'Cortesía', dias: null };
  if (pagado > ahora) return { k: 'activa', txt: 'Activa', hasta: pagado, dias: Math.ceil((pagado - ahora) / DIA) };
  if (prueba > ahora) return { k: 'prueba', txt: 'Prueba gratis', hasta: prueba, dias: Math.ceil((prueba - ahora) / DIA) };
  if (pagado && pagado + 7 * DIA > ahora) return { k: 'gracia', txt: 'Venció: días de gracia', hasta: pagado + 7 * DIA, dias: Math.ceil((pagado + 7 * DIA - ahora) / DIA) };
  return { k: 'vencida', txt: 'Vencida: solo lectura', hasta: Math.max(prueba, pagado), dias: 0 };
}

// ---------- al abrir la app ----------
// Si este negocio ya está en la nube y hay sesión guardada, se sincroniza solo.
export async function iniciarNube() {
  try { const p = JSON.parse(localStorage.getItem('orbe-nube-plan') || 'null'); if (p) poner({ plan: p }); } catch (e) { /* sin plan guardado */ }
  poner({ pendientes: pend.size });
  const S = leer();
  // Volver de «olvidé mi contraseña» o de confirmar el correo trae la sesión en la dirección: hay que cargar la nube.
  const conToken = yaHayEnlace();
  if (conToken) { try { await leerEnlace(); } catch (e) { poner({ avisoEnlace: 'No se pudo abrir el enlace: revisa tu internet' }); } }
  if (!(S.negocio && S.negocio.nubeId) && !conToken && !localStorage.getItem('orbe-negocios-sesion')) return;
  try {
    const c = await cliente();
    const { data: { session } } = await c.auth.getSession();
    poner({ sesion: session ? session.user : null, correo: session ? session.user.email : '', usuario: session ? ((session.user.user_metadata || {}).usuario || '') : '', negocioId: (S.negocio && S.negocio.nubeId) || '' });
    if (session) { c.rpc('soy_admin_orbe').then(({ data }) => poner({ admin: !!data })); if (S.negocio && S.negocio.nubeId) arrancar(); }
  } catch (e) { poner({ estado: 'sin internet' }); }
}
