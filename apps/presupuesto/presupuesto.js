(function () {
  const { esc, dinero, hoja, aviso, confirmar } = Orbe;
  const D = () => Orbe.datos;
  let mes = Orbe.hoy().slice(0, 7);
  const cat = id => D().categorias.find(c => c.id === id);
  const delMes = (m = mes) => D().movs.filter(x => x.fecha.startsWith(m));
  const gastadoEn = (id, m = mes) => delMes(m).filter(x => x.tipo === 'gasto' && x.cat === id).reduce((s, x) => s + x.monto, 0);
  const nivel = (g, l) => !l ? '' : g > l ? 'mal' : g >= l * 0.8 ? 'warn' : '';
  const sumaMes = (m, tipo) => delMes(m).filter(x => x.tipo === tipo).reduce((s, x) => s + x.monto, 0);
  const mover = n => { const [y, m] = mes.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; pintar(); };

  function pintar() {
    const entra = sumaMes(mes, 'ingreso'), sale = sumaMes(mes, 'gasto'), queda = entra - sale;
    const esteMes = mes === Orbe.hoy().slice(0, 7);
    document.getElementById('titulo-mes').textContent = new Date(mes + '-15T12:00:00').toLocaleDateString('es', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase());
    document.getElementById('sig').disabled = esteMes; document.getElementById('sig').style.opacity = esteMes ? .35 : 1;
    let pista = '';
    if (esteMes && sale > 0) {
      const dia = +Orbe.hoy().slice(8), total = new Date(+mes.slice(0, 4), +mes.slice(5), 0).getDate();
      const proy = sale / dia * total;
      pista = `<p style="margin:12px 0 0;font-size:13.5px;font-weight:700;opacity:.9">A este ritmo gastarás unos ${dinero(Math.round(proy))} este mes.</p>`;
    }
    document.getElementById('queda').innerHTML = `<small>${queda >= 0 ? 'Te queda' : 'Te pasaste por'}</small><b>${dinero(Math.abs(queda))}</b>
      <div class="dos"><span>Entró<br><b>${dinero(entra)}</b></span><span>Salió<br><b>${dinero(sale)}</b></span></div>${pista}`;

    const cs = D().categorias.map(c => ({ c, g: gastadoEn(c.id) })).sort((a, b) => (b.c.limite ? b.g / b.c.limite : 0) - (a.c.limite ? a.g / a.c.limite : 0) || b.g - a.g);
    const vacias = cs.filter(x => !x.g && !x.c.limite);
    const visibles = delMes().length && !pintar.todas ? cs.filter(x => x.g || x.c.limite) : cs;
    document.getElementById('cats').innerHTML = visibles.map(({ c, g }) => {
      const n = nivel(g, c.limite), pct = c.limite ? Math.min(100, g / c.limite * 100) : 0;
      const nota = !c.limite ? 'Sin límite' : n === 'mal' ? `Te pasaste por ${dinero(g - c.limite)}` : Math.abs(c.limite - g) < 0.005 ? 'Llegaste al límite' : n === 'warn' ? `Cuidado: te quedan ${dinero(c.limite - g)}` : `Te quedan ${dinero(c.limite - g)}`;
      return `<button type="button" class="cat ${n}" data-cat="${c.id}"><span class="top"><b>${esc(c.nombre)}</b><span>${dinero(g)}${c.limite ? ' de ' + dinero(c.limite) : ''}</span></span>${c.limite ? `<span class="barra-prog"><i style="width:${pct}%"></i></span>` : ''}<small>${nota}</small></button>`;
    }).join('') + (visibles.length < cs.length ? `<button type="button" class="enlace" id="ver-todas" style="align-self:flex-start">Ver ${vacias.length} categorías sin gastos</button>` : '') || '<div class="vacio">No tienes categorías. Toca “Editar” para crearlas.</div>';
    const vt = document.getElementById('ver-todas'); if (vt) vt.onclick = () => { pintar.todas = true; pintar(); };
    document.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => limite(cat(b.dataset.cat)));

    const ms = delMes().slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
    document.getElementById('lista').innerHTML = ms.length ? ms.slice(0, 60).map(x => `<button type="button" class="fila mov" data-m="${x.id}"><span class="info"><b>${esc(x.nota || (x.tipo === 'ingreso' ? 'Ingreso' : cat(x.cat)?.nombre || 'Gasto'))}</b><span>${Orbe.fecha(x.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}${x.tipo === 'gasto' && x.nota ? ' · ' + esc(cat(x.cat)?.nombre || '') : x.tipo === 'ingreso' ? ' · ingreso' : ''}</span></span><span class="monto ${x.tipo === 'ingreso' ? 'in' : ''}">${x.tipo === 'ingreso' ? '+' : '−'}${dinero(x.monto)}</span></button>`).join('')
      : `<div class="vacio"><b>${esteMes ? 'Empieza tu mes' : 'Sin movimientos'}</b>${esteMes ? 'Anota lo que te entra y lo que gastas. En segundos sabes cuánto te queda.' : 'Este mes no tiene movimientos.'}</div>`;
    document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => anotar(null, D().movs.find(x => x.id === b.dataset.m)));
  }

  function anotar(tipo = 'gasto', m) {
    const editar = !!m;
    if (!editar && !Orbe.puedeAgregar(D().movs.length)) return;
    m = m || { tipo, monto: '', cat: D().categorias[0]?.id, nota: '', fecha: mes === Orbe.hoy().slice(0, 7) ? Orbe.hoy() : mes + '-01' };
    tipo = m.tipo;
    const d = hoja({
      titulo: editar ? 'Editar movimiento' : 'Anotar',
      cuerpo: `<div class="opciones"><button type="button" class="opcion" data-t="gasto" aria-pressed="${tipo === 'gasto'}">Gasté</button><button type="button" class="opcion" data-t="ingreso" aria-pressed="${tipo === 'ingreso'}">Me entró</button></div>
        <label class="campo">Monto<input name="monto" inputmode="decimal" value="${m.monto}" placeholder="0" autocomplete="off"></label>
        <div class="campo" data-cats><span>Categoría</span><div class="opciones">${D().categorias.map(c => `<button type="button" class="opcion" data-c="${c.id}" aria-pressed="${c.id === m.cat}">${esc(c.nombre)}</button>`).join('')}</div></div>
        <label class="campo">Nota<input name="nota" value="${esc(m.nota)}" placeholder="Opcional, ej. Pago de luz" autocomplete="off"></label>
        <label class="campo">Fecha<input name="fecha" type="date" value="${m.fecha}"></label>
        <p class="texto-ayuda" data-err hidden style="color:var(--mal);font-weight:700"></p>`,
      pie: editar ? '<div class="dos"><button type="button" class="btn peligro" data-borrar>Borrar</button><button class="btn principal" type="submit">Guardar</button></div>' : '<button class="btn principal ancho" type="submit">Guardar</button>'
    });
    const f = d.querySelector('form'); let c = m.cat;
    const ver = () => { d.querySelector('[data-cats]').hidden = tipo !== 'gasto'; };
    d.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tipo = b.dataset.t; d.querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-pressed', x === b)); ver(); });
    d.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { c = b.dataset.c; d.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    ver(); if (!editar) setTimeout(() => f.monto.focus(), 250);
    const borrar = d.querySelector('[data-borrar]');
    if (borrar) borrar.onclick = async () => { if (!(await confirmar('Se borrará este movimiento.'))) return; D().movs = D().movs.filter(x => x.id !== m.id); Orbe.guardar(); d.close(); pintar(); };
    f.onsubmit = e => {
      e.preventDefault();
      const err = t => { const p = d.querySelector('[data-err]'); p.textContent = t; p.hidden = false; };
      const monto = Orbe.num(f.monto.value); if (monto <= 0) return err('Escribe un monto mayor que cero.');
      if (tipo === 'gasto' && !cat(c)) return err('Elige una categoría.');
      const antes = tipo === 'gasto' ? gastadoEn(c, f.fecha.value.slice(0, 7)) - (editar && m.tipo === 'gasto' && m.cat === c ? m.monto : 0) : 0;
      Object.assign(m, { tipo, monto, cat: tipo === 'gasto' ? c : null, nota: f.nota.value.trim(), fecha: f.fecha.value || Orbe.hoy() });
      if (!editar) { m.id = Orbe.uid(); D().movs.push(m); }
      Orbe.guardar(); mes = m.fecha.slice(0, 7); d.close(); pintar();
      if (tipo === 'gasto') {
        const k = cat(c), g = antes + monto;
        if (k.limite && g > k.limite && antes <= k.limite) return aviso(`⚠️ Te pasaste del límite de ${k.nombre}`);
        if (k.limite && g >= k.limite * 0.8 && antes < k.limite * 0.8) return aviso(`Cuidado: ya usaste el ${Math.round(g / k.limite * 100)}% de ${k.nombre}`);
      }
      aviso(editar ? 'Cambios guardados' : tipo === 'gasto' ? 'Gasto anotado' : 'Ingreso anotado');
    };
  }

  function limite(c) {
    const g = gastadoEn(c.id);
    const d = hoja({ titulo: c.nombre, cuerpo: `<p class="texto-ayuda">Este mes llevas ${dinero(g)} en ${esc(c.nombre)}.</p><label class="campo">Límite al mes<input name="limite" inputmode="decimal" value="${c.limite || ''}" placeholder="Sin límite"><small>Te avisamos al llegar al 80% y si te pasas.</small></label><label class="campo">Nombre<input name="nombre" value="${esc(c.nombre)}"></label>`,
      pie: '<button class="btn principal ancho" type="submit">Guardar</button>' });
    const f = d.querySelector('form');
    f.onsubmit = e => { e.preventDefault(); c.limite = Orbe.num(f.limite.value); c.nombre = f.nombre.value.trim() || c.nombre; Orbe.guardar(); d.close(); pintar(); };
  }

  function categorias() {
    const lista = d => {
      d.querySelector('[data-lista]').innerHTML = D().categorias.map(c => `<div class="serv"><span><b>${esc(c.nombre)}</b><br><small>${c.limite ? 'Límite ' + dinero(c.limite) : 'Sin límite'}</small></span><button type="button" class="icono-btn" data-q="${c.id}" aria-label="Quitar ${esc(c.nombre)}">${Orbe.ICON.cerrar}</button></div>`).join('');
      d.querySelectorAll('[data-q]').forEach(b => b.onclick = async () => {
        const usada = D().movs.some(x => x.cat === b.dataset.q);
        if (usada && !(await confirmar('Esta categoría tiene gastos. Se quitará la categoría y sus gastos quedarán en “Otros”.', 'Quitar'))) return;
        let otros = D().categorias.find(c => c.nombre === 'Otros' && c.id !== b.dataset.q);
        if (usada && !otros) { otros = { id: Orbe.uid(), nombre: 'Otros', limite: 0 }; D().categorias.push(otros); }
        D().movs.forEach(x => { if (x.cat === b.dataset.q) x.cat = otros.id; });
        D().categorias = D().categorias.filter(c => c.id !== b.dataset.q); Orbe.guardar(); pintar();
        if (document.body.contains(d)) lista(d); else categorias();
      });
    };
    const d = hoja({ titulo: 'Categorías', cuerpo: '<div class="tarjeta" style="padding:4px 16px" data-lista></div><div class="fila2"><label class="campo">Nueva categoría<input name="nombre" placeholder="Ej. Publicidad" autocomplete="off"></label><label class="campo">Límite al mes<input name="limite" inputmode="decimal" placeholder="Opcional"></label></div>', pie: '<button class="btn principal ancho" type="submit">Agregar</button>' });
    lista(d);
    const f = d.querySelector('form');
    f.onsubmit = e => { e.preventDefault(); if (!f.nombre.value.trim()) return f.nombre.focus(); D().categorias.push({ id: Orbe.uid(), nombre: f.nombre.value.trim(), limite: Orbe.num(f.limite.value) }); Orbe.guardar(); f.reset(); lista(d); pintar(); f.nombre.focus(); };
  }

  const base = ['Mercancía', 'Alquiler', 'Servicios (luz, agua, internet)', 'Sueldos', 'Transporte', 'Comida', 'Otros'];
  Orbe.iniciar({
    id: 'presupuesto', nombre: 'Presupuesto del mes', prefijo: 'PRE', limite: 15, unidad: 'movimientos', pintar,
    icono: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3"/></svg>',
    extrasMenu: '<button type="button" class="fila" data-a="categorias"><span class="info"><b>Categorías y límites</b><span>En qué gastas y cuánto te permites</span></span></button>',
    alAccion: x => x === 'categorias' ? (categorias(), true) : false
  }, { categorias: base.map((n, i) => ({ id: 'c' + i, nombre: n, limite: 0 })), movs: [] });
  document.getElementById('nuevo').onclick = () => anotar('gasto');
  document.getElementById('btn-cats').onclick = categorias;
  document.getElementById('ant').onclick = () => mover(-1);
  document.getElementById('sig').onclick = () => mover(1);
})();
