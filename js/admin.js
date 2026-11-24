// Panel de administración de Orbe (solo para administradores): pagos por revisar, negocios y datos de cobro.
// El servidor protege todo: si la cuenta no es administradora, no recibe ningún dato aunque abra esta página.
import { html, render, useState, useEffect } from './lib/preact-htm.js';
import { cliente, entrarCuenta, entrarUsuario, olvideClave, explicar, estadoPlan, leerEnlace, useNube, quitarAvisoEnlace } from './nube.js';
import { ClaveNueva, CampoClave } from './pantallas/cuenta.js';
import { Icono, Avisos, avisar, LogoOrbe } from './ui.js';

const fecha = t => t ? new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const ESTADO = { activa: ['Activa', 't-ver'], prueba: ['En prueba', 't-azu'], gracia: ['En gracia', 't-amb'], vencida: ['Vencida', 't-ros'] };

function Entrar({ listo }) {
  const [f, setF] = useState({ correo: '', clave: '' }), [olvido, setOlvido] = useState(false);
  const enviar = async () => {
    try {
      if (olvido) { await olvideClave(f.correo); avisar('Listo: revisa tu correo y abre el enlace en este aparato'); setOlvido(false); return; }
      await entrarUsuario(f.correo, f.clave); listo();
    } catch (er) { avisar(er.message); }
  };
  return html`<div class="tarjeta pila" style="max-width:420px;margin:12vh auto 0;padding:28px;gap:16px">
    <div class="fila" style="gap:12px"><${LogoOrbe} t=${40} /><span style="display:flex;flex-direction:column"><b style="font-size:17px">Orbe · Administración</b><span class="sub">${olvido ? 'Te mandamos un enlace para cambiar la contraseña' : 'Solo para administradores'}</span></span></div>
    <label class="campo"><span>${olvido ? 'Correo' : 'Usuario o correo'}</span><input type="text" autocomplete="username" autocapitalize="off" value=${f.correo} onInput=${e => setF(Object.assign({}, f, { correo: e.target.value }))} /></label>
    ${!olvido && html`<${CampoClave} titulo="Contraseña" valor=${f.clave} onCambio=${v => setF(Object.assign({}, f, { clave: v }))} onEnter=${enviar} />`}
    <button type="button" class="btn toca" onClick=${enviar}>${olvido ? 'Mandar el enlace' : 'Entrar'}</button>
    <button type="button" class="olvide-pin toca" onClick=${() => setOlvido(!olvido)}>${olvido ? 'Volver' : 'Olvidé mi contraseña'}</button>
  </div>`;
}

