# Seguridad de Orbe Negocios

Auditoría del 26-11-2026. Qué se revisó, qué se encontró, qué se corrigió y qué falta.

## Cómo está armada (y dónde está la seguridad de verdad)

- La app es una página estática (GitHub Pages) con Preact. **Todo el código del navegador lo puede leer y cambiar cualquiera**; por eso nada de lo que se revisa en el navegador (permisos, PIN, plan) protege de verdad.
- La seguridad real está en **Supabase**: RLS en todas las tablas, funciones `security definer` con `search_path = ''`, permisos de tabla mínimos y las funciones que revisan permisos en el esquema `privado` (no expuesto).
- La clave `sb_publishable_…` del código es pública a propósito. **Nunca** debe aparecer la `service_role` ni una clave secreta en el repositorio.

## Lo que se encontró y se corrigió

| # | Gravedad | Problema | Arreglo |
|---|---|---|---|
| 1 | **Crítica** | El límite de 10 intentos al entrar con usuario (`correo_para_entrar`) no funcionaba: el intento se anotaba y luego se lanzaba un error, que deshace la transacción. Se podían probar contraseñas sin límite y sin pasar por los límites de Supabase Auth. | Un fallo devuelve vacío (sin error) y el intento queda guardado. Además, tope de 30 fallos por IP cada 15 min. Probado: el intento 11 se bloquea. (`supabase/009_seguridad.sql`, `js/nube.js`) |
| 2 | **Alta** | XSS guardado en las hojas de impresión: el logo del negocio se metía en `innerHTML` sin escapar. Un logo con comillas (subido por otro aparato o por la API) podía ejecutar código y robar la sesión guardada. | `js/seguro.js`: `esc()` y `imgSegura()` (solo acepta imágenes `data:image/…;base64`). Aplicado en `ordenpdf.js`, `impresora.js` y `cuotas.js`. El ancho del papel también se limita a 58/80. |
| 3 | **Alta** | Sin Content-Security-Policy: cualquier XSS futuro podía cargar scripts de cualquier sitio y mandar datos a cualquier lado. | CSP en `index.html`, `admin.html` y `reservar.html`: solo scripts propios (sin scripts en línea ni `eval`), conexiones solo a Supabase y a las APIs de tasas y de productos, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. Los dos scripts en línea pasaron a `js/enlace.js` y `js/splash.js`. Probado con Playwright: todas las pantallas, la impresión y el OCR funcionan; un script inyectado queda bloqueado. |
| 4 | Media | Clickjacking: la app y el panel se podían abrir dentro de un `iframe` de otra página para engañar toques. | `js/enlace.js` oculta la app si está dentro de un marco (GitHub Pages no permite la cabecera `frame-ancestors`). La página de reservas sí se puede incrustar. |
| 5 | Media | Link de reservas sin límites: alguien podía llenar la agenda de un negocio con 40 reservas falsas una y otra vez, y mandar objetos grandes en `srv`. | Tope de 3 reservas por confirmar por WhatsApp, 10 por IP por hora, `srv` solo textos cortos, `pro` y `nota` con largo máximo. Negocio suspendido = link apagado. Probado. |
| 6 | Media | Si alguien con una sesión robada borraba o dañaba los datos, no había cómo recuperarlos (cada cambio pisa al anterior). | Historial privado `privado.registros_historial`: guarda la versión anterior de cada registro por 30 días. Nadie lo lee desde la app; se recupera desde el panel SQL de Supabase. |
| 7 | Baja | Códigos de invitación con `random()` (no criptográfico) y sin límite de intentos. | `gen_random_bytes`, máximo 10 códigos vivos por negocio y 10 intentos fallidos por hora por cuenta. |
| 8 | Baja | `poner_usuario` y `publicar_reservas` se podían llamar sin sesión (fallaban por dentro, pero no tenían por qué estar abiertas). | Cerradas al rol `anon`. |

También se agregó `<meta name="referrer" content="strict-origin-when-cross-origin">`.

