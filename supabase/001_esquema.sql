-- Orbe Negocios · base de datos en Supabase.
-- Cada negocio con sus miembros y sus datos (un registro por producto, venta, cliente…).
-- La app funciona sin internet y sube los cambios; aquí queda la copia en la nube de cada negocio.
-- Seguridad: cada cuenta solo ve sus negocios (RLS). Si la suscripción vence, los datos se ven pero no cambian.

create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 120),
  dueno uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'prueba' check (plan in ('prueba', 'negocio', 'empresa', 'cortesia')),
  prueba_hasta timestamptz not null default (now() + interval '3 days'),
  pagado_hasta timestamptz,
  creado timestamptz not null default now()
);
create index negocios_dueno_idx on public.negocios(dueno);

create table public.miembros (
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null default 'equipo' check (rol in ('dueno', 'admin', 'equipo')),
  creado timestamptz not null default now(),
  primary key (negocio_id, user_id)
);
create index miembros_user_idx on public.miembros(user_id);

-- Datos: col = colección (ventas, productos…), id = id del registro en la app.
create table public.registros (
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  col text not null check (col ~ '^[a-zA-Z]{1,30}$'),
  id text not null check (char_length(id) between 1 and 100),
  datos jsonb not null check (pg_column_size(datos) < 1000000),
  borrado boolean not null default false,
  actualizado timestamptz not null default now(),
  autor uuid default auth.uid() references auth.users(id) on delete set null,
  dispositivo text check (dispositivo is null or char_length(dispositivo) <= 40),
  primary key (negocio_id, col, id)
);
create index registros_cambios_idx on public.registros(negocio_id, actualizado);
create index registros_autor_idx on public.registros(autor);

-- Códigos para sumar otra cuenta (socio o administrador) al negocio. Vencen en 30 minutos y sirven una vez.
create table public.invitaciones (
  codigo text primary key check (codigo ~ '^[A-Z2-9]{8}$'),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  creado_por uuid not null references auth.users(id) on delete cascade,
  rol text not null default 'equipo' check (rol in ('admin', 'equipo')),
  vence timestamptz not null default (now() + interval '30 minutes'),
  usado_por uuid references auth.users(id) on delete set null,
  usado timestamptz
);
create index invitaciones_negocio_idx on public.invitaciones(negocio_id);
create index invitaciones_creado_por_idx on public.invitaciones(creado_por);
create index invitaciones_usado_por_idx on public.invitaciones(usado_por);

-- Administradores de Orbe (quienes aprueban pagos y ven todos los negocios). Se agregan a mano, nunca desde la app.
create table public.admins_orbe (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creado timestamptz not null default now()
);

-- Pagos de la suscripción: el cliente reporta («Ya pagué») y un administrador de Orbe aprueba.
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  plan text not null check (plan in ('negocio', 'empresa')),
  meses int not null check (meses in (1, 12)),
  monto numeric(12, 2) not null check (monto > 0),
  moneda text not null check (moneda in ('USD', 'VES', 'USDT')),
  metodo text not null check (metodo in ('Pago Móvil', 'Binance', 'Efectivo', 'Transferencia', 'Otro')),
  referencia text check (referencia is null or char_length(referencia) <= 80),
  nota text check (nota is null or char_length(nota) <= 300),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  reportado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado timestamptz not null default now(),
  revisado_por uuid references auth.users(id) on delete set null,
  revisado timestamptz
);
create index pagos_negocio_idx on public.pagos(negocio_id, creado desc);
create index pagos_estado_idx on public.pagos(estado) where estado = 'pendiente';
create index pagos_reportado_por_idx on public.pagos(reportado_por);
create index pagos_revisado_por_idx on public.pagos(revisado_por);

-- La hora del cambio la pone el servidor (no el reloj del aparato) y el autor es siempre quien escribe.
create or replace function public.marcar_registro() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado := now();
  new.autor := auth.uid();
  return new;
end $$;
create trigger registros_marcar before insert or update on public.registros
  for each row execute function public.marcar_registro();

