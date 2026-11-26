// No se deja abrir la app dentro de otra página (evita que engañen a alguien para tocar botones sin verlos).
if (window.top !== window.self) { document.documentElement.style.display = 'none'; try { window.top.location.replace(window.self.location.href); } catch (e) { /* el navegador no deja salir del marco: queda oculta */ } }
// Enlace del correo (confirmar cuenta o cambiar contraseña): se guarda antes de que la app use la dirección.
(function () { var h = location.hash || ''; if (/access_token=|error_description=|type=recovery/.test(h)) { try { sessionStorage.setItem('orbe-enlace', h.slice(1)); } catch (e) {} history.replaceState(null, '', location.pathname + location.search); } })();
// Enlace para conectar un aparato del equipo (…?aparato=CODIGO): se guarda el código y se quita de la dirección.
(function () {
  var q = new URLSearchParams(location.search), c = (q.get('aparato') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!q.has('aparato')) return;
  try {
    if (/^[A-Z2-9]{8}$/.test(c)) {
      sessionStorage.setItem('orbe-codigo', c);
      var mini = JSON.parse(localStorage.getItem('orbe-negocios-mini') || 'null');
      if (!(mini && mini.nombre)) sessionStorage.setItem('orbe-inicio-paso', 'entrar');
    }
  } catch (e) {}
  q.delete('aparato'); var s = q.toString();
  history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
})();
