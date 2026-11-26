// Panel de administración de Orbe (solo para administradores): pagos por revisar, negocios y datos de cobro.
// El servidor protege todo: si la cuenta no es administradora, no recibe ningún dato aunque abra esta página.
import { html, render, useState, useEffect } from './lib/preact-htm.js';
import { cliente, entrarCuenta, entrarUsuario, olvideClave, explicar, estadoPlan, leerEnlace, useNube, quitarAvisoEnlace } from './nube.js';
import { ClaveNueva, CampoClave } from './pantallas/cuenta.js';
import { Icono, Avisos, avisar, LogoOrbe } from './ui.js';

const fecha = t => t ? new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const ESTADO = { activa: ['Activa', 't-ver'], prueba: ['En prueba', 't-azu'], gracia: ['En gracia', 't-amb'], vencida: ['Vencida', 't-ros'], suspendida: ['Suspendida', 't-ros'] };

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

// ---------- verificación en dos pasos (obligatoria para administrar) ----------
// La contraseña sola no basta para el panel: también se pide el código de 6 números de una app de autenticación
// (Google Authenticator, Microsoft Authenticator, 1Password…). El servidor no entrega datos de administración sin él.
function CampoCodigo6({ valor, onCambio, onEnter }) {
  return html`<label class="campo"><span>Código de 6 números</span><input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="num" style="letter-spacing:.3em;font-size:22px;text-align:center" value=${valor} placeholder="000000" onInput=${e => onCambio(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown=${e => e.key === 'Enter' && onEnter()} /></label>`;
}
const salirDelPanel = async c => { await c.auth.signOut(); location.reload(); };

function PedirCodigo({ c, factorId, listo }) {
  const [codigo, setCodigo] = useState(''), [ocupado, setOcupado] = useState(false);
  const enviar = async () => {
    if (codigo.length !== 6) { avisar('Escribe los 6 números de tu app'); return; }
    setOcupado(true);
    const { error } = await c.auth.mfa.challengeAndVerify({ factorId, code: codigo });
    setOcupado(false);
    if (error) { setCodigo(''); avisar(/invalid|expired/i.test(error.message) ? 'Ese código no sirve: escribe el que sale ahora en tu app' : explicar(error)); return; }
    listo();
  };
  return html`<div class="tarjeta pila" style="max-width:420px;margin:12vh auto 0;padding:28px;gap:16px">
    <div class="fila" style="gap:12px"><${LogoOrbe} t=${40} /><span style="display:flex;flex-direction:column"><b style="font-size:17px">Verificación en dos pasos</b><span class="sub">Abre tu app de autenticación</span></span></div>
    <span class="sub" style="line-height:1.5">Escribe el código de 6 números que sale para “Orbe Negocios”. Cambia cada 30 segundos.</span>
    <${CampoCodigo6} valor=${codigo} onCambio=${setCodigo} onEnter=${enviar} />
    <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${enviar}>${ocupado ? 'Revisando…' : 'Entrar al panel'}</button>
    <button type="button" class="olvide-pin toca" onClick=${() => salirDelPanel(c)}>Salir</button>
  </div>`;
}

