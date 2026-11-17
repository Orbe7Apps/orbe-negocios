(function () {
  const { esc, dinero, hoja, aviso, confirmar } = Orbe;
  let filtro = 'deben', busca = '';

  const saldo = c => c.movs.reduce((s, m) => s + (m.tipo === 'fiado' ? m.monto : -m.monto), 0);
  // Fecha del fiado más viejo que todavía no se ha pagado (los abonos pagan primero lo más viejo)
  function desde(c) {
    const fi = c.movs.filter(m => m.tipo === 'fiado').sort((a, b) => a.fecha.localeCompare(b.fecha)).map(m => ({ ...m }));
    let ab = c.movs.filter(m => m.tipo === 'abono').reduce((s, m) => s + m.monto, 0);
    for (const f of fi) { if (ab >= f.monto - 0.004) { ab -= f.monto; continue; } return f.fecha; }
    return null;
  }
  const ultimo = c => c.movs.reduce((u, m) => (m.fecha > u ? m.fecha : u), '');
  const inicial = n => (n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('') || '?').toUpperCase();
  const cliente = id => Orbe.datos.clientes.find(c => c.id === id);
  const diasTxt = d => d === 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${d} días`;

  function pintar() {
    const cs = Orbe.datos.clientes;
    const total = cs.reduce((s, c) => s + Math.max(0, saldo(c)), 0);
    const deben = cs.filter(c => saldo(c) > 0.004);
    const mes = Orbe.hoy().slice(0, 7);
    const cobrado = cs.flatMap(c => c.movs).filter(m => m.tipo === 'abono' && m.fecha.startsWith(mes)).reduce((s, m) => s + m.monto, 0);
    const viejos = deben.filter(c => Orbe.diasEntre(desde(c), Orbe.hoy()) >= 15).length;
    document.getElementById('resumen').innerHTML = `
      <div class="dato destacado"><small>Te deben</small><b>${dinero(total)}</b></div>
      <div class="dato"><small>Clientes con deuda</small><b>${deben.length}</b></div>
      <div class="dato"><small>Cobrado este mes</small><b>${dinero(cobrado)}</b></div>
      <div class="dato"><small>Más de 15 días</small><b style="color:${viejos ? 'var(--mal)' : 'inherit'}">${viejos}</b></div>`;
    const fs = [['deben', `Deben (${deben.length})`], ['aldia', 'Al día'], ['todos', `Todos (${cs.length})`]];
    document.getElementById('filtros').innerHTML = fs.map(([k, t]) => `<button class="pestana" type="button" data-f="${k}" aria-pressed="${filtro === k}">${t}</button>`).join('');
    document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; pintar(); });

    let lista = cs.filter(c => filtro === 'todos' || (filtro === 'deben' ? saldo(c) > 0.004 : saldo(c) <= 0.004));
    if (busca) lista = lista.filter(c => c.nombre.toLowerCase().includes(busca));
    lista.sort((a, b) => saldo(b) - saldo(a) || a.nombre.localeCompare(b.nombre));
    const el = document.getElementById('lista');
    if (!cs.length) { el.innerHTML = '<div class="vacio"><b>Tu cuaderno está vacío</b>Toca “Anotar fiado” para apuntar lo primero que te deben.</div>'; return; }
    if (!lista.length) { el.innerHTML = `<div class="vacio">${busca ? 'No hay clientes con ese nombre.' : filtro === 'deben' ? '<b>Nadie te debe 🎉</b>Todos tus clientes están al día.' : 'No hay clientes aquí.'}</div>`; return; }
    el.innerHTML = lista.map(c => {
      const s = saldo(c), d = desde(c), dias = d ? Orbe.diasEntre(d, Orbe.hoy()) : 0;
      const chip = s > 0.004 ? `<span class="chip ${dias >= 30 ? 'mal' : dias >= 15 ? 'warn' : ''}">debe desde ${diasTxt(dias)}</span>` : '<span class="chip ok">al día</span>';
      return `<button class="fila" type="button" data-c="${c.id}"><span class="inicial">${esc(inicial(c.nombre))}</span><span class="info"><b>${esc(c.nombre)}</b><span>${chip}</span></span><span class="monto" style="color:${s > 0.004 ? 'inherit' : 'var(--ok)'}">${dinero(Math.max(0, s))}</span></button>`;
    }).join('');
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => detalle(b.dataset.c));
  }

  function opcionesClientes(sel) {
    return Orbe.datos.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');
  }

  // Anotar fiado o abono
  function anotar(tipo = 'fiado', idCliente) {
    const d = hoja({
      titulo: tipo === 'fiado' ? 'Anotar fiado' : 'Registrar abono',
      cuerpo: `
        <div class="opciones" role="group" aria-label="Tipo"><button type="button" class="opcion" data-t="fiado" aria-pressed="${tipo === 'fiado'}">Fió</button><button type="button" class="opcion" data-t="abono" aria-pressed="${tipo === 'abono'}">Abonó</button></div>
        <label class="campo">Cliente
          <select name="cliente"><option value="__nuevo">+ Cliente nuevo</option>${opcionesClientes(idCliente)}</select></label>
        <div data-nuevo class="fila2"><label class="campo">Nombre<input name="nombre" placeholder="Ej. Sra. Carmen" autocomplete="off"></label><label class="campo">WhatsApp<input name="tel" inputmode="tel" placeholder="Con código de país" autocomplete="off"></label></div>
        <label class="campo">Monto<input name="monto" inputmode="decimal" placeholder="0" autocomplete="off"></label>
        <label class="campo" data-det>Qué se llevó<input name="detalle" placeholder="Ej. 2 harinas y 1 aceite" autocomplete="off"></label>
        <label class="campo">Fecha<input name="fecha" type="date" value="${Orbe.hoy()}"></label>
        <p class="texto-ayuda" data-err hidden style="color:var(--mal);font-weight:700"></p>`,
      pie: '<button class="btn principal ancho" type="submit">Guardar</button>'
    });
    const f = d.querySelector('form');
    f.cliente.value = idCliente || '__nuevo';
    const ver = () => { d.querySelector('[data-nuevo]').hidden = f.cliente.value !== '__nuevo'; d.querySelector('[data-det] ').firstChild.textContent = tipo === 'fiado' ? 'Qué se llevó' : 'Nota (opcional)'; f.detalle.placeholder = tipo === 'fiado' ? 'Ej. 2 harinas y 1 aceite' : 'Ej. Pagó por Zelle'; d.querySelector('h2').textContent = tipo === 'fiado' ? 'Anotar fiado' : 'Registrar abono'; };
    d.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tipo = b.dataset.t; d.querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-pressed', x === b)); ver(); });
    f.cliente.onchange = ver; ver();
    setTimeout(() => (f.cliente.value === '__nuevo' ? f.nombre : f.monto).focus(), 250);
    f.onsubmit = e => {
      e.preventDefault();
      const err = m => { const p = d.querySelector('[data-err]'); p.textContent = m; p.hidden = false; };
      const monto = Orbe.num(f.monto.value);
      if (monto <= 0) return err('Escribe un monto mayor que cero.');
      let c;
      if (f.cliente.value === '__nuevo') {
        const nombre = f.nombre.value.trim(); if (!nombre) return err('Escribe el nombre del cliente.');
        if (!Orbe.puedeAgregar(Orbe.datos.clientes.length)) return;
        c = { id: Orbe.uid(), nombre, tel: f.tel.value.trim(), movs: [] }; Orbe.datos.clientes.push(c);
      } else c = cliente(f.cliente.value);
      if (tipo === 'abono' && monto > saldo(c) + 0.004) return err(`${c.nombre} solo debe ${dinero(Math.max(0, saldo(c)))}.`);
      c.movs.push({ id: Orbe.uid(), tipo, monto, detalle: f.detalle.value.trim(), fecha: f.fecha.value || Orbe.hoy() });
      Orbe.guardar(); d.close(); pintar();
      aviso(tipo === 'fiado' ? `Anotado: ${c.nombre} debe ${dinero(saldo(c))}` : saldo(c) <= 0.004 ? `${c.nombre} quedó al día 🎉` : `Abono guardado. Debe ${dinero(saldo(c))}`);
      if (document.querySelector('dialog[data-detalle]')) { document.querySelector('dialog[data-detalle]').close(); setTimeout(() => detalle(c.id), 320); }
    };
  }

  function recordatorio(c) {
    const s = saldo(c), neg = Orbe.datos.ajustes.negocio;
    const pend = c.movs.filter(m => m.tipo === 'fiado' && m.fecha >= (desde(c) || '')).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-6);
    const det = pend.map(m => `• ${Orbe.fecha(m.fecha)}: ${m.detalle || 'compra'} — ${dinero(m.monto)}`).join('\n');
    return `Hola ${c.nombre.split(' ')[0]} 👋${neg ? ` Te escribo de ${neg}.` : ''}\nTe paso tu cuenta pendiente: *${dinero(s)}*\n\n${det}\n\nCuando puedas me avisas por aquí. ¡Gracias por tu confianza! 🙌`;
  }

  function detalle(id) {
    const c = cliente(id); if (!c) return;
    const s = saldo(c), movs = c.movs.slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || 0);
    const d = hoja({
      titulo: c.nombre,
      cuerpo: `
        <div class="tarjeta"><small style="color:var(--muted);font-weight:700">${s > 0.004 ? 'Debe' : 'Saldo'}</small><div class="saldo-grande" style="color:${s > 0.004 ? 'inherit' : 'var(--ok)'}">${dinero(Math.max(0, s))}</div>
          ${s > 0.004 ? `<p class="texto-ayuda" style="margin-top:6px">Desde el ${Orbe.fecha(desde(c), { day: 'numeric', month: 'long' })} · ${diasTxt(Orbe.diasEntre(desde(c), Orbe.hoy()))}</p>` : '<p class="texto-ayuda" style="margin-top:6px">Está al día ✓</p>'}</div>
        <div class="acciones3"><button type="button" class="btn" data-x="fiado">${Orbe.ICON.mas} Fió</button><button type="button" class="btn principal" data-x="abono" ${s > 0.004 ? '' : 'disabled style="opacity:.5"'}>Abonó</button></div>
        ${s > 0.004 ? `<button type="button" class="btn wa ancho" data-x="wa">${Orbe.ICON.wa} Mandar cuenta por WhatsApp</button>` : ''}
        <div class="tarjeta" style="padding:6px 16px"><h3 style="font-size:15px;padding:10px 0 4px">Movimientos</h3>
          ${movs.length ? movs.map(m => `<div class="mov"><div class="info"><b>${m.tipo === 'fiado' ? esc(m.detalle || 'Fiado') : 'Abono' + (m.detalle ? ' · ' + esc(m.detalle) : '')}</b><span>${Orbe.fecha(m.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div><span class="monto" style="color:${m.tipo === 'abono' ? 'var(--ok)' : 'inherit'}">${m.tipo === 'abono' ? '−' : '+'}${dinero(m.monto)}</span><button type="button" class="borrar" data-borrar="${m.id}" aria-label="Borrar movimiento">${Orbe.ICON.cerrar.replace('<svg', '<svg width="16" height="16"')}</button></div>`).join('') : '<p class="texto-ayuda" style="padding:8px 0 14px">Sin movimientos.</p>'}
        </div>
        <div class="acciones3"><button type="button" class="btn" data-x="editar">Editar datos</button><button type="button" class="btn peligro" data-x="eliminar">Eliminar</button></div>`
    });
    d.dataset.detalle = '1';
    d.querySelector('[data-x="fiado"]').onclick = () => anotar('fiado', c.id);
    d.querySelector('[data-x="abono"]').onclick = () => s > 0.004 && anotar('abono', c.id);
    const w = d.querySelector('[data-x="wa"]'); if (w) w.onclick = () => Orbe.whatsapp(c.tel, recordatorio(c));
    d.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
      if (!(await confirmar('Se borrará este movimiento y cambiará el saldo.'))) return;
      c.movs = c.movs.filter(m => m.id !== b.dataset.borrar); Orbe.guardar(); d.close(); pintar(); setTimeout(() => detalle(c.id), 320);
    });
    d.querySelector('[data-x="editar"]').onclick = () => { d.close(); setTimeout(() => editar(c), 320); };
    d.querySelector('[data-x="eliminar"]').onclick = async () => {
      if (!(await confirmar(`Se borrará a ${c.nombre} con todos sus movimientos.`))) return;
      Orbe.datos.clientes = Orbe.datos.clientes.filter(x => x.id !== c.id); Orbe.guardar(); d.close(); pintar(); aviso('Cliente eliminado');
    };
  }

  function editar(c) {
    const d = hoja({ titulo: 'Editar cliente', cuerpo: `<label class="campo">Nombre<input name="nombre" value="${esc(c.nombre)}"></label><label class="campo">WhatsApp<input name="tel" inputmode="tel" value="${esc(c.tel)}" placeholder="Con código de país, ej. 58412..."><small>Así el recordatorio se abre directo en su chat.</small></label>`, pie: '<button class="btn principal ancho" type="submit">Guardar</button>' });
    const f = d.querySelector('form');
    f.onsubmit = e => { e.preventDefault(); if (!f.nombre.value.trim()) return; c.nombre = f.nombre.value.trim(); c.tel = f.tel.value.trim(); Orbe.guardar(); d.close(); pintar(); setTimeout(() => detalle(c.id), 320); };
  }

  Orbe.iniciar({
    id: 'fiados', nombre: 'Cuaderno de fiados', prefijo: 'FIA', limite: 3, unidad: 'clientes', pintar,
    icono: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/><circle cx="17" cy="15.5" r="3.2"/></svg>'
  }, { clientes: [] });
  document.getElementById('nuevo').onclick = () => anotar('fiado');
  document.getElementById('buscar').oninput = e => { busca = e.target.value.trim().toLowerCase(); pintar(); };
})();
