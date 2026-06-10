# Déployer les Edge Functions depuis le dashboard (sans rien installer)

Tout se fait sur **supabase.com/dashboard** → ton projet `gzohgrntluuucloiytme`.
Aucun outil à installer. ~10 minutes.

---

## Étape 1 — Lancer les migrations SQL (3 fichiers, dans l'ordre)

Menu de gauche → **SQL Editor** → **New query**. Pour chaque fichier : ouvre-le,
copie tout, colle, clique **Run**. Dans l'ordre :

1. `supabase/migrations/0009_features.sql`  ← **indispensable** (dashboard, fiches
   clients, tarif ami, parrainage, relance, lien partageable)
2. `supabase/migrations/0010_security_hardening.sql`  ← corrige les warnings sécurité
3. `supabase/migrations/0011_cron_relance.sql`  ← programme la relance auto (lundi 9h)

> Le cron (0011) appellera `relance` ; tant que la fonction n'est pas déployée
> (étape 2) il reçoit une erreur 404 sans conséquence. Une fois déployée, ça marche.

---

## Étape 2 — Déployer les 2 Edge Functions

Menu de gauche → **Edge Functions**.

### a) Mettre à jour `notify` (ajoute l'email « Recommande un pote »)
- Si une fonction `notify` existe déjà : ouvre-la → **Edit function** (éditeur de code).
  Sinon → **Deploy a new function** → nomme-la exactement `notify`.
- **Efface tout** le contenu de `index.ts`, puis colle l'intégralité de
  `supabase/dashboard-deploy/notify/index.ts`.
- Clique **Deploy** (ou **Save and deploy**).

### b) Créer `relance` (nouvelle)
- **Deploy a new function** → nom exact : `relance`.
- Colle l'intégralité de `supabase/dashboard-deploy/relance/index.ts`.
- Clique **Deploy**. (Tu peux laisser « Verify JWT » activé : le cron envoie la clé
  publique, ça passe.)

---

## Étape 3 — Vérifier les secrets (emails)

Edge Functions → **Secrets** (ou Project Settings → Edge Functions). Vérifie que
ces 4 clés existent (sinon **Add new secret**) :

| Clé | Exemple |
|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxx` (depuis resend.com → API Keys) |
| `EMAIL_FROM` | `BARBER95 <rdv@tondomaine.fr>` (ou `onboarding@resend.dev` pour tester) |
| `ADMIN_EMAIL` | `bailleulilyas@gmail.com` |
| `SITE_URL` | `https://barber95.vercel.app` |

> `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement —
> tu n'as PAS à les ajouter.
>
> Sans `RESEND_API_KEY`, les fonctions tournent mais n'envoient aucun email
> (elles l'ignorent proprement, rien ne plante).

---

## Étape 4 — Tester (optionnel)

- **Relance** : Edge Functions → `relance` → onglet **Invoke**/**Test** → **Run**.
  Réponse attendue : `{ "ok": true, "envoyes": N, "semaines": 3 }`.
- **Cron** : SQL Editor → `select jobname, schedule, active from cron.job;` →
  tu dois voir `relance-hebdo` actif.

✅ Terminé : relance hebdo automatique + email « Recommande un pote » après chaque
coupe terminée.
