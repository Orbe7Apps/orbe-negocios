(function () {
  const { esc, dinero, hoja, aviso, confirmar, ICON } = Orbe;
  const D = () => Orbe.datos;
  let filtro = 'deben', busca = '', tipoHist = 'todos';

  const saldo = c => c.movs.reduce((s, m) => s + (m.tipo === 'fiado' ? m.monto : -m.monto), 0);
  const ordenados = c => c.movs.slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.tipo === 'fiado' ? -1 : 1));
  // Recorre la cuenta: los abonos pagan primero lo más viejo. Da la fecha de lo que sigue sin pagar y los días que tardó en pagar cada fiado.
  function cuenta(c) {
    const cola = []; const tiempos = [];
    for (const m of ordenados(c)) {
      if (m.tipo === 'fiado') { cola.push({ f: m.fecha, r: m.monto }); continue; }
      let a = m.monto;
      while (a > 0.004 && cola.length) { const x = cola[0], p = Math.min(a, x.r); x.r -= p; a -= p; if (x.r <= 0.004) { tiempos.push(Orbe.diasEntre(x.f, m.fecha)); cola.shift(); } }
    }
    return { desde: cola[0]?.f || null, promedio: tiempos.length ? Math.round(tiempos.reduce((s, x) => s + x, 0) / tiempos.length) : null, pagos: tiempos.length };
  }
  const cliente = id => D().clientes.find(c => c.id === id);
  const debe = c => saldo(c) > 0.004;
  const dias = c => { const d = cuenta(c).desde; return d ? Orbe.diasEntre(d, Orbe.hoy()) : 0; };
  const fama = c => { const k = cuenta(c); if (k.promedio === null) return null; return k.promedio <= 10 ? ['ok', `Suele pagar en ${k.promedio} días`] : k.promedio <= 25 ? ['warn', `Tarda unos ${k.promedio} días`] : ['mal', `Tarda más de ${k.promedio} días`]; };
  const todosMovs = () => D().clientes.flatMap(c => c.movs.map(m => ({ ...m, c })));

  function pintar() {
    const v = document.getElementById('vista');
    if (Orbe.vista === 'hoy') pintarHoy(v); else if (Orbe.vista === 'clientes') pintarClientes(v); else pintarHistorial(v);
  }

  function pintarHoy(v) {
    const cs = D().clientes, deudores = cs.filter(debe), total = deudores.reduce((s, c) => s + saldo(c), 0);
    const mes = Orbe.hoy().slice(0, 7), movs = todosMovs();
    const cobrado = movs.filter(m => m.tipo === 'abono' && m.fecha.startsWith(mes)).reduce((s, m) => s + m.monto, 0);
    const viejos = deudores.filter(c => dias(c) >= 15);
    const barras = Array.from({ length: 14 }, (_, i) => { const f = Orbe.sumarDias(Orbe.hoy(), i - 13); return movs.filter(m => m.tipo === 'abono' && m.fecha === f).reduce((s, m) => s + m.monto, 0); });
    const maxB = Math.max(...barras, 0.01);
    const tareas = [];
    viejos.sort((a, b) => saldo(b) - saldo(a)).slice(0, 3).forEach(c => tareas.push({ color: 'var(--out)', icono: ICON.campana, titulo: `Cobrarle a ${esc(c.nombre)}: ${dinero(saldo(c))}`, sub: `Debe desde ${Orbe.hace(cuenta(c).desde)}. Mándale su cuenta por WhatsApp.`, accion: () => recordar(c) }));
    cs.filter(c => c.limite && saldo(c) > c.limite).forEach(c => tareas.push({ color: 'var(--warn)', icono: ICON.alerta, titulo: `${esc(c.nombre)} pasó su límite`, sub: `Debe ${dinero(saldo(c))} y su límite es ${dinero(c.limite)}.`, accion: () => detalle(c.id) }));
    const recientes = movs.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
    v.innerHTML = `<div class="entra">
      ${Orbe.hero({ etiqueta: `Lo que te deben ${deudores.length} ${deudores.length === 1 ? 'cliente' : 'clientes'}`, monto: total, pildora: viejos.length ? { c: 'mal', t: `${viejos.length} con más de 15 días` } : { c: 'bien', t: 'Ninguna deuda vieja' },
        anillo: { p: cobrado + total ? cobrado / (cobrado + total) : 0, t: `${cobrado + total ? Math.round(cobrado / (cobrado + total) * 100) : 0}%`, sub: 'cobrado del mes', c: 'var(--c)' },
        barras: barras.map(x => x / maxB),
        chips: [{ t: 'Cobrado', v: dinero(cobrado) }, { t: 'Fiado',  v: dinero(movs.filter(m => m.tipo === 'fiado' && m.fecha.startsWith(mes)).reduce((s, m) => s + m.monto, 0)) }, { t: 'Más vieja', v: deudores.length ? Math.max(...deudores.map(dias)) + ' días' : '—' }] })}
      <section class="seccion"><div class="seccion-cab"><h2>Para hacer hoy</h2>${tareas.length ? `<span class="cuenta">${tareas.length}</span>` : ''}</div>${Orbe.tareas(tareas, 'Nadie tiene deudas viejas. Buen trabajo.')}</section>
      <section class="seccion"><div class="seccion-cab"><h2>Últimos movimientos</h2><button class="enlace" type="button" data-ir="historial">Ver todo</button></div>
        ${recientes.length ? `<div class="tarjeta">${recientes.map(filaMov).join('')}</div>` : '<div class="vacio"><b>Tu cuaderno está vacío</b>Toca + para anotar lo primero que te deben.</div>'}</section></div>`;
    Orbe.activarTareas(v, tareas);
    v.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => Orbe.ir(b.dataset.ir));
    v.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => detalle(b.dataset.cm));
  }
  const filaMov = m => `<button type="button" class="tarea" data-cm="${m.c.id}"><span class="ini" style="width:38px;height:38px;border-radius:12px;font-size:13px;background:${Orbe.color(m.c.nombre)}">${esc(Orbe.iniciales(m.c.nombre))}</span><span class="info"><b>${esc(m.c.nombre)}</b><span>${m.tipo === 'fiado' ? esc(m.detalle || 'Fiado') : 'Abono' + (m.detalle ? ' / ' + esc(m.detalle) : '')} / ${Orbe.hace(m.fecha)}</span></span><span class="monto" style="color:${m.tipo === 'abono' ? 'var(--in)' : 'inherit'}">${m.tipo === 'abono' ? '−' : '+'}${dinero(m.monto)}</span></button>`;

  function pintarClientes(v) {
    const cs = D().clientes;
    const n = { deben: cs.filter(debe).length, aldia: cs.filter(c => !debe(c)).length };
    let lista = cs.filter(c => filtro === 'todos' || (filtro === 'deben' ? debe(c) : !debe(c)));
    if (busca) lista = lista.filter(c => c.nombre.toLowerCase().includes(busca));
    lista.sort((a, b) => saldo(b) - saldo(a) || a.nombre.localeCompare(b.nombre));
    const maxS = Math.max(...cs.map(saldo), 1);
    v.innerHTML = `<label class="buscar">${ICON.buscar}<input id="buscar" type="search" placeholder="Buscar entre ${cs.length} clientes" value="${esc(busca)}" aria-label="Buscar cliente"></label>
      <div class="pestanas">${[['deben', 'Deben', n.deben, 'var(--out)'], ['aldia', 'Al día', n.aldia, 'var(--in)'], ['todos', 'Todos', cs.length, 'var(--muted)']].map(([k, t, x, c]) => `<button class="pestana" type="button" data-f="${k}" aria-pressed="${filtro === k}"><i style="background:${c}"></i>${t} <em>${x}</em></button>`).join('')}</div>
      <section class="seccion"><div class="lista entra" id="lista">${lista.length ? lista.map(c => {
        const s = saldo(c), d = dias(c), f = fama(c);
        const col = d >= 30 ? 'var(--out)' : d >= 15 ? 'var(--warn)' : 'var(--in)';
        return `<button class="fila toque" type="button" data-c="${c.id}">${Orbe.ini(c.nombre)}<span class="info"><b>${esc(c.nombre)}</b>
          ${s > 0.004 ? `<div class="progreso"><i style="width:${Math.max(4, s / maxS * 100)}%;background:${col}"></i></div><span>Debe desde ${Orbe.hace(cuenta(c).desde)}${f ? ' / ' + f[1].toLowerCase() : ''}</span>` : `<span>Al día${f ? ' / ' + f[1].toLowerCase() : ''}</span>`}</span>
          <span class="derecha"><span class="monto" style="color:${s > 0.004 ? col : 'var(--in)'}">${dinero(Math.max(0, s))}</span>${c.limite ? `<small>de ${dinero(c.limite)}</small>` : ''}</span></button>`;
      }).join('') : `<div class="vacio">${busca ? 'No hay clientes con ese nombre.' : filtro === 'deben' ? '<b>Nadie te debe</b>Todos tus clientes están al día.' : 'No hay clientes aquí todavía.'}</div>`}</div></section>`;
    const inp = document.getElementById('buscar');
    inp.oninput = e => { busca = e.target.value.trim().toLowerCase(); const p = inp.selectionStart; pintarClientes(v); const n2 = document.getElementById('buscar'); n2.focus(); n2.setSelectionRange(p, p); };
    v.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; pintarClientes(v); });
    v.querySelectorAll('[data-c]').forEach(b => b.onclick = () => detalle(b.dataset.c));
  }

  function pintarHistorial(v) {
    let movs = todosMovs().sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (tipoHist !== 'todos') movs = movs.filter(m => m.tipo === tipoHist);
    // cobros de las últimas 8 semanas
    const sem = Array.from({ length: 8 }, (_, i) => { const fin = Orbe.sumarDias(Orbe.hoy(), -7 * (7 - i)), ini = Orbe.sumarDias(fin, -6); return { ini, fin, v: todosMovs().filter(m => m.tipo === 'abono' && m.fecha >= ini && m.fecha <= fin).reduce((s, m) => s + m.monto, 0) }; });
    const grupos = {}; movs.slice(0, 120).forEach(m => (grupos[m.fecha] = grupos[m.fecha] || []).push(m));
    v.innerHTML = `<section class="seccion" style="margin-top:14px"><div class="tarjeta p"><div class="seccion-cab" style="margin:0"><h2 style="font-size:16px">Cobrado por semana</h2><b class="num">${dinero(sem.reduce((s, x) => s + x.v, 0))}</b></div>${Orbe.grafico(sem.map(x => x.v), sem.map(x => Orbe.fecha(x.ini, { day: 'numeric' })))}</div></section>
      <div class="segmento">${[['todos', 'Todo'], ['fiado', 'Fiados'], ['abono', 'Abonos']].map(([k, t]) => `<button type="button" data-t="${k}" aria-pressed="${tipoHist === k}">${t}</button>`).join('')}</div>
      <div class="entra">${Object.keys(grupos).length ? Object.entries(grupos).map(([f, ms]) => `<section class="seccion" style="margin-top:16px"><div class="seccion-cab" style="margin-bottom:6px"><h2 style="font-size:14px;color:var(--muted);font-weight:600">${Orbe.fecha(f, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, x => x.toUpperCase())}</h2></div><div class="tarjeta">${ms.map(filaMov).join('')}</div></section>`).join('') : '<div class="vacio" style="margin-top:16px">Sin movimientos todavía.</div>'}</div>`;
    v.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tipoHist = b.dataset.t; pintarHistorial(v); });
    v.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => detalle(b.dataset.cm));
  }

  function anotar(tipo = 'fiado', idCliente) {
    const d = hoja({
      titulo: tipo === 'fiado' ? 'Anotar fiado' : 'Registrar abono',
      cuerpo: `<div class="segmento" style="margin:0"><button type="button" data-t="fiado" aria-pressed="${tipo === 'fiado'}">Se llevó fiado</button><button type="button" data-t="abono" aria-pressed="${tipo === 'abono'}">Me abonó</button></div>
        <label class="campo">Monto<input name="monto" class="grande" inputmode="decimal" placeholder="${esc(Orbe.simbolo())}0" autocomplete="off"></label>
        <label class="campo">Cliente<select name="cliente"><option value="__nuevo">+ Cliente nuevo</option>${D().clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(c => `<option value="${c.id}" ${c.id === idCliente ? 'selected' : ''}>${esc(c.nombre)}${debe(c) ? ' / debe ' + dinero(saldo(c)) : ''}</option>`).join('')}</select></label>
        <div data-nuevo class="fila2"><label class="campo">Nombre<input name="nombre" placeholder="Ej. Sra. Carmen" autocomplete="off"></label><label class="campo">WhatsApp<input name="tel" inputmode="tel" placeholder="Opcional" autocomplete="off"></label></div>
        <label class="campo" data-det><span data-det-t>Qué se llevó</span><input name="detalle" placeholder="Ej. 2 harinas y 1 aceite" autocomplete="off"></label>
        <label class="campo">Fecha<input name="fecha" type="date" value="${Orbe.hoy()}"></label>
        <div data-aviso></div>`,
      pie: '<button class="btn principal ancho" type="submit">Guardar</button>'
    });
    const f = d.querySelector('form');
    const ver = () => {
      d.querySelector('[data-nuevo]').hidden = f.cliente.value !== '__nuevo';
      d.querySelector('[data-det-t]').textContent = tipo === 'fiado' ? 'Qué se llevó' : 'Nota (opcional)';
      f.detalle.placeholder = tipo === 'fiado' ? 'Ej. 2 harinas y 1 aceite' : 'Ej. Pagó por transferencia';
      d.querySelector('h2').textContent = tipo === 'fiado' ? 'Anotar fiado' : 'Registrar abono';
      const c = cliente(f.cliente.value), av = d.querySelector('[data-aviso]');
      av.innerHTML = c && tipo === 'fiado' && c.limite ? `<p class="texto-ayuda">${esc(c.nombre)} debe ${dinero(saldo(c))} de un límite de ${dinero(c.limite)}.</p>` : c && tipo === 'abono' ? `<p class="texto-ayuda">${esc(c.nombre)} debe ${dinero(Math.max(0, saldo(c)))}. <button type="button" class="enlace" data-todo>Pagó todo</button></p>` : '';
      const t = av.querySelector('[data-todo]'); if (t) t.onclick = () => { f.monto.value = String(Math.round(saldo(c) * 100) / 100).replace('.', ','); };
    };
    d.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tipo = b.dataset.t; d.querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-pressed', x === b)); ver(); });
    f.cliente.onchange = ver; ver();
    f.onsubmit = e => {
      e.preventDefault();
      const monto = Orbe.num(f.monto.value);
      if (monto <= 0) return Orbe.error(d, 'Escribe un monto mayor que cero.');
      let c = cliente(f.cliente.value);
      if (!c) {
        const nombre = f.nombre.value.trim(); if (!nombre) return Orbe.error(d, 'Escribe el nombre del cliente.');
        if (tipo === 'abono') return Orbe.error(d, 'Un cliente nuevo no puede abonar todavía. Anota primero lo que se llevó.');
        if (!Orbe.puedeAgregar()) return d.close();
        c = { id: Orbe.uid(), nombre, tel: f.tel.value.trim(), limite: 0, movs: [] }; D().clientes.push(c);
      }
      if (tipo === 'abono' && monto > saldo(c) + 0.004) return Orbe.error(d, `${c.nombre} solo debe ${dinero(Math.max(0, saldo(c)))}.`);
      const antes = saldo(c);
      c.movs.push({ id: Orbe.uid(), tipo, monto, detalle: f.detalle.value.trim(), fecha: f.fecha.value || Orbe.hoy() });
      Orbe.guardar(); d.close(); Orbe.pintarDemo(); pintar();
      document.querySelector('dialog[data-detalle]')?.close();
      if (tipo === 'fiado') {
        aviso(`Anotado. ${c.nombre} debe ${dinero(saldo(c))}`);
        if (c.limite && saldo(c) > c.limite && antes <= c.limite) setTimeout(() => aviso(`Ojo: ${c.nombre} pasó su límite de ${dinero(c.limite)}`), 2700);
      } else setTimeout(() => recibo(c, monto), 350);
    };
  }

  function recibo(c, monto) {
    const s = saldo(c), neg = D().ajustes.negocio;
    const d = hoja({ titulo: s <= 0.004 ? `${c.nombre} quedó al día` : 'Abono guardado', cuerpo: `<div class="tarjeta p" style="text-align:center"><small class="texto-ayuda">Recibido</small><div class="monto-xl">${Orbe.montoHTML(monto)}</div><p class="texto-ayuda" style="margin-top:6px">${s <= 0.004 ? 'Ya no debe nada.' : `Ahora debe ${dinero(s)}.`}</p></div><p class="texto-ayuda">Mándale el recibo para que quede constancia. Da confianza y evita discusiones.</p>`,
      pie: `<button type="button" class="btn wa ancho" data-si>${ICON.wa} Enviar recibo por WhatsApp</button><button type="button" class="btn ancho" data-no>Listo</button>` });
    d.querySelector('[data-si]').onclick = () => { Orbe.whatsapp(c.tel, `Hola ${c.nombre.split(' ')[0]}, recibimos tu abono de *${dinero(monto)}*${neg ? ` en ${neg}` : ''} el ${Orbe.fecha(Orbe.hoy(), { day: 'numeric', month: 'long' })}.\n${s <= 0.004 ? 'Tu cuenta quedó en cero. ¡Gracias!' : `Tu saldo pendiente es de *${dinero(s)}*. ¡Gracias!`}`); d.close(); };
    d.querySelector('[data-no]').onclick = () => d.close();
  }

  function textoCuenta(c, tono) {
    const s = saldo(c), neg = D().ajustes.negocio, k = cuenta(c);
    const pend = ordenados(c).filter(m => m.tipo === 'fiado' && m.fecha >= (k.desde || '')).slice(-8);
    const det = pend.map(m => `• ${Orbe.fecha(m.fecha)}: ${m.detalle || 'compra'} — ${dinero(m.monto)}`).join('\n');
    const nom = c.nombre.split(' ')[0];
    if (tono === 'directo') return `Hola ${nom}.${neg ? ` Te escribo de ${neg}.` : ''} Tienes un saldo pendiente de *${dinero(s)}* desde el ${Orbe.fecha(k.desde, { day: 'numeric', month: 'long' })}:\n\n${det}\n\n¿Me confirmas qué día puedes pagarlo? Gracias.`;
    return `Hola ${nom}, ¿cómo estás?${neg ? ` Te escribo de ${neg}.` : ''}\nTe paso tu cuenta para que la tengas a mano: *${dinero(s)}*\n\n${det}\n\nCuando puedas me avisas por aquí. ¡Gracias por tu confianza!`;
  }
  function recordar(c) {
    let tono = 'amable';
    const d = hoja({ titulo: `Cuenta de ${c.nombre}`, cuerpo: `<div class="segmento" style="margin:0"><button type="button" data-tono="amable" aria-pressed="true">Amable</button><button type="button" data-tono="directo" aria-pressed="false">Directo</button></div><div class="mensaje-wa" style="" data-texto></div>${c.tel ? '' : '<p class="texto-ayuda">No tiene WhatsApp guardado: elegirás el chat al enviar.</p>'}`,
      pie: `<button type="button" class="btn wa ancho" data-enviar>${ICON.wa} Enviar por WhatsApp</button>` });
    const pon = () => d.querySelector('[data-texto]').textContent = textoCuenta(c, tono); pon();
    d.querySelectorAll('[data-tono]').forEach(b => b.onclick = () => { tono = b.dataset.tono; d.querySelectorAll('[data-tono]').forEach(x => x.setAttribute('aria-pressed', x === b)); pon(); });
    d.querySelector('[data-enviar]').onclick = () => { Orbe.whatsapp(c.tel, textoCuenta(c, tono)); c.ultimoAviso = Orbe.hoy(); Orbe.guardar(); d.close(); };
  }

  function detalle(id) {
    const c = cliente(id); if (!c) return;
    const s = saldo(c), k = cuenta(c), f = fama(c), movs = ordenados(c).reverse();
    const d = hoja({
      titulo: c.nombre,
      cuerpo: `${Orbe.hero({ etiqueta: s > 0.004 ? 'Debe' : 'Saldo', monto: Math.max(0, s), pildora: s > 0.004 ? { c: dias(c) >= 15 ? 'mal' : '', t: `Desde ${Orbe.hace(k.desde)}` } : { c: 'bien', t: 'Al día' },
          anillo: c.limite ? { p: Math.min(1, s / c.limite), t: Math.round(s / c.limite * 100) + '%', sub: 'de su límite', c: s > c.limite ? '#ff6b8b' : 'var(--c)' } : null,
          chips: [{ t: 'Pagos completos', v: k.pagos }, { t: 'Suele pagar en', v: k.promedio === null ? '—' : k.promedio + ' días' }, { t: 'Último aviso', v: c.ultimoAviso ? Orbe.hace(c.ultimoAviso) : '—' }] })}
        ${f ? `<span class="chip ${f[0]}" style="align-self:flex-start">${f[1]}</span>` : ''}
        <div class="dos"><button type="button" class="btn" data-x="fiado">${ICON.mas} Fió</button><button type="button" class="btn principal" data-x="abono" ${s > 0.004 ? '' : 'disabled'}>Abonó</button></div>
        ${s > 0.004 ? `<button type="button" class="btn wa ancho" data-x="wa">${ICON.wa} Mandar su cuenta</button>` : ''}
        <div class="tarjeta"><h3 style="font-size:15px;padding:12px 0 2px">Movimientos</h3>
          ${movs.length ? movs.map(m => `<div class="mov"><div class="info"><b>${m.tipo === 'fiado' ? esc(m.detalle || 'Fiado') : 'Abono' + (m.detalle ? ' / ' + esc(m.detalle) : '')}</b><span>${Orbe.fecha(m.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div><span class="monto" style="color:${m.tipo === 'abono' ? 'var(--in)' : 'inherit'}">${m.tipo === 'abono' ? '−' : '+'}${dinero(m.monto)}</span><button type="button" class="borrar" data-borrar="${m.id}" aria-label="Borrar movimiento">${ICON.cerrar}</button></div>`).join('') : '<p class="texto-ayuda" style="padding:8px 0 14px">Sin movimientos.</p>'}
        </div>
        <div class="dos"><button type="button" class="btn" data-x="editar">Editar datos</button><button type="button" class="btn peligro" data-x="eliminar">Eliminar</button></div>`
    });
    d.dataset.detalle = '1';
    d.querySelector('[data-x="fiado"]').onclick = () => anotar('fiado', c.id);
    d.querySelector('[data-x="abono"]').onclick = () => anotar('abono', c.id);
    const w = d.querySelector('[data-x="wa"]'); if (w) w.onclick = () => recordar(c);
    d.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
      if (!(await confirmar('Se borrará este movimiento y cambiará el saldo.'))) return;
      c.movs = c.movs.filter(m => m.id !== b.dataset.borrar); Orbe.guardar(); d.close(); pintar(); setTimeout(() => detalle(c.id), 320);
    });
    d.querySelector('[data-x="editar"]').onclick = () => { d.close(); setTimeout(() => editar(c), 320); };
    d.querySelector('[data-x="eliminar"]').onclick = async () => {
      if (!(await confirmar(`Se borrará a ${c.nombre} con todos sus movimientos.`))) return;
      D().clientes = D().clientes.filter(x => x.id !== c.id); Orbe.guardar(); d.close(); pintar(); aviso('Cliente eliminado');
    };
  }

  function editar(c) {
    const d = hoja({ titulo: 'Editar cliente', cuerpo: `<label class="campo">Nombre<input name="nombre" value="${esc(c.nombre)}"></label><label class="campo">WhatsApp<input name="tel" inputmode="tel" value="${esc(c.tel)}" placeholder="Con código de país, ej. 58412..."><small>Así su cuenta se abre directo en su chat.</small></label><label class="campo">Límite de crédito<input name="limite" inputmode="decimal" value="${c.limite || ''}" placeholder="Sin límite"><small>Te avisamos si le fías por encima de este monto.</small></label>`, pie: '<button class="btn principal ancho" type="submit">Guardar</button>' });
    const f = d.querySelector('form');
    f.onsubmit = e => { e.preventDefault(); if (!f.nombre.value.trim()) return Orbe.error(d, 'Escribe el nombre.'); c.nombre = f.nombre.value.trim(); c.tel = f.tel.value.trim(); c.limite = Orbe.num(f.limite.value); Orbe.guardar(); d.close(); pintar(); setTimeout(() => detalle(c.id), 320); };
  }

  // Ejemplo: una bodega con 7 clientes y 6 semanas de movimientos
  function demo() {
    const h = n => Orbe.sumarDias(Orbe.hoy(), -n); let i = 0;
    const m = (tipo, monto, dd, detalle = '') => ({ id: 'd' + (i++), tipo, monto, detalle, fecha: h(dd) });
    const cl = (nombre, limite, movs) => ({ id: 'c' + (i++), nombre, tel: '', limite, movs });
    return { ajustes: { negocio: 'Bodega La Esquina', moneda: '$' }, clientes: [
      cl('Carmen Rojas', 60, [m('fiado', 12.5, 34, '2 harinas y 1 aceite'), m('fiado', 8, 27, 'Queso blanco'), m('abono', 15, 20, 'Pago móvil'), m('fiado', 18.4, 19, 'Compra de la semana'), m('fiado', 6, 9, 'Pan y huevos')]),
      cl('Luis Pérez', 40, [m('fiado', 20, 41, 'Refrescos para la fiesta'), m('abono', 20, 33), m('fiado', 14, 22, 'Arroz y pasta'), m('fiado', 31.5, 16, 'Carne molida 2 kg')]),
      cl('Ana Gómez', 0, [m('fiado', 5, 30, 'Pan'), m('abono', 5, 26), m('fiado', 9.8, 12, 'Leche y café'), m('abono', 9.8, 5)]),
      cl('Don José', 80, [m('fiado', 45, 38, 'Cajas de cerveza'), m('abono', 25, 29), m('fiado', 22, 18, 'Hielo y carbón'), m('fiado', 15, 4, 'Cigarros')]),
      cl('María Fernanda', 0, [m('fiado', 7.5, 15, 'Galletas para el colegio'), m('abono', 7.5, 8), m('fiado', 4.2, 2, 'Jugos')]),
      cl('Pedro Castillo', 30, [m('fiado', 12, 11, 'Detergente y jabón'), m('fiado', 9, 6, 'Azúcar 2 kg'), m('abono', 10, 1, 'Efectivo')]),
      cl('Rosa Medina', 0, [m('fiado', 16, 25, 'Pollo entero'), m('abono', 16, 21)])
    ] };
  }

  Orbe.iniciar({
    id: 'fiados', nombre: 'Cuaderno de fiados', prefijo: 'FIA', unidad: 'un cliente tuyo', pintar, demo,
    datos: () => ({ clientes: [] }),
    icono: Orbe.sv('<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/><circle cx="17" cy="15.5" r="3.2"/>'),
    tabs: [{ id: 'hoy', nombre: 'Hoy', icono: ICON.inicio }, { id: 'clientes', nombre: 'Clientes', icono: ICON.personas }, { id: 'historial', nombre: 'Historial', icono: ICON.reloj }],
    fabTexto: () => 'Anotar',
    fab: () => anotar('fiado')
  });
})();