function Panel({ c, correo }) {
  const [tab, setTab] = useState('pagos');
  const [negocios, setNegocios] = useState(null), [pagos, setPagos] = useState(null), [cfg, setCfg] = useState(null);
  const cargar = async () => {
    const [n, p, k] = await Promise.all([c.rpc('admin_negocios'), c.from('pagos').select('id, negocio_id, plan, meses, monto, moneda, metodo, referencia, nota, estado, creado, revisado').order('creado', { ascending: false }).limit(200), c.from('config_orbe').select('*').eq('id', 1).maybeSingle()]);
    if (n.error) { avisar(explicar(n.error)); return; }
    setNegocios(n.data || []); setPagos(p.data || []); setCfg(k.data);
  };
  useEffect(() => { cargar(); const r = setInterval(cargar, 30000); return () => clearInterval(r); }, []);
  const nombre = id => ((negocios || []).find(g => g.id === id) || {});
  const revisar = async (p, ok) => {
    if (!confirm((ok ? '¿Aprobar' : '¿Rechazar') + ' el pago de ' + (nombre(p.negocio_id).nombre || '') + ' por ' + p.moneda + ' ' + p.monto + '?')) return;
    const { error } = await c.rpc('revisar_pago', { pago: p.id, aprobar: ok });
    if (error) avisar(explicar(error)); else { avisar(ok ? 'Pago aprobado: su suscripción se extendió' : 'Pago rechazado'); cargar(); }
  };
  const activar = async (g, plan, meses) => {
    if (!confirm('¿Activar ' + g.nombre + ' con plan ' + plan + ' por ' + meses + (meses === 1 ? ' mes' : ' meses') + '?')) return;
    const { error } = await c.rpc('activar_negocio', { n: g.id, plan, meses });
    if (error) avisar(explicar(error)); else { avisar('Activado'); cargar(); }
  };
  const pend = (pagos || []).filter(p => p.estado === 'pendiente');
  const mes0 = new Date(); mes0.setDate(1); mes0.setHours(0, 0, 0, 0);
  const cobradoMes = (pagos || []).filter(p => p.estado === 'aprobado' && new Date(p.revisado || p.creado) >= mes0).reduce((a, p) => { a[p.moneda] = (a[p.moneda] || 0) + Number(p.monto); return a; }, {});
  const estados = (negocios || []).map(g => estadoPlan(g) || { k: 'prueba' });
  const cuenta = k => estados.filter(e => e.k === k).length;

  return html`<div class="admin">
    <header class="fila" style="gap:12px;margin-bottom:18px"><${LogoOrbe} t=${36} /><span class="crece" style="display:flex;flex-direction:column"><b style="font-size:18px">Orbe · Administración</b><span class="sub">${correo}</span></span>
      <button type="button" class="btn2 chico toca" onClick=${async () => { await c.auth.signOut(); location.reload(); }}>Salir</button></header>
    <div class="cifras" style="margin-bottom:16px">${[['Pagos por revisar', pend.length, 'var(--amber)'], ['Negocios activos', cuenta('activa'), 'var(--in)'], ['En prueba', cuenta('prueba'), 'var(--accent)'], ['Vencidos o en gracia', cuenta('vencida') + cuenta('gracia'), 'var(--out)']].map(k => html`<div class="tarjeta cifra"><span class="sub">${k[0]}</span><b class="num" style=${{ fontSize: '26px', color: k[2] }}>${k[1]}</b></div>`)}</div>
    <div class="sub" style="margin:-6px 0 14px">Cobrado este mes: ${Object.keys(cobradoMes).length ? Object.keys(cobradoMes).map(m => m + ' ' + cobradoMes[m].toFixed(2)).join(' · ') : 'nada todavía'}</div>
    <div class="segmento" style="margin-bottom:14px">${[['pagos', 'Pagos por revisar' + (pend.length ? ' (' + pend.length + ')' : '')], ['negocios', 'Negocios'], ['historial', 'Historial de pagos'], ['cobro', 'Datos de cobro']].map(o => html`<button type="button" class=${tab === o[0] ? 'on' : ''} onClick=${() => setTab(o[0])}>${o[1]}</button>`)}</div>

    ${tab === 'pagos' && (pend.length ? html`<div class="pila" style="gap:10px">${pend.map(p => html`<div class="tarjeta fila" key=${p.id} style="gap:14px;flex-wrap:wrap">
        <span class="crece" style="display:flex;flex-direction:column;gap:3px;min-width:220px"><b style="font-size:16px">${nombre(p.negocio_id).nombre || 'Negocio'}</b><span class="sub">${nombre(p.negocio_id).correo || ''}</span>
          <span class="sub">${fecha(p.creado)} · plan ${p.plan} · ${p.meses === 12 ? '1 año' : '1 mes'}${p.nota ? ' · «' + p.nota + '»' : ''}</span></span>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:3px"><b class="num" style="font-size:20px">${p.moneda} ${Number(p.monto).toFixed(2)}</b><span class="sub">${p.metodo}${p.referencia ? ' · ref. ' + p.referencia : ''}</span></span>
        <span class="fila" style="gap:8px"><button type="button" class="btn2 chico rojo toca" onClick=${() => revisar(p, false)}>Rechazar</button><button type="button" class="btn2 chico lleno toca" onClick=${() => revisar(p, true)}><${Icono} n="check" t=${14} g=${3} />Aprobar</button></span>
      </div>`)}</div>` : html`<p class="vacio">No hay pagos por revisar. Esta página se actualiza sola cada 30 segundos.</p>`)}

    ${tab === 'negocios' && html`<div class="tabla-caja"><table class="tabla"><thead><tr><th>Negocio</th><th>Dueño</th><th>Estado</th><th>Hasta</th><th>Creado</th><th>Último movimiento</th><th class="der">Activar a mano</th></tr></thead>
      <tbody>${(negocios || []).map((g, i) => { const e = estados[i]; return html`<tr key=${g.id}><td><b>${g.nombre}</b><br /><span class="sub">${g.plan}</span></td><td class="muted">${g.correo}</td><td><span class=${'pildora ' + ESTADO[e.k][1]}>${ESTADO[e.k][0]}</span></td><td class="num">${fecha(e.hasta)}</td><td class="num muted">${fecha(g.creado)}</td><td class="num muted">${fecha(g.ultimo_cambio)}</td>
        <td class="der"><span class="fila" style="gap:6px;justify-content:flex-end">${[['negocio', 1, 'Negocio 1 mes'], ['empresa', 1, 'Empresa 1 mes'], ['negocio', 12, 'Negocio 1 año']].map(o => html`<button type="button" class="btn2 chico toca" onClick=${() => activar(g, o[0], o[1])}>${o[2]}</button>`)}</span></td></tr>`; })}</tbody></table>
      ${negocios && !negocios.length && html`<p class="vacio">Todavía no hay negocios con cuenta.</p>`}</div>`}

    ${tab === 'historial' && html`<div class="tabla-caja"><table class="tabla"><thead><tr><th>Fecha</th><th>Negocio</th><th>Plan</th><th>Método</th><th class="der">Monto</th><th>Estado</th></tr></thead>
      <tbody>${(pagos || []).map(p => html`<tr key=${p.id}><td class="num">${fecha(p.creado)}</td><td>${nombre(p.negocio_id).nombre || ''}</td><td>${p.plan} · ${p.meses === 12 ? 'año' : 'mes'}</td><td>${p.metodo}${p.referencia ? ' · ' + p.referencia : ''}</td><td class="der num">${p.moneda} ${Number(p.monto).toFixed(2)}</td><td><span class=${'pildora ' + (p.estado === 'aprobado' ? 't-ver' : p.estado === 'rechazado' ? 't-ros' : 't-amb')}>${p.estado}</span></td></tr>`)}</tbody></table></div>`}

    ${tab === 'cobro' && cfg && html`<${Cobro} c=${c} cfg=${cfg} listo=${cargar} />`}
  </div>`;
}

