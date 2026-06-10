-- ════════════════════════════════════════════════════════════
-- BARBER95 — Dashboard Adam, fiches clients, tarif ami, relance,
-- parrainage, lien partageable.
--   • clients : is_friend, avatar_url, ref_code, relance_envoyee_at
--   • prestations : prix_ami (tarif réduit, null = pas de réduction)
--   • reservations : source (tracking lien partagé)
--   • table referrals + RPC appliquer_parrainage
--   • handle_new_user : avatar Google + code parrainage à l'inscription
--   • reserver_creneau : paramètre p_source optionnel
-- À exécuter dans le SQL Editor Supabase (après 0001 → 0008).
-- ════════════════════════════════════════════════════════════

-- ── Colonnes clients ──
alter table public.clients
  add column if not exists is_friend boolean not null default false,
  add column if not exists avatar_url text,
  add column if not exists ref_code text,
  add column if not exists relance_envoyee_at timestamptz;

create unique index if not exists clients_ref_code_idx on public.clients (ref_code);

-- ── Tarif ami sur la prestation (null = même prix pour tout le monde) ──
alter table public.prestations
  add column if not exists prix_ami numeric(6, 2);

-- ── Source de la réservation (lien partagé /book?source=…) ──
alter table public.reservations
  add column if not exists source text;

-- ════════════════════════════════════════════════════════════
-- CODE DE PARRAINAGE
-- ════════════════════════════════════════════════════════════

-- Génère un code court unique (8 caractères hexadécimaux).
create or replace function public.gen_ref_code()
returns text
language plpgsql
as $$
declare
  v_code text;
begin
  loop
    v_code := lower(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (select 1 from public.clients where ref_code = v_code);
  end loop;
  return v_code;
end;
$$;

-- Inscription : crée la ligne clients avec avatar Google + code parrainage.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clients (id, email, avatar_url, ref_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    public.gen_ref_code()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill des comptes existants : code parrainage + avatar Google.
update public.clients
set ref_code = public.gen_ref_code()
where ref_code is null;

update public.clients c
set avatar_url = coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
where u.id = c.id and c.avatar_url is null;

-- ── Table referrals : qui a parrainé qui ──
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.clients (id) on delete cascade,
  referred_id uuid not null references public.clients (id) on delete cascade,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referred_id) -- un filleul ne peut être parrainé qu'une fois
);

alter table public.referrals enable row level security;

-- lecture : parrain, filleul ou admin. Écriture uniquement via RPC/admin.
drop policy if exists referrals_read on public.referrals;
create policy referrals_read on public.referrals
  for select using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

drop policy if exists referrals_admin on public.referrals;
create policy referrals_admin on public.referrals
  for all using (public.is_admin()) with check (public.is_admin());

-- RPC : applique un code de parrainage au compte connecté (le filleul),
-- appelée après sa première réservation confirmée. Best-effort : renvoie
-- false si le code est invalide / auto-parrainage / déjà parrainé.
create or replace function public.appliquer_parrainage(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_referrer uuid;
begin
  if v_uid is null or p_code is null or trim(p_code) = '' then
    return false;
  end if;

  select id into v_referrer
  from public.clients
  where ref_code = lower(trim(p_code)) and id <> v_uid;
  if v_referrer is null then
    return false;
  end if;

  if exists (select 1 from public.referrals where referred_id = v_uid) then
    return false;
  end if;

  insert into public.referrals (referrer_id, referred_id, used_at)
  values (v_referrer, v_uid, now());

  -- récompense : +1 point de fidélité pour le parrain
  update public.clients
  set points_fidelite = points_fidelite + 1
  where id = v_referrer;

  return true;
end;
$$;

-- ════════════════════════════════════════════════════════════
-- RÉSERVATION : tracking de la source (lien partagé)
-- On remplace reserver_creneau par une version à 3 paramètres
-- (p_source optionnel) — il faut supprimer l'ancienne signature
-- pour éviter une surcharge ambiguë.
-- ════════════════════════════════════════════════════════════
drop function if exists public.reserver_creneau(uuid, uuid);

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
  v_resa uuid;
  v_ok int;
begin
  if v_uid is null then
    raise exception 'non authentifié';
  end if;

  -- profil complété obligatoire avant réservation
  select tel into v_tel from public.clients where id = v_uid;
  if v_tel is null or v_tel = '' then
    raise exception 'profil incomplet';
  end if;

  -- verrou atomique : ne réussit que si encore 'ouvert'
  update public.creneaux
  set statut = 'reserve_temporaire', locked_at = now()
  where id = p_creneau and statut = 'ouvert';
  get diagnostics v_ok = row_count;
  if v_ok = 0 then
    raise exception 'créneau indisponible';
  end if;

  insert into public.reservations (client_id, prestation_id, creneau_id, statut, source)
  values (v_uid, p_prestation, p_creneau, 'en_attente', nullif(trim(coalesce(p_source, '')), ''))
  returning id into v_resa;

  update public.creneaux set reservation_id = v_resa where id = p_creneau;
  return v_resa;
end;
$$;

-- ── Réglage par défaut du délai de relance (modifiable depuis le dashboard) ──
insert into public.site_contenu (cle, valeur)
values ('relance.semaines', '3')
on conflict (cle) do nothing;
