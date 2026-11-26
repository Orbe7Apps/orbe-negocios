-- Orbe Negocios · migración 11: el panel de administración exige la verificación en dos pasos (TOTP).
-- Con solo la contraseña (sesión aal1) un administrador de Orbe no recibe ningún dato de administración:
-- tiene que confirmar el código de 6 números de su app de autenticación (sesión aal2).
-- Si el administrador pierde el teléfono: en el panel SQL de Supabase, borrar su factor
--   delete from auth.mfa_factors where user_id = '<id del administrador>';
-- y al entrar de nuevo al panel se le pide configurar la app otra vez.

-- ¿Es administrador y ya pasó el segundo paso? 'no' · 'falta_mfa' · 'ok' (el panel decide qué pantalla mostrar)
create or replace function public.estado_admin_orbe() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when not exists (select 1 from public.admins_orbe a where a.user_id = auth.uid()) then 'no'
    when coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then 'falta_mfa'
    else 'ok' end;
$$;
revoke all on function public.estado_admin_orbe() from public, anon;
grant execute on function public.estado_admin_orbe() to authenticated;

create or replace function privado.es_admin_orbe() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins_orbe a where a.user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
