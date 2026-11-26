// Ajustes → Link de reservas: el cliente agenda solo desde Instagram o WhatsApp, viendo las horas libres.
import { html, useState } from '../lib/preact-htm.js';
import { useApp } from '../ctx.js';
import { cambiarNegocio, guardarProducto, guardarPerfil, listaProductos } from '../datos.js';
import { useNube, publicarReservas } from '../nube.js';
import { Icono, Interruptor, avisar } from '../ui.js';
import { enlaceWA } from '../ordenpdf.js';

export const slugDe = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'mi-negocio';
export const urlReservas = slug => new URL('reservar.html?n=' + encodeURIComponent(slug), location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '')).href;

export function LinkReservas() {
  const { S, P, abrir } = useApp();
  const N = useNube(), n = S.negocio, conf = n.reservas || {};
  const [slug, setSlug] = useState(conf.slug || slugDe(n.nombre));
  const [ocupado, setOcupado] = useState(false);
  const enNube = !!n.nubeId && N.sesion;
  const srvs = listaProductos().filter(p => p.q == null && p.dur > 0), pros = S.perfiles.filter(p => !p.inactivo && !p.borrado);
  const guardar = async activa => {
    const s = slugDe(slug);
    if (s.length < 3) { avisar('El link lleva al menos 3 letras'); return; }
    setOcupado(true);
    try { const ok = await publicarReservas({ slug: s, activa }); cambiarNegocio({ reservas: { slug: ok, activa } }, activa ? 'Activó el link de reservas' : 'Apagó el link de reservas'); setSlug(ok); avisar(activa ? 'Listo: tu link de reservas está activo' : 'Link de reservas apagado'); }
    catch (er) { avisar(er.message); } finally { setOcupado(false); }
  };
  const url = conf.slug ? urlReservas(conf.slug) : '';
  const copiar = () => { try { navigator.clipboard.writeText(url); avisar('Link copiado: pégalo en tu Instagram o WhatsApp'); } catch (e) { avisar(url); } };
  const compartir = async () => { const texto = 'Reserva tu cita en ' + n.nombre + ': ' + url; if (navigator.share) { try { await navigator.share({ title: n.nombre, text: texto, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } } window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener'); };
  if (enNube && N.aparato) return html`<p class="sub" style="margin:0 0 10px;line-height:1.5">${conf.activa && conf.slug ? html`Tu link está activo: <b class="num" style="word-break:break-all">${urlReservas(conf.slug)}</b>. ` : ''}El link de reservas se activa y se cambia desde el aparato del dueño.</p>`;
  if (!enNube) return html`<p class="sub" style="margin:0 0 10px;line-height:1.5">El link de reservas funciona con la nube: primero guarda tu negocio en tu cuenta.</p>
    <div class="chips"><button type="button" class="btn2 chico lleno toca" onClick=${() => abrir('cuenta', { modo: 'entrar' })}>Guardar en la nube</button></div>`;
  return html`<p class="sub" style="margin:0 0 12px;line-height:1.5">Tus clientes eligen servicio, con quién, día y hora libre, y la cita entra sola a tu Agenda. Ponlo en tu Instagram o mándalo por WhatsApp.</p>
    ${conf.activa && url ? html`<div class="tarjeta pila" style="box-shadow:none;background:var(--in-soft);gap:10px">
        <span class="fila" style="gap:8px"><span class="pildora t-ver">Activo</span><span class="sub" style="color:var(--ink)">Tu link:</span></span>
        <b class="num" style="font-size:14px;word-break:break-all">${url}</b>
        <div class="chips"><button type="button" class="btn2 chico lleno toca" onClick=${copiar}><${Icono} n="doc" t=${14} />Copiar</button><button type="button" class="btn2 chico verde toca" onClick=${compartir}><${Icono} n="movil" t=${14} />Compartir</button><a class="btn2 chico toca" style="text-decoration:none" href=${url} target="_blank" rel="noopener">Ver como cliente</a></div>
      </div>` : null}
    <label class="campo" style="margin-top:12px"><span>Nombre del link</span><span class="fila" style="gap:6px"><span class="sub" style="white-space:nowrap">…reservar.html?n=</span><input type="text" class="crece" value=${slug} autocapitalize="off" autocomplete="off" onInput=${e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} style="min-height:46px;border-radius:14px;border:1.5px solid var(--line);background:var(--fill2);padding:0 12px;font:inherit" /></span></label>
    <div class="chips" style="margin-top:10px">${conf.activa
      ? html`<button type="button" class=${'btn2 chico lleno toca' + (ocupado ? ' apagado' : '')} onClick=${() => guardar(true)}>Guardar cambios</button><button type="button" class="btn2 chico rojo toca" onClick=${() => guardar(false)}>Apagar el link</button>`
      : html`<button type="button" class=${'btn2 chico lleno toca' + (ocupado ? ' apagado' : '')} onClick=${() => guardar(true)}>${ocupado ? 'Activando…' : 'Activar mi link de reservas'}</button>`}</div>
    <span class="titulo-funciones" style="margin-top:16px">Qué se puede reservar</span>
    ${srvs.length ? srvs.map(p => html`<${Interruptor} key=${p.id} on=${p.web !== false} onCambio=${v => guardarProducto(Object.assign({}, p, { web: v }))} titulo=${p.n} sub=${(p.dur || 30) + ' min'} />`) : html`<span class="sub">Agrega tus servicios para que aparezcan.</span>`}
    ${pros.length > 1 && html`<span class="titulo-funciones" style="margin-top:12px">Quién atiende reservas</span>
      ${pros.map(p => html`<${Interruptor} key=${p.id} on=${p.citas !== false} onCambio=${v => guardarPerfil({ id: p.id, citas: v })} titulo=${p.n} sub="Con su horario y vacaciones" />`)}`}`;
}
