-- Orbe Negocios · migración 3: iniciar sesión con usuario (el correo queda solo para el dueño).
create table public.usuarios (
  usuario text primary key check (usuario ~ '^[a-z0-9._-]{3,30}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  creado timestamptz not null default now()
);
alter table public.usuarios enable row level security;
revoke all on public.usuarios from anon, authenticated;

create table privado.intentos (usuario text not null, t timestamptz not null default now());
create index intentos_usuario_t on privado.intentos (usuario, t);
revoke all on privado.intentos from public, anon, authenticated;

create or replace function public.usuario_libre(u text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.usuarios where usuario = lower(trim(u)));
$$;

create or replace function privado.guardar_usuario_nuevo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u text := lower(trim(new.raw_user_meta_data->>'usuario'));
begin
  if u is not null and u <> '' then
    if exists (select 1 from public.usuarios where usuario = u) then raise exception 'Ese usuario ya existe'; end if;
    insert into public.usuarios (usuario, user_id) values (u, new.id);
  end if;
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users for each row execute function privado.guardar_usuario_nuevo();

-- Con la contraseña correcta devuelve el correo para abrir la sesión; 10 fallos en 15 minutos bloquean ese usuario un rato.
create or replace function public.correo_para_entrar(u text, clave text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v text := lower(trim(u)); r record;
begin
  if (select count(*) from privado.intentos i where i.usuario = v and i.t > now() - interval '15 minutes') >= 10 then
    raise exception 'Demasiados intentos. Espera unos minutos';
  end if;
  select au.email, au.encrypted_password into r from public.usuarios us join auth.users au on au.id = us.user_id where us.usuario = v;
  if r.email is null or r.encrypted_password is null or extensions.crypt(clave, r.encrypted_password) <> r.encrypted_password then
    insert into privado.intentos (usuario) values (v);
    delete from privado.intentos where t < now() - interval '1 day';
    raise exception 'El usuario o la contraseña no coinciden';
  end if;
  delete from privado.intentos where usuario = v;
  return r.email;
end $$;

create or replace function public.poner_usuario(u text) returns text
language plpgsql security definer set search_path = '' as $$
declare v text := lower(trim(u));
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if v !~ '^[a-z0-9._-]{3,30}$' then raise exception 'El usuario lleva de 3 a 30 letras o números, sin espacios'; end if;
  if exists (select 1 from public.usuarios where usuario = v and user_id <> auth.uid()) then raise exception 'Ese usuario ya existe'; end if;
  delete from public.usuarios where user_id = auth.uid();
  insert into public.usuarios (usuario, user_id) values (v, auth.uid());
  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('usuario', v) where id = auth.uid();
  return v;
end $$;

revoke all on function public.usuario_libre(text), public.correo_para_entrar(text, text), public.poner_usuario(text) from public;
grant execute on function public.usuario_libre(text), public.correo_para_entrar(text, text) to anon, authenticated;
grant execute on function public.poner_usuario(text) to authenticated;
revoke all on function privado.guardar_usuario_nuevo() from public, anon, authenticated;