create or replace function public.es_miembro(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros m where m.negocio_id = n and m.user_id = auth.uid());
$$;
-- Puede escribir: miembro y con la prueba o la suscripción al día (más 7 días de gracia).
create or replace function public.puede_escribir(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.miembros m join public.negocios g on g.id = m.negocio_id
    where m.negocio_id = n and m.user_id = auth.uid()
      and (g.plan = 'cortesia' or g.prueba_hasta > now() or coalesce(g.pagado_hasta, '-infinity') + interval '7 days' > now())
  );
$$;
create or replace function public.es_admin(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros m where m.negocio_id = n and m.user_id = auth.uid() and m.rol in ('dueno', 'admin'));
$$;
create or replace function public.es_admin_orbe() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins_orbe a where a.user_id = auth.uid());
$$;

alter table public.negocios enable row level security;
alter table public.miembros enable row level security;
alter table public.registros enable row level security;
alter table public.invitaciones enable row level security;
alter table public.admins_orbe enable row level security;
alter table public.pagos enable row level security;

create policy "ver mis negocios" on public.negocios for select to authenticated using ((select public.es_miembro(id)) or (select public.es_admin_orbe()));
create policy "ver miembros de mis negocios" on public.miembros for select to authenticated using ((select public.es_miembro(negocio_id)));
create policy "leer datos de mi negocio" on public.registros for select to authenticated using ((select public.es_miembro(negocio_id)));
create policy "guardar datos de mi negocio" on public.registros for insert to authenticated with check ((select public.puede_escribir(negocio_id)));
create policy "cambiar datos de mi negocio" on public.registros for update to authenticated using ((select public.puede_escribir(negocio_id))) with check ((select public.puede_escribir(negocio_id)));
create policy "ver pagos de mi negocio" on public.pagos for select to authenticated using ((select public.es_miembro(negocio_id)) or (select public.es_admin_orbe()));
-- invitaciones y admins_orbe: sin acceso directo (solo por las funciones de abajo).