function ActivarDosPasos({ c, listo }) {
  const [f, setF] = useState(null), [codigo, setCodigo] = useState(''), [ocupado, setOcupado] = useState(false), [verClave, setVerClave] = useState(false);
  useEffect(() => { (async () => {
    // Si quedó un intento a medias (sin verificar), se borra y se empieza de nuevo.
    const { data: l } = await c.auth.mfa.listFactors();
    for (const x of ((l && l.all) || []).filter(x => x.status !== 'verified')) await c.auth.mfa.unenroll({ factorId: x.id });
    const { data, error } = await c.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Orbe admin ' + new Date().toISOString().slice(0, 10), issuer: 'Orbe Negocios' });
    if (error) { avisar(explicar(error)); setF(false); return; }
    setF(data);
  })().catch(er => { avisar(explicar(er)); setF(false); }); }, []);
  const verificar = async () => {
    if (codigo.length !== 6) { avisar('Escribe los 6 números de tu app'); return; }
    setOcupado(true);
    const { error } = await c.auth.mfa.challengeAndVerify({ factorId: f.id, code: codigo });
    setOcupado(false);
    if (error) { setCodigo(''); avisar(/invalid|expired/i.test(error.message) ? 'Ese código no sirve: escribe el que sale ahora en tu app' : explicar(error)); return; }
    avisar('Listo: la verificación en dos pasos quedó activada', 'ok');
    listo();
  };
  const qr = f && f.totp && typeof f.totp.qr_code === 'string' && /^data:image\/svg\+xml/.test(f.totp.qr_code) ? f.totp.qr_code : '';
  return html`<div class="tarjeta pila" style="max-width:460px;margin:8vh auto 0;padding:28px;gap:14px">
    <div class="fila" style="gap:12px"><${LogoOrbe} t=${40} /><span style="display:flex;flex-direction:column"><b style="font-size:17px">Activa la verificación en dos pasos</b><span class="sub">Obligatoria para el panel de administración</span></span></div>
    <span class="sub" style="line-height:1.5">Desde aquí se aprueban pagos y se ven todos los negocios. Para que nadie entre solo con tu contraseña, cada vez se pedirá también un código de tu teléfono.</span>
    ${f === null ? html`<p class="vacio">Preparando…</p>` : f === false ? html`<p class="vacio">No se pudo empezar. Recarga la página.</p>` : html`
      <div class="pila" style="gap:8px">${[['1', 'Instala en tu teléfono Google Authenticator o Microsoft Authenticator (gratis).'], ['2', 'En la app toca “+” y escanea este código.'], ['3', 'Escribe abajo los 6 números que te muestra.']].map(x => html`<span class="fila" style="gap:10px;font-size:14px;line-height:1.4"><span class="paso-n">${x[0]}</span>${x[1]}</span>`)}</div>
      ${qr && html`<div style="align-self:center;background:#fff;padding:12px;border-radius:16px"><img src=${qr} alt="Código QR para tu app de autenticación" width="190" height="190" style="display:block" /></div>`}
      <button type="button" class="olvide-pin toca" style="align-self:center" onClick=${() => setVerClave(!verClave)}>${verClave ? 'Ocultar la clave' : '¿No puedes escanear? Ver la clave para escribirla'}</button>
      ${verClave && html`<b class="num" style="align-self:center;font-size:15px;letter-spacing:.08em;word-break:break-all;text-align:center">${f.totp.secret}</b>`}
      <${CampoCodigo6} valor=${codigo} onCambio=${setCodigo} onEnter=${verificar} />
      <button type="button" class=${'btn toca' + (ocupado ? ' apagado' : '')} onClick=${verificar}>${ocupado ? 'Revisando…' : 'Activar y entrar'}</button>`}
    <button type="button" class="olvide-pin toca" onClick=${() => salirDelPanel(c)}>Salir</button>
  </div>`;
}

