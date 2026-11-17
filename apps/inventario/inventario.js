(function () {
  const { esc, dinero, hoja, aviso, confirmar, ICON } = Orbe;
  const D = () => Orbe.datos;
  let filtro = 'todos', busca = '';
  const prod = id => D().productos.find(p => p.id === id);
  const cant = n => (Math.round(n * 100) / 100).toLocaleString('es');
  const und = p => p.unidad || 'und';
  const ventas = (desde, hasta = Orbe.hoy()) => D().movs.filter(m => m.tipo === 'venta' && m.fecha >= desde && m.fecha <= hasta);
  const vendidos = (id, n = 14) => ventas(Orbe.sumarDias(Orbe.hoy(), -n + 1)).filter(m => m.pid === id).reduce((s, m) => s + m.cant, 0);
  const porDia = p => vendidos(p.id, 14) / 14;
  const diasQueda = p => { const r = porDia(p); return r > 0 ? p.stock / r : Infinity; };
  const margen = p => p.precio > 0 && p.costo > 0 ? (p.precio - p.costo) / p.precio : null;
  const estado = p => p.stock <= 0 ? ['mal', 'Agotado'] : p.stock <= p.min ? ['warn', 'Por reponer'] : diasQueda(p) <= 4 ? ['warn', `Se acaba en ~${Math.max(1, Math.round(diasQueda(p)))} días`] : ['ok', ''];
  const bajos = () => D().productos.filter(p => p.stock <= p.min || diasQueda(p) <= 4);
  const dormidos = () => D().productos.filter(p => p.stock > 0 && !vendidos(p.id, 30) && p.creado && Orbe.diasEntre(p.creado, Orbe.hoy()) >= 21);
  const colorCat = c => { if (!c) return 'var(--muted)'; const cs = [...new Set(D().productos.map(p => p.cat).filter(Boolean))].sort(); return Orbe.paleta[(cs.indexOf(c) + 8) % 8]; };
  const total = ms => ms.reduce((s, m) => s + m.cant * (m.precio || 0), 0);
  const ganancia = ms => ms.reduce((s, m) => s + m.cant * ((m.precio || 0) - (m.costo || 0)), 0);

  function mover(p, tipo, n, extra = {}) {
    if (tipo === 'venta') p.stock -= n; else if (tipo === 'entrada') p.stock += n; else p.stock = n;
    p.stock = Math.round(p.stock * 100) / 100;
    D().movs.push({ id: Orbe.uid(), pid: p.id, tipo, cant: n, precio: p.precio, costo: p.costo, fecha: Orbe.hoy(), ...extra });
    if (D().movs.length > 5000) D().movs.splice(0, D().movs.length - 5000);
  }

  function pintar() { const v = document.getElementById('vista'); ({ hoy: pintarHoy, productos: pintarProductos, reportes: pintarReportes })[Orbe.vista](v); }

  function pintarHoy(v) {
    const hoy = Orbe.hoy(), vh = ventas(hoy), vay = ventas(Orbe.sumarDias(hoy, -1), Orbe.sumarDias(hoy, -1));
    const tHoy = total(vh), tAyer = total(vay);
    const dias14 = Array.from({ length: 14 }, (_, i) => total(ventas(Orbe.sumarDias(hoy, i - 13), Orbe.sumarDias(hoy, i - 13))));
    const prom = dias14.slice(0, 13).reduce((s, x) => s + x, 0) / 13, max = Math.max(...dias14, 0.01);
    const valor = D().productos.reduce((s, p) => s + Math.max(0, p.stock) * (p.costo || 0), 0);
    const b = bajos(), dor = dormidos();
    const tareas = [];
    if (b.length) tareas.push({ color: 'var(--out)', icono: ICON.caja, titulo: `${b.length} ${b.length === 1 ? 'producto por reponer' : 'productos por reponer'}`, sub: b.slice(0, 3).map(p => esc(p.nombre)).join(', ') + '. Arma el pedido al proveedor.', accion: pedido });
    b.filter(p => p.stock > p.min && isFinite(diasQueda(p))).slice(0, 2).forEach(p => tareas.push({ color: 'var(--warn)', icono: ICON.reloj, titulo: `${esc(p.nombre)} se acaba en ~${Math.max(1, Math.round(diasQueda(p)))} días`, sub: `Vendes unas ${cant(Math.round(porDia(p) * 10) / 10)} ${esc(und(p))} al día y quedan ${cant(p.stock)}.`, accion: () => detalle(p.id) }));
    if (dor.length) tareas.push({ color: '#3ba7e6', icono: ICON.estrella, titulo: `${dor.length} ${dor.length === 1 ? 'producto sin ventas' : 'productos sin ventas'} en 30 días`, sub: `${dor.slice(0, 2).map(p => esc(p.nombre)).join(', ')}. Haz una oferta para moverlos.`, accion: () => oferta(dor) });
    const top = D().productos.map(p => ({ p, n: vendidos(p.id, 7) })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 4);
    const pct = tAyer ? Math.round((tHoy - tAyer) / tAyer * 100) : null;
    v.innerHTML = `<div class="entra">
      ${Orbe.hero({ etiqueta: `Vendido hoy · ${vh.length} ${vh.length === 1 ? 'venta' : 'ventas'}`, monto: tHoy, pildora: pct === null ? null : { c: pct >= 0 ? 'bien' : 'mal', t: `${pct >= 0 ? '+' : ''}${pct}% vs ayer` },
        anillo: { p: prom ? Math.min(1, tHoy / prom) : 0, t: `${prom ? Math.round(tHoy / prom * 100) : 0}%`, sub: 'de tu promedio' },
        barras: dias14.map(x => x / max),
        chips: [{ t: 'Ganancia hoy', v: dinero(ganancia(vh)), c: '#7ff0c4' }, { t: 'En estantes', v: dinero(valor) }, { t: 'Por reponer', v: b.length, c: b.length ? '#ffb3c2' : '' }] })}
      <section class="seccion"><div class="seccion-cab"><h2>Para hacer hoy</h2>${tareas.length ? `<span class="cuenta">${tareas.length}</span>` : ''}</div>${Orbe.tareas(tareas, 'Tu inventario está en orden.')}</section>
      <section class="seccion"><div class="seccion-cab"><h2>Lo que más se vende</h2><span class="texto-ayuda">7 días</span></div>
        ${top.length ? `<div class="tarjeta">${top.map(x => `<button type="button" class="tarea" data-p="${x.p.id}">${Orbe.ini(x.p.nombre, colorCat(x.p.cat))}<span class="info"><b>${esc(x.p.nombre)}</b><span>${cant(x.n)} ${esc(und(x.p))} vendidos · quedan ${cant(x.p.stock)}</span></span><span class="monto">${dinero(x.n * x.p.precio)}</span></button>`).join('')}</div>` : '<div class="vacio">Aún no hay ventas. Toca + para registrar la primera.</div>'}</section></div>`;
    Orbe.activarTareas(v, tareas);
    v.querySelectorAll('[data-p]').forEach(x => x.onclick = () => detalle(x.dataset.p));
  }

  function pintarProductos(v) {
    const ps = D().productos, b = bajos();
    const cats = [...new Set(ps.map(p => p.cat).filter(Boolean))].sort();
    let lista = ps.slice();
    if (filtro === 'bajos') lista = b.slice();
    if (filtro.startsWith('cat:')) lista = lista.filter(p => p.cat === filtro.slice(4));
    if (busca) lista = lista.filter(p => (p.nombre + ' ' + (p.cat || '')).toLowerCase().includes(busca));
    lista.sort((x, y) => (b.includes(y) - b.includes(x)) || x.nombre.localeCompare(y.nombre));
    const valor = ps.reduce((s, p) => s + Math.max(0, p.stock) * (p.costo || 0), 0);
    const mg = ps.map(margen).filter(x => x !== null), mprom = mg.length ? Math.round(mg.reduce((s, x) => s + x, 0) / mg.length * 100) : 0;
    v.innerHTML = `<label class="buscar">${ICON.buscar}<input id="buscar" type="search" placeholder="Buscar entre ${ps.length} productos" value="${esc(busca)}" aria-label="Buscar producto"></label>
      <div class="pestanas">${[['todos', 'Todo', ps.length, null], ['bajos', 'Por reponer', b.length, 'var(--out)']].concat(cats.map(c => ['cat:' + c, c, ps.filter(p => p.cat === c).length, colorCat(c)])).map(([k, t, n, c]) => `<button class="pestana" type="button" data-f="${esc(k)}" aria-pressed="${filtro === k}">${c ? `<i style="background:${c}"></i>` : ''}${esc(t)} <em>${n}</em></button>`).join('')}</div>
      <p class="texto-ayuda" style="margin-top:12px"><b style="color:var(--ink)">${dinero(valor)}</b> en estantes · <b style="color:var(--ink)">${mprom}%</b> de ganancia promedio</p>
      <section class="seccion" style="margin-top:12px"><div class="lista entra">${lista.length ? lista.map(p => {
        const [k, t] = estado(p), m = margen(p), col = k === 'mal' ? 'var(--out)' : k === 'warn' ? 'var(--warn)' : 'var(--in)';
        return `<button class="fila toque" type="button" data-p="${p.id}">${Orbe.ini(p.nombre, colorCat(p.cat))}<span class="info"><b>${esc(p.nombre)}</b><div class="progreso"><i style="width:${Math.min(100, Math.max(3, p.stock / Math.max(1, p.min * 3) * 100))}%;background:${col}"></i></div><span>${p.costo ? `Costo ${dinero(p.costo)} · ` : ''}Precio ${dinero(p.precio)}${m !== null ? ` · Ganas ${Math.round(m * 100)}%` : ''}</span></span>
          <span class="derecha"><span class="monto" style="color:${col}">${cant(p.stock)} ${esc(und(p))}</span>${t ? `<small style="color:${col}">${t}</small>` : ''}</span></button>`;
      }).join('') : `<div class="vacio">${busca ? 'No hay productos con ese nombre.' : filtro === 'bajos' ? '<b>Todo en orden</b>Ningún producto está por acabarse.' : '<b>Agrega tu primer producto</b>Toca + y pon cuántos tienes y cuál es el mínimo.'}</div>`}</div></section>
      ${ps.length ? `<button type="button" class="btn ancho" style="margin-top:14px" id="precios">${ICON.wa} Mandar lista de precios</button>` : ''}`;
    const inp = document.getElementById('buscar');
    inp.oninput = e => { busca = e.target.value.trim().toLowerCase(); const c = inp.selectionStart; pintarProductos(v); const n = document.getElementById('buscar'); n.focus(); n.setSelectionRange(c, c); };
    v.querySelectorAll('[data-f]').forEach(x => x.onclick = () => { filtro = x.dataset.f; pintarProductos(v); });
    v.querySelectorAll('[data-p]').forEach(x => x.onclick = () => detalle(x.dataset.p));
    const lp = document.getElementById('precios'); if (lp) lp.onclick = listaPrecios;
  }

  function pintarReportes(v) {
    const hoy = Orbe.hoy(), n = 14;
    const dias = Array.from({ length: n }, (_, i) => Orbe.sumarDias(hoy, i - n + 1));
    const vals = dias.map(f => total(ventas(f, f)));
    const v30 = ventas(Orbe.sumarDias(hoy, -29)), t30 = total(v30), g30 = ganancia(v30);
    const porProd = {}; v30.forEach(m => porProd[m.pid] = (porProd[m.pid] || 0) + m.cant * (m.precio || 0));
    const top = Object.entries(porProd).map(([id, x]) => ({ p: prod(id), x })).filter(o => o.p).sort((a, b) => b.x - a.x);
    const porCat = {}; v30.forEach(m => { const c = prod(m.pid)?.cat || 'Sin categoría'; porCat[c] = (porCat[c] || 0) + m.cant * (m.precio || 0); });
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    const dor = dormidos();
    v.innerHTML = `<div class="entra">
      <section class="seccion" style="margin-top:14px"><div class="tarjeta p"><div class="seccion-cab" style="margin:0"><h2 style="font-size:16px">Ventas · 14 días</h2><b class="num">${dinero(vals.reduce((s, x) => s + x, 0))}</b></div>${Orbe.grafico(vals, dias.map((f, i) => i % 2 ? '' : Orbe.fecha(f, { day: 'numeric' })))}</div></section>
      <div class="dos" style="margin-top:12px"><div class="tarjeta p"><small class="texto-ayuda">Vendido en 30 días</small><div class="monto-xl" style="font-size:24px">${Orbe.montoHTML(t30)}</div></div><div class="tarjeta p"><small class="texto-ayuda">Ganancia en 30 días</small><div class="monto-xl" style="font-size:24px;color:var(--in)">${Orbe.montoHTML(g30)}</div></div></div>
      <section class="seccion"><div class="seccion-cab"><h2>Productos estrella</h2><span class="texto-ayuda">30 días</span></div><div class="tarjeta p">${top.length ? Orbe.orbe(top.map((o, i) => ({ n: o.p.nombre, v: o.x, c: Orbe.paleta[i % 8] })), t30) : '<p class="texto-ayuda">Sin ventas todavía.</p>'}</div></section>
      <section class="seccion"><div class="seccion-cab"><h2>Por categoría</h2></div><div class="tarjeta p">${cats.length ? Orbe.orbe(cats.map(([c, x]) => ({ n: c, v: x, c: colorCat(c === 'Sin categoría' ? '' : c) })), t30) : '<p class="texto-ayuda">Sin ventas todavía.</p>'}</div></section>
      ${dor.length ? `<section class="seccion"><div class="seccion-cab"><h2>Sin ventas en 30 días</h2><button type="button" class="enlace" id="oferta">Crear oferta</button></div><div class="tarjeta">${dor.map(p => `<button type="button" class="tarea" data-p="${p.id}">${Orbe.ini(p.nombre, colorCat(p.cat))}<span class="info"><b>${esc(p.nombre)}</b><span>${cant(p.stock)} ${esc(und(p))} paradas · ${dinero(p.stock * (p.costo || 0))} en dinero</span></span></button>`).join('')}</div></section>` : ''}</div>`;
    v.querySelectorAll('[data-p]').forEach(x => x.onclick = () => detalle(x.dataset.p));
    const o = document.getElementById('oferta'); if (o) o.onclick = () => oferta(dor);
  }

  // Venta rápida: tocas productos, ajustas cantidades y guardas
  function vender() {
    if (!D().productos.length) return formulario();
    const carro = {}; let q = '';
    const d = hoja({ titulo: 'Nueva venta', cuerpo: `<label class="buscar" style="margin:0">${ICON.buscar}<input data-q type="search" placeholder="Buscar producto"></label><div class="lista" data-lista></div>`,
      pie: '<button class="btn principal ancho" type="submit" data-total disabled>Elige productos</button>' });
    const pinta = () => {
      const ps = D().productos.filter(p => !q || p.nombre.toLowerCase().includes(q)).sort((a, b) => vendidos(b.id, 30) - vendidos(a.id, 30));
      d.querySelector('[data-lista]').innerHTML = ps.map(p => `<div class="fila" style="box-shadow:none">${Orbe.ini(p.nombre, colorCat(p.cat))}<span class="info"><b>${esc(p.nombre)}</b><span>${dinero(p.precio)} · quedan ${cant(p.stock)}</span></span>
        <span style="display:flex;align-items:center;gap:6px">${carro[p.id] ? `<button type="button" class="icono-btn" data-menos="${p.id}" aria-label="Quitar uno">−</button><b class="num" style="min-width:22px;text-align:center">${cant(carro[p.id])}</b>` : ''}<button type="button" class="icono-btn" data-mas="${p.id}" aria-label="Agregar uno" style="background:var(--c);color:var(--c-ink)" ${p.stock - (carro[p.id] || 0) <= 0 ? 'disabled' : ''}>+</button></span></div>`).join('') || '<p class="texto-ayuda">Sin resultados.</p>';
      d.querySelectorAll('[data-mas]').forEach(x => x.onclick = () => { carro[x.dataset.mas] = (carro[x.dataset.mas] || 0) + 1; pinta(); });
      d.querySelectorAll('[data-menos]').forEach(x => x.onclick = () => { carro[x.dataset.menos]--; if (carro[x.dataset.menos] <= 0) delete carro[x.dataset.menos]; pinta(); });
      const t = Object.entries(carro).reduce((s, [id, n]) => s + n * prod(id).precio, 0), u = Object.values(carro).reduce((s, n) => s + n, 0);
      const btn = d.querySelector('[data-total]'); btn.disabled = !u; btn.textContent = u ? `Cobrar ${dinero(t)} · ${cant(u)} ${u === 1 ? 'producto' : 'productos'}` : 'Elige productos';
    };
    d.querySelector('[data-q]').oninput = e => { q = e.target.value.trim().toLowerCase(); pinta(); }; pinta();
    d.querySelector('form').onsubmit = e => {
      e.preventDefault(); const items = Object.entries(carro); if (!items.length) return;
      items.forEach(([id, n]) => mover(prod(id), 'venta', n)); Orbe.guardar(); d.close(); pintar();
      const agot = items.map(([id]) => prod(id)).filter(p => p.stock <= p.min);
      aviso(agot.length ? `Venta guardada. Ojo: ${agot[0].nombre} ya está por acabarse` : `Venta guardada: ${dinero(items.reduce((s, [id, n]) => s + n * prod(id).precio, 0))}`);
    };
  }

  function pedido() {
    const b = bajos(); if (!b.length) return aviso('No hay productos por reponer');
    const sug = p => Math.max(1, Math.ceil(Math.max(p.min * 2, porDia(p) * 14) - Math.max(0, p.stock)));
    const d = hoja({ titulo: 'Pedido al proveedor', cuerpo: `<p class="texto-ayuda">Cantidad sugerida para cubrir unas 2 semanas de ventas. Puedes cambiarla.</p><div class="tarjeta">${b.map(p => `<div class="mov"><div class="info"><b>${esc(p.nombre)}</b><span>Quedan ${cant(p.stock)} · vendes ${cant(Math.round(porDia(p) * 10) / 10)} al día</span></div><input data-pid="${p.id}" inputmode="decimal" value="${sug(p)}" style="width:72px;text-align:center;font-weight:700;border:0;background:var(--fill);border-radius:12px;padding:9px;font-size:16px"><span class="texto-ayuda">${esc(und(p))}</span></div>`).join('')}</div>`,
      pie: `<button type="button" class="btn wa ancho" data-enviar>${ICON.wa} Enviar pedido por WhatsApp</button>${D().ajustes.proveedor ? '' : '<p class="texto-ayuda" style="text-align:center">Guarda el WhatsApp de tu proveedor en Menú › Ajustes.</p>'}` });
    d.querySelector('[data-enviar]').onclick = () => {
      const neg = D().ajustes.negocio;
      const lineas = [...d.querySelectorAll('[data-pid]')].filter(i => Orbe.num(i.value) > 0).map(i => { const p = prod(i.dataset.pid); return `• ${p.nombre}: ${cant(Orbe.num(i.value))} ${und(p)}`; }).join('\n');
      Orbe.whatsapp(D().ajustes.proveedor, `Hola, buen día.${neg ? ` Te escribo de ${neg}.` : ''} Quiero hacer este pedido:\n\n${lineas}\n\n¿Me confirmas precio y cuándo me lo puedes traer? Gracias.`); d.close();
    };
  }

  function listaPrecios() {
    const neg = D().ajustes.negocio, porCat = {};
    D().productos.filter(p => p.stock > 0).forEach(p => (porCat[p.cat || 'Otros'] = porCat[p.cat || 'Otros'] || []).push(p));
    const txt = `*${neg || 'Lista de precios'}*\nPrecios de hoy, ${Orbe.fecha(Orbe.hoy(), { day: 'numeric', month: 'long' })}:\n` + Object.entries(porCat).sort().map(([c, ps]) => `\n*${c}*\n` + ps.sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => `• ${p.nombre}: ${dinero(p.precio)}`).join('\n')).join('\n') + '\n\nHaz tu pedido por aquí.';
    const d = hoja({ titulo: 'Lista de precios', cuerpo: `<p class="texto-ayuda">Solo productos con existencia. Compártela en tus estados o con tus clientes.</p><div class="tarjeta p" style="white-space:pre-wrap;font-size:14px;background:#dcf8c6;color:#10221a;max-height:46dvh;overflow:auto">${esc(txt)}</div>`, pie: `<button type="button" class="btn wa ancho" data-e>${ICON.wa} Compartir por WhatsApp</button>` });
    d.querySelector('[data-e]').onclick = () => { Orbe.whatsapp('', txt); d.close(); };
  }

  function oferta(ps) {
    const neg = D().ajustes.negocio;
    const txt = `*Ofertas de la semana${neg ? ' en ' + neg : ''}*\n\n` + ps.map(p => `• ${p.nombre}: antes ${dinero(p.precio)}, ahora *${dinero(Math.round(p.precio * 0.85 * 100) / 100)}*`).join('\n') + '\n\nHasta agotar existencias. Pídelo por aquí.';
    const d = hoja({ titulo: 'Oferta para moverlos', cuerpo: `<p class="texto-ayuda">Un 15% de descuento en lo que no se vende. Es mejor recuperar el dinero que dejarlo parado.</p><div class="tarjeta p" style="white-space:pre-wrap;font-size:14px;background:#dcf8c6;color:#10221a">${esc(txt)}</div>`, pie: `<button type="button" class="btn wa ancho" data-e>${ICON.wa} Compartir oferta</button>` });
    d.querySelector('[data-e]').onclick = () => { Orbe.whatsapp('', txt); d.close(); };
  }

  function formulario(p) {
    const nuevo = !p;
    p = p || { nombre: '', cat: '', stock: '', min: '', costo: '', precio: '', unidad: 'und' };
    const cats = [...new Set(D().productos.map(x => x.cat).filter(Boolean))];
    const d = hoja({
      titulo: nuevo ? 'Nuevo producto' : 'Editar producto',
      cuerpo: `<label class="campo">Nombre<input name="nombre" value="${esc(p.nombre)}" placeholder="Ej. Harina de maíz 1 kg" autocomplete="off"></label>
        <div class="fila2"><label class="campo">Categoría<input name="cat" value="${esc(p.cat)}" list="cats" placeholder="Ej. Víveres" autocomplete="off"></label>
        <label class="campo">Unidad<select name="unidad">${['und', 'kg', 'g', 'L', 'm', 'cajas', 'paq.', 'docenas'].map(u => `<option ${u === und(p) ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>
        <datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
        <div class="fila2"><label class="campo">${nuevo ? 'Cuántos tienes' : 'Cantidad actual'}<input name="stock" inputmode="decimal" value="${p.stock}" placeholder="0"></label>
        <label class="campo">Avisarme con<input name="min" inputmode="decimal" value="${p.min}" placeholder="Ej. 5"><small>o menos</small></label></div>
        <div class="fila2"><label class="campo">Te cuesta<input name="costo" inputmode="decimal" value="${p.costo}" placeholder="Opcional"></label>
        <label class="campo">Lo vendes a<input name="precio" inputmode="decimal" value="${p.precio}" placeholder="0"></label></div>
        <p class="texto-ayuda" data-margen></p>`,
      pie: '<button class="btn principal ancho" type="submit">Guardar</button>'
    });
    const f = d.querySelector('form');
    const mg = () => { const c = Orbe.num(f.costo.value), pr = Orbe.num(f.precio.value); d.querySelector('[data-margen]').textContent = c > 0 && pr > 0 ? `Ganas ${dinero(pr - c)} por unidad (${Math.round((pr - c) / pr * 100)}%).${pr < c ? ' Ojo: lo vendes por debajo de lo que te cuesta.' : ''}` : ''; };
    f.costo.oninput = f.precio.oninput = mg; mg();
    f.onsubmit = e => {
      e.preventDefault();
      if (!f.nombre.value.trim()) return Orbe.error(d, 'Escribe el nombre del producto.');
      const v = { nombre: f.nombre.value.trim(), cat: f.cat.value.trim(), unidad: f.unidad.value, min: Orbe.num(f.min.value), costo: Orbe.num(f.costo.value), precio: Orbe.num(f.precio.value) };
      const st = Orbe.num(f.stock.value);
      if (nuevo) { if (!Orbe.puedeAgregar()) return d.close(); const np = { id: Orbe.uid(), stock: 0, creado: Orbe.hoy(), ...v }; D().productos.push(np); if (st) mover(np, 'entrada', st, { nota: 'Inicial' }); }
      else { Object.assign(p, v); if (st !== p.stock) mover(p, 'ajuste', st, { nota: 'Conteo' }); }
      Orbe.guardar(); d.close(); Orbe.pintarDemo(); pintar(); aviso(nuevo ? 'Producto agregado' : 'Cambios guardados');
    };
  }

  function cantidad(p, tipo) {
    const t = { venta: ['Vendí', '¿Cuántos vendiste?'], entrada: ['Llegó mercancía', '¿Cuántos llegaron?'], ajuste: ['Contar de nuevo', '¿Cuántos hay realmente?'] }[tipo];
    const d = hoja({ titulo: `${t[0]} · ${p.nombre}`, cuerpo: `<label class="campo">${t[1]}<input name="n" class="grande" inputmode="decimal" placeholder="0" autocomplete="off"></label>${tipo === 'entrada' ? `<label class="campo">Costo por unidad<input name="costo" inputmode="decimal" value="${p.costo || ''}"><small>Si cambió, se actualiza.</small></label>` : ''}<p class="texto-ayuda">Ahora hay ${cant(p.stock)} ${esc(und(p))}.</p>`, pie: '<button class="btn principal ancho" type="submit">Guardar</button>' });
    const f = d.querySelector('form');
    f.onsubmit = e => {
      e.preventDefault(); const n = Orbe.num(f.n.value);
      if (n <= 0 && tipo !== 'ajuste') return Orbe.error(d, 'Escribe una cantidad.');
      if (tipo === 'venta' && n > p.stock) return Orbe.error(d, `Solo hay ${cant(p.stock)}. Usa “Contar de nuevo” si el número no cuadra.`);
      if (tipo === 'entrada' && f.costo.value) p.costo = Orbe.num(f.costo.value);
      mover(p, tipo, n); Orbe.guardar();
      d.close(); document.querySelector('dialog[data-detalle]')?.close(); pintar(); aviso(`Listo: quedan ${cant(p.stock)} ${und(p)}`);
    };
  }

  function detalle(id) {
    const p = prod(id); if (!p) return;
    const [k, t] = estado(p), m = margen(p), dq = diasQueda(p);
    const movs = D().movs.filter(x => x.pid === id).slice(-10).reverse();
    const nombres = { venta: 'Venta', entrada: 'Entrada', ajuste: 'Conteo' };
    const d = hoja({
      titulo: p.nombre,
      cuerpo: `${Orbe.hero({ etiqueta: `Tienes · ${esc(p.cat || 'sin categoría')}`, texto: `${cant(p.stock)} <span class="dec">${esc(und(p))}</span>`, pildora: t ? { c: k === 'mal' ? 'mal' : '', t } : { c: 'bien', t: isFinite(dq) ? `Alcanza para ~${Math.round(dq)} días` : 'Bien surtido' },
          anillo: m !== null ? { p: Math.max(0, m), t: Math.round(m * 100) + '%', sub: 'de ganancia' } : null,
          chips: [{ t: 'Vendidos 14 días', v: cant(vendidos(id, 14)) }, { t: 'Precio', v: dinero(p.precio) }, { t: 'Mínimo', v: cant(p.min) }] })}
        <div class="dos"><button type="button" class="btn principal" data-x="venta">Vendí</button><button type="button" class="btn" data-x="entrada">Llegó mercancía</button></div>
        <div class="tarjeta"><h3 style="font-size:15px;padding:12px 0 2px">Últimos movimientos</h3>${movs.length ? movs.map(x => `<div class="mov"><div class="info"><b>${nombres[x.tipo]}${x.nota ? ` · ${esc(x.nota)}` : ''}</b><span>${Orbe.fecha(x.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div><span class="monto">${x.tipo === 'venta' ? '−' : x.tipo === 'entrada' ? '+' : '='}${cant(x.cant)}</span></div>`).join('') : '<p class="texto-ayuda" style="padding:6px 0 14px">Sin movimientos todavía.</p>'}</div>
        <div class="dos"><button type="button" class="btn" data-x="ajuste">Contar de nuevo</button><button type="button" class="btn" data-x="editar">Editar</button></div>
        <button type="button" class="btn peligro ancho" data-x="borrar">Eliminar producto</button>`
    });
    d.dataset.detalle = '1';
    d.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => {
      const x = b.dataset.x;
      if (x === 'editar') { d.close(); return setTimeout(() => formulario(p), 320); }
      if (x === 'borrar') {
        if (!(await confirmar(`Se borrará ${p.nombre} y su historial.`))) return;
        D().productos = D().productos.filter(q => q.id !== id); D().movs = D().movs.filter(q => q.pid !== id); Orbe.guardar(); d.close(); pintar(); return aviso('Producto eliminado');
      }
      cantidad(p, x);
    });
  }

  // Ejemplo: un minimercado con 14 productos y un mes de ventas
  function demo() {
    let s = 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const P = [['Harina de maíz 1 kg', 'Víveres', 1.0, 1.4, 48, 10, 5], ['Arroz 1 kg', 'Víveres', 1.05, 1.45, 36, 10, 4], ['Aceite 1 L', 'Víveres', 2.3, 3.1, 5, 6, 2], ['Pasta 500 g', 'Víveres', 0.7, 1.0, 40, 10, 3], ['Café 250 g', 'Víveres', 2.3, 3.2, 6, 5, 1.5],
      ['Huevos x 30', 'Frescos', 3.4, 4.5, 4, 5, 1.6], ['Queso blanco 1 kg', 'Frescos', 4.2, 5.8, 9, 3, 1], ['Leche 1 L', 'Frescos', 1.1, 1.5, 22, 8, 3],
      ['Refresco 2 L', 'Bebidas', 1.3, 2.0, 30, 8, 4], ['Agua 1,5 L', 'Bebidas', 0.5, 0.9, 0, 6, 2.5], ['Jugo de naranja', 'Bebidas', 1.2, 1.8, 14, 4, 0.8],
      ['Jabón de baño', 'Limpieza', 0.5, 0.9, 25, 5, 0.9], ['Detergente 1 kg', 'Limpieza', 2.1, 2.9, 12, 3, 0.5], ['Cloro 1 L', 'Limpieza', 0.9, 1.3, 18, 4, 0]];
    const productos = [], movs = []; let i = 0;
    P.forEach(([nombre, cat, costo, precio, stock, min, ritmo], k) => {
      const p = { id: 'p' + k, nombre, cat, costo, precio, stock, min, unidad: 'und', creado: Orbe.sumarDias(Orbe.hoy(), -60) }; productos.push(p);
      for (let dd = 29; dd >= 0; dd--) { const n = Math.round(ritmo * (0.4 + r() * 1.2) * (dd === 0 ? 0.6 : 1)); if (n > 0) movs.push({ id: 'm' + (i++), pid: p.id, tipo: 'venta', cant: n, precio, costo, fecha: Orbe.sumarDias(Orbe.hoy(), -dd) }); }
    });
    return { ajustes: { negocio: 'Mercado La Esquina', moneda: '$', proveedor: '' }, productos, movs };
  }

  Orbe.iniciar({
    id: 'inventario', nombre: 'Inventario simple', prefijo: 'INV', unidad: 'un producto tuyo', pintar, demo,
    datos: () => ({ productos: [], movs: [] }),
    icono: ICON.caja,
    tabs: [{ id: 'hoy', nombre: 'Hoy', icono: ICON.inicio }, { id: 'productos', nombre: 'Productos', icono: ICON.caja }, { id: 'reportes', nombre: 'Reportes', icono: ICON.grafico }],
    fab: () => Orbe.vista === 'productos' ? formulario() : vender(),
    extrasMenu: '<button type="button" class="fila" data-a="precios"><span class="info"><b>Lista de precios</b><span>Para tus estados y clientes</span></span></button>',
    alAccion: x => x === 'precios' ? (listaPrecios(), true) : false,
    ajustesExtra: a => `<label class="campo">WhatsApp de tu proveedor<input name="proveedor" inputmode="tel" value="${esc(a.proveedor || '')}" placeholder="Opcional, con código de país"><small>Para mandarle el pedido de lo que se está acabando.</small></label>`,
    guardarAjustes: (a, f) => { a.proveedor = f.proveedor.value.trim(); }
  });
})();