-- Crear un negocio: quien lo crea queda como dueño. Máximo 5 por cuenta.
create or replace function public.crear_negocio(nombre text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare nid uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Inicia sesión primero'; end if;
  if (select count(*) from public.negocios where dueno = uid) >= 5 then raise exception 'Llegaste al máximo de 5 negocios por cuenta'; end if;
  insert into public.negocios (nombre, dueno) values (left(trim(nombre), 120), uid) returning id into nid;
  insert into public.miembros (negocio_id, user_id, rol) values (nid, uid, 'dueno');
  return nid;
end $$;

create or replace function public.crear_invitacion(n uuid, rol text default 'equipo') returns text
language plpgsql security definer set search_path = '' as $$
declare c text; letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if not public.es_admin(n) then raise exception 'Solo el dueño o un administrador puede invitar'; end if;
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

create or replace function public.unirse(codigo text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.invitaciones; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Inicia sesión primero'; end if;
  select * into inv from public.invitaciones i where i.codigo = upper(trim(unirse.codigo)) for update;
  if inv.codigo is null or inv.usado is not null or inv.vence < now() then raise exception 'El código no sirve o ya venció'; end if;
  insert into public.miembros (negocio_id, user_id, rol) values (inv.negocio_id, uid, inv.rol) on conflict (negocio_id, user_id) do nothing;
  update public.invitaciones set usado = now(), usado_por = uid where invitaciones.codigo = inv.codigo;
  return inv.negocio_id;
end $$;

create or replace function public.quitar_miembro(n uuid, usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin(n) then raise exception 'Solo el dueño o un administrador puede quitar cuentas'; end if;
  delete from public.miembros where negocio_id = n and user_id = usuario and rol <> 'dueno';
end $$;

-- «Ya pagué»: el dueño o un administrador del negocio reporta el pago.
create or replace function public.reportar_pago(n uuid, plan text, meses int, monto numeric, moneda text, metodo text, referencia text, nota text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  if not public.es_admin(n) then raise exception 'Solo el dueño o un administrador reporta pagos'; end if;
  if (select count(*) from public.pagos where negocio_id = n and estado = 'pendiente') >= 3 then raise exception 'Ya tienes pagos por revisar: espera la confirmación'; end if;
  insert into public.pagos (negocio_id, plan, meses, monto, moneda, metodo, referencia, nota)
    values (n, plan, meses, monto, moneda, metodo, nullif(left(trim(referencia), 80), ''), nullif(left(trim(nota), 300), '')) returning id into pid;
  return pid;
end $$;

-- Aprobar o rechazar un pago (solo administradores de Orbe). Al aprobar, la fecha se extiende desde hoy o desde lo ya pagado.
create or replace function public.revisar_pago(pago uuid, aprobar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.pagos;
begin
  if not public.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  select * into p from public.pagos where id = pago for update;
  if p.id is null or p.estado <> 'pendiente' then raise exception 'Ese pago ya fue revisado'; end if;
  update public.pagos set estado = case when aprobar then 'aprobado' else 'rechazado' end, revisado = now(), revisado_por = auth.uid() where id = pago;
  if aprobar then
    update public.negocios set plan = p.plan, prueba_hasta = least(prueba_hasta, now()),
      pagado_hasta = greatest(now(), coalesce(pagado_hasta, now())) + make_interval(months => p.meses)
      where id = p.negocio_id;
  end if;
end $$;

-- Activar a mano (cliente que paga en persona o cortesía).
create or replace function public.activar_negocio(n uuid, plan text, meses int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  if plan not in ('negocio', 'empresa', 'cortesia') or meses not between 1 and 24 then raise exception 'Datos no válidos'; end if;
  update public.negocios set plan = activar_negocio.plan, prueba_hasta = least(prueba_hasta, now()),
    pagado_hasta = greatest(now(), coalesce(pagado_hasta, now())) + make_interval(months => meses) where id = n;
end $$;

-- Panel de administración: todos los negocios con su estado (solo administradores de Orbe).
create or replace function public.admin_negocios() returns table (id uuid, nombre text, correo text, plan text, prueba_hasta timestamptz, pagado_hasta timestamptz, creado timestamptz, pendientes bigint, ultimo_cambio timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  return query select g.id, g.nombre, u.email::text, g.plan, g.prueba_hasta, g.pagado_hasta, g.creado,
    (select count(*) from public.pagos p where p.negocio_id = g.id and p.estado = 'pendiente'),
    (select max(r.actualizado) from public.registros r where r.negocio_id = g.id)
    from public.negocios g join auth.users u on u.id = g.dueno order by g.creado desc;
end $$;

-- Permisos de las funciones: las auxiliares no se llaman desde fuera; las de acción solo con sesión iniciada.
revoke all on function public.es_miembro(uuid), public.puede_escribir(uuid), public.es_admin(uuid), public.es_admin_orbe() from public, anon;
grant execute on function public.es_miembro(uuid), public.puede_escribir(uuid), public.es_admin(uuid), public.es_admin_orbe() to authenticated;
revoke all on function public.crear_negocio(text), public.crear_invitacion(uuid, text), public.unirse(text), public.quitar_miembro(uuid, uuid),
  public.reportar_pago(uuid, text, int, numeric, text, text, text, text), public.revisar_pago(uuid, boolean), public.activar_negocio(uuid, text, int), public.admin_negocios() from public, anon;
grant execute on function public.crear_negocio(text), public.crear_invitacion(uuid, text), public.unirse(text), public.quitar_miembro(uuid, uuid),
  public.reportar_pago(uuid, text, int, numeric, text, text, text, text), public.revisar_pago(uuid, boolean), public.activar_negocio(uuid, text, int), public.admin_negocios() to authenticated;
revoke all on function public.marcar_registro() from public, anon, authenticated;

-- Permisos de tabla: lo justo (las políticas deciden qué filas).
revoke all on public.negocios, public.miembros, public.registros, public.invitaciones, public.admins_orbe, public.pagos from anon, authenticated;
grant select on public.negocios, public.miembros, public.pagos to authenticated;
grant select, insert, update on public.registros to authenticated;