function Panel({ c, correo }) {
  const [tab, setTab] = useState('pagos');
  const [negocios, setNegocios] = useState(null), [pagos, setPagos] = useState(null), [cfg, setCfg] = useState(null);
  const cargar = async () => {
    const [n, p, k] = await Promise.all([c.rpc('admin_negocios'), c.from('pagos').select('id, negocio_id, negocio_nombre, cliente_correo, factura, plan, meses, monto, moneda, metodo, referencia, nota, estado, creado, revisado').order('creado', { ascending: false }).limit(1000), c.rpc('admin_config')]);
    if (n.error) { avisar(explicar(n.error)); return; }
    setNegocios(n.data || []); setPagos(p.data || []); setCfg(k.data);
  };
  useEffect(() => { cargar(); const r = setInterval(cargar, 30000); return () => clearInterval(r); }, []);
  const nombre = id => ((negocios || []).find(g => g.id === id) || {});
  // Nombre del negocio del pago (si el cliente borró su cuenta, queda el nombre que tenía al pagar).
  const quien = p => nombre(p.negocio_id).nombre || p.negocio_nombre || 'Cuenta borrada';
  const fac = p => p.factura && p.factura.rif ? p.factura : null;
  const revisar = async (p, ok) => {
    if (!confirm((ok ? '¿Aprobar' : '¿Rechazar') + ' el pago de ' + quien(p) + ' por ' + p.moneda + ' ' + p.monto + '?')) return;
    const { error } = await c.rpc('revisar_pago', { pago: p.id, aprobar: ok });
    if (error) avisar(explicar(error)); else { avisar(ok ? 'Pago aprobado: su suscripción se extendió' : 'Pago rechazado'); cargar(); }
  };
  const activar = async (g, plan, meses) => {
    if (!confirm('¿Activar ' + g.nombre + ' con plan ' + plan + ' por ' + meses + (meses === 1 ? ' mes' : ' meses') + '?')) return;
    const { error } = await c.rpc('activar_negocio', { n: g.id, plan, meses });
    if (error) avisar(explicar(error)); else { avisar('Activado'); cargar(); }
  };
  // Suspender: el negocio no puede usar Orbe ni guardar en la nube hasta que lo reactives. Nada se borra.
  const suspender = async (g, si) => {
    let motivo = null;
    if (si) { motivo = prompt('¿Por qué suspendes “' + g.nombre + '”? El dueño verá este motivo (puedes dejarlo vacío).', 'Falta de pago'); if (motivo === null) return; }
    else if (!confirm('¿Reactivar “' + g.nombre + '”? Podrá volver a usar Orbe de inmediato.')) return;
    const { error } = await c.rpc('suspender_negocio', { n: g.id, suspender: si, motivo });
    if (error) avisar(explicar(error)); else { avisar(si ? 'Cuenta suspendida' : 'Cuenta reactivada'); cargar(); }
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
        <span class="crece" style="display:flex;flex-direction:column;gap:3px;min-width:220px"><b style="font-size:16px">${quien(p)}</b><span class="sub">${nombre(p.negocio_id).correo || p.cliente_correo || ''}</span>
          ${fac(p) && html`<span class="sub"><span class="pildora t-azu">Pide factura</span> ${fac(p).razon} · ${fac(p).rif}</span>`}
          <span class="sub">${fecha(p.creado)} · plan ${p.plan} · ${p.meses === 12 ? '1 año' : '1 mes'}${p.nota ? ' · “' + p.nota + '”' : ''}</span></span>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:3px"><b class="num" style="font-size:20px">${p.moneda} ${Number(p.monto).toFixed(2)}</b><span class="sub">${p.metodo}${p.referencia ? ' · ref. ' + p.referencia : ''}</span></span>
        <span class="fila" style="gap:8px"><button type="button" class="btn2 chico rojo toca" onClick=${() => revisar(p, false)}>Rechazar</button><button type="button" class="btn2 chico lleno toca" onClick=${() => revisar(p, true)}><${Icono} n="check" t=${14} g=${3} />Aprobar</button></span>
      </div>`)}</div>` : html`<p class="vacio">No hay pagos por revisar. Esta página se actualiza sola cada 30 segundos.</p>`)}

    ${tab === 'negocios' && html`<div class="tabla-caja"><table class="tabla"><thead><tr><th>Negocio</th><th>Dueño</th><th>Estado</th><th>Hasta</th><th>Creado</th><th>Último movimiento</th><th class="der">Activar a mano</th></tr></thead>
      <tbody>${(negocios || []).map((g, i) => { const e = estados[i]; return html`<tr key=${g.id}><td><b>${g.nombre}</b><br /><span class="sub">${g.plan}</span><br />${g.suspendido_en ? html`<button type="button" class="btn2 chico lleno toca" style="margin-top:6px" onClick=${() => suspender(g, false)}>Reactivar</button>` : html`<button type="button" class="btn2 chico rojo toca" style="margin-top:6px" onClick=${() => suspender(g, true)}>Suspender</button>`}</td><td class="muted">${g.correo}</td><td><span class=${'pildora ' + ESTADO[e.k][1]}>${ESTADO[e.k][0]}</span>${g.suspendido_en ? html`<br /><span class="sub">Desde el ${fecha(g.suspendido_en)}${g.suspendido_motivo ? ' · ' + g.suspendido_motivo : ''}</span>` : null}</td><td class="num">${fecha(e.hasta)}</td><td class="num muted">${fecha(g.creado)}</td><td class="num muted">${fecha(g.ultimo_cambio)}</td>
        <td class="der"><span class="fila" style="gap:6px;justify-content:flex-end">${[['negocio', 1, 'Negocio 1 mes'], ['empresa', 1, 'Empresa 1 mes'], ['negocio', 12, 'Negocio 1 año']].map(o => html`<button type="button" class="btn2 chico toca" onClick=${() => activar(g, o[0], o[1])}>${o[2]}</button>`)}</span></td></tr>`; })}</tbody></table>
      ${negocios && !negocios.length && html`<p class="vacio">Todavía no hay negocios con cuenta.</p>`}</div>`}

    ${tab === 'historial' && html`<${Historial} pagos=${pagos || []} quien=${quien} fac=${fac} />`}

    ${tab === 'cobro' && cfg && html`<${Cobro} c=${c} cfg=${cfg} listo=${cargar} />`}
  </div>`;
}

// Historial por mes, con el total cobrado y el archivo para el contador.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const claveMes = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const nombreMes = k => MESES[Number(k.slice(5)) - 1] + ' ' + k.slice(0, 4);
function Historial({ pagos, quien, fac }) {
  const meses = Array.from(new Set(pagos.map(p => claveMes(p.revisado || p.creado)).concat([claveMes(Date.now())]))).sort().reverse();
  const [mes, setMes] = useState(meses[0]);
  const delMes = pagos.filter(p => claveMes(p.revisado || p.creado) === mes);
  const aprobados = delMes.filter(p => p.estado === 'aprobado');
  const total = aprobados.reduce((a, p) => { a[p.moneda] = (a[p.moneda] || 0) + Number(p.monto); return a; }, {});
  const csv = () => {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const filas = [['Fecha de pago', 'Fecha aprobado', 'Negocio', 'Correo', 'Plan', 'Período', 'Método', 'Referencia', 'Moneda', 'Monto', 'Estado', 'Pide factura', 'RIF o cédula', 'Razón social', 'Dirección fiscal']]
      .concat(delMes.map(p => { const f = fac(p) || {}; return [new Date(p.creado).toLocaleDateString('es-VE'), p.revisado ? new Date(p.revisado).toLocaleDateString('es-VE') : '', quien(p), p.cliente_correo || '', p.plan, p.meses === 12 ? '1 año' : '1 mes', p.metodo, p.referencia || '', p.moneda, Number(p.monto).toFixed(2).replace('.', ','), p.estado, f.rif ? 'Sí' : 'No', f.rif || '', f.razon || '', f.dir || '']; }));
    const blob = new Blob(['\ufeff' + filas.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'orbe-cobros-' + mes + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    avisar('Listo: se descargó el archivo de ' + nombreMes(mes));
  };
  return html`<div class="pila" style="gap:14px">
    <div class="fila" style="gap:10px;flex-wrap:wrap">
      <select value=${mes} onChange=${e => setMes(e.target.value)} style="min-height:42px;border-radius:12px;border:1.5px solid var(--line);background:var(--fill2);padding:0 12px;font:inherit;color:var(--ink)">${meses.map(k => html`<option value=${k}>${nombreMes(k)}</option>`)}</select>
      <span class="crece sub">Cobrado en ${nombreMes(mes)}: <b style="color:var(--ink)">${Object.keys(total).length ? Object.keys(total).map(m => m + ' ' + total[m].toFixed(2)).join(' · ') : 'nada'}</b> · ${aprobados.length} ${aprobados.length === 1 ? 'pago' : 'pagos'}${aprobados.filter(fac).length ? ' · ' + aprobados.filter(fac).length + ' piden factura' : ''}</span>
      <button type="button" class="btn2 chico lleno toca" onClick=${csv}><${Icono} n="doc" t=${14} />Descargar para el contador</button></div>
    <div class="tabla-caja"><table class="tabla"><thead><tr><th>Fecha</th><th>Negocio</th><th>Plan</th><th>Método</th><th class="der">Monto</th><th>Estado</th><th>Factura</th></tr></thead>
      <tbody>${delMes.map(p => html`<tr key=${p.id}><td class="num">${fecha(p.creado)}</td><td>${quien(p)}</td><td>${p.plan} · ${p.meses === 12 ? 'año' : 'mes'}</td><td>${p.metodo}${p.referencia ? ' · ' + p.referencia : ''}</td><td class="der num">${p.moneda} ${Number(p.monto).toFixed(2)}</td><td><span class=${'pildora ' + (p.estado === 'aprobado' ? 't-ver' : p.estado === 'rechazado' ? 't-ros' : 't-amb')}>${p.estado}</span></td><td class="muted">${fac(p) ? fac(p).razon + ' · ' + fac(p).rif : '—'}</td></tr>`)}</tbody></table>
      ${!delMes.length && html`<p class="vacio">No hubo pagos en ${nombreMes(mes)}.</p>`}</div>
  </div>`;
}

// Precios y datos que ven los clientes al pagar.
function Cobro({ c, cfg, listo }) {
  const pm = cfg.pago_movil || {};
  const em = cfg.emisor || {};
  const [f, setF] = useState({ erazon: em.razon || '', erif: em.rif || '', edir: em.dir || '', eimp: em.imprenta || '', banco: pm.banco || '', telefono: pm.telefono || '', documento: pm.documento || '', binance: cfg.binance || '', soporte: cfg.soporte || '',
    nm: String(cfg.precios.negocio.mes), na: String(cfg.precios.negocio.anio), em: String(cfg.precios.empresa.mes), ea: String(cfg.precios.empresa.anio) });
  const pon = o => setF(x => Object.assign({}, x, o));
  const guardar = async () => {
    const n = x => Number(String(x).replace(',', '.')) || 0;
    const precios = { negocio: { mes: n(f.nm), anio: n(f.na) }, empresa: { mes: n(f.em), anio: n(f.ea) }, moneda: 'USD' };
    const { error } = await c.rpc('guardar_config', { precios, pago_movil: { banco: f.banco.trim(), telefono: f.telefono.trim(), documento: f.documento.trim() }, binance: f.binance, soporte: f.soporte, emisor: { razon: f.erazon.trim(), rif: f.erif.trim().toUpperCase(), dir: f.edir.trim(), imprenta: f.eimp.trim() } });
    if (error) avisar(explicar(error)); else { avisar('Guardado: así lo ven tus clientes al pagar'); listo(); }
  };
  const Campo = (k, n, ph) => html`<label class="campo"><span>${n}</span><input type="text" value=${f[k]} placeholder=${ph || ''} onInput=${e => pon({ [k]: e.target.value })} /></label>`;
  return html`<div class="dos-uno" style="align-items:start">
    <section class="tarjeta pila" style="gap:14px"><b>Pago Móvil</b><span class="sub" style="line-height:1.45">Guardado y oculto: por ahora los clientes solo pagan por Binance. Nadie más puede leer estos datos.</span>${Campo('banco', 'Banco', 'Ej.: Banesco (0134)')}${Campo('telefono', 'Teléfono', '0414-0000000')}${Campo('documento', 'Cédula o RIF', 'V-12345678')}
      <b style="margin-top:6px">Binance</b>${Campo('binance', 'Binance Pay ID', 'Ej.: 123456789')}
      <b style="margin-top:6px">Soporte</b>${Campo('soporte', 'WhatsApp de soporte', '0414-0000000')}</section>
    <section class="tarjeta pila" style="gap:14px"><b>Precios (US$)</b>
      <div class="rejilla-2" style="gap:10px">${Campo('nm', 'Negocio · mes')}${Campo('na', 'Negocio · año')}${Campo('em', 'Empresa · mes')}${Campo('ea', 'Empresa · año')}</div>
      <span class="sub">Por ahora los clientes pagan en USDT por Binance.</span>
      <b style="margin-top:6px">Tus datos para facturar</b>
      <span class="sub" style="line-height:1.45">Los clientes no los ven. Sirven para cuando te formalices: con qué nombre y RIF facturas, y tu imprenta digital.</span>
      ${Campo('erazon', 'Nombre o razón social', 'Ej.: Orbe Apps, C.A.')}${Campo('erif', 'RIF', 'J-12345678-9')}${Campo('edir', 'Dirección fiscal')}${Campo('eimp', 'Imprenta digital o máquina fiscal', 'Cuando la tengas')}
      <button type="button" class="btn toca" onClick=${guardar}>Guardar</button></section>
  </div>`;
}

function App() {
  const [c, setC] = useState(null), [estado, setEstado] = useState('cargando'), [correo, setCorreo] = useState(''), [factor, setFactor] = useState('');
  const N = useNube();
  useEffect(() => { if (N.avisoEnlace) { avisar(N.avisoEnlace); quitarAvisoEnlace(); } }, [N.avisoEnlace]);
  const revisar = async () => {
    const cl = await cliente(); setC(cl);
    await leerEnlace().catch(er => avisar(explicar(er)));
    const { data: { session } } = await cl.auth.getSession();
    if (!session) { setEstado('entrar'); return; }
    setCorreo(session.user.email);
    const { data, error } = await cl.rpc('estado_admin_orbe');
    if (error) throw error;
    if (data === 'ok') { setEstado('admin'); return; }
    if (data !== 'falta_mfa') { setEstado('no'); return; }
    // Administrador sin el segundo paso: si ya tiene su app configurada se pide el código; si no, se configura.
    const { data: l } = await cl.auth.mfa.listFactors();
    const lista = ((l && l.totp) || []).filter(x => x.status === 'verified');
    if (lista.length) { setFactor(lista[0].id); setEstado('codigo'); } else setEstado('activar');
  };
  useEffect(() => { revisar().catch(er => { avisar(explicar(er)); setEstado('entrar'); }); }, []);
  // Al volver del enlace “Olvidé mi contraseña”: primero la contraseña nueva; luego se revisa de nuevo la cuenta.
  useEffect(() => { if (!N.recuperar && estado !== 'cargando') revisar(); }, [N.recuperar]);
  if (N.recuperar) return html`<${ClaveNueva} /><${Avisos} />`;
  return html`${estado === 'cargando' ? html`<p class="vacio" style="margin-top:20vh">Cargando…</p>`
    : estado === 'entrar' ? html`<${Entrar} listo=${revisar} />`
    : estado === 'codigo' ? html`<${PedirCodigo} c=${c} factorId=${factor} listo=${revisar} />`
    : estado === 'activar' ? html`<${ActivarDosPasos} c=${c} listo=${revisar} />`
    : estado === 'no' ? html`<div class="tarjeta pila" style="max-width:420px;margin:12vh auto 0;padding:28px;gap:12px;text-align:center"><b>Esta cuenta no es administradora</b><span class="sub">${correo}</span><button type="button" class="btn2 toca" onClick=${async () => { await c.auth.signOut(); location.reload(); }}>Salir</button></div>`
    : html`<${Panel} c=${c} correo=${correo} />`}<${Avisos} />`;
}
document.documentElement.classList.add('pc');
render(html`<${App} />`, document.getElementById('app'));
