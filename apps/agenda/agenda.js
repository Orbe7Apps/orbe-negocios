(function () {
  const { esc, dinero, hoja, aviso, confirmar, ICON } = Orbe;
  const D = () => Orbe.datos;
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  let dia = Orbe.hoy(), buscaCli = '';

  const min = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const h12 = h => { const m = min(h), H = Math.floor(m / 60); return `${((H + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${H < 12 ? 'a. m.' : 'p. m.'}`; };
  const serv = id => D().servicios.find(s => s.id === id);
  const colServ = id => Orbe.paleta[(D().servicios.findIndex(s => s.id === id) + 8) % 8];
  const dur = c => serv(c.servicio)?.dur || D().ajustes.intervalo || 30;
  const precio = c => serv(c.servicio)?.precio || 0;
  const citasDe = f => D().citas.filter(c => c.fecha === f).sort((a, b) => a.hora.localeCompare(b.hora));
  const activas = f => citasDe(f).filter(c => c.estado !== 'cancelada' && c.estado !== 'novino');
  const abre = f => D().ajustes.dias.includes(new Date(f + 'T12:00:00').getDay());
  const ahoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const pasada = c => c.fecha < Orbe.hoy() || (c.fecha === Orbe.hoy() && min(c.hora) + dur(c) <= ahoraMin());

  function libres(f) {
    if (!abre(f)) return [];
    const a = D().ajustes, ini = min(a.desde), fin = min(a.hasta), paso = a.intervalo;
    const ocupado = activas(f).map(c => [min(c.hora), min(c.hora) + dur(c)]);
    const ah = f === Orbe.hoy() ? ahoraMin() : -1, r = [];
    for (let t = ini; t + paso <= fin; t += paso) if (t > ah && !ocupado.some(([x, y]) => t < y && t + paso > x)) r.push(t);
    return r;
  }
  const ocupacion = f => { if (!abre(f)) return 0; const a = D().ajustes, tot = min(a.hasta) - min(a.desde); return Math.min(1, activas(f).reduce((s, c) => s + dur(c), 0) / tot); };

  // Clientas armadas desde las citas
  function clientas() {
    const m = new Map();
    D().citas.forEach(c => {
      const k = c.cliente.trim().toLowerCase(); if (!m.has(k)) m.set(k, { nombre: c.cliente, tel: '', citas: [] });
      const x = m.get(k); x.citas.push(c); if (c.tel) x.tel = c.tel;
    });
    return [...m.values()].map(x => {
      const hechas = x.citas.filter(c => c.estado === 'hecha').sort((a, b) => a.fecha.localeCompare(b.fecha));
      const ultima = hechas[hechas.length - 1]?.fecha || null;
      const prox = x.citas.filter(c => c.estado === 'pendiente' && c.fecha >= Orbe.hoy()).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
      const gaps = hechas.slice(1).map((c, i) => Orbe.diasEntre(hechas[i].fecha, c.fecha));
      const cada = gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null;
      const sin = ultima ? Orbe.diasEntre(ultima, Orbe.hoy()) : null;
      const perdida = !prox && sin !== null && sin > Math.max(30, (cada || 30) * 1.5);
      return { ...x, hechas: hechas.length, gastado: hechas.reduce((s, c) => s + precio(c), 0), ultima, prox, cada, sin, perdida, faltas: x.citas.filter(c => c.estado === 'novino').length };
    });
  }

  function pintar() { const v = document.getElementById('vista'); ({ agenda: pintarAgenda, clientas: pintarClientas, reportes: pintarReportes })[Orbe.vista](v); }

  function pintarAgenda(v) {
    const hoy = Orbe.hoy(), manana = Orbe.sumarDias(hoy, 1);
    if (!D().servicios.length) { v.innerHTML = `<div class="vacio" style="margin-top:16px"><b>Primero, tus servicios</b>Agrega lo que ofreces, cuánto dura y cuánto cuesta.<br><br><button class="btn principal" type="button" id="primeros">Agregar servicios</button></div>`; document.getElementById('primeros').onclick = servicios; return; }
    const cs = citasDe(dia), act = activas(dia), lb = libres(dia), esperado = act.reduce((s, c) => s + precio(c), 0);
    const prox = activas(hoy).find(c => c.estado === 'pendiente' && min(c.hora) + dur(c) > ahoraMin());
    const tareas = [];
    if (dia === hoy) {
      const sinMarcar = D().citas.filter(c => c.estado === 'pendiente' && pasada(c) && c.fecha >= Orbe.sumarDias(hoy, -7));
      if (sinMarcar.length) tareas.push({ color: 'var(--warn)', icono: ICON.check, titulo: `${sinMarcar.length} ${sinMarcar.length === 1 ? 'cita por marcar' : 'citas por marcar'}`, sub: '¿Vinieron o no? Así tus reportes quedan bien.', accion: () => marcarPendientes(sinMarcar) });
      const porRecordar = activas(manana).filter(c => c.estado === 'pendiente' && !c.recordada);
      if (porRecordar.length) tareas.push({ color: '#128c5e', icono: ICON.wa, titulo: porRecordar.length === 1 ? 'Recordar la cita de mañana' : `Recordar las ${porRecordar.length} citas de mañana`, sub: porRecordar.slice(0, 3).map(c => `${esc(c.cliente.split(' ')[0])} ${c.hora}`).join(' · '), accion: () => recordarVarias(porRecordar) });
      const perdidas = clientas().filter(x => x.perdida).sort((a, b) => b.gastado - a.gastado);
      if (perdidas.length) tareas.push({ color: 'var(--out)', icono: ICON.personas, titulo: `${perdidas.length} ${perdidas.length === 1 ? 'clienta no ha vuelto' : 'clientas no han vuelto'}`, sub: `${esc(perdidas[0].nombre)} vino hace ${perdidas[0].sin} días. Invítalas a volver.`, accion: () => { Orbe.ir('clientas'); } });
      if (lb.length >= 4) tareas.push({ color: '#3ba7e6', icono: ICON.calendario, titulo: `Tienes ${lb.length} horarios libres hoy`, sub: 'Comparte tu link de reservas en tus estados.', accion: enlace });
    }
    v.innerHTML = `<div class="entra">
      ${Orbe.hero({ etiqueta: `${dia === hoy ? 'Hoy' : Orbe.fecha(dia, { weekday: 'long', day: 'numeric', month: 'short' })} · ${act.length} ${act.length === 1 ? 'cita' : 'citas'}`, monto: esperado,
        pildora: dia === hoy ? (prox ? { t: `Próxima: ${esc(prox.cliente.split(' ')[0])} a las ${prox.hora}` } : { c: 'bien', t: act.length ? 'Sin más citas por hoy' : 'Día libre' }) : (abre(dia) ? { t: `${lb.length} horarios libres` } : { t: 'No atiendes este día' }),
        anillo: { p: ocupacion(dia), t: Math.round(ocupacion(dia) * 100) + '%', sub: 'del día ocupado' } })}
      <div class="pestanas dias-tira" id="dias"></div>
      ${tareas.length ? `<section class="seccion"><div class="seccion-cab"><h2>Para hacer hoy</h2><span class="cuenta">${tareas.length}</span></div>${Orbe.tareas(tareas)}</section>` : ''}
      <section class="seccion"><div class="seccion-cab"><h2>${dia === hoy ? 'Citas de hoy' : 'Citas'}</h2><button class="enlace" type="button" id="btn-link">Link para reservar</button></div>
        <div class="lista">${cs.length ? cs.map(c => {
          const s = serv(c.servicio), st = { hecha: ['ok', 'Atendida'], cancelada: ['', 'Cancelada'], novino: ['mal', 'No vino'] }[c.estado];
          return `<button type="button" class="fila toque" data-c="${c.id}" style="${c.estado !== 'pendiente' ? 'opacity:.6' : ''}"><span style="min-width:52px;text-align:left"><b class="num" style="font-size:17px">${c.hora}</b><small style="display:block;color:var(--muted);font-size:12px">${dur(c)} min</small></span><span style="width:4px;align-self:stretch;border-radius:4px;background:${colServ(c.servicio)}"></span>
            <span class="info"><b style="${c.estado === 'cancelada' ? 'text-decoration:line-through' : ''}">${esc(c.cliente)}</b><span>${esc(s?.nombre || 'Cita')}${c.recordada && c.estado === 'pendiente' ? ' · recordada' : ''}</span></span>
            <span class="derecha">${s?.precio ? `<span class="monto">${dinero(s.precio)}</span>` : ''}${st ? `<small><span class="chip ${st[0]}">${st[1]}</span></small>` : ''}</span></button>`;
        }).join('') : `<div class="vacio">${abre(dia) ? '<b>Sin citas</b>Toca un horario libre o el botón + para agendar.' : '<b>Día de descanso</b>Puedes cambiarlo en Menú › Horario.'}</div>`}</div></section>
      ${lb.length ? `<section class="seccion"><div class="seccion-cab"><h2>Horarios libres</h2><span class="texto-ayuda">${lb.length}</span></div><div class="opciones">${lb.map(t => `<button type="button" class="opcion" data-libre="${hhmm(t)}">${hhmm(t)}</button>`).join('')}</div></section>` : ''}</div>`;
    const el = document.getElementById('dias');
    const fechas = Array.from({ length: 31 }, (_, i) => Orbe.sumarDias(hoy, i - 3));
    el.innerHTML = fechas.map(f => { const d = new Date(f + 'T12:00:00'), n = activas(f).length; return `<button type="button" class="dia" data-d="${f}" aria-pressed="${f === dia}" style="${abre(f) ? '' : 'opacity:.45'}"><small>${f === hoy ? 'hoy' : DIAS[d.getDay()]}</small><b>${d.getDate()}</b><i style="opacity:${n ? 1 : 0}">${n}</i></button>`; }).join('');
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { dia = b.dataset.d; const x = el.scrollLeft; pintarAgenda(v); document.getElementById('dias').scrollLeft = x; });
    const sel = el.querySelector('[aria-pressed="true"]'); if (sel && !pintarAgenda._ok) { el.scrollLeft = Math.max(0, sel.offsetLeft - el.offsetLeft - 16); pintarAgenda._ok = true; }
    Orbe.activarTareas(v, tareas);
    v.querySelectorAll('[data-libre]').forEach(b => b.onclick = () => nueva(dia, b.dataset.libre));
    v.querySelectorAll('[data-c]').forEach(b => b.onclick = () => detalle(b.dataset.c));
    document.getElementById('btn-link').onclick = enlace;
  }

  function pintarClientas(v) {
    let cs = clientas();
    const perdidas = cs.filter(x => x.perdida).length, total = cs.length;
    if (buscaCli) cs = cs.filter(x => x.nombre.toLowerCase().includes(buscaCli));
    cs.sort((a, b) => (b.perdida - a.perdida) || b.gastado - a.gastado);
    const maxG = Math.max(...cs.map(x => x.gastado), 1);
    v.innerHTML = `<label class="buscar">${ICON.buscar}<input id="buscar" type="search" placeholder="Buscar entre ${total} clientas" value="${esc(buscaCli)}" aria-label="Buscar clienta"></label>
      ${perdidas ? `<p class="texto-ayuda" style="margin-top:12px"><b style="color:var(--out)">${perdidas}</b> no han vuelto en más tiempo del normal. Escríbeles para que reserven otra vez.</p>` : ''}
      <section class="seccion" style="margin-top:12px"><div class="lista entra">${cs.length ? cs.map(x => `<div class="fila">${Orbe.ini(x.nombre)}<span class="info"><b>${esc(x.nombre)}</b><div class="progreso"><i style="width:${Math.max(3, x.gastado / maxG * 100)}%;background:var(--c)"></i></div><span>${x.hechas} ${x.hechas === 1 ? 'visita' : 'visitas'}${x.cada ? ` · viene cada ${x.cada} días` : ''}${x.faltas ? ` · ${x.faltas} ${x.faltas === 1 ? 'falta' : 'faltas'}` : ''}</span></span>
          <span class="derecha"><span class="monto">${dinero(x.gastado)}</span>${x.prox ? `<small>Vuelve el ${Orbe.fecha(x.prox.fecha)}</small>` : x.perdida ? `<button type="button" class="chip mal" style="border:0" data-volver="${esc(x.nombre)}">Invitar</button>` : x.ultima ? `<small>${Orbe.hace(x.ultima)}</small>` : ''}</span></div>`).join('') : '<div class="vacio">Tus clientas aparecen aquí cuando agendas citas.</div>'}</div></section>`;
    const inp = document.getElementById('buscar');
    inp.oninput = e => { buscaCli = e.target.value.trim().toLowerCase(); const p = inp.selectionStart; pintarClientas(v); const n = document.getElementById('buscar'); n.focus(); n.setSelectionRange(p, p); };
    v.querySelectorAll('[data-volver]').forEach(b => b.onclick = () => { const x = clientas().find(y => y.nombre === b.dataset.volver); invitar(x); });
  }

  function pintarReportes(v) {
    const hoy = Orbe.hoy();
    const sem = Array.from({ length: 8 }, (_, i) => { const fin = Orbe.sumarDias(hoy, -7 * (7 - i)), ini = Orbe.sumarDias(fin, -6); return { ini, v: D().citas.filter(c => c.estado === 'hecha' && c.fecha >= ini && c.fecha <= fin).reduce((s, c) => s + precio(c), 0) }; });
    const d30 = D().citas.filter(c => c.fecha >= Orbe.sumarDias(hoy, -29) && c.fecha <= hoy);
    const hechas = d30.filter(c => c.estado === 'hecha'), faltas = d30.filter(c => c.estado === 'novino').length;
    const porServ = {}; hechas.forEach(c => porServ[c.servicio] = (porServ[c.servicio] || 0) + precio(c));
    const t30 = hechas.reduce((s, c) => s + precio(c), 0);
    const porDia = [1, 2, 3, 4, 5, 6, 0].map(d => ({ d, n: hechas.filter(c => new Date(c.fecha + 'T12:00:00').getDay() === d).length }));
    v.innerHTML = `<div class="entra"><section class="seccion" style="margin-top:14px"><div class="tarjeta p"><div class="seccion-cab" style="margin:0"><h2 style="font-size:16px">Ingresos por semana</h2><b class="num">${dinero(sem.reduce((s, x) => s + x.v, 0))}</b></div>${Orbe.grafico(sem.map(x => x.v), sem.map(x => Orbe.fecha(x.ini, { day: 'numeric' })))}</div></section>
      <div class="dos" style="margin-top:12px"><div class="tarjeta p"><small class="texto-ayuda">Atendidas en 30 días</small><div class="monto-xl" style="font-size:26px">${hechas.length}</div></div><div class="tarjeta p"><small class="texto-ayuda">Asistencia</small><div class="monto-xl" style="font-size:26px;color:${faltas ? 'var(--warn)' : 'var(--in)'}">${hechas.length + faltas ? Math.round(hechas.length / (hechas.length + faltas) * 100) : 100}%</div></div></div>
      <section class="seccion"><div class="seccion-cab"><h2>Lo que más te piden</h2><span class="texto-ayuda">30 días</span></div><div class="tarjeta p">${t30 ? Orbe.orbe(Object.entries(porServ).sort((a, b) => b[1] - a[1]).map(([id, x]) => ({ n: serv(id)?.nombre || 'Servicio', v: x, c: colServ(id) })), t30) : '<p class="texto-ayuda">Aún no hay citas atendidas.</p>'}</div></section>
      <section class="seccion"><div class="seccion-cab"><h2>Tus días más llenos</h2></div><div class="tarjeta p">${Orbe.grafico(porDia.map(x => x.n), porDia.map(x => DIAS[x.d]), porDia.reduce((bi, x, i, a) => x.n > a[bi].n ? i : bi, 0))}</div></section></div>`;
  }

  function nueva(fecha = dia, hora, c) {
    if (!D().servicios.length) return servicios();
    const editar = !!c;
    c = c || { cliente: '', tel: '', servicio: D().servicios[0].id, fecha, hora: hora || '', nota: '' };
    const nombres = clientas().map(x => x.nombre);
    const d = hoja({
      titulo: editar ? 'Cambiar cita' : 'Nueva cita',
      cuerpo: `<div class="fila2"><label class="campo">Clienta o cliente<input name="cliente" value="${esc(c.cliente)}" placeholder="Nombre" autocomplete="off" list="clientes"></label><label class="campo">WhatsApp<input name="tel" inputmode="tel" value="${esc(c.tel)}" placeholder="Opcional" autocomplete="off"></label></div>
        <datalist id="clientes">${nombres.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <div class="campo"><span>Servicio</span><div class="opciones">${D().servicios.map(s => `<button type="button" class="opcion" data-s="${s.id}" aria-pressed="${s.id === c.servicio}">${esc(s.nombre)} · ${s.dur} min</button>`).join('')}</div></div>
        <div class="fila2"><label class="campo">Día<input name="fecha" type="date" value="${c.fecha}"></label><label class="campo">Hora<input name="hora" type="time" value="${c.hora}" step="300"></label></div>
        <div class="opciones" data-sug></div>
        <label class="campo">Nota<input name="nota" value="${esc(c.nota)}" placeholder="Opcional, ej. diseño francés" autocomplete="off"></label>`,
      pie: '<button class="btn principal ancho" type="submit">Guardar cita</button>'
    });
    const f = d.querySelector('form'); let sv = c.servicio;
    d.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sv = b.dataset.s; d.querySelectorAll('[data-s]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    const sug = () => { const l = libres(f.fecha.value).slice(0, 10); d.querySelector('[data-sug]').innerHTML = l.map(t => `<button type="button" class="opcion" data-h="${hhmm(t)}" aria-pressed="${f.hora.value === hhmm(t)}">${hhmm(t)}</button>`).join(''); d.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { f.hora.value = b.dataset.h; sug(); }); };
    f.fecha.onchange = sug; f.hora.oninput = sug; sug();
    f.cliente.onchange = () => { const x = clientas().find(y => y.nombre === f.cliente.value); if (x?.tel && !f.tel.value) f.tel.value = x.tel; };
    f.onsubmit = e => {
      e.preventDefault();
      if (!f.cliente.value.trim()) return Orbe.error(d, 'Escribe el nombre de quien viene.');
      if (!f.fecha.value || !f.hora.value) return Orbe.error(d, 'Elige el día y la hora.');
      const ini = min(f.hora.value), fin = ini + (serv(sv)?.dur || 30);
      const choque = activas(f.fecha.value).find(x => x.id !== c.id && ini < min(x.hora) + dur(x) && fin > min(x.hora));
      if (choque && !d._forzar) { d._forzar = true; return Orbe.error(d, `Choca con la cita de ${choque.cliente} a las ${choque.hora}. Toca “Guardar” otra vez si igual quieres agendarla.`); }
      if (!editar && !Orbe.puedeAgregar()) return d.close();
      Object.assign(c, { cliente: f.cliente.value.trim(), tel: f.tel.value.trim(), servicio: sv, fecha: f.fecha.value, hora: f.hora.value, nota: f.nota.value.trim() });
      if (!editar) { c.id = Orbe.uid(); c.estado = 'pendiente'; D().citas.push(c); } else c.recordada = false;
      Orbe.guardar(); dia = c.fecha; d.close(); Orbe.pintarDemo(); if (Orbe.vista !== 'agenda') Orbe.ir('agenda'); else pintar();
      aviso(editar ? 'Cita cambiada' : `Cita agendada: ${Orbe.fecha(c.fecha, { weekday: 'short', day: 'numeric' })} a las ${c.hora}`);
      if (c.tel) setTimeout(() => preguntarWa(c, editar ? 'cambio' : 'confirmar'), 400);
    };
  }

  function texto(c, tipo) {
    const s = serv(c.servicio), neg = D().ajustes.negocio, cuando = `${Orbe.fecha(c.fecha, { weekday: 'long', day: 'numeric', month: 'long' })} a las ${h12(c.hora)}`, nom = c.cliente.split(' ')[0];
    if (tipo === 'confirmar' || tipo === 'cambio') return `Hola ${nom}. Tu cita${neg ? ` en ${neg}` : ''} ${tipo === 'cambio' ? 'cambió y ahora es' : 'quedó agendada'}:\n\n${cuando}\n${s?.nombre || 'Cita'}${s?.precio ? ` · ${dinero(s.precio)}` : ''}\n\nSi necesitas cambiarla, avísame por aquí. ¡Te espero!`;
    if (tipo === 'gracias') return `¡Gracias por venir, ${nom}!${neg ? ` Fue un gusto atenderte en ${neg}.` : ''}${D().ajustes.resena ? `\n\nSi te gustó, ¿nos dejas una reseña? Nos ayuda muchísimo:\n${D().ajustes.resena}` : ''}\n\nCuando quieras tu próxima cita, escríbeme por aquí.`;
    return `Hola ${nom}. Te recuerdo tu cita${neg ? ` en ${neg}` : ''}:\n\n${cuando}\n${s?.nombre || 'Cita'}\n\n¿Me confirmas que vienes?`;
  }
  function preguntarWa(c, tipo) {
    const d = hoja({ titulo: '¿Le avisas por WhatsApp?', cuerpo: `<div class="mensaje-wa" style="">${esc(texto(c, tipo))}</div>`, pie: `<button type="button" class="btn wa ancho" data-si>${ICON.wa} Enviar</button><button type="button" class="btn ancho" data-no>Ahora no</button>` });
    d.querySelector('[data-si]').onclick = () => { Orbe.whatsapp(c.tel, texto(c, tipo)); d.close(); };
    d.querySelector('[data-no]').onclick = () => d.close();
  }
  function recordarVarias(lista) {
    const d = hoja({ titulo: 'Citas de mañana', cuerpo: `<p class="texto-ayuda">Toca cada una para mandarle su recordatorio. Las que confirmes quedan marcadas.</p><div class="tarjeta">${lista.map(c => `<button type="button" class="tarea" data-r="${c.id}"><span class="ico" style="background:#128c5e">${ICON.wa}</span><span class="info"><b>${esc(c.cliente)} · ${c.hora}</b><span>${esc(serv(c.servicio)?.nombre || '')}${c.tel ? '' : ' · sin número guardado'}</span></span><span class="flecha">${ICON.flecha}</span></button>`).join('')}</div>` });
    d.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { const c = D().citas.find(x => x.id === b.dataset.r); Orbe.whatsapp(c.tel, texto(c, 'recordar')); c.recordada = true; Orbe.guardar(); b.style.opacity = .45; pintar(); });
  }
  function marcarPendientes(lista) {
    const d = hoja({ titulo: 'Citas por marcar', cuerpo: `<div class="tarjeta">${lista.map(c => `<div class="mov" data-m="${c.id}"><div class="info"><b>${esc(c.cliente)}</b><span>${Orbe.fecha(c.fecha, { weekday: 'short', day: 'numeric' })} · ${c.hora} · ${esc(serv(c.servicio)?.nombre || '')}</span></div><button type="button" class="chip ok" style="border:0;padding:7px 11px" data-e="hecha">Vino</button><button type="button" class="chip mal" style="border:0;padding:7px 11px" data-e="novino">No vino</button></div>`).join('')}</div>` });
    d.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const row = b.closest('[data-m]'), c = D().citas.find(x => x.id === row.dataset.m); c.estado = b.dataset.e; Orbe.guardar(); row.style.opacity = .4; row.querySelectorAll('button').forEach(x => x.disabled = true); pintar(); });
  }
  function invitar(x) {
    const neg = D().ajustes.negocio;
    const t = `Hola ${x.nombre.split(' ')[0]}, ¿cómo estás? Hace tiempo no te vemos${neg ? ` en ${neg}` : ''} y te extrañamos.\n\nEsta semana tengo horarios libres. ¿Te aparto uno? Responde por aquí y te lo reservo.`;
    const d = hoja({ titulo: `Invitar a ${x.nombre}`, cuerpo: `<p class="texto-ayuda">Vino hace ${x.sin} días${x.cada ? ` y suele venir cada ${x.cada}` : ''}. Ha gastado ${dinero(x.gastado)} contigo.</p><div class="mensaje-wa" style="">${esc(t)}</div>`, pie: `<button type="button" class="btn wa ancho" data-e>${ICON.wa} Enviar invitación</button>` });
    d.querySelector('[data-e]').onclick = () => { Orbe.whatsapp(x.tel, t); d.close(); };
  }

  function detalle(id) {
    const c = D().citas.find(x => x.id === id); if (!c) return;
    const s = serv(c.servicio), x = clientas().find(y => y.nombre.toLowerCase() === c.cliente.trim().toLowerCase());
    const d = hoja({
      titulo: c.cliente,
      cuerpo: `${Orbe.hero({ etiqueta: `${Orbe.fecha(c.fecha, { weekday: 'long', day: 'numeric', month: 'long' })} · ${dur(c)} min`, texto: h12(c.hora), pildora: { t: esc(s?.nombre || 'Cita') + (s?.precio ? ' · ' + dinero(s.precio) : '') },
          chips: x ? [{ t: 'Visitas', v: x.hechas }, { t: 'Ha gastado', v: dinero(x.gastado) }, { t: 'Faltas', v: x.faltas, c: x.faltas ? '#ffb3c2' : '' }] : null })}
        ${c.nota ? `<p class="texto-ayuda">Nota: ${esc(c.nota)}</p>` : ''}
        ${c.estado === 'pendiente' ? `<button type="button" class="btn wa ancho" data-x="recordar">${ICON.wa} ${c.recordada ? 'Recordar otra vez' : 'Mandar recordatorio'}</button>
          <div class="dos"><button type="button" class="btn principal" data-x="hecha">Ya la atendí</button><button type="button" class="btn" data-x="novino">No vino</button></div>
          <div class="dos"><button type="button" class="btn" data-x="editar">Cambiar</button><button type="button" class="btn peligro" data-x="cancelar">Cancelar</button></div>`
          : `${c.estado === 'hecha' ? `<button type="button" class="btn wa ancho" data-x="gracias">${ICON.wa} Agradecer${D().ajustes.resena ? ' y pedir reseña' : ''}</button>` : ''}<div class="dos"><button type="button" class="btn" data-x="reabrir">Volver a pendiente</button><button type="button" class="btn peligro" data-x="borrar">Borrar</button></div>`}`
    });
    d.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => {
      const k = b.dataset.x;
      if (k === 'recordar') { Orbe.whatsapp(c.tel, texto(c, 'recordar')); c.recordada = true; Orbe.guardar(); return; }
      if (k === 'gracias') return Orbe.whatsapp(c.tel, texto(c, 'gracias'));
      if (k === 'editar') { d.close(); return setTimeout(() => nueva(c.fecha, c.hora, c), 320); }
      if (k === 'borrar') { if (!(await confirmar('Se borrará esta cita.'))) return; D().citas = D().citas.filter(y => y.id !== id); }
      if (k === 'cancelar' && !(await confirmar(`Se cancelará la cita de ${c.cliente} y el horario quedará libre.`, 'Sí, cancelar'))) return;
      if (k === 'hecha') c.estado = 'hecha'; if (k === 'novino') c.estado = 'novino'; if (k === 'cancelar') c.estado = 'cancelada'; if (k === 'reabrir') c.estado = 'pendiente';
      Orbe.guardar(); d.close(); pintar();
      if (k === 'hecha' && c.tel) setTimeout(() => preguntarWa(c, 'gracias'), 350);
    });
  }

  function servicios() {
    const lista = d => {
      d.querySelector('[data-lista]').innerHTML = D().servicios.length ? D().servicios.map(s => `<div class="mov"><span style="width:10px;height:10px;border-radius:50%;background:${colServ(s.id)}"></span><div class="info"><b>${esc(s.nombre)}</b><span>${s.dur} min${s.precio ? ' · ' + dinero(s.precio) : ''}</span></div><button type="button" class="borrar" data-q="${s.id}" aria-label="Quitar ${esc(s.nombre)}">${ICON.cerrar}</button></div>`).join('') : '<p class="texto-ayuda" style="padding:12px 0">Aún no tienes servicios.</p>';
      d.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { D().servicios = D().servicios.filter(s => s.id !== b.dataset.q); Orbe.guardar(); lista(d); pintar(); });
    };
    const d = hoja({ titulo: 'Tus servicios', cuerpo: `<div class="tarjeta" data-lista></div><label class="campo">Servicio nuevo<input name="nombre" placeholder="Ej. Manicure semipermanente" autocomplete="off"></label>
        <div class="fila2"><label class="campo">Dura<select name="dur">${[15, 20, 30, 45, 60, 75, 90, 120, 150, 180].map(m => `<option value="${m}" ${m === 60 ? 'selected' : ''}>${m < 60 ? m + ' min' : (m / 60 + ' h').replace('.5', ',5')}</option>`).join('')}</select></label><label class="campo">Precio<input name="precio" inputmode="decimal" placeholder="Opcional"></label></div>`,
      pie: '<button class="btn principal ancho" type="submit">Agregar servicio</button>' });
    lista(d);
    const f = d.querySelector('form');
    f.onsubmit = e => { e.preventDefault(); if (!f.nombre.value.trim()) return Orbe.error(d, 'Escribe el nombre del servicio.'); D().servicios.push({ id: Orbe.uid(), nombre: f.nombre.value.trim(), dur: +f.dur.value, precio: Orbe.num(f.precio.value) }); Orbe.guardar(); f.reset(); f.dur.value = 60; lista(d); pintar(); aviso('Servicio agregado'); };
  }

  function horario() {
    const a = D().ajustes;
    const d = hoja({ titulo: 'Tu horario', cuerpo: `<p class="texto-ayuda">Días que atiendes</p><div class="opciones">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button type="button" class="opcion" data-dia="${i}" aria-pressed="${a.dias.includes(i)}">${DIAS[i]}</button>`).join('')}</div>
        <div class="fila2"><label class="campo">Abres<input name="desde" type="time" value="${a.desde}"></label><label class="campo">Cierras<input name="hasta" type="time" value="${a.hasta}"></label></div>
        <label class="campo">Ofrecer citas cada<select name="intervalo">${[15, 20, 30, 45, 60].map(m => `<option value="${m}" ${m === a.intervalo ? 'selected' : ''}>${m} minutos</option>`).join('')}</select></label>`, pie: '<button class="btn principal ancho" type="submit">Guardar horario</button>' });
    d.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'));
    const f = d.querySelector('form');
    f.onsubmit = e => { e.preventDefault(); if (min(f.hasta.value) <= min(f.desde.value)) return Orbe.error(d, 'La hora de cierre debe ser después de la de apertura.'); a.dias = [...d.querySelectorAll('[data-dia][aria-pressed="true"]')].map(b => +b.dataset.dia); a.desde = f.desde.value; a.hasta = f.hasta.value; a.intervalo = +f.intervalo.value; Orbe.guardar(); d.close(); pintar(); aviso('Horario guardado'); };
  }

  function enlace() {
    const a = D().ajustes;
    if (!D().servicios.length) return servicios();
    if (String(a.whatsapp || '').replace(/\D/g, '').length < 8) {
      const d = hoja({ titulo: 'Tu número de WhatsApp', cuerpo: '<p class="texto-ayuda">Los pedidos de cita te llegarán a este número.</p><label class="campo">WhatsApp del negocio<input name="w" inputmode="tel" placeholder="Con código de país, ej. 584121234567"></label>', pie: '<button class="btn principal ancho" type="submit">Continuar</button>' });
      const f = d.querySelector('form');
      f.onsubmit = e => { e.preventDefault(); if (f.w.value.replace(/\D/g, '').length < 8) return Orbe.error(d, 'Escribe el número completo con código de país.'); a.whatsapp = f.w.value.trim(); Orbe.guardar(); d.close(); setTimeout(enlace, 320); };
      return;
    }
    const sem = {}; for (let i = 0; i < 7; i++) { const f = Orbe.sumarDias(Orbe.hoy(), i), l = libres(f); if (l.length) sem[f] = l; }
    const datos = { n: a.negocio || 'Mi negocio', w: a.whatsapp.replace(/\D/g, ''), m: a.moneda, p: a.intervalo, s: D().servicios.map(s => [s.nombre, s.dur, s.precio || 0]), d: sem };
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(datos)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = new URL('reservar.html', location.href).href + '#' + b64;
    const d = hoja({ titulo: 'Link para reservar', cuerpo: `<p class="texto-ayuda" style="font-size:15px">Tus clientas ven tus servicios y horarios libres de los próximos 7 días, eligen uno y te llega el pedido de cita a tu WhatsApp.</p>
        <div class="tarjeta p" style="word-break:break-all;font-size:12.5px;color:var(--muted);max-height:80px;overflow:hidden">${esc(url)}</div>
        <p class="texto-ayuda">El link muestra los horarios libres de hoy. Compártelo de nuevo cuando agendes citas, por ejemplo cada mañana en tus estados.</p>`,
      pie: `<button type="button" class="btn principal ancho" data-copiar>Copiar link</button><button type="button" class="btn wa ancho" data-wa>${ICON.wa} Compartir por WhatsApp</button><a class="btn ancho" href="${esc(url)}" target="_blank" rel="noopener">Ver cómo se ve</a>` });
    d.querySelector('[data-copiar]').onclick = async () => { try { await navigator.clipboard.writeText(url); aviso('Link copiado. Pégalo en tu bio o estados'); } catch (e) { aviso('No se pudo copiar. Mantén presionado el link para copiarlo.'); } };
    d.querySelector('[data-wa]').onclick = () => Orbe.whatsapp('', `Reserva tu cita${a.negocio ? ' en ' + a.negocio : ''} aquí. Elige el servicio y el horario que te quede mejor:\n${url}`);
  }

  // Ejemplo: un salón de uñas con 6 semanas de citas
  function demo() {
    let s = 11; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const servicios = [{ id: 's1', nombre: 'Manicure semipermanente', dur: 60, precio: 15 }, { id: 's2', nombre: 'Pedicure', dur: 45, precio: 12 }, { id: 's3', nombre: 'Uñas acrílicas', dur: 120, precio: 30 }, { id: 's4', nombre: 'Retoque', dur: 30, precio: 8 }];
    const gente = ['Daniela Ruiz', 'María José Paz', 'Carolina Vega', 'Valentina Soto', 'Andrea Morales', 'Gabriela Núñez', 'Sofía Herrera', 'Paola Díaz', 'Laura Méndez', 'Camila Torres', 'Lucía Ramírez', 'Fernanda Castro', 'Natalia Ortiz', 'Juliana Reyes', 'Victoria Silva', 'Alejandra Mora', 'Isabella Rojas', 'Mariana López'];
    const horas = ['09:00', '10:00', '11:30', '13:00', '14:30', '16:00', '17:00'];
    const citas = []; let i = 0;
    for (let dd = -42; dd <= 7; dd++) {
      const f = Orbe.sumarDias(Orbe.hoy(), dd), wd = new Date(f + 'T12:00:00').getDay(); if (wd === 0) continue;
      horas.forEach(h => {
        if (r() > (dd > 0 ? 0.4 : 0.5)) return;
        const quien = gente[Math.floor(r() * (dd < -36 ? 18 : 16))], sv = servicios[Math.floor(r() * 4)];
        const est = dd < 0 || (dd === 0 && h < '10:00') ? (r() < 0.07 ? 'novino' : 'hecha') : 'pendiente';
        citas.push({ id: 'a' + (i++), fecha: f, hora: h, cliente: quien, tel: '', servicio: sv.id, nota: '', estado: est, recordada: dd === 1 && r() < 0.3 });
      });
    }
    return { ajustes: { negocio: 'Nails Studio Vale', moneda: '$', dias: [1, 2, 3, 4, 5, 6], desde: '09:00', hasta: '18:00', intervalo: 30, whatsapp: '', resena: '' }, servicios, citas };
  }

  Orbe.iniciar({
    id: 'agenda', nombre: 'Agenda de citas', prefijo: 'AGE', unidad: 'una cita tuya', pintar, demo,
    datos: () => ({ servicios: [], citas: [], ajustes: { negocio: '', moneda: '$', dias: [1, 2, 3, 4, 5, 6], desde: '09:00', hasta: '18:00', intervalo: 30, whatsapp: '', resena: '' } }),
    icono: Orbe.sv('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M9 14.5l2 2 4-4"/>'),
    tabs: [{ id: 'agenda', nombre: 'Agenda', icono: ICON.calendario }, { id: 'clientas', nombre: 'Clientas', icono: ICON.personas }, { id: 'reportes', nombre: 'Reportes', icono: ICON.grafico }],
    fabTexto: () => 'Cita',
    fab: () => nueva(dia),
    extrasMenu: `<button type="button" class="fila" data-a="servicios"><span class="info"><b>Servicios y precios</b><span>Lo que ofreces y cuánto dura</span></span></button>
      <button type="button" class="fila" data-a="horario"><span class="info"><b>Horario</b><span>Días y horas que atiendes</span></span></button>
      <button type="button" class="fila" data-a="enlace"><span class="info"><b>Link para reservar</b><span>Para tu bio y tus estados</span></span></button>`,
    alAccion: x => x === 'servicios' ? (servicios(), true) : x === 'horario' ? (horario(), true) : x === 'enlace' ? (enlace(), true) : false,
    ajustesExtra: a => `<label class="campo">WhatsApp del negocio<input name="whatsapp" inputmode="tel" value="${esc(a.whatsapp || '')}" placeholder="Con código de país"><small>Ahí te llegan los pedidos de cita del link.</small></label>
      <label class="campo">Link de tus reseñas en Google<input name="resena" inputmode="url" value="${esc(a.resena || '')}" placeholder="Opcional, https://g.page/r/..."><small>Lo mandamos al agradecer cada visita. Más reseñas, más clientas nuevas.</small></label>`,
    guardarAjustes: (a, f) => { a.whatsapp = f.whatsapp.value.trim(); a.resena = f.resena.value.trim(); }
  });
})();
