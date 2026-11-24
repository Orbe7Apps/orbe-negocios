-- Orbe Negocios · migración 2 (aplicada después de 001_esquema.sql)
-- 1) Funciones que revisan permisos: a un esquema privado (no expuesto en la API).
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

create or replace function privado.es_miembro(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros m where m.negocio_id = n and m.user_id = auth.uid());
$$;
create or replace function privado.puede_escribir(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.miembros m join public.negocios g on g.id = m.negocio_id
    where m.negocio_id = n and m.user_id = auth.uid()
      and (g.plan = 'cortesia' or g.prueba_hasta > now() or coalesce(g.pagado_hasta, '-infinity') + interval '7 days' > now())
  );
$$;
create or replace function privado.es_admin(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros m where m.negocio_id = n and m.user_id = auth.uid() and m.rol in ('dueno', 'admin'));
$$;
create or replace function privado.es_admin_orbe() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins_orbe a where a.user_id = auth.uid());
$$;
revoke all on function privado.es_miembro(uuid), privado.puede_escribir(uuid), privado.es_admin(uuid), privado.es_admin_orbe() from public, anon;
grant execute on function privado.es_miembro(uuid), privado.puede_escribir(uuid), privado.es_admin(uuid), privado.es_admin_orbe() to authenticated;

drop policy "ver mis negocios" on public.negocios;
drop policy "ver miembros de mis negocios" on public.miembros;
drop policy "leer datos de mi negocio" on public.registros;
drop policy "guardar datos de mi negocio" on public.registros;
drop policy "cambiar datos de mi negocio" on public.registros;
drop policy "ver pagos de mi negocio" on public.pagos;
create policy "ver mis negocios" on public.negocios for select to authenticated using ((select privado.es_miembro(id)) or (select privado.es_admin_orbe()));
create policy "ver miembros de mis negocios" on public.miembros for select to authenticated using ((select privado.es_miembro(negocio_id)));
create policy "leer datos de mi negocio" on public.registros for select to authenticated using ((select privado.es_miembro(negocio_id)));
create policy "guardar datos de mi negocio" on public.registros for insert to authenticated with check ((select privado.puede_escribir(negocio_id)));
create policy "cambiar datos de mi negocio" on public.registros for update to authenticated using ((select privado.puede_escribir(negocio_id))) with check ((select privado.puede_escribir(negocio_id)));
create policy "ver pagos de mi negocio" on public.pagos for select to authenticated using ((select privado.es_miembro(negocio_id)) or (select privado.es_admin_orbe()));

create or replace function public.crear_invitacion(n uuid, rol text default 'equipo') returns text
language plpgsql security definer set search_path = '' as $$
declare c text; letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if not privado.es_admin(n) then raise exception 'Solo el dueño o un administrador puede invitar'; end if;
  if rol not in ('admin', 'equipo') then raise exception 'Rol no válido'; end if;
  loop
    c := '';
    for i in 1..8 loop c := c || substr(letras, 1 + floor(random() * length(letras))::int, 1); end loop;
    exit when not exists (select 1 from public.invitaciones where codigo = c);
  end loop;
  delete from public.invitaciones where vence < now() - interval '1 day';
  insert into public.invitaciones (codigo, negocio_id, creado_por, rol) values (c, n, auth.uid(), rol);
  return c;
