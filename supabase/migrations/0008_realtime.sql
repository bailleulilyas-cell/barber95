-- ════════════════════════════════════════════════════════════
-- Active Supabase Realtime sur les tables clés : la page Réserver et le
-- dashboard se mettent à jour en direct.
-- ════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.creneaux;
alter publication supabase_realtime add table public.reservations;
alter publication supabase_realtime add table public.avis;
