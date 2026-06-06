-- ════════════════════════════════════════════════════════════
-- Galerie : médias (photos/vidéos) hébergés sur Cloudinary.
-- On ne stocke que les URLs/ids ; les fichiers vivent sur Cloudinary.
-- ════════════════════════════════════════════════════════════
create table if not exists public.galerie (
  id uuid primary key default gen_random_uuid(),
  public_id text,            -- id Cloudinary (pour suppression éventuelle)
  url text not null,         -- URL sécurisée du média
  type text not null default 'image', -- 'image' | 'video'
  legende text,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.galerie enable row level security;

-- lecture publique
drop policy if exists galerie_read on public.galerie;
create policy galerie_read on public.galerie for select using (true);

-- écriture réservée à l'admin
drop policy if exists galerie_admin on public.galerie;
create policy galerie_admin on public.galerie
  for all using (public.is_admin()) with check (public.is_admin());
