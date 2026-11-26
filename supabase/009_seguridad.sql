-- Orbe Negocios · migración 9: refuerzo de seguridad (auditoría del 26-11-2026).
--
-- 1) Límite de intentos al entrar con usuario: antes NO funcionaba. La función anotaba el intento fallido y luego
--    lanzaba un error; el error deshace toda la transacción, así que el intento nunca quedaba guardado y se podían
--    probar contraseñas sin límite. Ahora un fallo devuelve vacío (sin error) y el intento sí queda guardado.
--    Además se limita por dirección IP (para que no prueben una contraseña contra muchos usuarios).
-- 2) Link de reservas: tope por WhatsApp y por IP, y validación de tamaño de lo que se manda (evita que llenen la
--    agenda de un negocio con reservas falsas).
-- 3) Códigos de invitación con azar criptográfico y límite de intentos para adivinarlos.
-- 4) Historial de cambios de los datos (30 días): si alguien borra o daña datos con una sesión robada, se pueden recuperar.
-- 5) Permisos: funciones que no son para visitantes sin sesión dejan de estar abiertas al rol anon.

-- ---------- utilidades privadas ----------
-- IP de quien llama (la pone la pasarela de Supabase). Si no se sabe, devuelve null y no se limita por IP.
create or replace function privado.ip_cliente() returns text
language plpgsql stable set search_path = '' as $$
declare h json;
begin
  begin h := nullif(current_setting('request.headers', true), '')::json; exception when others then return null; end;
  if h is null then return null; end if;
  return nullif(trim(split_part(coalesce(h->>'cf-connecting-ip', h->>'x-real-ip', h->>'x-forwarded-for', ''), ',', 1)), '');
end $$;
revoke all on function privado.ip_cliente() from public, anon, authenticated;

alter table privado.intentos add column if not exists ip text;
alter table privado.intentos add column if not exists tipo text not null default 'entrar';
create index if not exists intentos_ip_t on privado.intentos (ip, t) where ip is not null;
create index if not exists intentos_tipo_t on privado.intentos (tipo, usuario, t);

