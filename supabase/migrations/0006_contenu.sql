-- ════════════════════════════════════════════════════════════
-- Contenu éditable du site : Adam modifie les textes en cliquant dessus.
-- Clé -> valeur. Lecture publique, écriture admin uniquement.
-- ════════════════════════════════════════════════════════════
create table if not exists public.site_contenu (
  cle text primary key,
  valeur text,
  updated_at timestamptz not null default now()
);

alter table public.site_contenu enable row level security;

drop policy if exists contenu_read on public.site_contenu;
create policy contenu_read on public.site_contenu for select using (true);

drop policy if exists contenu_admin on public.site_contenu;
create policy contenu_admin on public.site_contenu
  for all using (public.is_admin()) with check (public.is_admin());