end $$;
create or replace function public.quitar_miembro(n uuid, usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_admin(n) then raise exception 'Solo el dueño o un administrador puede quitar cuentas'; end if;
  delete from public.miembros where negocio_id = n and user_id = usuario and rol <> 'dueno';
end $$;
create or replace function public.reportar_pago(n uuid, plan text, meses int, monto numeric, moneda text, metodo text, referencia text, nota text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  if not privado.es_admin(n) then raise exception 'Solo el dueño o un administrador reporta pagos'; end if;
  if (select count(*) from public.pagos where negocio_id = n and estado = 'pendiente') >= 3 then raise exception 'Ya tienes pagos por revisar: espera la confirmación'; end if;
  insert into public.pagos (negocio_id, plan, meses, monto, moneda, metodo, referencia, nota)
    values (n, plan, meses, monto, moneda, metodo, nullif(left(trim(referencia), 80), ''), nullif(left(trim(nota), 300), '')) returning id into pid;
  return pid;
end $$;
create or replace function public.revisar_pago(pago uuid, aprobar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.pagos;
begin
  if not privado.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  select * into p from public.pagos where id = pago for update;
  if p.id is null or p.estado <> 'pendiente' then raise exception 'Ese pago ya fue revisado'; end if;
  update public.pagos set estado = case when aprobar then 'aprobado' else 'rechazado' end, revisado = now(), revisado_por = auth.uid() where id = pago;
  if aprobar then
    update public.negocios set plan = p.plan, prueba_hasta = least(prueba_hasta, now()),
      pagado_hasta = greatest(now(), coalesce(pagado_hasta, now())) + make_interval(months => p.meses)
      where id = p.negocio_id;
  end if;
end $$;
create or replace function public.activar_negocio(n uuid, plan text, meses int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  if plan not in ('negocio', 'empresa', 'cortesia') or meses not between 1 and 24 then raise exception 'Datos no válidos'; end if;
  update public.negocios set plan = activar_negocio.plan, prueba_hasta = least(prueba_hasta, now()),
    pagado_hasta = greatest(now(), coalesce(pagado_hasta, now())) + make_interval(months => meses) where id = n;
end $$;
create or replace function public.admin_negocios() returns table (id uuid, nombre text, correo text, plan text, prueba_hasta timestamptz, pagado_hasta timestamptz, creado timestamptz, pendientes bigint, ultimo_cambio timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  return query select g.id, g.nombre, u.email::text, g.plan, g.prueba_hasta, g.pagado_hasta, g.creado,
    (select count(*) from public.pagos p where p.negocio_id = g.id and p.estado = 'pendiente'),
    (select max(r.actualizado) from public.registros r where r.negocio_id = g.id)
    from public.negocios g join auth.users u on u.id = g.dueno order by g.creado desc;
end $$;
drop function public.es_miembro(uuid);
drop function public.puede_escribir(uuid);
drop function public.es_admin(uuid);
drop function public.es_admin_orbe();

-- 2) Configuración del cobro: precios y datos para pagar. La lee cualquiera con sesión; solo un administrador de Orbe la cambia.
create table public.config_orbe (
  id int primary key default 1 check (id = 1),
  precios jsonb not null,
  pago_movil jsonb not null default '{}'::jsonb,
  binance text check (binance is null or char_length(binance) <= 60),
  soporte text check (soporte is null or char_length(soporte) <= 30),
  actualizado timestamptz not null default now()
);
insert into public.config_orbe (precios) values ('{"negocio": {"mes": 15, "anio": 150}, "empresa": {"mes": 25, "anio": 250}, "moneda": "USD"}');
alter table public.config_orbe enable row level security;
create policy "leer la configuración de cobro" on public.config_orbe for select to authenticated using (true);
revoke all on public.config_orbe from anon, authenticated;
grant select on public.config_orbe to authenticated;

create or replace function public.guardar_config(precios jsonb, pago_movil jsonb, binance text, soporte text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  update public.config_orbe set precios = guardar_config.precios, pago_movil = guardar_config.pago_movil,
    binance = nullif(trim(guardar_config.binance), ''), soporte = nullif(trim(guardar_config.soporte), ''), actualizado = now() where id = 1;
end $$;
revoke all on function public.guardar_config(jsonb, jsonb, text, text) from public, anon;
grant execute on function public.guardar_config(jsonb, jsonb, text, text) to authenticated;

-- ¿Soy administrador de Orbe? (para mostrar o no el panel; los datos igual los protege el servidor)
create or replace function public.soy_admin_orbe() returns boolean
language sql stable security definer set search_path = '' as $$ select privado.es_admin_orbe(); $$;
revoke all on function public.soy_admin_orbe() from public, anon;
grant execute on function public.soy_admin_orbe() to authenticated;
