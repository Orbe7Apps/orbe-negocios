(function () {
  const { esc, dinero, hoja, aviso, confirmar } = Orbe;
  let filtro = 'todos', busca = '';
  const D = () => Orbe.datos;
  const prod = id => D().productos.find(p => p.id === id);
  const cant = n => (Math.round(n * 100) / 100).toLocaleString('es');
  const hace30 = () => Orbe.sumarDias(Orbe.hoy(), -30);
  const vendidos = (id, desde = hace30()) => D().movs.filter(m => m.pid === id && m.tipo === 'venta' && m.fecha >= desde).reduce((s, m) => s + m.cant, 0);
  const estado = p => p.stock <= 0 ? ['mal', 'Agotado'] : p.stock <= p.min ? ['warn', 'Por acabarse'] : ['ok', 'Bien'];
  const bajos = () => D().productos.filter(p => p.stock <= p.min);

  function mover(p, tipo, n, extra = {}) {
    if (tipo === 'venta') p.stock -= n; else if (tipo === 'entrada') p.stock += n; else p.stock = n;
    p.stock = Math.round(p.stock * 100) / 100;
    D().movs.push({ id: Orbe.uid(), pid: p.id, tipo, cant: n, precio: p.precio, fecha: Orbe.hoy(), ...extra });
    if (D().movs.length > 3000) D().movs.splice(0, D().movs.length - 3000);
    Orbe.guardar();
  }

  function pintar() {
    const ps = D().productos, mes = Orbe.hoy().slice(0, 7);
    const valor = ps.reduce((s, p) => s + Math.max(0, p.stock) * (p.costo || 0), 0);
    const ventaMes = D().movs.filter(m => m.tipo === 'venta' && m.fecha.startsWith(mes)).reduce((s, m) => s + m.cant * (m.precio || 0), 0);
    const b = bajos();
    document.getElementById('resumen').innerHTML = `
      <div class="dato destacado"><small>Vendido este mes</small><b>${dinero(ventaMes)}</b></div>
      <div class="dato"><small>Valor de tu inventario</small><b>${dinero(valor)}</b></div>
      <div class="dato"><small>Productos</small><b>${ps.length}</b></div>
      <div class="dato"><small>Por acabarse</small><b style="color:${b.length ? 'var(--mal)' : 'inherit'}">${b.length}</b></div>`;
    const av = document.getElementById('bajo');
    av.hidden = !b.length;
    if (b.length) {
      av.innerHTML = `<span>${b.length === 1 ? `Se está acabando ${esc(b[0].nombre)}` : `${b.length} productos se están acabando`}</span><button class="btn wa" type="button">${Orbe.ICON.wa} Pedir</button>`;
      av.querySelector('button').onclick = pedido;
    }
    const fs = [['todos', 'Todos'], ['bajos', `Por acabarse (${b.length})`], ['top', 'Más vendidos']];
    const cats = [...new Set(ps.map(p => p.cat).filter(Boolean))].sort();
    document.getElementById('filtros').innerHTML = fs.concat(cats.map(c => ['cat:' + c, c])).map(([k, t]) => `<button class="pestana" type="button" data-f="${esc(k)}" aria-pressed="${filtro === k}">${esc(t)}</button>`).join('');
    document.querySelectorAll('[data-f]').forEach(x => x.onclick = () => { filtro = x.dataset.f; pintar(); });

    let lista = ps.slice();
    if (filtro === 'bajos') lista = b.slice();
    if (filtro.startsWith('cat:')) lista = lista.filter(p => p.cat === filtro.slice(4));
    if (busca) lista = lista.filter(p => (p.nombre + ' ' + (p.cat || '')).toLowerCase().includes(busca));
    if (filtro === 'top') lista = lista.map(p => [p, vendidos(p.id)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    else lista.sort((a, b) => (b.stock <= b.min) - (a.stock <= a.min) || a.nombre.localeCompare(b.nombre));
    const el = document.getElementById('lista');
    if (!ps.length) { el.innerHTML = '<div class="vacio"><b>Agrega tu primer producto</b>Pon cuántos tienes y cuál es el mínimo. Te avisamos cuando se esté acabando.</div>'; return; }
    if (!lista.length) { el.innerHTML = `<div class="vacio">${filtro === 'top' ? 'Aún no hay ventas en los últimos 30 días. Usa el botón − cada vez que vendas.' : filtro === 'bajos' ? '<b>Todo en orden ✓</b>Ningún producto está por acabarse.' : 'No hay productos con ese nombre.'}</div>`; return; }
    el.innerHTML = lista.map(p => {
      const [k, t] = estado(p);
      const sub = filtro === 'top' ? `${cant(vendidos(p.id))} ${esc(p.unidad || 'u.')} vendidos en 30 días` : `${p.cat ? esc(p.cat) + ' · ' : ''}${dinero(p.precio)}`;
      return `<div class="fila prod" data-p="${p.id}" role="button" tabindex="0"><span class="info"><b>${esc(p.nombre)}</b><span>${sub}</span>${k !== 'ok' ? `<span style="margin-top:4px"><span class="chip ${k}">${t}</span></span>` : ''}</span>
        <span class="stock"><button class="paso" type="button" data-menos aria-label="Vendí 1 ${esc(p.nombre)}">−</button><span class="n" style="color:${k === 'ok' ? 'inherit' : `var(--${k})`}">${cant(p.stock)}<small>${esc(p.unidad || 'u.')}</small></span><button class="paso" type="button" data-mas aria-label="Llegó 1 ${esc(p.nombre)}">+</button></span></div>`;
    }).join('');
    el.querySelectorAll('[data-p]').forEach(f => {
      const p = prod(f.dataset.p);
      f.onclick = e => { if (!e.target.closest('.paso')) detalle(p.id); };
      f.onkeydown = e => { if (e.key === 'Enter') detalle(p.id); };
      f.querySelector('[data-menos]').onclick = () => { if (p.stock <= 0) return aviso(`${p.nombre} está agotado`); mover(p, 'venta', 1); pintar(); aviso(`Venta: 1 ${p.nombre} · quedan ${cant(p.stock)}`); };
      f.querySelector('[data-mas]').onclick = () => { mover(p, 'entrada', 1); pintar(); aviso(`Entrada: ahora hay ${cant(p.stock)} ${p.nombre}`); };
    });
  }

  function pedido() {
    const b = bajos(); if (!b.length) return;
    const neg = D().ajustes.negocio;
    const lineas = b.map(p => `• ${p.nombre}: ${cant(Math.max(1, p.min * 2 - Math.max(0, p.stock)))} ${p.unidad || 'u.'}`).join('\n');
    Orbe.whatsapp(D().ajustes.proveedor, `Hola 👋${neg ? ` Te escribo de ${neg}.` : ''} Quiero hacer este pedido:\n\n${lineas}\n\n¿Me confirmas precio y cuándo me lo puedes traer? ¡Gracias!`);
  }

  function formulario(p) {
    const nuevo = !p;
    if (nuevo && !Orbe.puedeAgregar(D().productos.length)) return;
    p = p || { nombre: '', cat: '', stock: '', min: '', costo: '', precio: '', unidad: 'u.' };
    const cats = [...new Set(D().productos.map(x => x.cat).filter(Boolean))];
    const d = hoja({
      titulo: nuevo ? 'Nuevo producto' : 'Editar producto',
      cuerpo: `<label class="campo">Nombre<input name="nombre" value="${esc(p.nombre)}" placeholder="Ej. Harina PAN 1 kg" autocomplete="off"></label>
        <div class="fila2"><label class="campo">Categoría<input name="cat" value="${esc(p.cat)}" list="cats" placeholder="Opcional" autocomplete="off"></label>
        <label class="campo">Unidad<select name="unidad">${['u.', 'kg', 'g', 'L', 'm', 'cajas', 'paq.', 'docenas'].map(u => `<option ${u === p.unidad ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>
        <datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
        <div class="fila2"><label class="campo">${nuevo ? 'Cuántos tienes' : 'Cantidad actual'}<input name="stock" inputmode="decimal" value="${p.stock}" placeholder="0"></label>
        <label class="campo">Avisarme con<input name="min" inputmode="decimal" value="${p.min}" placeholder="Ej. 5"><small>o menos</small></label></div>
        <div class="fila2"><label class="campo">Te cuesta<input name="costo" inputmode="decimal" value="${p.costo}" placeholder="Opcional"></label>
        <label class="campo">Lo vendes a<input name="precio" inputmode="decimal" value="${p.precio}" placeholder="0"></label></div>
        <p class="texto-ayuda" data-err hidden style="color:var(--mal);font-weight:700">Escribe el nombre del producto.</p>`,
      pie: '<button class="btn principal ancho" type="submit">Guardar</button>'
    });
    const f = d.querySelector('form');
    if (nuevo) setTimeout(() => f.nombre.focus(), 250);
    f.onsubmit = e => {
      e.preventDefault();
      if (!f.nombre.value.trim()) { d.querySelector('[data-err]').hidden = false; return; }
      const v = { nombre: f.nombre.value.trim(), cat: f.cat.value.trim(), unidad: f.unidad.value, min: Orbe.num(f.min.value), costo: Orbe.num(f.costo.value), precio: Orbe.num(f.precio.value) };
      const st = Orbe.num(f.stock.value);
      if (nuevo) { const np = { id: Orbe.uid(), stock: 0, ...v }; D().productos.push(np); if (st) mover(np, 'entrada', st, { nota: 'Inicial' }); }
      else { Object.assign(p, v); if (st !== p.stock) mover(p, 'ajuste', st, { nota: 'Conteo' }); }
      Orbe.guardar(); d.close(); pintar(); aviso(nuevo ? 'Producto agregado' : 'Cambios guardados');
    };
  }

  function cantidad(p, tipo) {
    const t = { venta: ['Vendí', '¿Cuántos vendiste?'], entrada: ['Llegó mercancía', '¿Cuántos llegaron?'], ajuste: ['Contar de nuevo', '¿Cuántos hay realmente?'] }[tipo];
    const d = hoja({ titulo: `${t[0]} · ${p.nombre}`, cuerpo: `<label class="campo">${t[1]}<input name="n" inputmode="decimal" placeholder="0" autocomplete="off"></label>${tipo === 'venta' ? `<label class="campo">Precio de venta<input name="precio" inputmode="decimal" value="${p.precio}"></label>` : ''}<p class="texto-ayuda">Ahora hay ${cant(p.stock)} ${esc(p.unidad || 'u.')}.</p>`, pie: '<button class="btn principal ancho" type="submit">Guardar</button>' });
    const f = d.querySelector('form'); setTimeout(() => f.n.focus(), 250);
    f.onsubmit = e => {
      e.preventDefault(); const n = Orbe.num(f.n.value);
      if (n <= 0 && tipo !== 'ajuste') return;
      if (tipo === 'venta' && n > p.stock) return aviso(`Solo hay ${cant(p.stock)}. Usa “Contar de nuevo” si el número no cuadra.`);
      mover(p, tipo, n, tipo === 'venta' ? { precio: Orbe.num(f.precio.value) } : {});
      d.close(); pintar(); aviso(`Listo: quedan ${cant(p.stock)} ${p.unidad || 'u.'}`);
      document.querySelector('dialog[data-detalle]')?.close();
    };
  }

  function detalle(id) {
    const p = prod(id); if (!p) return;
    const [k, t] = estado(p);
    const movs = D().movs.filter(m => m.pid === id).slice(-12).reverse();
    const nombres = { venta: 'Venta', entrada: 'Entrada', ajuste: 'Conteo' };
    const d = hoja({
      titulo: p.nombre,
      cuerpo: `<div class="tarjeta"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><small style="color:var(--muted);font-weight:700">Tienes</small><div class="grande">${cant(p.stock)} <span style="font-size:18px">${esc(p.unidad || 'u.')}</span></div></div><span class="chip ${k}">${t}</span></div>
          <p class="texto-ayuda" style="margin-top:8px">Te avisamos con ${cant(p.min)} o menos · Vendidos en 30 días: <b>${cant(vendidos(id))}</b>${p.costo && p.precio ? ` · Ganas ${dinero(p.precio - p.costo)} por unidad` : ''}</p></div>
        <div class="acciones2"><button type="button" class="btn principal" data-x="venta">Vendí</button><button type="button" class="btn" data-x="entrada">Llegó mercancía</button></div>
        <div class="tarjeta" style="padding:6px 16px"><h3 style="font-size:15px;padding:10px 0 4px">Últimos movimientos</h3>${movs.length ? movs.map(m => `<div class="mov"><span>${nombres[m.tipo]}${m.nota ? ` <small>· ${esc(m.nota)}</small>` : ''}<br><small>${Orbe.fecha(m.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</small></span><b>${m.tipo === 'venta' ? '−' : m.tipo === 'entrada' ? '+' : '='}${cant(m.cant)}</b></div>`).join('') : '<p class="texto-ayuda" style="padding:6px 0 14px">Sin movimientos todavía.</p>'}</div>
        <div class="acciones2"><button type="button" class="btn" data-x="ajuste">Contar de nuevo</button><button type="button" class="btn" data-x="editar">Editar</button></div>
        <button type="button" class="btn peligro ancho" data-x="borrar">Eliminar producto</button>`
    });
    d.dataset.detalle = '1';
    d.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => {
      const x = b.dataset.x;
      if (x === 'editar') { d.close(); return setTimeout(() => formulario(p), 320); }
      if (x === 'borrar') {
        if (!(await confirmar(`Se borrará ${p.nombre} y su historial.`))) return;
        D().productos = D().productos.filter(q => q.id !== id); D().movs = D().movs.filter(m => m.pid !== id); Orbe.guardar(); d.close(); pintar(); return aviso('Producto eliminado');
      }
      cantidad(p, x);
    });
  }

  Orbe.iniciar({
    id: 'inventario', nombre: 'Inventario simple', prefijo: 'INV', limite: 10, unidad: 'productos', pintar,
    icono: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16Z"/><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8"/></svg>',
    ajustesExtra: a => `<label class="campo">WhatsApp de tu proveedor<input name="proveedor" inputmode="tel" value="${esc(a.proveedor || '')}" placeholder="Opcional, con código de país"><small>Para mandarle el pedido de lo que se está acabando.</small></label>`,
    guardarAjustes: (a, f) => { a.proveedor = f.proveedor.value.trim(); }
  }, { productos: [], movs: [] });
  document.getElementById('nuevo').onclick = () => formulario();
  document.getElementById('buscar').oninput = e => { busca = e.target.value.trim().toLowerCase(); pintar(); };
})();
