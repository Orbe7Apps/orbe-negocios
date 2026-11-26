// Prueba de los avisos de contraseña y de correo sin confirmar (sin tocar la nube real: las respuestas de Supabase se simulan).
// Uso: node pruebas/contrasenas.js (teléfono de 390 px) o PC=1 node pruebas/contrasenas.js (computadora) → capturas en pruebas/capturas/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..'), out = path.join(__dirname, 'capturas', process.env.PC ? 'contrasenas-pc' : 'contrasenas');
fs.mkdirSync(out, { recursive: true });
const BASE = 'http://orbe.prueba/';
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json' };
const jwt = () => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return b({ alg: 'HS256', typ: 'JWT' }) + '.' + b({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated', email: 'dueno@correo.com' }) + '.' + Buffer.from('firma-de-prueba!').toString('base64url'); };
const usuario = { id: 'u1', aud: 'authenticated', email: 'dueno@correo.com', app_metadata: {}, user_metadata: { usuario: 'ferreteria.tornillo', terminos_version: '2026-11-25b' } };

(async () => {
  const b = await chromium.launch(); const fallas = [];
  const nueva = async () => {
    const ctx = await b.newContext({ ...(process.env.PC ? { viewport: { width: 1366, height: 860 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => fallas.push('ERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && process.env.VERBOSO) fallas.push('consola: ' + m.text()); }); p.on('request', q => { if (process.env.VERBOSO && /supabase/.test(q.url())) fallas.push(q.method() + ' ' + q.url().slice(0, 90)); });
    p.nube = { signup: null, token: null, user: null, resend: 0 };
    await ctx.route('**/*', async r => {
      const u = new URL(r.request().url());
      if (u.host === 'orbe.prueba') {
        let f = path.join(raiz, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
        if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
        return r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: tipos[path.extname(f)] || 'application/octet-stream' });
      }
      if (u.host.endsWith('supabase.co')) {
        const j = (status, body) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (u.pathname.endsWith('/rpc/usuario_libre')) return j(200, true);
        if (u.pathname.endsWith('/auth/v1/signup')) return p.nube.signup ? j(...p.nube.signup) : j(200, usuario);
        if (u.pathname.endsWith('/auth/v1/token')) return j(...(p.nube.token || [400, { code: 'email_not_confirmed', msg: 'Email not confirmed' }]));
        if (u.pathname.endsWith('/auth/v1/resend')) { p.nube.resend++; return j(200, {}); }
        if (u.pathname.endsWith('/auth/v1/user')) return r.request().method() === 'PUT' && p.nube.user ? j(...p.nube.user) : j(200, usuario);
        return j(200, []);
      }
      if (/fonts\.g/.test(u.host)) return r.fulfill({ status: 200, body: '' });
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    return p;
  };
  const foto = (p, n) => p.screenshot({ path: path.join(out, n + '.png') });
  const ver = async (p, texto, n) => { const ok = await p.getByText(texto).first().isVisible().catch(() => false); if (!ok) fallas.push(n + ': no aparece “' + texto + '”'); return ok; };

  // 1) Crear cuenta: errores del formulario y del servidor.
  let p = await nueva();
  await p.goto(BASE); await p.waitForTimeout(1200);
  await p.getByText('Empezar').first().click(); await p.waitForTimeout(500);
  const campos = p.locator('input');
  await p.locator('input[type=email]').fill('dueno@correo.com');
  await p.locator('input[autocomplete=username]').fill('ferreteria.tornillo');
  await p.locator('input[type=checkbox]').check();
  const claves = p.locator('input[autocomplete=new-password]');
  const crear = async (a) => { await claves.nth(0).fill(a); await claves.nth(1).fill(a); await p.getByRole('button', { name: 'Crear cuenta' }).click(); await p.waitForTimeout(700); };
  await crear('abc123'); await ver(p, 'al menos 8 caracteres', 'corta'); await foto(p, '1-corta');
  await crear('solamenteletras'); await ver(p, 'letras y números', 'sin-numeros'); await foto(p, '2-sin-numeros');
  p.nube.signup = [422, { code: 'weak_password', msg: 'Password is known to be weak and easy to guess, please choose a different one.', weak_password: { reasons: ['pwned'] } }];
  await crear('password123'); await ver(p, 'apareció en filtraciones', 'filtrada'); await foto(p, '3-filtrada');
  // 2) Cuenta creada, falta confirmar el correo.
  p.nube.signup = null;
  await crear('Tornillo2026x'); await ver(p, 'Confirma tu correo', 'confirmar');
  await p.getByRole('button', { name: /Ya lo confirmé/ }).click(); await p.waitForTimeout(800);
  await ver(p, 'Falta confirmar tu correo', 'sin-confirmar'); await foto(p, '4-sin-confirmar');
  await p.getByRole('button', { name: /Mandarlo otra vez/ }).click(); await p.waitForTimeout(800);
  if (p.nube.resend !== 1) fallas.push('reenviar: no pidió el correo otra vez'); await ver(p, 'te mandamos el enlace otra vez', 'reenviado'); await foto(p, '5-reenviado');
  await p.context().close();

  // 3) Entrar con el correo sin confirmar.
  p = await nueva();
  await p.goto(BASE); await p.waitForTimeout(1200);
  await p.getByText(/Ya tengo cuenta/).first().click(); await p.waitForTimeout(500);
  await p.locator('input[autocomplete=username]').fill('dueno@correo.com');
  await p.locator('input[autocomplete=current-password]').fill('Tornillo2026x');
  await p.getByRole('button', { name: 'Entrar' }).click(); await p.waitForTimeout(800);
  await ver(p, 'Mandar el enlace otra vez', 'entrar-sin-confirmar'); await foto(p, '6-entrar-sin-confirmar');
  await p.context().close();

  // 4) Contraseña nueva (enlace de “Olvidé mi contraseña”): filtrada y la misma de antes.
  p = await nueva();
  p.nube.user = [422, { code: 'weak_password', msg: 'Password is known to be weak and easy to guess, please choose a different one.', weak_password: { reasons: ['pwned'] } }];
  await p.goto(BASE + '#access_token=' + jwt() + '&refresh_token=r1&expires_in=3600&token_type=bearer&type=recovery'); await p.waitForTimeout(1800);
  const nuevas = p.locator('input[autocomplete=new-password]');
  const guardar = async a => { await nuevas.nth(0).fill(a); await nuevas.nth(1).fill(a); await p.getByRole('button', { name: /Guardar contraseña/ }).click(); await p.waitForTimeout(700); };
  if (await nuevas.count()) {
    await guardar('corta1'); await ver(p, 'al menos 8 caracteres', 'nueva-corta');
    await guardar('password123'); await ver(p, 'apareció en filtraciones', 'nueva-filtrada'); await foto(p, '7-nueva-filtrada');
    p.nube.user = [422, { code: 'same_password', msg: 'New password should be different from the old password.' }];
    await guardar('Tornillo2026x'); await ver(p, 'ya es tu contraseña actual', 'nueva-igual'); await foto(p, '8-nueva-igual');
  } else { fallas.push('no abrió la pantalla de contraseña nueva'); await foto(p, '9-debug'); fallas.push(await p.evaluate(() => document.body.innerText.slice(0, 300))); }
  await b.close();
  console.log(fallas.length ? 'FALLAS:\n' + fallas.join('\n') : 'Todo bien');
  process.exit(fallas.length ? 1 : 0);
})();
