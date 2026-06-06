-- ════════════════════════════════════════════════════════════
-- Libération automatique des créneaux « reservé_temporaire » non confirmés
-- depuis plus de 10 min, et de leur réservation en_attente.
-- Planifié toutes les 5 min via pg_cron.
-- ════════════════════════════════════════════════════════════

create or replace function public.liberer_creneaux_expires()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- réservations en attente liées à un verrou de + de 10 min → annulées
  update public.reservations r
  set statut = 'annulee'
  from public.creneaux c
  where r.creneau_id = c.id
    and r.statut = 'en_attente'
    and c.statut = 'reserve_temporaire'
    and c.locked_at < now() - interval '10 minutes';

  -- créneaux verrouillés depuis + de 10 min → rouverts
  update public.creneaux
  set statut = 'ouvert', reservation_id = null, locked_at = null
  where statut = 'reserve_temporaire'
    and locked_at < now() - interval '10 minutes';
end;
$$;

-- ── Planification pg_cron ──
-- (l'extension pg_cron doit être activée : Dashboard → Database → Extensions,
--  ou la ligne ci-dessous.)
create extension if not exists pg_cron;

-- évite les doublons si on rejoue la migration
select cron.unschedule('liberer-creneaux')
where exists (select 1 from cron.job where jobname = 'liberer-creneaux');

select cron.schedule(
  'liberer-creneaux',
  '*/5 * * * *',
  $$ select public.liberer_creneaux_expires(); $$
);
