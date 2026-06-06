-- ════════════════════════════════════════════════════════════
-- Patch : corrige la policy de mise à jour du profil client.
-- L'ancienne version (`with check role = 'client'`) bloquait l'update
-- dès que la ligne avait role='admin'. On remplace par une protection
-- de la colonne `role` via trigger.
-- À exécuter dans le SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════

drop policy if exists clients_self_update on public.clients;
create policy clients_self_update on public.clients
  for update using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.protect_client_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_protect_role on public.clients;
create trigger clients_protect_role
  before update on public.clients
  for each row execute function public.protect_client_role();
