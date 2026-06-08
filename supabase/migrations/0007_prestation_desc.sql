-- ════════════════════════════════════════════════════════════
-- Ajoute la colonne description à la prestation (manquait au schéma initial).
-- ════════════════════════════════════════════════════════════
alter table public.prestations
  add column if not exists description text;

update public.prestations
set description = 'Coupe homme, finitions soignées au millimètre.'
where description is null or description = '';
