-- ════════════════════════════════════════════════════════════
-- 0012 — Outil pro pour Adam : fix RLS update clients (admin),
-- notes sur la fiche client, réservations manuelles (walk-in).
-- À coller dans le SQL Editor Supabase → Run (après 0001→0011).
-- ════════════════════════════════════════════════════════════

-- ── 1) FIX : l'admin peut modifier N'IMPORTE QUEL client ──
-- L'ancienne policy clients_self_update n'autorisait que id = auth.uid(),
-- donc le toggle « tarif ami » (et les notes) échouaient silencieusement
-- pour l'admin. On ajoute une policy admin dédiée.
drop policy if exists clients_admin_update on public.clients;
create policy clients_admin_update on public.clients
  for update using (public.is_admin()) with check (public.is_admin());

-- ── 2) Notes libres sur la fiche client (lecture/écriture admin via RLS) ──
alter table public.clients add column if not exists notes text;

-- ── 3) Réservations manuelles : client qui appelle / passe, sans compte ──
alter table public.reservations add column if not exists client_nom text;
alter table public.reservations alter column client_id drop not null;

-- RPC admin : pose un RDV confirmé au nom de p_nom sur un créneau ouvert.
create or replace function public.reserver_manuel(p_creneau uuid, p_nom text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resa uuid;
  v_presta uuid;
  v_ok int;
begin
  if not public.is_admin() then
    raise exception 'réservé à l''administrateur';
  end if;
  if p_nom is null or trim(p_nom) = '' then
    raise exception 'nom requis';
  end if;

  select id into v_presta from public.prestations order by prix asc limit 1;

  -- verrou atomique : ne réussit que si le créneau est encore ouvert
  update public.creneaux
  set statut = 'confirme', locked_at = now()
  where id = p_creneau and statut = 'ouvert';
  get diagnostics v_ok = row_count;
  if v_ok = 0 then
    raise exception 'créneau indisponible';
  end if;

  insert into public.reservations (client_id, client_nom, prestation_id, creneau_id, statut)
  values (null, trim(p_nom), v_presta, p_creneau, 'confirmee')
  returning id into v_resa;

  update public.creneaux set reservation_id = v_resa where id = p_creneau;
  return v_resa;
end;
$$;

revoke execute on function public.reserver_manuel(uuid, text) from public, anon;
grant execute on function public.reserver_manuel(uuid, text) to authenticated;

-- ── 4) FIX annulation pour les RDV manuels (client_id NULL) ──
-- L'ancienne version traitait « client_id null » comme « réservation
-- introuvable » → l'admin ne pouvait pas annuler un RDV manuel. On
-- distingue maintenant « ligne absente » (FOUND) de « client_id null ».
create or replace function public.annuler_reservation(p_reservation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_client uuid;
  v_creneau uuid;
  v_debut timestamptz;
begin
  select r.client_id, r.creneau_id, c.datetime_debut
  into v_client, v_creneau, v_debut
  from public.reservations r
  join public.creneaux c on c.id = r.creneau_id
  where r.id = p_reservation;

  if not found then
    raise exception 'réservation introuvable';
  end if;

  -- soit admin, soit le propriétaire à >= 2h du RDV
  if not public.is_admin() then
    if v_client is null or v_client <> v_uid then
      raise exception 'non autorisé';
    end if;
    if v_debut < now() + interval '2 hours' then
      raise exception 'annulation impossible à moins de 2h';
    end if;
  end if;

  update public.reservations set statut = 'annulee' where id = p_reservation;
  update public.creneaux set statut = 'ouvert', reservation_id = null, locked_at = null
  where id = v_creneau;
end;
$$;

revoke execute on function public.annuler_reservation(uuid) from public, anon;
grant execute on function public.annuler_reservation(uuid) to authenticated;
