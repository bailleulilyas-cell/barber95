-- ════════════════════════════════════════════════════════════
-- 0011 — Planifie la relance hebdomadaire SANS toucher à l'UI Cron.
--
-- pg_cron appelle l'Edge Function `relance` par HTTP (pg_net) tous les
-- lundis à 9h. La clé ANON sert juste à passer la passerelle Supabase
-- (elle est publique : déjà présente dans le bundle front, aucun secret).
--
-- ⚠️ PRÉ-REQUIS : l'Edge Function `relance` doit être DÉPLOYÉE pour que
--    l'appel aboutisse (sinon le cron tourne mais reçoit un 404 — sans
--    danger). Voir DEPLOIEMENT.md §C2.
--
-- Idempotent. À coller dans le SQL Editor Supabase → Run.
-- ════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- évite un doublon si on rejoue la migration
select cron.unschedule('relance-hebdo')
where exists (select 1 from cron.job where jobname = 'relance-hebdo');

select cron.schedule(
  'relance-hebdo',
  '0 9 * * 1', -- tous les lundis à 9h00
  $$
  select net.http_post(
    url := 'https://gzohgrntluuucloiytme.supabase.co/functions/v1/relance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6b2hncm50bHV1dWNsb2l5dG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTgyMzEsImV4cCI6MjA5NTk5NDIzMX0.ulGpKEhNbyc5alDtc7LLchvonOKyMp9pheolrL5RdOY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Pour vérifier plus tard : select * from cron.job;
-- Pour arrêter : select cron.unschedule('relance-hebdo');
