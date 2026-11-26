-- Orbe Negocios · migración 10: aparatos del equipo con su propio acceso.
--
-- Antes, todos los aparatos de un negocio entraban con el usuario y la contraseña del dueño: cualquier empleado
-- conocía esa contraseña y su aparato podía hacer todo (cambiar permisos, borrar ventas, pagar, borrar la cuenta).
-- Ahora cada aparato del equipo (caja, tablet del local) se conecta con un código de un solo uso que da el dueño y
-- recibe una cuenta propia, sin correo ni contraseña que recordar (la crea la función “aparato” del servidor).
-- Una cuenta de equipo trabaja normal (vende, cobra, anota), pero el servidor no le deja:
--   · cambiar roles ni permisos, crear o eliminar perfiles, cambiar el rol de un perfil;
--   · cambiar el PIN del dueño o de un administrador (sí ponerlo la primera vez, después de la contraseña del dueño);
--   · borrar ventas, abonos, cierres, movimientos de caja, turnos ni el registro de cambios;
--   · invitar, pagar la suscripción, publicar el link de reservas ni crear otro negocio.

alter table public.miembros add column if not exists nombre text check (nombre is null or char_length(nombre) <= 40);

-- ¿La sesión es de un aparato del equipo? (lo marca el servidor al crearla; el usuario no puede cambiarlo)
create or replace function privado.es_aparato() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'aparato')::boolean, false);
$$;
revoke all on function privado.es_aparato() from public, anon;
grant execute on function privado.es_aparato() to authenticated;

-- ---------- lo que una cuenta de equipo no puede cambiar ----------
create or replace function privado.revisar_cambio_equipo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r text; msg constant text := 'ORBE_SOLO_DUENO: esto solo se cambia desde el aparato del dueño';
begin
  if auth.uid() is null then return new; end if;
  select m.rol into r from public.miembros m where m.negocio_id = new.negocio_id and m.user_id = auth.uid();
  if r is distinct from 'equipo' then return new; end if;
  if new.col = 'roles' then raise exception '%', msg; end if;
  if tg_op = 'INSERT' then
    -- Un perfil nuevo no se crea desde un aparato del equipo (si ya existe, lo revisa la parte de UPDATE).
    if new.col = 'perfiles' and not exists (select 1 from public.registros x where x.negocio_id = new.negocio_id and x.col = 'perfiles' and x.id = new.id) then
      raise exception '%', msg;
    end if;
    return new;
  end if;
  -- UPDATE
  if new.col = 'perfiles' then
    if (new.borrado and not old.borrado)
       or (new.datos ->> 'rol') is distinct from (old.datos ->> 'rol')
       or (new.datos ->> 'inactivo') is distinct from (old.datos ->> 'inactivo')
       or (new.datos ->> 'borrado') is distinct from (old.datos ->> 'borrado')
       or (new.datos -> 'sucs') is distinct from (old.datos -> 'sucs')
       or ((old.datos ->> 'rol') in ('dueno', 'admin') and coalesce(old.datos ->> 'pin', '') <> '' and (new.datos ->> 'pin') is distinct from (old.datos ->> 'pin')) then
      raise exception '%', msg;
    end if;
  end if;
  if new.borrado and not old.borrado and new.col in ('ventas', 'abonos', 'cierres', 'movCaja', 'turnos', 'registro') then
    raise exception '%', msg;
  end if;
  return new;
end $$;
revoke all on function privado.revisar_cambio_equipo() from public, anon, authenticated;
drop trigger if exists registros_revisar_equipo on public.registros;
create trigger registros_revisar_equipo before insert or update on public.registros for each row execute function privado.revisar_cambio_equipo();

