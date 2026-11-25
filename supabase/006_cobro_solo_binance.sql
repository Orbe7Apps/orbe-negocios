-- Los clientes solo leen precios, Binance y soporte. Pago Móvil y los datos del emisor quedan solo para el administrador.
revoke select on public.config_orbe from authenticated, anon;
grant select (id, precios, binance, soporte, actualizado) on public.config_orbe to authenticated;

create or replace function public.admin_config() returns jsonb
language plpgsql security definer set search_path = '' stable as $$
begin
  if not privado.es_admin_orbe() then raise exception 'Sin permiso'; end if;
  return (select to_jsonb(c) from public.config_orbe c where id = 1);
end $$;
revoke all on function public.admin_config() from public, anon;
grant execute on function public.admin_config() to authenticated;