-- ---------- 1) entrar con usuario ----------
create or replace function public.correo_para_entrar(u text, clave text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v text := lower(trim(coalesce(u, ''))); r record; v_ip text := privado.ip_cliente();
begin
  if length(v) > 60 or length(coalesce(clave, '')) > 200 then return null; end if;
  if (select count(*) from privado.intentos i where i.tipo = 'entrar' and i.usuario = v and i.t > now() - interval '15 minutes') >= 10 then
    raise exception 'Demasiados intentos. Espera unos minutos';
  end if;
  if v_ip is not null and (select count(*) from privado.intentos i where i.tipo = 'entrar' and i.ip = v_ip and i.t > now() - interval '15 minutes') >= 30 then
    raise exception 'Demasiados intentos. Espera unos minutos';
  end if;
  select au.email, au.encrypted_password into r from public.usuarios us join auth.users au on au.id = us.user_id where us.usuario = v;
  if r.email is null or r.encrypted_password is null or extensions.crypt(coalesce(clave, ''), r.encrypted_password) <> r.encrypted_password then
    -- Sin error a propósito: así el intento queda guardado (un error desharía el insert).
    insert into privado.intentos (usuario, ip, tipo) values (v, v_ip, 'entrar');
    delete from privado.intentos where t < now() - interval '1 day';
    return null;
  end if;
  delete from privado.intentos where tipo = 'entrar' and usuario = v;
  return r.email;
end $$;
revoke all on function public.correo_para_entrar(text, text) from public;
grant execute on function public.correo_para_entrar(text, text) to anon, authenticated;

-- ---------- 2) reservas por el link público ----------
create or replace function public.reservar(slug text, nom text, tel text, srv jsonb, pro text, t bigint, dur integer, nota text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare p public.paginas_reserva; g public.negocios; rid uuid; ini timestamptz; v_ip text := privado.ip_cliente();
  telnum text := regexp_replace(coalesce(tel, ''), '\D', '', 'g');
begin
  if t is null or dur is null then raise exception 'Elige la hora'; end if;
  ini := to_timestamp(t / 1000.0);
  select * into p from public.paginas_reserva where paginas_reserva.slug = lower(trim(reservar.slug)) and activa;
  if p.negocio_id is null then raise exception 'Este link de reservas no está activo'; end if;
  select * into g from public.negocios where id = p.negocio_id;
  if g.suspendido_en is not null or not (g.plan = 'cortesia' or g.prueba_hasta > now() or coalesce(g.pagado_hasta, '-infinity') + interval '7 days' > now()) then
    raise exception 'Este link de reservas no está activo';
  end if;
  if length(trim(coalesce(nom, ''))) < 2 or length(nom) > 60 then raise exception 'Escribe tu nombre'; end if;
  if length(telnum) < 7 or length(tel) > 25 then raise exception 'Escribe tu WhatsApp'; end if;
  if dur < 5 or dur > 600 then raise exception 'Duración no válida'; end if;
  if length(coalesce(pro, '')) > 40 or length(coalesce(nota, '')) > 500 then raise exception 'Datos no válidos'; end if;
  if ini < now() or ini > now() + interval '62 days' then raise exception 'Elige una hora de los próximos días'; end if;
  if jsonb_typeof(srv) <> 'array' or jsonb_array_length(srv) < 1 or jsonb_array_length(srv) > 10
     or exists (select 1 from jsonb_array_elements(srv) e where jsonb_typeof(e) <> 'string' or length(e #>> '{}') > 40) then
    raise exception 'Elige un servicio';
  end if;
  -- Topes contra reservas falsas: por WhatsApp en este negocio, por IP en una hora y el total por confirmar.
  if (select count(*) from public.reservas r where r.negocio_id = p.negocio_id and regexp_replace(r.datos->>'tel', '\D', '', 'g') = telnum) >= 3 then
    raise exception 'Ya tienes reservas por confirmar en este negocio. Escríbele por WhatsApp';
  end if;
  if v_ip is not null and (select count(*) from privado.intentos i where i.tipo = 'reservar' and i.ip = v_ip and i.t > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiadas reservas seguidas. Intenta más tarde';
  end if;
  if (select count(*) from public.reservas where negocio_id = p.negocio_id) >= 40 then
    raise exception 'El negocio tiene muchas reservas por confirmar. Intenta más tarde o escríbele por WhatsApp';
  end if;
  -- Choque con lo ocupado (publicado) o con otra reserva que todavía no se pasó a la agenda.
  if exists (select 1 from jsonb_array_elements(coalesce(p.datos->'ocupado', '[]'::jsonb)) o
       where (o->>'pro') = coalesce(pro, '') and (o->>'t')::bigint < t + dur * 60000 and (o->>'t')::bigint + (o->>'dur')::int * 60000 > t)
     or exists (select 1 from public.reservas r where r.negocio_id = p.negocio_id and (r.datos->>'pro') = coalesce(pro, '')
       and (r.datos->>'t')::bigint < t + dur * 60000 and (r.datos->>'t')::bigint + (r.datos->>'dur')::int * 60000 > t) then
    raise exception 'Esa hora se acaba de ocupar. Elige otra';
  end if;
  insert into public.reservas (negocio_id, datos) values (p.negocio_id, jsonb_build_object('nom', left(trim(nom), 60), 'tel', left(trim(tel), 25), 'srv', srv, 'pro', coalesce(pro, ''), 't', t, 'dur', dur, 'nota', left(coalesce(trim(nota), ''), 200)))
    returning id into rid;
  insert into privado.intentos (usuario, ip, tipo) values (p.negocio_id::text, v_ip, 'reservar');
  return rid;
end $$;
revoke all on function public.reservar(text, text, text, jsonb, text, bigint, integer, text) from public;
grant execute on function public.reservar(text, text, text, jsonb, text, bigint, integer, text) to anon, authenticated;

-- La página pública tampoco se muestra si el negocio está suspendido.
create or replace function public.pagina_reservas(slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select p.datos || jsonb_build_object('pendientes', coalesce((select jsonb_agg(jsonb_build_object('pro', r.datos->'pro', 't', r.datos->'t', 'dur', r.datos->'dur')) from public.reservas r where r.negocio_id = p.negocio_id), '[]'::jsonb))
  from public.paginas_reserva p join public.negocios g on g.id = p.negocio_id
  where p.slug = lower(trim(pagina_reservas.slug)) and p.activa and g.suspendido_en is null
    and (g.plan = 'cortesia' or g.prueba_hasta > now() or coalesce(g.pagado_hasta, '-infinity') + interval '7 days' > now());
$$;
revoke all on function public.pagina_reservas(text) from public;
grant execute on function public.pagina_reservas(text) to anon, authenticated;

-- ---------- 3) invitaciones ----------
create or replace function public.crear_invitacion(n uuid, rol text default 'equipo') returns text
language plpgsql security definer set search_path = '' as $$
declare c text; letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea; i int;
begin
  if not privado.es_admin(n) then raise exception 'Solo el dueño o un administrador puede invitar'; end if;
  if rol not in ('admin', 'equipo') then raise exception 'Rol no válido'; end if;
  if (select count(*) from public.invitaciones where negocio_id = n and usado is null and vence > now()) >= 10 then raise exception 'Hay muchos códigos sin usar: espera a que venzan'; end if;
  loop
    b := extensions.gen_random_bytes(8); c := '';
    for i in 0..7 loop c := c || substr(letras, 1 + (get_byte(b, i) % 32), 1); end loop;  -- 256 es múltiplo de 32: sin sesgo
    exit when not exists (select 1 from public.invitaciones where codigo = c);
  end loop;
  delete from public.invitaciones where vence < now() - interval '1 day';
  insert into public.invitaciones (codigo, negocio_id, creado_por, rol) values (c, n, auth.uid(), rol);
  return c;
end $$;

create or replace function public.unirse(codigo text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.invitaciones; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Inicia sesión primero'; end if;
  if (select count(*) from privado.intentos i where i.tipo = 'unirse' and i.usuario = uid::text and i.t > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiados intentos. Espera un rato';
  end if;
  select * into inv from public.invitaciones i where i.codigo = upper(trim(unirse.codigo)) for update;
  if inv.codigo is null or inv.usado is not null or inv.vence < now() then
    insert into privado.intentos (usuario, ip, tipo) values (uid::text, privado.ip_cliente(), 'unirse');
    return null;  -- sin error, para que el intento quede contado
  end if;
  insert into public.miembros (negocio_id, user_id, rol) values (inv.negocio_id, uid, inv.rol) on conflict (negocio_id, user_id) do nothing;
  update public.invitaciones set usado = now(), usado_por = uid where invitaciones.codigo = inv.codigo;
  return inv.negocio_id;
end $$;

-- ---------- 4) historial de cambios (para recuperar datos) ----------
create table if not exists privado.registros_historial (
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  col text not null,
  id text not null,
  datos jsonb not null,
  borrado boolean not null,
  actualizado timestamptz not null,
  autor uuid,
  dispositivo text,
  reemplazado timestamptz not null default now(),
  reemplazado_por uuid default auth.uid()
);
create index if not exists registros_historial_idx on privado.registros_historial (negocio_id, col, id, reemplazado desc);
create index if not exists registros_historial_t on privado.registros_historial (reemplazado);
revoke all on privado.registros_historial from public, anon, authenticated;

create or replace function privado.guardar_historial() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.datos is distinct from new.datos or old.borrado is distinct from new.borrado then
    insert into privado.registros_historial (negocio_id, col, id, datos, borrado, actualizado, autor, dispositivo)
      values (old.negocio_id, old.col, old.id, old.datos, old.borrado, old.actualizado, old.autor, old.dispositivo);
    -- Limpieza de lo viejo de vez en cuando (no en cada cambio).
    if random() < 0.002 then delete from privado.registros_historial where reemplazado < now() - interval '30 days'; end if;
  end if;
  return new;
end $$;
revoke all on function privado.guardar_historial() from public, anon, authenticated;
drop trigger if exists registros_historial on public.registros;
create trigger registros_historial before update on public.registros for each row execute function privado.guardar_historial();

-- ---------- 5) permisos de funciones ----------
-- poner_usuario y publicar_reservas ya revisaban la sesión por dentro, pero no tienen por qué estar abiertas a visitantes.
revoke all on function public.poner_usuario(text) from public, anon;
grant execute on function public.poner_usuario(text) to authenticated;
revoke all on function public.publicar_reservas(uuid, text, boolean, jsonb) from public, anon;
grant execute on function public.publicar_reservas(uuid, text, boolean, jsonb) to authenticated;
