-- ════════════════════════════════════════════════════════════
-- 0013 — Fidélité qui se boucle : à 10 points, la coupe suivante est
-- OFFERTE et appliquée automatiquement (le client n'a rien à faire).
-- Seuil = 10 (doit rester aligné avec FIDELITE.objectif dans src/config.js).
-- À coller dans le SQL Editor Supabase → Run (après 0001→0012).
-- ════════════════════════════════════════════════════════════

alter table public.reservations add column if not exists offerte boolean not null default false;

-- ── reserver_creneau : marque la résa « offerte » si le client a atteint le
--    palier et n'a pas déjà une coupe offerte en cours (anti double-usage) ──
create or replace function public.reserver_creneau(
  p_creneau uuid,
  p_prestation uuid,
  p_source text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tel text;
  v_points int;
  v_seuil int := 10; -- = FIDELITE.objectif
  v_offerte boolean := false;
  v_resa uuid;
  v_ok int;
begin
  if v_uid is null then
    raise exception 'non authentifié';
  end if;

  select tel, points_fidelite into v_tel, v_points from public.clients where id = v_uid;
  if v_tel is null or v_tel = '' then
    raise exception 'profil incomplet';
  end if;

  -- éligible à la coupe offerte ?
  if coalesce(v_points, 0) >= v_seuil and not exists (
    select 1 from public.reservations
    where client_id = v_uid and offerte and statut in ('en_attente', 'confirmee')
  ) then
    v_offerte := true;
  end if;

  -- verrou atomique : ne réussit que si encore 'ouvert'
  update public.creneaux
  set statut = 'reserve_temporaire', locked_at = now()
  where id = p_creneau and statut = 'ouvert';
  get diagnostics v_ok = row_count;
  if v_ok = 0 then
    raise exception 'créneau indisponible';
  end if;

  insert into public.reservations (client_id, prestation_id, creneau_id, statut, source, offerte)
  values (v_uid, p_prestation, p_creneau, 'en_attente', nullif(trim(coalesce(p_source, '')), ''), v_offerte)
  returning id into v_resa;

  update public.creneaux set reservation_id = v_resa where id = p_creneau;
  return v_resa;
end;
$$;

revoke execute on function public.reserver_creneau(uuid, uuid, text) from public, anon;
grant execute on function public.reserver_creneau(uuid, uuid, text) to authenticated;

-- ── bump_fidelite : à la clôture, +1 point, OU -10 si la coupe était offerte ──
create or replace function public.bump_fidelite()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.statut = 'terminee' and old.statut is distinct from 'terminee' then
    if new.offerte then
      update public.clients
      set points_fidelite = greatest(points_fidelite - 10, 0)
      where id = new.client_id;
    else
      update public.clients
      set points_fidelite = points_fidelite + 1
      where id = new.client_id;
    end if;
  end if;
  return new;
end;
$$;
