(function () {
  const { esc, dinero, hoja, aviso, confirmar, ICON } = Orbe;
  const D = () => Orbe.datos;
  let mes = Orbe.hoy().slice(0, 7), tipoMov = 'todos', busca = '';
  const cat = id => D().categorias.find(c => c.id === id);
  const colCat = id => Orbe.paleta[(D().categorias.findIndex(c => c.id === id) + 8) % 8];
  const delMes = (m = mes) => D().movs.filter(x => x.fecha.startsWith(m));
  const suma = (ms, tipo) => ms.filter(x => x.tipo === tipo).reduce((s, x) => s + x.monto, 0);
  const gastadoEn = (id, m = mes) => delMes(m).filter(x => x.tipo === 'gasto' && x.cat === id).reduce((s, x) => s + x.monto, 0);
  const mesAnt = m => { const [y, k] = m.split('-').map(Number), d = new Date(y, k - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const diasMes = m => new Date(+m.slice(0, 4), +m.slice(5), 0).getDate();
  const nombreMes = (m, año = true) => new Date(m + '-15T12:00:00').toLocaleDateString('es', año ? { month: 'long', year: 'numeric' } : { month: 'long' });
  const mover = n => { const [y, k] = mes.split('-').map(Number), d = new Date(y, k - 1 + n, 1); mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; pintar(); };
  const pagadoFijo = (f, m = mes) => D().movs.find(x => x.fijo === f.id && x.fecha.startsWith(m));
  const venceFijo = (f, m = mes) => `${m}-${String(Math.min(f.dia, diasMes(m))).padStart(2, '0')}`;

  function pintar() { const v = document.getElementById('vista'); ({ mes: pintarMes, movimientos: pintarMovs, fijos: pintarFijos })[Orbe.vista](v); }

  function cabMes() {
    const este = mes === Orbe.hoy().slice(0, 7);
    return `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px"><button class="icono-btn" type="button" data-mes="-1" aria-label="Mes anterior">${Orbe.sv('<path d="M15 5l-7 7 7 7"/>', 2.4)}</button><h2 style="font-size:18px">${nombreMes(mes).replace(/^./, c => c.toUpperCase())}</h2><button class="icono-btn" type="button" data-mes="1" aria-label="Mes siguiente" ${este ? 'disabled' : ''}>${Orbe.sv('<path d="M9 5l7 7-7 7"/>', 2.4)}</button></div>`;
  }
  const activarMes = v => v.querySelectorAll('[data-mes]').forEach(b => b.onclick = () => mover(+b.dataset.mes));

  function pintarMes(v) {
    const ms = delMes(), entra = suma(ms, 'ingreso'), sale = suma(ms, 'gasto'), queda = entra - sale;
    const este = mes === Orbe.hoy().slice(0, 7), hoyN = +Orbe.hoy().slice(8), dm = diasMes(mes);
    const pend = D().fijos.filter(f => !pagadoFijo(f)).reduce((s, f) => s + f.monto, 0);
    const restantes = dm - hoyN + 1, porDia = este ? (queda - pend) / restantes : null;
    const anterior = suma(delMes(mesAnt(mes)), 'gasto');
    const comp = anterior ? Math.round((sale / (este ? hoyN / dm : 1) - anterior) / anterior * 100) : null;
    const tareas = [];
    if (este) {
      D().fijos.filter(f => !pagadoFijo(f) && Orbe.diasEntre(Orbe.hoy(), venceFijo(f)) <= 3).forEach(f => { const dd = Orbe.diasEntre(Orbe.hoy(), venceFijo(f)); tareas.push({ color: dd < 0 ? 'var(--out)' : 'var(--warn)', icono: ICON.calendario, titulo: `Pagar ${esc(f.nombre)}: ${dinero(f.monto)}`, sub: dd < 0 ? `Venció hace ${-dd} ${-dd === 1 ? 'día' : 'días'}. Toca para marcarlo pagado.` : dd === 0 ? 'Vence hoy. Toca para marcarlo pagado.' : `Vence en ${dd} ${dd === 1 ? 'día' : 'días'}. Toca para marcarlo pagado.`, accion: () => pagarFijo(f) }); });
      D().categorias.filter(c => c.limite && gastadoEn(c.id) > c.limite).forEach(c => tareas.push({ color: 'var(--out)', icono: ICON.alerta, titulo: `Te pasaste en ${esc(c.nombre)}`, sub: `Llevas ${dinero(gastadoEn(c.id))} de ${dinero(c.limite)}.`, accion: () => limite(c) }));
      const proy = hoyN >= 5 ? sale / hoyN * dm : 0;
      if (proy > entra && entra > 0) tareas.push({ color: '#3ba7e6', icono: ICON.grafico, titulo: 'A este ritmo gastarás más de lo que entra', sub: `Proyección del mes: ${dinero(Math.round(proy))} en gastos.`, accion: () => Orbe.ir('movimientos') });
    }
    const porCat = D().categorias.map(c => ({ c, g: gastadoEn(c.id) })).filter(x => x.g > 0).sort((a, b) => b.g - a.g);
    const conLim = D().categorias.filter(c => c.limite).map(c => ({ c, g: gastadoEn(c.id) })).sort((a, b) => b.g / b.c.limite - a.g / a.c.limite);
    v.innerHTML = `${cabMes()}<div class="entra">
      ${Orbe.hero({ etiqueta: queda >= 0 ? `Te queda en ${nombreMes(mes, false)}` : 'Gastaste más de lo que entró', monto: Math.abs(queda),
        pildora: este && entra ? (porDia > 0 ? { c: 'bien', t: `Puedes gastar ${dinero(Math.floor(porDia * 100) / 100)} al día` } : { c: 'mal', t: 'No te alcanza para los pagos fijos' }) : comp !== null ? { c: comp > 0 ? 'mal' : 'bien', t: `${comp > 0 ? '+' : ''}${comp}% de gastos vs mes anterior` } : null,
        anillo: { p: entra ? Math.min(1, sale / entra) : 0, t: entra ? Math.round(sale / entra * 100) + '%' : '—', sub: 'gastado', c: entra && sale > entra ? '#ff6b8b' : 'var(--c)' },
        chips: [{ t: 'Entró', v: dinero(Math.round(entra)), c: '#7ff0c4' }, { t: 'Salió', v: dinero(Math.round(sale)), c: '#ffb3c2' }, { t: 'Fijos', v: dinero(Math.round(pend)) }] })}
      ${tareas.length ? `<section class="seccion"><div class="seccion-cab"><h2>Para hacer hoy</h2><span class="cuenta">${tareas.length}</span></div>${Orbe.tareas(tareas)}</section>` : ''}
      <section class="seccion"><div class="seccion-cab"><h2>En qué se va</h2>${comp !== null && este ? `<span class="chip ${comp > 0 ? 'mal' : 'ok'}">${comp > 0 ? '+' : ''}${comp}% vs ${nombreMes(mesAnt(mes), false)}</span>` : ''}</div>
        <div class="tarjeta p">${porCat.length ? Orbe.orbe(porCat.map(x => ({ n: x.c.nombre, v: x.g, c: colCat(x.c.id) })), sale) : '<p class="texto-ayuda">Aún no hay gastos este mes. Toca + para anotar.</p>'}</div></section>
      <section class="seccion"><div class="seccion-cab"><h2>Tus límites</h2><button class="enlace" type="button" id="btn-cats">Editar</button></div>
        <div class="lista">${conLim.length ? conLim.map(({ c, g }) => { const r = g / c.limite, col = r > 1 ? 'var(--out)' : r >= 0.8 ? 'var(--warn)' : 'var(--in)';
          return `<button type="button" class="fila toque" data-cat="${c.id}">${Orbe.ini(c.nombre, colCat(c.id))}<span class="info"><b>${esc(c.nombre)}</b><div class="progreso"><i style="width:${Math.min(100, Math.max(2, r * 100))}%;background:${col}"></i></div><span style="color:${r >= 0.8 ? col : ''}">${r > 1 ? `Te pasaste por ${dinero(g - c.limite)}` : `Te quedan ${dinero(c.limite - g)}`}</span></span><span class="derecha"><span class="monto">${dinero(g)}</span><small>de ${dinero(c.limite)}</small></span></button>`; }).join('')
          : '<div class="vacio"><b>Ponte límites</b>Elige cuánto quieres gastar al mes en cada categoría y te avisamos antes de pasarte.</div>'}</div></section></div>`;
    activarMes(v); Orbe.activarTareas(v, tareas);
    v.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => limite(cat(b.dataset.cat)));
    document.getElementById('btn-cats').onclick = categorias;
  }

  function pintarMovs(v) {
    let ms = delMes().slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
    if (tipoMov !== 'todos') ms = ms.filter(x => x.tipo === tipoMov);
    if (busca) ms = ms.filter(x => ((x.nota || '') + ' ' + (cat(x.cat)?.nombre || '')).toLowerCase().includes(busca));
    const dias = Array.from({ length: diasMes(mes) }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`).filter(f => f <= Orbe.hoy());
    const vals = dias.map(f => D().movs.filter(x => x.tipo === 'gasto' && x.fecha === f).reduce((s, x) => s + x.monto, 0));
    const grupos = {}; ms.forEach(x => (grupos[x.fecha] = grupos[x.fecha] || []).push(x));
    v.innerHTML = `${cabMes()}
      <section class="seccion" style="margin-top:12px"><div class="tarjeta p"><div class="seccion-cab" style="margin:0"><h2 style="font-size:16px">Gastos por día</h2><b class="num">${dinero(vals.reduce((s, x) => s + x, 0))}</b></div>${vals.length ? Orbe.grafico(vals, dias.map((f, i) => i % 5 ? '' : String(+f.slice(8)))) : '<p class="texto-ayuda">Este mes aún no empieza.</p>'}</div></section>
      <label class="buscar">${ICON.buscar}<input id="buscar" type="search" placeholder="Buscar movimiento" value="${esc(busca)}" aria-label="Buscar movimiento"></label>
      <div class="segmento">${[['todos', 'Todo'], ['gasto', 'Gastos'], ['ingreso', 'Ingresos']].map(([k, t]) => `<button type="button" data-t="${k}" aria-pressed="${tipoMov === k}">${t}</button>`).join('')}</div>
      <div class="entra">${Object.keys(grupos).length ? Object.entries(grupos).map(([f, xs]) => `<section class="seccion" style="margin-top:16px"><div class="seccion-cab" style="margin-bottom:6px"><h2 style="font-size:14px;color:var(--muted);font-weight:600">${Orbe.fecha(f, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase())}</h2><span class="texto-ayuda num">${dinero(suma(xs, 'ingreso') - suma(xs, 'gasto'))}</span></div><div class="tarjeta">${xs.map(x => {
        const c = cat(x.cat), n = x.tipo === 'ingreso' ? 'Ingreso' : c?.nombre || 'Gasto';
        return `<button type="button" class="tarea" data-m="${x.id}"><span class="ini" style="width:38px;height:38px;border-radius:12px;font-size:13px;background:${x.tipo === 'ingreso' ? 'var(--in)' : colCat(x.cat)}">${x.tipo === 'ingreso' ? ICON.dinero : esc(Orbe.iniciales(n))}</span><span class="info"><b>${esc(x.nota || n)}</b><span>${esc(x.nota ? n : '')}${x.fijo ? (x.nota ? ' · ' : '') + 'pago fijo' : ''}</span></span><span class="monto" style="color:${x.tipo === 'ingreso' ? 'var(--in)' : 'inherit'}">${x.tipo === 'ingreso' ? '+' : '−'}${dinero(x.monto)}</span></button>`;
      }).join('')}</div></section>`).join('') : `<div class="vacio" style="margin-top:16px">${busca ? 'Nada coincide con tu búsqueda.' : '<b>Sin movimientos</b>Toca + para anotar lo que entra y lo que gastas.'}</div>`}</div>`;
    activarMes(v);
    const inp = document.getElementById('buscar');
    inp.oninput = e => { busca = e.target.value.trim().toLowerCase(); const p = inp.selectionStart; pintarMovs(v); const n = document.getElementById('buscar'); n.focus(); n.setSelectionRange(p, p); };
    v.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tipoMov = b.dataset.t; pintarMovs(v); });
    v.querySelectorAll('[data-m]').forEach(b => b.onclick = () => anotar(null, D().movs.find(x => x.id === b.dataset.m)));
  }

  function pintarFijos(v) {
    const fs = D().fijos.slice().sort((a, b) => a.dia - b.dia), m = Orbe.hoy().slice(0, 7);
    const total = fs.reduce((s, f) => s + f.monto, 0), pagado = fs.filter(f => pagadoFijo(f, m)).reduce((s, f) => s + f.monto, 0);
    v.innerHTML = `<div class="entra">${Orbe.hero({ etiqueta: `Pagos fijos de ${nombreMes(m, false)}`, monto: total - pagado, pildora: { c: total - pagado > 0 ? '' : 'bien', t: total - pagado > 0 ? 'por pagar este mes' : 'Todo pagado este mes' },
        anillo: { p: total ? pagado / total : 0, t: total ? Math.round(pagado / total * 100) + '%' : '—', sub: 'pagado' }, chips: [{ t: 'Total al mes', v: dinero(total) }, { t: 'Pagado', v: dinero(pagado), c: '#7ff0c4' }, { t: 'Pagos', v: fs.length }] })}
      <p class="texto-ayuda" style="margin-top:14px">Alquiler, servicios, sueldos, cuotas: lo que pagas todos los meses. Te avisamos 3 días antes y con un toque queda anotado.</p>
      <section class="seccion" style="margin-top:12px"><div class="lista">${fs.length ? fs.map(f => { const p = pagadoFijo(f, m), dd = Orbe.diasEntre(Orbe.hoy(), venceFijo(f, m)), col = p ? 'var(--in)' : dd < 0 ? 'var(--out)' : dd <= 3 ? 'var(--warn)' : 'var(--muted)';
        return `<div class="fila">${Orbe.ini(f.nombre, colCat(f.cat))}<span class="info"><b>${esc(f.nombre)}</b><span style="color:${col}">${p ? `Pagado el ${Orbe.fecha(p.fecha)}` : dd < 0 ? `Venció el día ${f.dia}` : dd === 0 ? 'Vence hoy' : `Vence el día ${f.dia}`}</span></span><span class="derecha"><span class="monto">${dinero(f.monto)}</span>${p ? '<small><span class="chip ok">Pagado</span></small>' : `<button type="button" class="chip" style="border:0;background:var(--c);color:var(--c-ink);padding:5px 11px;margin-top:3px" data-pagar="${f.id}">Pagar</button>`}</span><button type="button" class="icono-btn" style="width:34px;height:34px" data-editar="${f.id}" aria-label="Editar ${esc(f.nombre)}">${ICON.menu}</button></div>`; }).join('')
        : '<div class="vacio"><b>Sin pagos fijos</b>Agrega lo que pagas cada mes para no olvidarlo.</div>'}</div></section>
      <button type="button" class="btn ancho" style="margin-top:14px" id="nuevo-fijo">${ICON.mas} Agregar pago fijo</button></div>`;
    v.querySelectorAll('[data-pagar]').forEach(b => b.onclick = () => pagarFijo(D().fijos.find(f => f.id === b.dataset.pagar)));
    v.querySelectorAll('[data-editar]').forEach(b => b.onclick = () => fijo(D().fijos.find(f => f.id === b.dataset.editar)));
    document.getElementById('nuevo-fijo').onclick = () => fijo();
  }

  function pagarFijo(f) {
    if (pagadoFijo(f, Orbe.hoy().slice(0, 7))) return aviso('Ya está pagado este mes');
    if (!Orbe.puedeAgregar()) return;
    D().movs.push({ id: Orbe.uid(), tipo: 'gasto', monto: f.monto, cat: f.cat, nota: f.nombre, fecha: Orbe.hoy(), fijo: f.id });
    Orbe.guardar(); Orbe.pintarDemo(); pintar(); aviso(`${f.nombre} pagado y anotado`);
  }
  function fijo(f) {
    const nuevo = !f; f = f || { nombre: '', monto: '', dia: 1, cat: D().categorias[0]?.id };
    const d = hoja({ titulo: nuevo ? 'Nuevo pago fijo' : 'Editar pago fijo', cuerpo: `<label class="campo">Qué pagas<input name="nombre" value="${esc(f.nombre)}" placeholder="Ej. Alquiler del local" autocomplete="off"></label>
      <div class="fila2"><label class="campo">Monto<input name="monto" inputmode="decimal" value="${f.monto}" placeholder="0"></label><label class="campo">Día del mes<input name="dia" inputmode="numeric" value="${f.dia}" placeholder="1"></label></div>
      <label class="campo">Categoría<select name="cat">${D().categorias.map(c => `<option value="${c.id}" ${c.id === f.cat ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label>`,
      pie: nuevo ? '<button class="btn principal ancho" type="submit">Guardar</button>' : '<div class="dos"><button type="button" class="btn peligro" data-borrar>Quitar</button><button class="btn principal" type="submit">Guardar</button></div>' });
    const fm = d.querySelector('form');
    const b = d.querySelector('[data-borrar]'); if (b) b.onclick = async () => { if (!(await confirmar(`Se quitará ${f.nombre} de tus pagos fijos. Los pagos ya anotados se quedan.`, 'Quitar'))) return; D().fijos = D().fijos.filter(x => x.id !== f.id); Orbe.guardar(); d.close(); pintar(); };
    fm.onsubmit = e => {
      e.preventDefault();
      const dia = Math.round(Orbe.num(fm.dia.value)), monto = Orbe.num(fm.monto.value);
      if (!fm.nombre.value.trim()) return Orbe.error(d, 'Escribe qué pagas.'); if (monto <= 0) return Orbe.error(d, 'Escribe el monto.'); if (dia < 1 || dia > 31) return Orbe.error(d, 'El día debe estar entre 1 y 31.');
      Object.assign(f, { nombre: fm.nombre.value.trim(), monto, dia, cat: fm.cat.value });
      if (nuevo) { f.id = Orbe.uid(); D().fijos.push(f); }
      Orbe.guardar(); d.close(); pintar(); aviso('Pago fijo guardado');
    };
  }

  function anotar(tipo = 'gasto', m) {
    const editar = !!m;
    m = m || { tipo, monto: '', cat: D().categorias[0]?.id, nota: '', fecha: mes === Orbe.hoy().slice(0, 7) ? Orbe.hoy() : mes + '-01' };
    tipo = m.tipo;
    const d = hoja({
      titulo: editar ? 'Editar movimiento' : 'Anotar',
      cuerpo: `<div class="segmento" style="margin:0"><button type="button" data-t="gasto" aria-pressed="${tipo === 'gasto'}">Gasté</button><button type="button" data-t="ingreso" aria-pressed="${tipo === 'ingreso'}">Me entró</button></div>
        <label class="campo">Monto<input name="monto" class="grande" inputmode="decimal" value="${m.monto}" placeholder="${esc(Orbe.simbolo())}0" autocomplete="off"></label>
        <div class="campo" data-cats><span>Categoría</span><div class="opciones">${D().categorias.map(c => `<button type="button" class="opcion" data-c="${c.id}" aria-pressed="${c.id === m.cat}"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colCat(c.id)};margin-right:6px"></span>${esc(c.nombre)}</button>`).join('')}</div></div>
        <label class="campo">Nota<input name="nota" value="${esc(m.nota)}" placeholder="Opcional, ej. Pago de luz" autocomplete="off"></label>
        <label class="campo">Fecha<input name="fecha" type="date" value="${m.fecha}"></label><div data-info></div>`,
      pie: editar ? '<div class="dos"><button type="button" class="btn peligro" data-borrar>Borrar</button><button class="btn principal" type="submit">Guardar</button></div>' : '<button class="btn principal ancho" type="submit">Guardar</button>'
    });
    const f = d.querySelector('form'); let c = m.cat;
    const info = () => { const k = cat(c), el = d.querySelector('[data-info]'); el.innerHTML = tipo === 'gasto' && k?.limite ? `<p class="texto-ayuda">En ${esc(k.nombre)} llevas ${dinero(gastadoEn(k.id, f.fecha.value.slice(0, 7)))} de ${dinero(k.limite)} este mes.</p>` : ''; };
    const ver = () => { d.querySelector('[data-cats]').hidden = tipo !== 'gasto'; info(); };
    d.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tipo = b.dataset.t; d.querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-pressed', x === b)); ver(); });
    d.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { c = b.dataset.c; d.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-pressed', x === b)); info(); });
    ver();
    const borrar = d.querySelector('[data-borrar]');
    if (borrar) borrar.onclick = async () => { if (!(await confirmar('Se borrará este movimiento.'))) return; D().movs = D().movs.filter(x => x.id !== m.id); Orbe.guardar(); d.close(); pintar(); };
    f.onsubmit = e => {
      e.preventDefault();
      const monto = Orbe.num(f.monto.value); if (monto <= 0) return Orbe.error(d, 'Escribe un monto mayor que cero.');
      if (tipo === 'gasto' && !cat(c)) return Orbe.error(d, 'Elige una categoría.');
      if (!editar && !Orbe.puedeAgregar()) return d.close();
      const m2 = f.fecha.value.slice(0, 7) || mes;
      const antes = tipo === 'gasto' ? gastadoEn(c, m2) - (editar && m.tipo === 'gasto' && m.cat === c ? m.monto : 0) : 0;
      Object.assign(m, { tipo, monto, cat: tipo === 'gasto' ? c : null, nota: f.nota.value.trim(), fecha: f.fecha.value || Orbe.hoy() });
      if (!editar) { m.id = Orbe.uid(); D().movs.push(m); }
      Orbe.guardar(); mes = m.fecha.slice(0, 7); d.close(); Orbe.pintarDemo(); pintar();
      if (tipo === 'gasto') {
        const k = cat(c), g = antes + monto;
        if (k.limite && g > k.limite && antes <= k.limite) return aviso(`Te pasaste del límite de ${k.nombre}`);
        if (k.limite && g >= k.limite * 0.8 && antes < k.limite * 0.8) return aviso(`Cuidado: ya usaste el ${Math.round(g / k.limite * 100)}% de ${k.nombre}`);
      }
      aviso(editar ? 'Cambios guardados' : tipo === 'gasto' ? 'Gasto anotado' : 'Ingreso anotado');
    };
  }

  function limite(c) {
    const g = gastadoEn(c.id), ant = gastadoEn(c.id, mesAnt(mes));
    const d = hoja({ titulo: c.nombre, cuerpo: `<p class="texto-ayuda">Este mes llevas ${dinero(g)}. El mes pasado gastaste ${dinero(ant)}.</p><label class="campo">Límite al mes<input name="limite" class="grande" inputmode="decimal" value="${c.limite || ''}" placeholder="Sin límite"><small>Te avisamos al llegar al 80% y si te pasas.</small></label>${ant ? `<button type="button" class="enlace" data-sug style="align-self:flex-start">Usar lo del mes pasado (${dinero(Math.ceil(ant))})</button>` : ''}<label class="campo">Nombre<input name="nombre" value="${esc(c.nombre)}"></label>`,
      pie: '<button class="btn principal ancho" type="submit">Guardar</button>' });
    const f = d.querySelector('form'), s = d.querySelector('[data-sug]'); if (s) s.onclick = () => { f.limite.value = Math.ceil(ant); };
    f.onsubmit = e => { e.preventDefault(); c.limite = Orbe.num(f.limite.value); c.nombre = f.nombre.value.trim() || c.nombre; Orbe.guardar(); d.close(); pintar(); };
  }

  function categorias() {
    const lista = d => {
      d.querySelector('[data-lista]').innerHTML = D().categorias.map(c => `<div class="mov"><span style="width:10px;height:10px;border-radius:50%;background:${colCat(c.id)}"></span><div class="info"><b>${esc(c.nombre)}</b><span>${c.limite ? 'Límite ' + dinero(c.limite) : 'Sin límite'}</span></div><button type="button" class="enlace" data-l="${c.id}">Límite</button><button type="button" class="borrar" data-q="${c.id}" aria-label="Quitar ${esc(c.nombre)}">${ICON.cerrar}</button></div>`).join('');
      d.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { d.close(); setTimeout(() => limite(cat(b.dataset.l)), 320); });
      d.querySelectorAll('[data-q]').forEach(b => b.onclick = async () => {
        const id = b.dataset.q, usada = D().movs.some(x => x.cat === id) || D().fijos.some(x => x.cat === id);
        if (usada && !(await confirmar('Esta categoría tiene movimientos. Pasarán a “Otros”.', 'Quitar'))) return;
        let otros = D().categorias.find(c => c.nombre === 'Otros' && c.id !== id);
        if (usada && !otros) { otros = { id: Orbe.uid(), nombre: 'Otros', limite: 0 }; D().categorias.push(otros); }
        D().movs.forEach(x => { if (x.cat === id) x.cat = otros.id; }); D().fijos.forEach(x => { if (x.cat === id) x.cat = otros.id; });
        D().categorias = D().categorias.filter(c => c.id !== id); Orbe.guardar(); pintar();
        if (document.body.contains(d)) lista(d); else categorias();
      });
    };
    const d = hoja({ titulo: 'Categorías', cuerpo: '<div class="tarjeta" data-lista></div><div class="fila2"><label class="campo">Nueva categoría<input name="nombre" placeholder="Ej. Publicidad" autocomplete="off"></label><label class="campo">Límite al mes<input name="limite" inputmode="decimal" placeholder="Opcional"></label></div>', pie: '<button class="btn principal ancho" type="submit">Agregar</button>' });
    lista(d);
    const f = d.querySelector('form');
    f.onsubmit = e => { e.preventDefault(); if (!f.nombre.value.trim()) return Orbe.error(d, 'Escribe el nombre.'); D().categorias.push({ id: Orbe.uid(), nombre: f.nombre.value.trim(), limite: Orbe.num(f.limite.value) }); Orbe.guardar(); f.reset(); lista(d); pintar(); };
  }

  const base = ['Mercancía', 'Alquiler', 'Servicios', 'Sueldos', 'Transporte', 'Publicidad', 'Comida', 'Otros'];
  // Ejemplo: una tienda con este mes y el anterior
  function demo() {
    let s = 5; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const categorias = base.map((n, i) => ({ id: 'c' + i, nombre: n, limite: [900, 300, 120, 400, 80, 60, 150, 0][i] }));
    const fijos = [{ id: 'f1', nombre: 'Alquiler del local', monto: 300, dia: 1, cat: 'c1' }, { id: 'f2', nombre: 'Luz', monto: 42, dia: 18, cat: 'c2' }, { id: 'f3', nombre: 'Internet', monto: 25, dia: 20, cat: 'c2' }, { id: 'f4', nombre: 'Sueldo del ayudante', monto: 380, dia: 30, cat: 'c3' }];
    const movs = []; let i = 0; const hoy = Orbe.hoy(), m0 = hoy.slice(0, 7), m1 = mesAnt(m0);
    const add = (tipo, monto, cat, nota, fecha, fijo) => { if (fecha <= hoy) movs.push({ id: 'x' + String(i++).padStart(3, '0'), tipo, monto: Math.round(monto * 100) / 100, cat, nota, fecha, fijo }); };
    [m1, m0].forEach(m => {
      const dm = diasMes(m);
      for (let d = 1; d <= dm; d++) {
        const f = `${m}-${String(d).padStart(2, '0')}`;
        if (d % 7 === 0) add('ingreso', 640 + r() * 220, null, 'Ventas de la semana', f);
        if (d % 5 === 2) add('gasto', 110 + r() * 90, 'c0', ['Pedido al mayorista', 'Mercancía', 'Reposición'][d % 3], f);
        if (r() < 0.22) add('gasto', 4 + r() * 14, 'c4', 'Gasolina', f);
        if (r() < 0.18) add('gasto', 5 + r() * 12, 'c6', 'Almuerzo', f);
        if (d === 9) add('gasto', 35, 'c5', 'Anuncio en Instagram', f);
      }
      fijos.forEach(x => { if (m === m1 || x.dia <= 5) add('gasto', x.monto, x.cat, x.nombre, `${m}-${String(Math.min(x.dia, dm)).padStart(2, '0')}`, x.id); });
    });
    return { ajustes: { negocio: 'Tienda Mi Barrio', moneda: '$' }, categorias, fijos, movs };
  }

  Orbe.iniciar({
    id: 'presupuesto', nombre: 'Presupuesto del mes', prefijo: 'PRE', unidad: 'un movimiento tuyo', pintar, demo,
    datos: () => ({ categorias: base.map((n, i) => ({ id: 'c' + i, nombre: n, limite: 0 })), fijos: [], movs: [] }),
    icono: ICON.dinero,
    tabs: [{ id: 'mes', nombre: 'Mes', icono: ICON.inicio }, { id: 'movimientos', nombre: 'Movimientos', icono: ICON.lista }, { id: 'fijos', nombre: 'Fijos', icono: ICON.calendario }],
    fabTexto: v => v === 'fijos' ? 'Pago fijo' : 'Anotar',
    fab: () => Orbe.vista === 'fijos' ? fijo() : anotar('gasto'),
    extrasMenu: '<button type="button" class="fila" data-a="categorias"><span class="info"><b>Categorías y límites</b><span>En qué gastas y cuánto te permites</span></span></button>',
    alAccion: x => x === 'categorias' ? (categorias(), true) : false
  });
})();
