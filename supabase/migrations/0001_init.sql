-- ════════════════════════════════════════════════════════════
-- BARBER95 — Schéma initial (Phase 2)
-- Tables, RLS, fonctions de réservation atomiques, trigger fidélité.
-- À exécuter dans le SQL Editor de Supabase (ou via `supabase db push`).
-- ════════════════════════════════════════════════════════════

-- ── Enums de statut ──
do $$ begin
  create type statut_creneau as enum ('ouvert', 'reserve_temporaire', 'confirme', 'annule');
exception when duplicate_object then null; end $$;

do $$ begin
  create type statut_reservation as enum ('en_attente', 'confirmee', 'terminee', 'annulee');
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════
-- TABLES
-- ════════════════════════════════════════════════════════════

-- clients : 1 ligne par utilisateur Supabase Auth
create table if not exists public.clients (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  prenom text,
  nom text,
  tel text,
  points_fidelite int not null default 0,
  push_token text,
  role text not null default 'client', -- 'client' | 'admin'
  created_at timestamptz not null default now()
);

create table if not exists public.prestations (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  duree_minutes int not null default 30,
  prix numeric(6, 2) not null
);

create table if not exists public.creneaux (
  id uuid primary key default gen_random_uuid(),
  datetime_debut timestamptz not null,
  datetime_fin timestamptz not null,
  statut statut_creneau not null default 'ouvert',
  reservation_id uuid,
  locked_at timestamptz
);
create index if not exists creneaux_debut_idx on public.creneaux (datetime_debut);
create index if not exists creneaux_statut_idx on public.creneaux (statut);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  prestation_id uuid references public.prestations (id),
  creneau_id uuid not null references public.creneaux (id),
  statut statut_reservation not null default 'en_attente',
  created_at timestamptz not null default now()
);
create index if not exists reservations_client_idx on public.reservations (client_id);

create table if not exists public.avis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  reservation_id uuid references public.reservations (id) on delete cascade,
  note int not null check (note between 1 and 5),
  commentaire text,
  prenom text,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- HELPERS
-- ════════════════════════════════════════════════════════════

-- rôle admin (utilisé par les policies). SECURITY DEFINER pour éviter
-- la récursion RLS sur la table clients.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.clients
    where id = auth.uid() and role = 'admin'
  );
$$;

-- création auto d'une ligne clients à l'inscription Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clients (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- +1 point de fidélité au passage en 'terminee'
create or replace function public.bump_fidelite()
returns trigger
language plpgsql
as $$
begin
  if new.statut = 'terminee' and old.statut is distinct from 'terminee' then
    update public.clients
    set points_fidelite = points_fidelite + 1
    where id = new.client_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_fidelite on public.reservations;
create trigger reservations_fidelite
  after update on public.reservations
  for each row execute function public.bump_fidelite();

-- ════════════════════════════════════════════════════════════
-- RPC RÉSERVATION (verrou atomique anti-double-réservation)
-- ════════════════════════════════════════════════════════════

-- Étape 1 : verrou temporaire. UPDATE conditionnel atomique :
-- seul le passage ouvert -> reserve_temporaire réussit.
create or replace function public.reserver_creneau(p_creneau uuid, p_prestation uuid)
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

  insert into public.reservations (client_id, prestation_id, creneau_id, statut)
  values (v_uid, p_prestation, p_creneau, 'en_attente')
  returning id into v_resa;

  update public.creneaux set reservation_id = v_resa where id = p_creneau;
  return v_resa;
end;
$$;

-- Étape 2 : confirmation (le créneau doit toujours appartenir à cette résa).
create or replace function public.confirmer_reservation(p_reservation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_creneau uuid;
begin
  select creneau_id into v_creneau
  from public.reservations
  where id = p_reservation and client_id = v_uid and statut = 'en_attente';
  if v_creneau is null then
    raise exception 'réservation introuvable ou déjà traitée';
  end if;

  update public.reservations set statut = 'confirmee' where id = p_reservation;
  update public.creneaux set statut = 'confirme' where id = v_creneau;
end;
$$;

-- Annulation côté client (>= 2h avant) ou admin.
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

  if v_client is null then
    raise exception 'réservation introuvable';
  end if;

  -- soit admin, soit le propriétaire à >= 2h du RDV
  if not public.is_admin() then
    if v_client <> v_uid then
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

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
alter table public.clients enable row level security;
alter table public.prestations enable row level security;
alter table public.creneaux enable row level security;
alter table public.reservations enable row level security;
alter table public.avis enable row level security;

-- clients : chacun voit/modifie sa ligne ; admin voit tout.
drop policy if exists clients_self_select on public.clients;
create policy clients_self_select on public.clients
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists clients_self_update on public.clients;
create policy clients_self_update on public.clients
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Protection de la colonne `role` : un non-admin ne peut pas changer son rôle
-- (la policy ci-dessus autorise l'update du profil ; ce trigger fige le rôle).
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

drop policy if exists clients_self_insert on public.clients;
create policy clients_self_insert on public.clients
  for insert with check (id = auth.uid());

-- prestations : lecture publique ; écriture admin.
drop policy if exists prestations_read on public.prestations;
create policy prestations_read on public.prestations for select using (true);
drop policy if exists prestations_admin on public.prestations;
create policy prestations_admin on public.prestations
  for all using (public.is_admin()) with check (public.is_admin());

-- creneaux : lecture publique (pour afficher les dispos) ; écriture admin.
-- (les clients ne modifient JAMAIS en direct : ça passe par les RPC.)
drop policy if exists creneaux_read on public.creneaux;
create policy creneaux_read on public.creneaux for select using (true);
drop policy if exists creneaux_admin on public.creneaux;
create policy creneaux_admin on public.creneaux
  for all using (public.is_admin()) with check (public.is_admin());

-- reservations : le client voit les siennes ; admin voit tout.
drop policy if exists reservations_own on public.reservations;
create policy reservations_own on public.reservations
  for select using (client_id = auth.uid() or public.is_admin());
drop policy if exists reservations_admin on public.reservations;
create policy reservations_admin on public.reservations
  for all using (public.is_admin()) with check (public.is_admin());

-- avis : lecture publique des avis visibles ; le client voit/insère les siens ;
-- admin gère tout (dont masquage).
drop policy if exists avis_public on public.avis;
create policy avis_public on public.avis
  for select using (visible = true or client_id = auth.uid() or public.is_admin());
drop policy if exists avis_insert on public.avis;
create policy avis_insert on public.avis
  for insert with check (client_id = auth.uid());
drop policy if exists avis_admin on public.avis;
create policy avis_admin on public.avis
  for all using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- SEED — prestation unique « Coupe »
-- ════════════════════════════════════════════════════════════
insert into public.prestations (nom, duree_minutes, prix)
select 'Coupe', 30, 10
where not exists (select 1 from public.prestations);
