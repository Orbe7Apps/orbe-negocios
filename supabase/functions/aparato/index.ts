// Orbe Negocios · función “aparato”: conecta un aparato del equipo con el código que da el dueño.
// Recibe { codigo, nombre } y, si el código sirve, crea una cuenta propia para ese aparato (sin correo real ni
// contraseña que recordar) y la une al negocio con el rol del código. Devuelve con qué iniciar la sesión una sola vez;
// el aparato no guarda la contraseña: si pierde la sesión, el dueño le da otro código.
// Seguridad: el código sirve una vez y vence en 30 minutos; 20 códigos fallidos por hora bloquean esa IP.
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const ORIGENES = ['https://orbe7apps.github.io', 'http://localhost:8000'];

const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

Deno.serve(async (req: Request) => {
  const origen = req.headers.get('origin') || '';
  const h = {
    'Access-Control-Allow-Origin': ORIGENES.includes(origen) ? origen : ORIGENES[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };
  const responder = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405);

  let b: { codigo?: unknown; nombre?: unknown } = {};
  try { b = await req.json(); } catch { return responder({ error: 'Datos no válidos' }, 400); }
  const codigo = String(b.codigo ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nombre = String(b.nombre ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40) || 'Aparato del equipo';
  if (!/^[A-Z2-9]{8}$/.test(codigo)) return responder({ error: 'El código tiene 8 letras y números' }, 400);
  const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;

  const url = Deno.env.get('SUPABASE_URL')!, clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) Reclamar el código (en un solo paso: dos aparatos no pueden usar el mismo).
  const { data: inv, error: e1 } = await db.rpc('reclamar_invitacion_aparato', { p_codigo: codigo, p_ip: ip });
  if (e1) return responder({ error: /Demasiados/.test(e1.message) ? 'Demasiados intentos. Espera un rato' : 'No se pudo revisar el código. Intenta otra vez' }, /Demasiados/.test(e1.message) ? 429 : 500);
  const fila = Array.isArray(inv) ? inv[0] : inv;
  if (!fila || !fila.negocio_id) return responder({ error: 'El código no sirve o ya venció. Pide uno nuevo al dueño' }, 400);

  // 2) Crear la cuenta del aparato. El correo es interno (nunca se le manda nada) y la contraseña es al azar.
  const correo = `orbeappsoficial+ap${hex(crypto.getRandomValues(new Uint8Array(8)))}@gmail.com`;
  const pass = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const { data: u, error: e2 } = await db.auth.admin.createUser({
    email: correo, password: pass, email_confirm: true,
    app_metadata: { aparato: true, negocio: fila.negocio_id }, user_metadata: { nombre }
  });
  if (e2 || !u?.user) {
    await db.rpc('liberar_invitacion_aparato', { p_codigo: codigo });
    console.error('crear cuenta de aparato', e2?.message);
    return responder({ error: 'No se pudo crear el acceso. Intenta otra vez' }, 500);
  }

  // 3) Unirla al negocio.
  const { error: e3 } = await db.rpc('completar_aparato', { p_codigo: codigo, p_user: u.user.id, p_nombre: nombre });
  if (e3) {
    await db.auth.admin.deleteUser(u.user.id);
    await db.rpc('liberar_invitacion_aparato', { p_codigo: codigo });
    console.error('unir aparato', e3.message);
    return responder({ error: 'No se pudo conectar el aparato. Intenta otra vez' }, 500);
  }
  return responder({ correo, clave: pass, negocio: fila.negocio_id });
});
