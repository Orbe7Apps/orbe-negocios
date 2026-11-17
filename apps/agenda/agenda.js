(function () {
  const { esc, dinero, hoja, aviso, confirmar } = Orbe;
  const D = () => Orbe.datos;
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  let dia = Orbe.hoy();

  const min = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const h12 = h => { const m = min(h), H = Math.floor(m / 60), M = m % 60; return `${((H + 11) % 12) + 1}:${String(M).padStart(2, '0')} ${H < 12 ? 'a. m.' : 'p. m.'}`; };
  const serv = id => D().servicios.find(s => s.id === id);
  const dur = c => serv(c.servicio)?.dur || D().ajustes.intervalo || 30;
  const citasDe = f => D().citas.filter(c => c.fecha === f).sort((a, b) => a.hora.localeCompare(b.hora));
  const activas = f => citasDe(f).filter(c => c.estado !== 'cancelada');
  const abre = f => D().ajustes.dias.includes(new Date(f + 'T12:00:00').getDay());

  // Horarios libres de un día (inicio de cada bloque)
  function libres(f) {
    if (!abre(f)) return [];
    const a = D().ajustes, ini = min(a.desde), fin = min(a.hasta), paso = a.intervalo;
    const ocupado = activas(f).map(c => [min(c.hora), min(c.hora) + dur(c)]);
    const ahora = f === Orbe.hoy() ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
    const r = [];
    for (let t = ini; t + paso <= fin; t += paso) if (t > ahora && !ocupado.some(([x, y]) => t < y && t + paso > x)) r.push(t);
    return r;
  }

  function pintar() {
    const hoy = Orbe.hoy(), lunes = Orbe.sumarDias(hoy, -((new Date(hoy + 'T12:00:00').getDay() + 6) % 7));
    const semana = D().citas.filter(c => c.fecha >= lunes && c.fecha <= Orbe.sumarDias(lunes, 6) && c.estado !== 'cancelada');
    const deHoy = activas(hoy);
    const esperado = deHoy.reduce((s, c) => s + (serv(c.servicio)?.precio || 0), 0);
    const prox = deHoy.find(c => c.estado === 'pendiente' && min(c.hora) >= new Date().getHours() * 60 + new Date().getMinutes() - 15);
    document.getElementById('resumen').innerHTML = `
      <div class="dato destacado"><small>Próxima cita</small><b>${prox ? h12(prox.hora) : '—'}</b></div>
      <div class="dato"><small>Citas hoy</small><b>${deHoy.length}</b></div>
      <div class="dato"><small>Esta semana</small><b>${semana.length}</b></div>
      <div class="dato"><small>Hoy facturas</small><b>${dinero(esperado)}</b></div>`;
    // tira de días: 3 atrás y 27 adelante
    const el = document.getElementById('dias');
    const fechas = Array.from({ length: 31 }, (_, i) => Orbe.sumarDias(hoy, i - 3));
    el.innerHTML = fechas.map(f => { const d = new Date(f + 'T12:00:00'); return `<button type="button" class="dia ${activas(f).length ? 'con' : ''} ${abre(f) ? '' : 'cerrado'}" data-d="${f}" aria-pressed="${f === dia}" aria-label="${Orbe.fecha(f, { weekday: 'long', day: 'numeric', month: 'long' })}"><small>${f === hoy ? 'hoy' : DIAS[d.getDay()]}</small><b>${d.getDate()}</b><i></i></button>`; }).join('');
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { dia = b.dataset.d; pintar(); });
    const sel = el.querySelector('[aria-pressed="true"]'); if (sel && !pintar._centrado) { el.scrollLeft = Math.max(0, sel.offsetLeft - el.offsetLeft - 16); pintar._centrado = true; }

    document.getElementById('titulo-dia').textContent = dia === hoy ? 'Hoy, ' + Orbe.fecha(dia, { day: 'numeric', month: 'long' }) : Orbe.fecha(dia, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase());
    const lista = document.getElementById('lista');
    if (!D().servicios.length) { lista.innerHTML = `<div class="vacio"><b>Primero, tus servicios</b>Agrega lo que ofreces, cuánto dura y cuánto cuesta.<br><br><button class="btn principal" type="button" id="primeros">Agregar servicios</button></div>`; document.getElementById('primeros').onclick = servicios; return; }
    const cs = citasDe(dia), lb = libres(dia);
    const items = cs.map(c => ({ t: min(c.hora), c })).concat(lb.map(t => ({ t, libre: true })))
      .sort((a, b) => a.t - b.t || (a.libre ? 1 : -1));
    if (!items.length) { lista.innerHTML = `<div class="vacio">${abre(dia) ? 'No quedan horarios libres este día.' : '<b>Día de descanso</b>Este día no atiendes. Puedes cambiarlo en Menú › Horario.'}</div>`; return; }
    lista.innerHTML = items.map(x => {
      if (x.libre) return `<button type="button" class="libre" data-libre="${hhmm(x.t)}"><span class="hora">${hhmm(x.t)}</span><span>Libre · toca para agendar</span></button>`;
      const c = x.c, s = serv(c.servicio);
      return `<button type="button" class="cita ${c.estado}" data-c="${c.id}"><span class="hora">${hhmm(min(c.hora))}<small>${dur(c)} min</small></span><span class="info"><b>${esc(c.cliente)}</b><span>${esc(s?.nombre || 'Cita')}${c.estado === 'hecha' ? ' · atendida ✓' : c.estado === 'cancelada' ? ' · cancelada' : ''}</span></span>${s?.precio ? `<span class="monto">${dinero(s.precio)}</span>` : ''}</button>`;
    }).join('');
    lista.querySelectorAll('[data-libre]').forEach(b => b.onclick = () => nueva(dia, b.dataset.libre));
    lista.querySelectorAll('[data-c]').forEach(b => b.onclick = () => detalle(b.dataset.c));
  }

  function nueva(fecha = dia, hora, c) {
    if (!D().servicios.length) return servicios();
    if (!c && !Orbe.puedeAgregar(D().citas.length)) return;
    const editar = !!c;
    c = c || { cliente: '', tel: '', servicio: D().servicios[0].id, fecha, hora: hora || '', nota: '' };
    const d = hoja({
      titulo: editar ? 'Editar cita' : 'Nueva cita',
      cuerpo: `<div class="fila2"><label class="campo">Cliente<input name="cliente" value="${esc(c.cliente)}" placeholder="Nombre" autocomplete="off" list="clientes"></label><label class="campo">WhatsApp<input name="tel" inputmode="tel" value="${esc(c.tel)}" placeholder="Opcional" autocomplete="off"></label></div>
        <datalist id="clientes">${[...new Map(D().citas.map(x => [x.cliente, x.tel])).keys()].map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <label class="campo">Servicio<select name="servicio">${D().servicios.map(s => `<option value="${s.id}" ${s.id === c.servicio ? 'selected' : ''}>${esc(s.nombre)} · ${s.dur} min${s.precio ? ' · ' + dinero(s.precio) : ''}</option>`).join('')}</select></label>
        <div class="fila2"><label class="campo">Día<input name="fecha" type="date" value="${c.fecha}"></label><label class="campo">Hora<input name="hora" type="time" value="${c.hora}" step="300"></label></div>
        <div class="opciones" data-sug></div>
        <label class="campo">Nota<input name="nota" value="${esc(c.nota)}" placeholder="Opcional" autocomplete="off"></label>
        <p class="texto-ayuda" data-err hidden style="color:var(--mal);font-weight:700"></p>`,
      pie: '<button class="btn principal ancho" type="submit">Guardar cita</button>'
    });
    const f = d.querySelector('form');
    const sug = () => { const l = libres(f.fecha.value).slice(0, 8); d.querySelector('[data-sug]').innerHTML = l.length ? l.map(t => `<button type="button" class="opcion" data-h="${hhmm(t)}" aria-pressed="${f.hora.value === hhmm(t)}">${hhmm(t)}</button>`).join('') : ''; d.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { f.hora.value = b.dataset.h; sug(); }); };
    f.fecha.onchange = sug; f.hora.oninput = sug; sug();
    f.cliente.onchange = () => { const prev = D().citas.slice().reverse().find(x => x.cliente === f.cliente.value && x.tel); if (prev && !f.tel.value) f.tel.value = prev.tel; };
    if (!editar) setTimeout(() => f.cliente.focus(), 250);
    f.onsubmit = e => {
      e.preventDefault();
      const err = m => { const p = d.querySelector('[data-err]'); p.textContent = m; p.hidden = false; };
      if (!f.cliente.value.trim()) return err('Escribe el nombre de la clienta o el cliente.');
      if (!f.fecha.value || !f.hora.value) return err('Elige el día y la hora.');
      const ini = min(f.hora.value), fin = ini + (serv(f.servicio.value)?.dur || 30);
      const choque = activas(f.fecha.value).find(x => x.id !== c.id && ini < min(x.hora) + dur(x) && fin > min(x.hora));
      if (choque && !d._forzar) { d._forzar = true; return err(`Choca con la cita de ${choque.cliente} a las ${choque.hora}. Toca “Guardar” otra vez si igual quieres agendarla.`); }
      Object.assign(c, { cliente: f.cliente.value.trim(), tel: f.tel.value.trim(), servicio: f.servicio.value, fecha: f.fecha.value, hora: f.hora.value, nota: f.nota.value.trim() });
      if (!editar) { c.id = Orbe.uid(); c.estado = 'pendiente'; D().citas.push(c); }
      Orbe.guardar(); dia = c.fecha; d.close(); pintar();
      aviso(editar ? 'Cita actualizada' : `Cita agendada: ${Orbe.fecha(c.fecha, { weekday: 'short', day: 'numeric' })} a las ${c.hora}`);
      if (!editar && c.tel) setTimeout(() => confirmarWa(c), 400);
    };
  }

  function textoCita(c, tipo) {
    const s = serv(c.servicio), neg = D().ajustes.negocio, cuando = `${Orbe.fecha(c.fecha, { weekday: 'long', day: 'numeric', month: 'long' })} a las ${h12(c.hora)}`;
    const nom = c.cliente.split(' ')[0];
    if (tipo === 'confirmar') return `Hola ${nom} 👋 Tu cita${neg ? ` en ${neg}` : ''} quedó agendada:\n\n📅 ${cuando}\n✂️ ${s?.nombre || 'Cita'}${s?.precio ? ` · ${dinero(s.precio)}` : ''}\n\nSi necesitas cambiarla, avísame por aquí. ¡Te espero!`;
    return `Hola ${nom} 👋 Te recuerdo tu cita${neg ? ` en ${neg}` : ''}:\n\n📅 ${cuando}\n✂️ ${s?.nombre || 'Cita'}\n\n¿Me confirmas que vienes? 🙌`;
  }
  function confirmarWa(c) {
    const d = hoja({ titulo: '¿Le avisas por WhatsApp?', cuerpo: `<p class="texto-ayuda" style="font-size:15px">Mándale a ${esc(c.cliente)} la confirmación con el día y la hora.</p>`, pie: `<button type="button" class="btn wa ancho" data-si>${Orbe.ICON.wa} Enviar confirmación</button><button type="button" class="btn ancho" data-no>Ahora no</button>` });
    d.querySelector('[data-si]').onclick = () => { Orbe.whatsapp(c.tel, textoCita(c, 'confirmar')); d.close(); };
    d.querySelector('[data-no]').onclick = () => d.close();
  }

  function detalle(id) {
    const c = D().citas.find(x => x.id === id); if (!c) return;
    const s = serv(c.servicio);
    const d = hoja({
      titulo: c.cliente,
      cuerpo: `<div class="tarjeta"><b style="font:800 26px var(--display);letter-spacing:-.03em">${h12(c.hora)}</b><p class="texto-ayuda" style="margin-top:4px">${Orbe.fecha(c.fecha, { weekday: 'long', day: 'numeric', month: 'long' })} · ${dur(c)} min</p>
          <p style="margin:12px 0 0;font-weight:700">${esc(s?.nombre || 'Cita')}${s?.precio ? ' · ' + dinero(s.precio) : ''}</p>${c.nota ? `<p class="texto-ayuda" style="margin-top:4px">${esc(c.nota)}</p>` : ''}</div>
        ${c.estado === 'pendiente' ? `<button type="button" class="btn wa ancho" data-x="recordar">${Orbe.ICON.wa} Mandar recordatorio</button><div class="acciones2"><button type="button" class="btn principal" data-x="hecha">Ya la atendí ✓</button><button type="button" class="btn" data-x="editar">Cambiar</button></div><button type="button" class="btn peligro ancho" data-x="cancelar">Cancelar cita</button>`
          : `<div class="acciones2"><button type="button" class="btn" data-x="reabrir">Volver a pendiente</button><button type="button" class="btn peligro" data-x="borrar">Borrar</button></div>`}`
    });
    d.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => {
      const x = b.dataset.x;
      if (x === 'recordar') return Orbe.whatsapp(c.tel, textoCita(c, 'recordar'));
      if (x === 'editar') { d.close(); return setTimeout(() => nueva(c.fecha, c.hora, c), 320); }
      if (x === 'borrar') { if (!(await confirmar('Se borrará esta cita.'))) return; D().citas = D().citas.filter(y => y.id !== id); }
      if (x === 'cancelar' && !(await confirmar(`Se cancelará la cita de ${c.cliente} y el horario quedará libre.`, 'Sí, cancelar'))) return;
      if (x === 'hecha') c.estado = 'hecha'; if (x === 'cancelar') c.estado = 'cancelada'; if (x === 'reabrir') c.estado = 'pendiente';
      Orbe.guardar(); d.close(); pintar();
    });
  }

  function servicios() {
    const pintarLista = d => {
      d.querySelector('[data-lista]').innerHTML = D().servicios.length ? D().servicios.map(s => `<div class="serv"><span><b>${esc(s.nombre)}</b><br><small>${s.dur} min${s.precio ? ' · ' + dinero(s.precio) : ''}</small></span><button type="button" class="icono-btn" data-quitar="${s.id}" aria-label="Quitar ${esc(s.nombre)}">${Orbe.ICON.cerrar}</button></div>`).join('') : '<p class="texto-ayuda">Aún no tienes servicios.</p>';
      d.querySelectorAll('[data-quitar]').forEach(b => b.onclick = () => { D().servicios = D().servicios.filter(s => s.id !== b.dataset.quitar); Orbe.guardar(); pintarLista(d); pintar(); });
    };
    const d = hoja({
      titulo: 'Tus servicios',
      cuerpo: `<div class="tarjeta" style="padding:4px 16px" data-lista></div>
        <label class="campo">Servicio<input name="nombre" placeholder="Ej. Manicure semipermanente" autocomplete="off"></label>
        <div class="fila2"><label class="campo">Dura<select name="dur">${[15, 20, 30, 45, 60, 75, 90, 120, 150, 180].map(m => `<option value="${m}" ${m === 60 ? 'selected' : ''}>${m < 60 ? m + ' min' : (m / 60 + ' h').replace('.5', ',5')}</option>`).join('')}</select></label><label class="campo">Precio<input name="precio" inputmode="decimal" placeholder="Opcional"></label></div>`,
      pie: '<button class="btn principal ancho" type="submit">Agregar servicio</button>'
    });
    pintarLista(d);
    const f = d.querySelector('form');
    f.onsubmit = e => {
      e.preventDefault(); if (!f.nombre.value.trim()) return f.nombre.focus();
      D().servicios.push({ id: Orbe.uid(), nombre: f.nombre.value.trim(), dur: +f.dur.value, precio: Orbe.num(f.precio.value) });
      Orbe.guardar(); f.reset(); f.dur.value = 60; pintarLista(d); pintar(); aviso('Servicio agregado'); f.nombre.focus();
    };
  }

  function horario() {
    const a = D().ajustes;
    const d = hoja({
      titulo: 'Tu horario',
      cuerpo: `<p class="texto-ayuda">Días que atiendes</p><div class="opciones">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button type="button" class="opcion" data-dia="${i}" aria-pressed="${a.dias.includes(i)}">${DIAS[i]}</button>`).join('')}</div>
        <div class="fila2"><label class="campo">Abres<input name="desde" type="time" value="${a.desde}"></label><label class="campo">Cierras<input name="hasta" type="time" value="${a.hasta}"></label></div>
        <label class="campo">Ofrecer citas cada<select name="intervalo">${[15, 20, 30, 45, 60].map(m => `<option value="${m}" ${m === a.intervalo ? 'selected' : ''}>${m} minutos</option>`).join('')}</select></label>`,
      pie: '<button class="btn principal ancho" type="submit">Guardar horario</button>'
    });
    d.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'));
    const f = d.querySelector('form');
    f.onsubmit = e => {
      e.preventDefault();
      if (min(f.hasta.value) <= min(f.desde.value)) return aviso('La hora de cierre debe ser después de la de apertura');
      a.dias = [...d.querySelectorAll('[data-dia][aria-pressed="true"]')].map(b => +b.dataset.dia);
      a.desde = f.desde.value; a.hasta = f.hasta.value; a.intervalo = +f.intervalo.value;
      Orbe.guardar(); d.close(); pintar(); aviso('Horario guardado');
    };
  }

  // Enlace público con los horarios libres de los próximos 7 días
  function enlace() {
    const a = D().ajustes;
    if (!D().servicios.length) return servicios();
    if (!String(a.whatsapp || '').replace(/\D/g, '')) {
      const d = hoja({ titulo: 'Tu número de WhatsApp', cuerpo: '<p class="texto-ayuda">Las reservas te llegarán a este número.</p><label class="campo">WhatsApp del negocio<input name="w" inputmode="tel" placeholder="Con código de país, ej. 584121234567"></label>', pie: '<button class="btn principal ancho" type="submit">Continuar</button>' });
      const f = d.querySelector('form'); setTimeout(() => f.w.focus(), 250);
      f.onsubmit = e => { e.preventDefault(); if (f.w.value.replace(/\D/g, '').length < 8) return aviso('Escribe el número completo con código de país'); a.whatsapp = f.w.value.trim(); Orbe.guardar(); d.close(); setTimeout(enlace, 320); };
      return;
    }
    const libresSemana = {};
    for (let i = 0; i < 7; i++) { const f = Orbe.sumarDias(Orbe.hoy(), i), l = libres(f); if (l.length) libresSemana[f] = l; }
    const datos = { n: a.negocio || 'Mi negocio', w: a.whatsapp.replace(/\D/g, ''), m: a.moneda, p: a.intervalo, s: D().servicios.map(s => [s.nombre, s.dur, s.precio || 0]), d: libresSemana };
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(datos)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = new URL('reservar.html', location.href).href + '#' + b64;
    const d = hoja({
      titulo: 'Link para reservar',
      cuerpo: `<p class="texto-ayuda" style="font-size:15px">Tus clientas ven tus servicios y horarios libres de los próximos 7 días, eligen uno y te llega el pedido de cita a tu WhatsApp.</p>
        <div class="enlace-caja">${esc(url)}</div>
        <p class="texto-ayuda"><b>Importante:</b> el link muestra los horarios libres de hoy. Cuando agendes citas nuevas, vuelve a compartirlo (por ejemplo, cada mañana en tus estados).</p>`,
      pie: `<button type="button" class="btn principal ancho" data-copiar>Copiar link</button><button type="button" class="btn wa ancho" data-wa>${Orbe.ICON.wa} Compartir por WhatsApp</button><a class="btn ancho" href="${esc(url)}" target="_blank" rel="noopener">Ver cómo se ve</a>`
    });
    d.querySelector('[data-copiar]').onclick = async () => { try { await navigator.clipboard.writeText(url); aviso('Link copiado. Pégalo en tu bio o estados'); } catch (e) { aviso('No se pudo copiar. Mantén presionado el link para copiarlo.'); } };
    d.querySelector('[data-wa]').onclick = () => Orbe.whatsapp('', `📅 Reserva tu cita${a.negocio ? ' en ' + a.negocio : ''} aquí. Elige el servicio y el horario que te quede mejor:\n${url}`);
  }

  Orbe.iniciar({
    id: 'agenda', nombre: 'Agenda de citas', prefijo: 'AGE', limite: 10, unidad: 'citas', pintar,
    icono: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M9 14.5l2 2 4-4"/></svg>',
    extrasMenu: `<button type="button" class="fila" data-a="servicios"><span class="info"><b>Servicios y precios</b><span>Lo que ofreces y cuánto dura</span></span></button>
      <button type="button" class="fila" data-a="horario"><span class="info"><b>Horario</b><span>Días y horas que atiendes</span></span></button>
      <button type="button" class="fila" data-a="enlace"><span class="info"><b>Link para reservar</b><span>Para tu bio y tus estados</span></span></button>`,
    alAccion: x => x === 'servicios' ? (servicios(), true) : x === 'horario' ? (horario(), true) : x === 'enlace' ? (enlace(), true) : false,
    ajustesExtra: a => `<label class="campo">WhatsApp del negocio<input name="whatsapp" inputmode="tel" value="${esc(a.whatsapp || '')}" placeholder="Con código de país"><small>Ahí te llegan los pedidos de cita del link.</small></label>`,
    guardarAjustes: (a, f) => { a.whatsapp = f.whatsapp.value.trim(); }
  }, { servicios: [], citas: [], ajustes: { negocio: '', moneda: '$', dias: [1, 2, 3, 4, 5, 6], desde: '09:00', hasta: '18:00', intervalo: 30, whatsapp: '' } });
  document.getElementById('nuevo').onclick = () => nueva(dia);
  document.getElementById('btn-link').onclick = enlace;
})();
