-- ════════════════════════════════════════════════════════════
-- Suivi des rappels 30 min : évite de renvoyer le même rappel.
-- ════════════════════════════════════════════════════════════
alter table public.reservations
  add column if not exists rappel_envoye boolean not null default false;
