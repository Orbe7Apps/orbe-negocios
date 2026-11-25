-- Cada cuenta es dueña de un solo negocio (las sedes y los perfiles van dentro de ese negocio, según el plan).
create unique index if not exists negocios_un_dueno on public.negocios (dueno);
create or replace function public.crear_negocio(nombre text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare nid uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Inicia sesión primero'; end if;
  if exists (select 1 from public.negocios where dueno = uid) then raise exception 'Tu cuenta ya tiene un negocio: cada cuenta es para un solo negocio'; end if;
  insert into public.negocios (nombre, dueno) values (left(trim(nombre), 120), uid) returning id into nid;
  insert into public.miembros (negocio_id, user_id, rol) values (nid, uid, 'dueno');
  return nid;
end $$;

-- Prueba gratis de 3 días para los negocios nuevos.
alter table public.negocios alter column prueba_hasta set default (now() + interval '3 days');