-- Una cuenta de aparato no crea negocios propios.
create or replace function public.crear_negocio(nombre text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare nid uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Inicia sesión primero'; end if;
  if privado.es_aparato() then raise exception 'Este aparato es del equipo de otro negocio: para crear un negocio, cierra sesión y crea tu propia cuenta'; end if;
  if exists (select 1 from public.negocios where dueno = uid) then raise exception 'Tu cuenta ya tiene un negocio: cada cuenta es para un solo negocio'; end if;
  insert into public.negocios (nombre, dueno) values (left(trim(nombre), 120), uid) returning id into nid;
  insert into public.miembros (negocio_id, user_id, rol) values (nid, uid, 'dueno');
  return nid;
end $$;

-- ---------- alta de un aparato (solo la llama la función “aparato” del servidor, con la clave de servicio) ----------
-- Reclama el código: lo marca usado en un solo paso (dos aparatos no pueden usar el mismo). 20 fallos por hora por IP.
create or replace function public.reclamar_invitacion_aparato(p_codigo text, p_ip text) returns table (negocio_id uuid, rol text)
language plpgsql security definer set search_path = '' as $$
declare v text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g')); v_n uuid; v_r text;
begin
  if p_ip is not null and (select count(*) from privado.intentos i where i.tipo = 'aparato' and i.ip = p_ip and i.t > now() - interval '1 hour') >= 20 then
    raise exception 'Demasiados intentos. Espera un rato';
  end if;
  update public.invitaciones i set usado = now()
    where i.codigo = v and i.usado is null and i.vence > now()
    returning i.negocio_id, i.rol into v_n, v_r;
  if v_n is null then
    insert into privado.intentos (usuario, ip, tipo) values (v, p_ip, 'aparato');
    return;  -- sin filas y sin error: el intento queda contado
  end if;
  negocio_id := v_n; rol := v_r;
  return next;
end $$;

-- Si no se pudo crear la cuenta, el código vuelve a servir.
create or replace function public.liberar_invitacion_aparato(p_codigo text) returns void
language sql security definer set search_path = '' as $$
  update public.invitaciones set usado = null where codigo = upper(p_codigo) and usado_por is null;
$$;

create or replace function public.completar_aparato(p_codigo text, p_user uuid, p_nombre text) returns void
language plpgsql security definer set search_path = '' as $$
declare inv public.invitaciones;
begin
  select * into inv from public.invitaciones where codigo = upper(p_codigo) and usado is not null and usado_por is null for update;
  if inv.codigo is null then raise exception 'Código no válido'; end if;
  insert into public.miembros (negocio_id, user_id, rol, nombre) values (inv.negocio_id, p_user, inv.rol, nullif(left(trim(coalesce(p_nombre, '')), 40), ''));
  update public.invitaciones set usado_por = p_user where codigo = inv.codigo;
end $$;

revoke all on function public.reclamar_invitacion_aparato(text, text), public.liberar_invitacion_aparato(text), public.completar_aparato(text, uuid, text) from public, anon, authenticated;
grant execute on function public.reclamar_invitacion_aparato(text, text), public.liberar_invitacion_aparato(text), public.completar_aparato(text, uuid, text) to service_role;

-- ---------- el dueño ve y desconecta los aparatos de su equipo ----------
create or replace function public.mis_aparatos(n uuid) returns table (user_id uuid, nombre text, rol text, creado timestamptz, ultimo timestamptz, aparato boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.es_admin(n) then raise exception 'Solo el dueño o un administrador ve los aparatos'; end if;
  return query select m.user_id, m.nombre, m.rol, m.creado,
    (select max(r.actualizado) from public.registros r where r.negocio_id = n and r.autor = m.user_id),
    coalesce((u.raw_app_meta_data ->> 'aparato')::boolean, false)
    from public.miembros m join auth.users u on u.id = m.user_id
    where m.negocio_id = n and m.rol <> 'dueno' order by m.creado;
end $$;

-- Desconectar: el aparato pierde el acceso al instante. Si era una cuenta de aparato, se borra (no sirve para nada más).
create or replace function public.quitar_aparato(n uuid, usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r text; ap boolean;
begin
  if not privado.es_admin(n) then raise exception 'Solo el dueño o un administrador desconecta aparatos'; end if;
  if usuario = auth.uid() then raise exception 'No puedes desconectar el aparato que estás usando'; end if;
  select m.rol into r from public.miembros m where m.negocio_id = n and m.user_id = usuario;
  if r is null then raise exception 'Ese aparato ya no está conectado'; end if;
  if r = 'dueno' then raise exception 'El dueño no se desconecta'; end if;
  if r = 'admin' and not exists (select 1 from public.miembros m where m.negocio_id = n and m.user_id = auth.uid() and m.rol = 'dueno') then
    raise exception 'Solo el dueño desconecta a un administrador';
  end if;
  delete from public.miembros where negocio_id = n and user_id = usuario;
  select coalesce((raw_app_meta_data ->> 'aparato')::boolean, false) into ap from auth.users where id = usuario;
  if ap and not exists (select 1 from public.miembros where user_id = usuario) then delete from auth.users where id = usuario; end if;
end $$;

-- En un aparato del equipo, el dueño sin PIN confirma que es él con la contraseña de su cuenta (sin abrir su sesión ahí).
-- 5 fallos en 15 minutos por aparato bloquean un rato. Un fallo devuelve false (sin error) para que quede contado.
create or replace function public.verificar_clave_dueno(n uuid, clave text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare h text; uid text := auth.uid()::text;
begin
  if not privado.es_miembro(n) then raise exception 'Sin permiso'; end if;
  if (select count(*) from privado.intentos i where i.tipo = 'dueno' and i.usuario = uid and i.t > now() - interval '15 minutes') >= 5 then
    raise exception 'Demasiados intentos. Espera unos minutos';
  end if;
  select u.encrypted_password into h from public.negocios g join auth.users u on u.id = g.dueno where g.id = n;
  if h is null or length(coalesce(clave, '')) > 200 or extensions.crypt(coalesce(clave, ''), h) <> h then
    insert into privado.intentos (usuario, ip, tipo) values (uid, privado.ip_cliente(), 'dueno');
    return false;
  end if;
  delete from privado.intentos where tipo = 'dueno' and usuario = uid;
  return true;
end $$;

revoke all on function public.mis_aparatos(uuid), public.quitar_aparato(uuid, uuid), public.verificar_clave_dueno(uuid, text) from public, anon;
grant execute on function public.mis_aparatos(uuid), public.quitar_aparato(uuid, uuid), public.verificar_clave_dueno(uuid, text) to authenticated;
