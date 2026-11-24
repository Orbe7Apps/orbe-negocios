-- Protección legal: los pagos sobreviven al borrado de la cuenta, datos de factura, datos del emisor y «Borrar mi cuenta».
alter table public.pagos drop constraint pagos_negocio_id_fkey;
alter table public.pagos alter column negocio_id drop not null;
alter table public.pagos add constraint pagos_negocio_id_fkey foreign key (negocio_id) references public.negocios(id) on delete set null;
alter table public.pagos add column if not exists negocio_nombre text, add column if not exists cliente_correo text, add column if not exists factura jsonb not null default '{}'::jsonb;

drop function if exists public.reportar_pago(uuid, text, int, numeric, text, text, text, text);
create or replace function public.reportar_pago(n uuid, plan text, meses int, monto numeric, moneda text, metodo text, referencia text, nota text default null, factura jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare pid uuid; nom text; correo text;
begin
  if not privado.es_admin(n) then raise exception 'Solo el dueño o un administrador reporta pagos'; end if;
  if (select count(*) from public.pagos where negocio_id = n and estado = 'pendiente') >= 3 then raise exception 'Ya tienes pagos por revisar: espera la confirmación'; end if;
  if octet_length(coalesce(factura, '{}'::jsonb)::text) > 2000 then raise exception 'Datos de factura demasiado largos'; end if;
  select g.nombre, u.email into nom, correo from public.negocios g join auth.users u on u.id = g.dueno where g.id = n;
  insert into public.pagos (negocio_id, plan, meses, monto, moneda, metodo, referencia, nota, negocio_nombre, cliente_correo, factura)
    values (n, plan, meses, monto, moneda, metodo, nullif(left(trim(referencia), 80), ''), nullif(left(trim(nota), 300), ''), nom, correo, coalesce(factura, '{}'::jsonb)) returning id into pid;
  return pid;
end $$;
revoke all on function public.reportar_pago(uuid, text, int, numeric, text, text, text, text, jsonb) from public, anon;
grant execute on function public.reportar_pago(uuid, text, int, numeric, text, text, text, text, jsonb) to authenticated;

alter table public.config_orbe add column if not exists emisor jsonb not null default '{}'::jsonb;
drop function if exists public.guardar_config(jsonb, jsonb, text, text);
create or replace function public.guardar_config(precios jsonb, pago_movil jsonb, binance text, soporte text, emisor jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  update public.config_orbe set precios = guardar_config.precios, pago_movil = guardar_config.pago_movil,
    binance = nullif(trim(guardar_config.binance), ''), soporte = nullif(trim(guardar_config.soporte), ''), emisor = coalesce(guardar_config.emisor, '{}'::jsonb), actualizado = now() where id = 1;
end $$;
revoke all on function public.guardar_config(jsonb, jsonb, text, text, jsonb) from public, anon;
grant execute on function public.guardar_config(jsonb, jsonb, text, text, jsonb) to authenticated;

create or replace function public.borrar_mi_cuenta() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  delete from public.negocios where dueno = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;
