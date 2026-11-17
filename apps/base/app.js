/* Orbe Apps · base común de las microapps: datos en el teléfono, modo de ejemplo, pestañas, piezas visuales, activación e instalación. */
(function () {
  const ALF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const IG = 'https://ig.me/m/orbe.apps';
  const fnv = s => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const chk = (pre, body) => { const h = fnv('orbe17|' + pre + '|' + body); return ALF[h % 32] + ALF[(h >>> 5) % 32]; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const fechaISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const sv = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    menu: sv('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>', 2.2),
    cerrar: sv('<path d="M6 6l12 12M18 6 6 18"/>', 2.2),
    buscar: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    mas: sv('<path d="M12 5v14M5 12h14"/>', 2.4),
    flecha: sv('<path d="M9 6l6 6-6 6"/>'),
    inicio: sv('<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19Z"/>'),
    lista: sv('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
    grafico: sv('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    personas: sv('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3.5 6"/>'),
    reloj: sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    campana: sv('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    caja: sv('<path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16Z"/><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8"/>'),
    calendario: sv('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    dinero: sv('<path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3"/>'),
    alerta: sv('<path d="M12 4 2.5 20h19Z"/><path d="M12 10v4M12 17v.5"/>'),
    estrella: sv('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8Z"/>'),
    check: sv('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 2.4),
    papel: sv('<path d="M6 3h9l4 4v14H6Z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>'
  };
  const PALETA = ['#4f46e5', '#0f766e', '#b45309', '#be123c', '#0369a1', '#7c3aed', '#c2410c', '#15803d'];

  const Orbe = window.Orbe = {
    ICON, esc, sv,
    app: null, datos: null, vista: null,
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    hoy: () => fechaISO(new Date()),
    fechaISO,
    sumarDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return fechaISO(d); },
    diasEntre(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); },
    fecha(iso, opc = { day: 'numeric', month: 'short' }) { if (!iso) return ''; return new Date(iso.length > 10 ? iso : iso + 'T12:00:00').toLocaleDateString('es', opc).replace('.', ''); },
    hace(iso) { const d = Orbe.diasEntre(iso, Orbe.hoy()); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`; },
    _fmt(n, dec) { const o = { minimumFractionDigits: dec, maximumFractionDigits: dec }; try { return n.toLocaleString('es', { ...o, useGrouping: 'always' }); } catch (e) { return n.toLocaleString('es', o); } },
    simbolo() { const s = Orbe.datos?.ajustes?.moneda || '$'; return s + (s.length > 1 ? ' ' : ''); },
    dinero(n) {
      n = Number(n) || 0; const entero = Math.abs(n % 1) < 0.005;
      return (n < 0 ? '-' : '') + Orbe.simbolo() + Orbe._fmt(Math.abs(n), entero ? 0 : 2);
    },
    // Monto grande con los centavos más pequeños, como en Orbe
    montoHTML(n) {
      n = Number(n) || 0; const t = Orbe._fmt(Math.abs(n), 2), i = t.lastIndexOf(',');
      return `${n < 0 ? '-' : ''}${esc(Orbe.simbolo())}${t.slice(0, i)}<span class="dec">${t.slice(i)}</span>`;
    },
    num(v) { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; },
    whatsapp(numero, texto) {
      const n = String(numero || '').replace(/\D/g, '');
      window.open((n ? 'https://wa.me/' + n : 'https://wa.me/') + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    },
    iniciales: n => { const w = String(n).trim().split(/\s+/).filter(p => p.length >= 3 && /^\p{L}/u.test(p)); const t = w.length >= 2 ? w[0][0] + w[1][0] : (w[0] || String(n).trim()).slice(0, 2); return (t || '?').toUpperCase(); },
    paleta: PALETA,
    color: s => PALETA[fnv(String(s)) % PALETA.length],
    ini(nombre, color) { return `<span class="ini" style="background:${color || Orbe.color(nombre)}">${esc(Orbe.iniciales(nombre))}</span>`; },

    /* Piezas visuales */
    rings(items, size, sw, gap) {
      const c = size / 2; let h = '';
      items.forEach((it, k) => {
        const r = c - sw / 2 - k * (sw + gap); if (r < sw) return;
        const pr = Math.max(0, Math.min(1, it.p || 0));
        h += `<circle cx="${c}" cy="${c}" r="${r.toFixed(2)}" fill="none" style="stroke:${it.c};stroke-opacity:.18;stroke-width:${sw}"></circle>`;
        if (pr > 0.002) h += `<circle class="rg" cx="${c}" cy="${c}" r="${r.toFixed(2)}" fill="none" stroke-linecap="round" pathLength="${(1 / pr).toFixed(4)}" stroke-dasharray="1 1000" transform="rotate(-90 ${c} ${c})" style="stroke:${it.c};stroke-width:${sw};animation-delay:${(k * 0.08).toFixed(2)}s"></circle>`;
      });
      return `<svg class="rings" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${h}</svg>`;
    },
    hero({ etiqueta, monto, texto, pildora, anillo, chips, barras }) {
      const col = c => ({ '#7ff0c4': 'var(--in)', '#ffb3c2': 'var(--out)' }[c] || c || 'inherit');
      const on = anillo ? Math.round(Math.max(0, Math.min(1, anillo.p || 0)) * 20) : 0;
      return `<section class="hero"><small>${etiqueta}</small><div class="monto-xl">${monto !== undefined ? Orbe.montoHTML(monto) : texto}</div>${pildora ? `<span class="pildora ${pildora.c || ''}">${pildora.t}</span>` : ''}
        ${anillo ? `<div class="medidor"><div class="top"><span>${anillo.sub || ''}</span><b>${anillo.t}</b></div><div class="bloques">${Array.from({ length: 20 }, (_, k) => `<i class="${k < on ? 'on' : ''}" style="animation-delay:${k * 0.025}s"></i>`).join('')}</div></div>` : ''}
        ${barras ? `<div class="barras-mini">${barras.map((v, k) => `<i class="${k === barras.length - 1 ? 'hoy' : ''}" style="height:${Math.max(4, v * 100)}%;animation-delay:${k * 0.02}s"></i>`).join('')}</div>` : ''}
        ${chips ? `<div class="chips">${chips.map(x => `<div><small>${x.t}</small><b style="color:${col(x.c)}">${x.v}</b></div>`).join('')}</div>` : ''}</section>`;
    },
    tareas(lista, vacio = 'Todo al día. Nada pendiente por ahora.') {
      if (!lista.length) return `<div class="todo-bien"><span class="ini">${ICON.check}</span>${vacio}</div>`;
      return `<div class="notas">${lista.map((t, i) => `<button type="button" class="nota" data-tarea="${i}" style="--t:${t.color}"><span class="ico">${t.icono}</span><span class="txt"><b>${t.titulo}</b><span>${t.sub}</span></span><em>${ICON.flecha}</em></button>`).join('')}</div>`;
    },
    activarTareas(raiz, lista) { raiz.querySelectorAll('[data-tarea]').forEach(b => b.onclick = () => lista[+b.dataset.tarea].accion()); },
    grafico(valores, etiquetas, iHoy = valores.length - 1) {
      const max = Math.max(...valores, 0.0001);
      return `<div class="grafico">${valores.map((v, i) => `<div class="col ${i === iHoy ? 'hoy' : ''}"><i style="height:${Math.max(2, v / max * 100)}%;animation-delay:${i * 0.025}s"></i><small>${etiquetas[i]}</small></div>`).join('')}</div>`;
    },
    orbe(items, total) { // reparto: barra apilada y lista con porcentaje
      const top = items.slice(0, 6), t = total || 1;
      return `<div class="reparto"><div class="apilada">${top.map((x, k) => `<i style="width:${x.v / t * 100}%;background:${x.c};animation-delay:${k * 0.05}s" title="${esc(x.n)}"></i>`).join('')}</div><div class="leyenda">${top.map(x => `<div><i style="background:${x.c}"></i><span>${esc(x.n)}</span><em>${Math.round(x.v / t * 100)}%</em><b>${x.etq ?? Orbe.dinero(x.v)}</b></div>`).join('')}</div></div>`;
    },

    /* Datos: en modo de ejemplo se usan datos de muestra aparte */
    clave() { return (Orbe.activa() ? 'orbe-' : 'orbe-demo-') + Orbe.app.id; },
    cargar() {
      let d = null; const def = Orbe.app.datos();
      try { d = JSON.parse(localStorage.getItem(Orbe.clave())); } catch (e) {}
      if (!d && !Orbe.activa()) { d = Orbe.app.demo(); d._demo = true; }
      const g = d || {};
      d = Object.assign(structuredClone(def), g);
      d.ajustes = Object.assign({ negocio: '', moneda: '$' }, structuredClone(def.ajustes || {}), g.ajustes || {});
      return Orbe.datos = d;
    },
    guardar() {
      try { localStorage.setItem(Orbe.clave(), JSON.stringify(Orbe.datos)); }
      catch (e) { Orbe.aviso('No se pudo guardar. Revisa el espacio de tu teléfono.'); }
    },

    /* Activación con código */
    validar(codigo) {
      const c = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const pre = Orbe.app.prefijo;
      if (!c.startsWith(pre) || c.length !== pre.length + 8) return false;
      const resto = c.slice(pre.length); const body = resto.slice(0, 6);
      if ([...resto].some(ch => !ALF.includes(ch))) return false;
      return resto.slice(6) === chk(pre, body);
    },
    activa() { try { return Orbe.validar(localStorage.getItem('orbe-licencia-' + Orbe.app.id)); } catch (e) { return false; } },
    // En el ejemplo se puede agregar 1 registro propio para probar
    puedeAgregar() {
      if (Orbe.activa()) return true;
      if (!(Orbe.datos._propios >= 1)) { Orbe.datos._propios = (Orbe.datos._propios || 0) + 1; return true; }
      Orbe.activar(`En el ejemplo puedes agregar ${Orbe.app.unidad} para probar. Activa tu app para usarla con tu negocio, sin límites.`);
      return false;
    },
    enDemo() { return !Orbe.activa(); },

    hoja({ titulo, cuerpo, pie = '', alAbrir }) {
      const d = document.createElement('dialog'); d.className = 'hoja';
      d.innerHTML = `<form class="hoja-in" method="dialog" novalidate><div class="hoja-cab"><h2>${esc(titulo)}</h2><button class="icono-btn" type="button" data-cerrar aria-label="Cerrar">${ICON.cerrar}</button></div><div class="hoja-cuerpo">${cuerpo}</div>${pie ? `<div class="hoja-pie">${pie}</div>` : ''}</form>`;
      document.body.appendChild(d);
      d.querySelector('[data-cerrar]').onclick = () => d.close();
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
      d.addEventListener('close', () => setTimeout(() => d.remove(), 300));
      d.showModal(); d.querySelector('.hoja-cuerpo').scrollTop = 0;
      // El teclado nunca se abre solo
      if (document.activeElement && d.contains(document.activeElement)) document.activeElement.blur();
      alAbrir && alAbrir(d, d.querySelector('form'));
      return d;
    },
    error(d, texto) { let p = d.querySelector('.error'); if (!p) { p = document.createElement('p'); p.className = 'error'; d.querySelector('.hoja-cuerpo').appendChild(p); } p.textContent = texto; p.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); },
    confirmar(texto, si = 'Sí, borrar') {
      return new Promise(res => {
        const d = Orbe.hoja({ titulo: '¿Seguro?', cuerpo: `<p class="texto-ayuda" style="font-size:15px">${esc(texto)}</p>`,
          pie: `<div class="dos"><button type="button" class="btn" data-no>Cancelar</button><button type="button" class="btn peligro" data-si>${esc(si)}</button></div>` });
        let r = false;
        d.querySelector('[data-si]').onclick = () => { r = true; d.close(); };
        d.querySelector('[data-no]').onclick = () => d.close();
        d.addEventListener('close', () => res(r));
      });
    },
    aviso(texto) {
      let t = document.querySelector('.toast');
      if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
      t.textContent = texto; t.classList.add('ver');
      clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('ver'), 2600);
    },

    activar(motivo) {
      const d = Orbe.hoja({
        titulo: 'Activa tu app',
        cuerpo: `${motivo ? `<p class="texto-ayuda" style="font-size:15px">${esc(motivo)}</p>` : ''}
          <label class="campo">Código de activación<input name="codigo" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${Orbe.app.prefijo}-XXXX-XXXX"></label>
          <div class="tarjeta p" style="display:flex;gap:12px;align-items:center"><span class="ini" style="background:var(--c);color:var(--c-ink)">${Orbe.app.icono}</span><span><b style="font-size:20px">17 USD</b><br><span class="texto-ayuda">Pago único. Es tuya para siempre, sin mensualidad.</span></span></div>`,
        pie: `<button class="btn principal ancho" type="submit">Activar</button><a class="btn ancho" href="${IG}" target="_blank" rel="noopener">Comprar por Instagram</a>`
      });
      const f = d.querySelector('form');
      f.onsubmit = e => {
        e.preventDefault();
        const c = f.codigo.value.trim();
        if (!Orbe.validar(c)) return Orbe.error(d, 'Ese código no es válido para esta app. Revísalo o escríbenos por Instagram.');
        d.close(); Orbe.guardarLicencia(c);
      };
    },
    guardarLicencia(c) {
      localStorage.setItem('orbe-licencia-' + Orbe.app.id, c.toUpperCase());
      Orbe.cargar(); Orbe.pintarTodo();
      Orbe.aviso('Tu app quedó activada para siempre. Ya puedes usarla con tu negocio.');
      setTimeout(Orbe.ajustes, 900);
    },
    pintarDemo() {
      const el = document.getElementById('demo'); if (!el) return;
      if (!Orbe.enDemo()) { el.hidden = true; return; }
      el.hidden = false;
      const usado = Orbe.datos._propios >= 1;
      el.innerHTML = `<i class="punto"></i><span>${usado ? 'Ya probaste agregar uno tuyo. Actívala para usarla con tu negocio.' : `Datos de muestra. Puedes agregar ${esc(Orbe.app.unidad)} para probar.`}</span><button type="button">Activar</button>`;
      el.querySelector('button').onclick = () => Orbe.activar('Al activarla empiezas con tu app vacía, lista para tu negocio.');
    },

    menu() {
      const demo = Orbe.enDemo();
      const d = Orbe.hoja({
        titulo: 'Menú',
        cuerpo: `<div class="lista menu-lista">
          ${demo ? '<button type="button" class="fila" data-a="activar"><span class="info"><b>Activar mi app</b><span>Escribe tu código de compra</span></span></button>' : ''}
          <button type="button" class="fila" data-a="ajustes"><span class="info"><b>Ajustes</b><span>Nombre del negocio y moneda</span></span></button>
          ${Orbe.app.extrasMenu || ''}
          <button type="button" class="fila" data-a="instalar"><span class="info"><b>Instalar en el teléfono</b><span>Ábrela como una app, sin internet</span></span></button>
          ${demo ? '<button type="button" class="fila" data-a="reiniciar"><span class="info"><b>Reiniciar el ejemplo</b><span>Vuelve a los datos de muestra</span></span></button>'
            : `<button type="button" class="fila" data-a="copia"><span class="info"><b>Descargar copia de seguridad</b><span>Guárdala por si cambias de teléfono</span></span></button>
          <button type="button" class="fila" data-a="restaurar"><span class="info"><b>Restaurar una copia</b><span>Recupera tus datos desde un archivo</span></span></button>
          <button type="button" class="fila" data-a="borrar"><span class="info"><b style="color:var(--out)">Borrar todos los datos</b><span>Empieza de cero en este teléfono</span></span></button>`}
        </div>
        <p class="texto-ayuda" style="text-align:center;margin-top:6px">${demo ? 'Modo de ejemplo' : 'App activada'} · Los datos se guardan solo en este teléfono.</p>`
      });
      d.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { d.close(); setTimeout(() => Orbe.accion(b.dataset.a), 150); });
    },
    accion(a) {
      if (Orbe.app.alAccion && Orbe.app.alAccion(a)) return;
      if (a === 'ajustes') return Orbe.ajustes();
      if (a === 'activar') return Orbe.activar();
      if (a === 'instalar') return Orbe.instalar();
      if (a === 'reiniciar') { localStorage.removeItem(Orbe.clave()); Orbe.cargar(); Orbe.pintarTodo(); return Orbe.aviso('Ejemplo reiniciado'); }
      if (a === 'copia') {
        const blob = new Blob([JSON.stringify({ app: Orbe.app.id, fecha: new Date().toISOString(), datos: Orbe.datos }, null, 1)], { type: 'application/json' });
        const el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = `copia-${Orbe.app.id}-${Orbe.hoy()}.json`; el.click();
        setTimeout(() => URL.revokeObjectURL(el.href), 4000); return Orbe.aviso('Copia descargada');
      }
      if (a === 'restaurar') {
        const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
        i.onchange = async () => {
          try {
            const j = JSON.parse(await i.files[0].text());
            if (j.app !== Orbe.app.id || !j.datos) throw 0;
            if (!(await Orbe.confirmar('Se reemplazarán los datos actuales por los de la copia.', 'Sí, restaurar'))) return;
            delete j.datos._demo; Orbe.datos = j.datos; Orbe.guardar(); location.reload();
          } catch (e) { Orbe.aviso('Ese archivo no es una copia de esta app'); }
        };
        return i.click();
      }
      if (a === 'borrar') return Orbe.confirmar('Se borrarán todos los datos de esta app en este teléfono. No se puede deshacer.').then(ok => { if (ok) { localStorage.removeItem(Orbe.clave()); location.reload(); } });
    },
    ajustes() {
      const a = Orbe.datos.ajustes;
      const d = Orbe.hoja({
        titulo: Orbe.enDemo() ? 'Ajustes' : 'Tu negocio',
        cuerpo: `<label class="campo">Nombre del negocio<input name="negocio" value="${esc(a.negocio)}" placeholder="Ej. Barbería El Patrón" autocomplete="organization"></label>
          <label class="campo">Símbolo de tu moneda<input name="moneda" value="${esc(a.moneda)}" maxlength="4" placeholder="$"><small>Por ejemplo $, S/, Bs, €, Q, R$ o COP.</small></label>
          ${Orbe.app.ajustesExtra ? Orbe.app.ajustesExtra(a) : ''}`,
        pie: '<button class="btn principal ancho" type="submit">Guardar</button>'
      });
      const f = d.querySelector('form');
      f.onsubmit = e => {
        e.preventDefault();
        a.negocio = f.negocio.value.trim(); a.moneda = f.moneda.value.trim() || '$';
        Orbe.app.guardarAjustes && Orbe.app.guardarAjustes(a, f);
        Orbe.guardar(); d.close(); Orbe.pintarTodo(); Orbe.aviso('Ajustes guardados');
      };
    },
    _instalar: null,
    instalar() {
      if (Orbe._instalar) { Orbe._instalar.prompt(); Orbe._instalar = null; return; }
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      Orbe.hoja({ titulo: 'Instalar en el teléfono', cuerpo: ios
        ? '<p class="texto-ayuda" style="font-size:15px">En Safari toca el botón <b>Compartir</b> (el cuadro con la flecha) y luego <b>Agregar a inicio</b>. Quedará como una app más y funciona sin internet.</p>'
        : '<p class="texto-ayuda" style="font-size:15px">En Chrome toca los <b>tres puntos</b> de arriba y luego <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>. Quedará como una app más y funciona sin internet.</p>' });
    },

    pintarBarra() {
      const n = Orbe.datos.ajustes.negocio;
      document.getElementById('sub').innerHTML = esc(n || (Orbe.enDemo() ? 'Ejemplo' : 'Toca ⋯ para poner el nombre de tu negocio')) + ' · ' + esc(Orbe.fecha(Orbe.hoy(), { weekday: 'short', day: 'numeric', month: 'short' }));
    },
    pintarTabs() {
      const fab = document.getElementById('fab'); if (fab) fab.innerHTML = ICON.mas + `<span>${esc(Orbe.app.fabTexto ? Orbe.app.fabTexto(Orbe.vista) : 'Nuevo')}</span>`;
      const t = Orbe.app.tabs; if (!t) return;
      document.getElementById('tabbar').innerHTML = t.map(x => `<button type="button" class="tab" data-tab="${x.id}" ${x.id === Orbe.vista ? 'aria-current="page"' : ''}>${x.icono}<span>${x.nombre}</span></button>`).join('');
      document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => Orbe.ir(b.dataset.tab));
    },
    ir(vista) { if (Orbe.vista === vista) return; Orbe.vista = vista; Orbe.pintarTabs(); Orbe.app.pintar(); window.scrollTo({ top: 0 }); },
    pintarTodo() { Orbe.pintarBarra(); Orbe.pintarDemo(); Orbe.pintarTabs(); Orbe.app.pintar(); },

    iniciar(app) {
      Orbe.app = app; Orbe.vista = app.tabs ? app.tabs[0].id : null;
      document.getElementById('barra').innerHTML = `<div class="envoltura"><div class="app-ico" aria-hidden="true">${app.icono}</div><div class="titulo"><h1>${esc(app.nombre)}</h1><small id="sub"></small></div><button class="icono-btn" type="button" id="btn-menu" aria-label="Menú">${ICON.menu}</button></div>`;
      document.getElementById('btn-menu').onclick = Orbe.menu;
      const fab = document.getElementById('fab'); if (fab) fab.onclick = () => app.fab();
      const q = new URLSearchParams(location.search).get('codigo');
      if (q) { history.replaceState(null, '', location.pathname); if (Orbe.validar(q)) { localStorage.setItem('orbe-licencia-' + app.id, q.toUpperCase()); setTimeout(() => { Orbe.aviso('Tu app quedó activada para siempre. Ya puedes usarla con tu negocio.'); setTimeout(Orbe.ajustes, 900); }, 300); } }
      Orbe.cargar(); Orbe.pintarTodo();
      window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); Orbe._instalar = e; });
      if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  };
})();
