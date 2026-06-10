-- ════════════════════════════════════════════════════════════
-- 0010 — Durcissement sécurité (warnings du database linter Supabase)
--
-- 1) search_path figé (lint 0011_function_search_path_mutable)
-- 2) EXECUTE révoqué aux rôles anon/authenticated sur les fonctions
--    INTERNES & TRIGGERS, qui ne doivent pas être appelables via l'API
--    REST (lints 0028/0029).
-- 3) Les RPC métier ne gardent que `authenticated` (on retire `anon`).
--
-- ⚠️ `is_admin()` est LAISSÉE exécutable volontairement : les policies RLS
--    de lecture publique (creneaux/avis/prestations) l'appellent pour anon
--    ET authenticated ; la révoquer casserait la sécurité au niveau ligne.
--    Les 2 warnings restants sur `is_admin` sont donc attendus.
--
-- Idempotent : peut être relancé sans risque.
-- À coller dans le SQL Editor Supabase → Run (comme les migrations 0001→0009).
-- ════════════════════════════════════════════════════════════

-- ── 1) search_path figé ──
alter function public.bump_fidelite() set search_path = public;
alter function public.gen_ref_code() set search_path = public;

-- ── 2) fonctions internes / triggers : jamais appelées directement ──
-- (un trigger se déclenche sans dépendre du droit EXECUTE du rôle ;
--  les fonctions appelées par une fonction SECURITY DEFINER ou par pg_cron
--  s'exécutent avec les droits du propriétaire → rien ne casse.)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.bump_fidelite() from public, anon, authenticated;
revoke execute on function public.protect_client_role() from public, anon, authenticated;
revoke execute on function public.gen_ref_code() from public, anon, authenticated;
revoke execute on function public.liberer_creneaux_expires() from public, anon, authenticated;

-- ── 3) RPC métier : on retire l'accès anon, on garde authenticated ──
-- (on retire d'abord le grant implicite via PUBLIC, puis on ré-accorde
--  explicitement à authenticated.)
revoke execute on function public.reserver_creneau(uuid, uuid, text) from public, anon;
grant execute on function public.reserver_creneau(uuid, uuid, text) to authenticated;

revoke execute on function public.confirmer_reservation(uuid) from public, anon;
grant execute on function public.confirmer_reservation(uuid) to authenticated;

revoke execute on function public.annuler_reservation(uuid) from public, anon;
grant execute on function public.annuler_reservation(uuid) to authenticated;

revoke execute on function public.appliquer_parrainage(text) from public, anon;
grant execute on function public.appliquer_parrainage(text) to authenticated;