## Lo que quedó bien desde antes

- RLS activado en las 10 tablas; sin políticas de `insert/update/delete` donde no hacen falta.
- `registros`: la hora y el autor los pone el servidor (no el aparato); escribir exige suscripción al día y negocio no suspendido.
- Pagos: el cliente solo reporta; solo un administrador de Orbe aprueba. Pago Móvil y datos del emisor no son legibles por clientes (permisos por columna).
- Administradores de Orbe en una tabla que no se toca desde la app.
- Cadena de hashes (SHA-256) en ventas, cierres y registro: detecta cambios hechos a mano.
- Librerías copiadas en el repositorio (no se cargan de CDNs de terceros).

## Lo que hay que hacer a mano (no se puede desde el código)

1. **Supabase → Authentication → Providers → Email → activar “Leaked password protection”** (rechaza contraseñas filtradas, revisando contra HaveIBeenPwned). Es la única alerta de seguridad que queda en el asesor de Supabase.
2. En la misma sección: contraseña mínima de **8 caracteres** con letras y números, y **confirmar correo** obligatorio.
3. **Activar MFA (TOTP)** en las cuentas de `admins_orbe`. Cuando todos los administradores lo tengan, se puede exigir en el servidor cambiando `privado.es_admin_orbe()` para pedir `auth.jwt()->>'aal' = 'aal2'`.
4. Authentication → URL Configuration: dejar en *Redirect URLs* solo `https://orbe7apps.github.io/orbe-negocios/` (y `admin.html`).
5. GitHub: proteger la rama `main` (revisión antes de unir) y activar *secret scanning* y *Dependabot alerts*. Quien pueda subir código a `main` controla la app de todos.
6. Respaldos: revisar que el plan de Supabase tenga copias diarias (o hacer un `pg_dump` semanal).

## Límites del diseño actual (para la siguiente etapa)

- **Los PIN y los permisos por perfil solo protegen dentro del aparato.** Todos los perfiles de un negocio usan la misma cuenta de Supabase; quien tenga esa sesión (por ejemplo, abriendo las herramientas de desarrollo en una computadora del negocio) puede leer y cambiar todo por la API. Un PIN de 4 dígitos guardado como hash se adivina en segundos fuera de la app. Solución de fondo: una cuenta de Supabase por empleado (las invitaciones ya existen en el servidor) y permisos por colección revisados en RLS.
- **La sesión se guarda en `localStorage`.** Es lo normal en apps web, y la CSP reduce mucho el riesgo, pero cualquier XSS podría leerla. Mantener la regla: nunca `innerHTML` con datos sin `esc()`.
- **Enlaces del correo con el flujo implícito** (`#access_token=…`). Conviene pasar a PKCE (`flowType: 'pkce'`) para que el token no viaje en la dirección.
- **Sin tope de espacio por negocio**: una cuenta en prueba podría subir muchos registros de hasta 1 MB. Vigilar el tamaño de la base en el panel de Supabase.
- `usuario_libre` deja saber si un usuario existe (hace falta para registrarse). Es aceptable porque entrar ya tiene límite de intentos.

## Reglas para no romper la seguridad en cambios futuros

- Toda tabla nueva: `enable row level security`, `revoke all … from anon, authenticated` y dar solo lo justo.
- Toda función nueva `security definer`: `set search_path = ''`, revisar `auth.uid()` y permisos al principio, y `revoke … from public, anon` si no es para visitantes.
- Para contar intentos fallidos, **no lanzar error** después de guardar el intento: el error deshace el guardado.
- Nada de `innerHTML`, `eval`, `new Function` ni scripts en línea; si hace falta HTML a mano, usar `esc()` e `imgSegura()` de `js/seguro.js`.
- Si se agrega un servicio externo (otra API de tasas, etc.), sumarlo a `connect-src` en la CSP de `index.html`.
- Correr el asesor de seguridad de Supabase después de cada migración.
