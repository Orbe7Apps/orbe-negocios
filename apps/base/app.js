/* Orbe Apps · base común de las microapps: datos en el teléfono, ajustes, copia de seguridad, activación e instalación. */
(function () {
  const ALF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const IG = 'https://ig.me/m/orbe.apps';
  const fnv = s => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const chk = (pre, body) => { const h = fnv('orbe17|' + pre + '|' + body); return ALF[h % 32] + ALF[(h >>> 5) % 32]; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const fechaISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ICON = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
    cerrar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    buscar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    mas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>'
  };

  const Orbe = window.Orbe = {
    ICON, esc,
    app: null, datos: null,
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    hoy: () => fechaISO(new Date()),
    fechaISO,
    sumarDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return fechaISO(d); },
    diasEntre(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); },
    fecha(iso, opc = { day: 'numeric', month: 'short' }) { if (!iso) return ''; return new Date(iso.length > 10 ? iso : iso + 'T12:00:00').toLocaleDateString('es', opc).replace('.', ''); },
    dinero(n) {
      n = Number(n) || 0; const s = Orbe.datos?.ajustes?.moneda || '$';
      const entero = Math.abs(n % 1) < 0.005;
      let t; try { t = Math.abs(n).toLocaleString('es', { minimumFractionDigits: entero ? 0 : 2, maximumFractionDigits: 2, useGrouping: 'always' }); } catch (e) { t = Math.abs(n).toLocaleString('es', { minimumFractionDigits: entero ? 0 : 2, maximumFractionDigits: 2 }); }
      return (n < 0 ? '-' : '') + s + (s.length > 1 ? ' ' : '') + t;
    },
    num(v) { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; },
    whatsapp(numero, texto) {
      const n = String(numero || '').replace(/\D/g, '');
      window.open((n ? 'https://wa.me/' + n : 'https://wa.me/') + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    },

    /* Datos guardados en este teléfono */
    cargar(porDefecto) {
      let d = null;
      try { d = JSON.parse(localStorage.getItem('orbe-' + Orbe.app.id)); } catch (e) {}
      const guardados = d || {};
      d = Object.assign(structuredClone(porDefecto), guardados);
      d.ajustes = Object.assign({ negocio: '', moneda: '$' }, structuredClone(porDefecto.ajustes || {}), guardados.ajustes || {});
      return Orbe.datos = d;
    },
    guardar() {
      try { localStorage.setItem('orbe-' + Orbe.app.id, JSON.stringify(Orbe.datos)); }
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
    puedeAgregar(cantidad) {
      if (Orbe.activa() || cantidad < Orbe.app.limite) return true;
      Orbe.activar(`La prueba gratis llega hasta ${Orbe.app.limite} ${Orbe.app.unidad}. Activa tu app para seguir sin límite.`);
      return false;
    },

    /* Hojas: formularios que suben desde abajo */
    hoja({ titulo, cuerpo, pie = '', alAbrir }) {
      const d = document.createElement('dialog'); d.className = 'hoja';
      d.innerHTML = `<form class="hoja-in" method="dialog" novalidate><div class="hoja-cab"><h2>${esc(titulo)}</h2><button class="icono-btn" value="cerrar" type="button" data-cerrar aria-label="Cerrar">${ICON.cerrar}</button></div><div class="hoja-cuerpo">${cuerpo}</div>${pie ? `<div class="hoja-pie">${pie}</div>` : ''}</form>`;
      document.body.appendChild(d);
      d.querySelector('[data-cerrar]').onclick = () => d.close();
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
      d.addEventListener('close', () => setTimeout(() => d.remove(), 300));
      d.showModal();
      alAbrir && alAbrir(d, d.querySelector('form'));
      return d;
    },
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
        cuerpo: `${motivo ? `<p class="texto-ayuda">${esc(motivo)}</p>` : ''}
          <label class="campo">Código de activación<input name="codigo" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${Orbe.app.prefijo}-XXXX-XXXX" required></label>
          <p class="texto-ayuda" data-error hidden style="color:var(--mal);font-weight:700">Ese código no es válido para esta app. Revísalo o escríbenos.</p>
          <p class="texto-ayuda">¿Aún no la tienes? Cuesta <b>17 USD</b>, pago único y para siempre.</p>`,
        pie: `<button class="btn principal ancho" type="submit">Activar</button><a class="btn ancho" href="${IG}" target="_blank" rel="noopener">Comprar por Instagram</a>`
      });
      const f = d.querySelector('form');
      f.onsubmit = e => {
        e.preventDefault();
        const c = f.codigo.value.trim();
        if (!Orbe.validar(c)) { d.querySelector('[data-error]').hidden = false; return; }
        localStorage.setItem('orbe-licencia-' + Orbe.app.id, c.toUpperCase());
        d.close(); Orbe.pintarPrueba(); Orbe.aviso('¡Listo! Tu app quedó activada para siempre.');
      };
    },
    pintarPrueba() {
      const el = document.getElementById('prueba'); if (!el) return;
      if (Orbe.activa()) { el.hidden = true; return; }
      el.hidden = false;
      el.innerHTML = `<span>Versión de prueba: hasta ${Orbe.app.limite} ${esc(Orbe.app.unidad)}.</span><button type="button">Activar</button>`;
      el.querySelector('button').onclick = () => Orbe.activar();
    },

    /* Menú: ajustes, copia de seguridad, instalar */
    menu() {
      const activa = Orbe.activa();
      const d = Orbe.hoja({
        titulo: 'Menú',
        cuerpo: `<div class="menu-lista">
          <button type="button" class="fila" data-a="ajustes"><span class="info"><b>Ajustes</b><span>Nombre del negocio y moneda</span></span></button>
          ${Orbe.app.extrasMenu || ''}
          <button type="button" class="fila" data-a="instalar"><span class="info"><b>Instalar en el teléfono</b><span>Ábrela como una app, sin internet</span></span></button>
          <button type="button" class="fila" data-a="copia"><span class="info"><b>Descargar copia de seguridad</b><span>Guárdala por si cambias de teléfono</span></span></button>
          <button type="button" class="fila" data-a="restaurar"><span class="info"><b>Restaurar una copia</b><span>Recupera tus datos desde un archivo</span></span></button>
          ${activa ? '' : '<button type="button" class="fila" data-a="activar"><span class="info"><b>Activar mi app</b><span>Escribe tu código de compra</span></span></button>'}
          <button type="button" class="fila" data-a="borrar"><span class="info"><b style="color:var(--mal)">Borrar todos los datos</b><span>Empieza de cero en este teléfono</span></span></button>
        </div>
        <p class="texto-ayuda" style="text-align:center;margin-top:8px">${activa ? 'App activada ✓' : 'Versión de prueba'} · Tus datos se guardan solo en este teléfono.</p>`
      });
      d.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { d.close(); setTimeout(() => Orbe.accion(b.dataset.a), 120); });
    },
    accion(a) {
      if (Orbe.app.alAccion && Orbe.app.alAccion(a)) return;
      if (a === 'ajustes') return Orbe.ajustes();
      if (a === 'activar') return Orbe.activar();
      if (a === 'instalar') return Orbe.instalar();
      if (a === 'copia') {
        const blob = new Blob([JSON.stringify({ app: Orbe.app.id, fecha: new Date().toISOString(), datos: Orbe.datos }, null, 1)], { type: 'application/json' });
        const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = `copia-${Orbe.app.id}-${Orbe.hoy()}.json`; a2.click();
        setTimeout(() => URL.revokeObjectURL(a2.href), 4000); return Orbe.aviso('Copia descargada');
      }
      if (a === 'restaurar') {
        const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
        i.onchange = async () => {
          try {
            const j = JSON.parse(await i.files[0].text());
            if (j.app !== Orbe.app.id || !j.datos) throw 0;
            if (!(await Orbe.confirmar('Se reemplazarán los datos actuales por los de la copia.', 'Sí, restaurar'))) return;
            Orbe.datos = j.datos; Orbe.guardar(); location.reload();
          } catch (e) { Orbe.aviso('Ese archivo no es una copia de esta app'); }
        };
        return i.click();
      }
      if (a === 'borrar') return Orbe.confirmar('Se borrarán todos los datos de esta app en este teléfono. No se puede deshacer.').then(ok => { if (ok) { localStorage.removeItem('orbe-' + Orbe.app.id); location.reload(); } });
    },
    ajustes() {
      const a = Orbe.datos.ajustes;
      const d = Orbe.hoja({
        titulo: 'Ajustes',
        cuerpo: `<label class="campo">Nombre del negocio<input name="negocio" value="${esc(a.negocio)}" placeholder="Ej. Barbería El Patrón" autocomplete="organization"></label>
          <label class="campo">Símbolo de tu moneda<input name="moneda" value="${esc(a.moneda)}" maxlength="4" placeholder="$"><small>Por ejemplo $, S/, Bs, €, Q o COP.</small></label>
          ${Orbe.app.ajustesExtra ? Orbe.app.ajustesExtra(a) : ''}`,
        pie: '<button class="btn principal ancho" type="submit">Guardar</button>'
      });
      const f = d.querySelector('form');
      f.onsubmit = e => {
        e.preventDefault();
        a.negocio = f.negocio.value.trim(); a.moneda = f.moneda.value.trim() || '$';
        Orbe.app.guardarAjustes && Orbe.app.guardarAjustes(a, f);
        Orbe.guardar(); d.close(); Orbe.pintarBarra(); Orbe.app.pintar(); Orbe.aviso('Ajustes guardados');
      };
    },
    _instalar: null,
    instalar() {
      if (Orbe._instalar) { Orbe._instalar.prompt(); Orbe._instalar = null; return; }
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      Orbe.hoja({ titulo: 'Instalar en el teléfono', cuerpo: ios
        ? '<p class="texto-ayuda" style="font-size:15px">En Safari toca el botón <b>Compartir</b> (el cuadro con la flecha) y luego <b>Agregar a inicio</b>. Quedará como una app más.</p>'
        : '<p class="texto-ayuda" style="font-size:15px">En Chrome toca los <b>tres puntos</b> de arriba y luego <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>. Quedará como una app más y funciona sin internet.</p>' });
    },

    pintarBarra() {
      const n = Orbe.datos.ajustes.negocio;
      document.getElementById('sub').textContent = n || 'Toca ⋯ para poner el nombre de tu negocio';
    },

    iniciar(app, porDefecto) {
      Orbe.app = app; Orbe.cargar(porDefecto);
      document.getElementById('barra').innerHTML = `<div class="envoltura"><div class="app-ico" aria-hidden="true">${app.icono}</div><div class="titulo"><h1>${esc(app.nombre)}</h1><small id="sub"></small></div><button class="icono-btn" type="button" id="btn-menu" aria-label="Menú">${ICON.menu}</button></div>`;
      document.getElementById('btn-menu').onclick = Orbe.menu;
      Orbe.pintarBarra(); Orbe.pintarPrueba(); app.pintar();
      if (new URLSearchParams(location.search).has('codigo')) {
        const c = new URLSearchParams(location.search).get('codigo');
        if (Orbe.validar(c)) { localStorage.setItem('orbe-licencia-' + app.id, c.toUpperCase()); Orbe.pintarPrueba(); Orbe.aviso('¡Listo! Tu app quedó activada para siempre.'); }
        history.replaceState(null, '', location.pathname);
      }
      window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); Orbe._instalar = e; });
      if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  };
})();