// Precios y datos que ven los clientes al pagar.
function Cobro({ c, cfg, listo }) {
  const pm = cfg.pago_movil || {};
  const [f, setF] = useState({ banco: pm.banco || '', telefono: pm.telefono || '', documento: pm.documento || '', binance: cfg.binance || '', soporte: cfg.soporte || '',
    nm: String(cfg.precios.negocio.mes), na: String(cfg.precios.negocio.anio), em: String(cfg.precios.empresa.mes), ea: String(cfg.precios.empresa.anio) });
  const pon = o => setF(x => Object.assign({}, x, o));
  const guardar = async () => {
    const n = x => Number(String(x).replace(',', '.')) || 0;
    const precios = { negocio: { mes: n(f.nm), anio: n(f.na) }, empresa: { mes: n(f.em), anio: n(f.ea) }, moneda: 'USD' };
    const { error } = await c.rpc('guardar_config', { precios, pago_movil: { banco: f.banco.trim(), telefono: f.telefono.trim(), documento: f.documento.trim() }, binance: f.binance, soporte: f.soporte });
    if (error) avisar(explicar(error)); else { avisar('Guardado: así lo ven tus clientes al pagar'); listo(); }
  };
  const Campo = (k, n, ph) => html`<label class="campo"><span>${n}</span><input type="text" value=${f[k]} placeholder=${ph || ''} onInput=${e => pon({ [k]: e.target.value })} /></label>`;
  return html`<div class="dos-uno" style="align-items:start">
    <section class="tarjeta pila" style="gap:14px"><b>Pago Móvil</b>${Campo('banco', 'Banco', 'Ej.: Banesco (0134)')}${Campo('telefono', 'Teléfono', '0414-0000000')}${Campo('documento', 'Cédula o RIF', 'V-12345678')}
      <b style="margin-top:6px">Binance</b>${Campo('binance', 'Binance Pay ID', 'Ej.: 123456789')}
      <b style="margin-top:6px">Soporte</b>${Campo('soporte', 'WhatsApp de soporte', '0414-0000000')}</section>
    <section class="tarjeta pila" style="gap:14px"><b>Precios (US$)</b>
      <div class="rejilla-2" style="gap:10px">${Campo('nm', 'Negocio · mes')}${Campo('na', 'Negocio · año')}${Campo('em', 'Empresa · mes')}${Campo('ea', 'Empresa · año')}</div>
      <span class="sub">Los clientes pagan en bolívares a la tasa BCV del día o en USDT por Binance.</span>
      <button type="button" class="btn toca" onClick=${guardar}>Guardar</button></section>
  </div>`;
}

function App() {
  const [c, setC] = useState(null), [estado, setEstado] = useState('cargando'), [correo, setCorreo] = useState('');
  const N = useNube();
  useEffect(() => { if (N.avisoEnlace) { avisar(N.avisoEnlace); quitarAvisoEnlace(); } }, [N.avisoEnlace]);
  const revisar = async () => {
    const cl = await cliente(); setC(cl);
    await leerEnlace().catch(er => avisar(explicar(er)));
    const { data: { session } } = await cl.auth.getSession();
    if (!session) { setEstado('entrar'); return; }
    setCorreo(session.user.email);
    const { data } = await cl.rpc('soy_admin_orbe');
    setEstado(data ? 'admin' : 'no');
  };
  useEffect(() => { revisar().catch(er => { avisar(explicar(er)); setEstado('entrar'); }); }, []);
  // Al volver del enlace «Olvidé mi contraseña»: primero la contraseña nueva; luego se revisa de nuevo la cuenta.
  useEffect(() => { if (!N.recuperar && estado !== 'cargando') revisar(); }, [N.recuperar]);
  if (N.recuperar) return html`<${ClaveNueva} /><${Avisos} />`;
  return html`${estado === 'cargando' ? html`<p class="vacio" style="margin-top:20vh">Cargando…</p>`
    : estado === 'entrar' ? html`<${Entrar} listo=${revisar} />`
    : estado === 'no' ? html`<div class="tarjeta pila" style="max-width:420px;margin:12vh auto 0;padding:28px;gap:12px;text-align:center"><b>Esta cuenta no es administradora</b><span class="sub">${correo}</span><button type="button" class="btn2 toca" onClick=${async () => { await c.auth.signOut(); location.reload(); }}>Salir</button></div>`
    : html`<${Panel} c=${c} correo=${correo} />`}<${Avisos} />`;
}
document.documentElement.classList.add('pc');
render(html`<${App} />`, document.getElementById('app'));
