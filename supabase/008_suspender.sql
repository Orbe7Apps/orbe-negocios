-- Suspender negocios desde el panel: no pueden usar Orbe ni guardar en la nube hasta reactivarlos. Nada se borra.
alter table public.negocios add column if not exists suspendido_en timestamptz, add column if not exists suspendido_motivo text;

create or replace function privado.puede_escribir(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.miembros m join public.negocios g on g.id = m.negocio_id
    where m.negocio_id = n and m.user_id = auth.uid() and g.suspendido_en is null
      and (g.plan = 'cortesia' or g.prueba_hasta > now() or coalesce(g.pagado_hasta, '-infinity') + interval '7 days' > now())
  );
$$;

create or replace function public.suspender_negocio(n uuid, suspender boolean, motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  update public.negocios set
    suspendido_en = case when suspender then now() else null end,
    suspendido_motivo = case when suspender then nullif(left(trim(coalesce(motivo, '')), 300), '') else null end
  where id = n;
  if not found then raise exception 'Ese negocio no existe'; end if;
end $$;
revoke all on function public.suspender_negocio(uuid, boolean, text) from public, anon;
grant execute on function public.suspender_negocio(uuid, boolean, text) to authenticated;

drop function if exists public.admin_negocios();
create function public.admin_negocios() returns table (id uuid, nombre text, correo text, plan text, prueba_hasta timestamptz, pagado_hasta timestamptz, creado timestamptz, pendientes bigint, ultimo_cambio timestamptz, suspendido_en timestamptz, suspendido_motivo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  return query select g.id, g.nombre, u.email::text, g.plan, g.prueba_hasta, g.pagado_hasta, g.creado,
    (select count(*) from public.pagos p where p.negocio_id = g.id and p.estado = 'pendiente'),
    (select max(r.actualizado) from public.registros r where r.negocio_id = g.id),
    g.suspendido_en, g.suspendido_motivo
    from public.negocios g join auth.users u on u.id = g.dueno order by g.creado desc;
end $$;
revoke all on function public.admin_negocios() from public, anon;
grant execute on function public.admin_negocios() to authenticated;
