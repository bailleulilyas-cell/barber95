# Déploiement & activation — BARBER95

Tout le code est prêt. Ce guide liste, dans l'ordre, ce qu'il reste à faire côté
services externes. Chaque bloc est indépendant : tu peux activer les fonctionnalités
au fur et à mesure.

---

## A. Mettre le site en ligne (indispensable)

### A1. Pousser le code sur GitHub
```bash
git init
git add .
git commit -m "BARBER95"
# crée un repo sur github.com puis :
git remote add origin https://github.com/TON_COMPTE/barber95.git
git branch -M main
git push -u origin main
```
> `.env` n'est pas poussé (protégé par `.gitignore`) — c'est normal.

### A2. Déployer sur Vercel
1. vercel.com → **Add New → Project** → importe le repo GitHub.
2. Framework : **Vite** (détecté automatiquement). Laisse les réglages par défaut.
3. **Environment Variables** → ajoute :
   - `VITE_SUPABASE_URL` = `https://gzohgrntluuucloiytme.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (ta clé anon)
   - *(plus tard)* `VITE_CLOUDINARY_CLOUD_NAME` et `VITE_CLOUDINARY_UPLOAD_PRESET`
4. **Deploy**. Tu obtiens une URL type `https://barber95.vercel.app`.

### A3. Autoriser l'URL de production (sinon Google ne marche pas en ligne)
- **Supabase** → Authentication → URL Configuration :
  - Site URL : `https://barber95.vercel.app`
  - Redirect URLs : ajoute `https://barber95.vercel.app` et `https://barber95.vercel.app/**`
- **Google Cloud Console** → ton client OAuth `barber95` :
  - Origines JavaScript autorisées : ajoute `https://barber95.vercel.app`
  - URI de redirection : (déjà bon — c'est l'URL Supabase, inchangée)

✅ À ce stade : le site est en ligne, la connexion Google marche, la réservation
fonctionne. **Tu peux aussi l'ouvrir sur ton téléphone** via l'URL Vercel.

---

## B. Migrations base de données (à lancer dans le SQL Editor Supabase)

Tu as déjà exécuté `0001` et le patch `0002`. Lance maintenant, dans l'ordre, le
contenu de ces fichiers (copier-coller → Run) :
- `supabase/migrations/0003_rappels.sql`  (colonne de suivi des rappels)
- `supabase/migrations/0004_crons.sql`    (libération auto des créneaux + pg_cron)
- `supabase/migrations/0005_galerie.sql`  (table galerie)
- `supabase/migrations/0006_contenu.sql`  (textes éditables au clic)
- `supabase/migrations/0007_prestation_desc.sql` (description de la prestation)
- `supabase/migrations/0008_realtime.sql` (mises à jour en direct)
- `supabase/migrations/0009_features.sql` (**dashboard Adam, fiches clients,
  tarif ami, parrainage, relance, lien partageable** — indispensable pour les
  nouvelles pages admin)
- `supabase/migrations/0010_security_hardening.sql` (warnings sécurité)
- `supabase/migrations/0011_cron_relance.sql` (cron relance en SQL)
- `supabase/migrations/0012_outil_pro.sql` (**fix RLS update clients admin —
  nécessaire pour le tarif ami & les notes** — + notes client + RDV manuel)

> Si `0004` renvoie une erreur sur `pg_cron` : Dashboard → Database → Extensions →
> active **pg_cron**, puis relance le fichier.

---

## C. Emails (Resend) — confirmations, annulations, rappels, avis

### C1. Compte + domaine
1. resend.com → crée un compte.
2. **Domains** → ajoute ton domaine (ex. `barber95.fr`) et suis les enregistrements
   DNS à coller chez ton registrar. (Sans domaine, Resend n'envoie qu'à ta propre
   adresse — ok pour tester, pas pour de vrais clients.)
3. **API Keys** → crée une clé (commence par `re_...`).

### C2. Déployer les Edge Functions
Installe le CLI Supabase puis :
```bash
supabase login
supabase link --project-ref gzohgrntluuucloiytme
# secrets utilisés par les fonctions email :
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set EMAIL_FROM="BARBER95 <rdv@barber95.fr>"
supabase secrets set ADMIN_EMAIL=bailleulilyas@gmail.com
supabase secrets set SITE_URL=https://barber95.vercel.app
# déploiement :
supabase functions deploy notify
supabase functions deploy rappels --no-verify-jwt
supabase functions deploy relance --no-verify-jwt
```

> Déjà déployé `notify` avant ? **Redéploie-le** : il envoie maintenant aussi
> l'email « Recommande un pote » (lien de parrainage) après chaque coupe terminée.

### C3. Planifier le rappel 30 min
- Dashboard Supabase → **Integrations → Cron** (ou section Cron) → **Create job** :
  - Nom : `rappels`
  - Schedule : `*/5 * * * *` (toutes les 5 min)
  - Type : **Supabase Edge Function** → choisis `rappels`.

### C4. Planifier la relance hebdomadaire des clients inactifs
- **Plus besoin de l'UI Cron** : lance la migration `0011_cron_relance.sql` dans le
  SQL Editor — elle programme le cron (lundi 9h) en SQL via pg_cron + pg_net.
- Pré-requis : `relance` doit être **déployée** (étape C2) pour que l'appel aboutisse.
- Le délai d'inactivité (3 semaines par défaut) se règle directement depuis le
  dashboard d'Adam (`/admin/dashboard`, bloc « Relance automatique »).

✅ Emails actifs : confirmation (client + toi), annulation, rappel 30 min, demande
d'avis + lien de parrainage après « Marquer terminé », relance des inactifs.

---

## C bis. Tarif ami (optionnel)

Le prix réduit « ami » se règle sur `/tarifs` connecté en admin → « Modifier la
prestation » → champ **Prix ami (€)** (vide = personne n'a de réduction). Ensuite,
active le toggle « Tarif ami » sur la fiche d'un client (`/admin/clients`) : il
verra automatiquement le prix réduit, sans aucune mention particulière.

---

## D. Galerie (Cloudinary)

1. cloudinary.com → crée un compte (gratuit). Note ton **Cloud name**.
2. Settings → **Upload** → **Add upload preset** → mode **Unsigned** → enregistre le
   nom du preset.
3. Ajoute dans `.env` (local) **et** dans Vercel (Environment Variables) :
   - `VITE_CLOUDINARY_CLOUD_NAME=ton_cloud_name`
   - `VITE_CLOUDINARY_UPLOAD_PRESET=ton_preset`
4. Redeploy Vercel. → Sur `/galerie`, connecté en admin, le bouton **+ Ajouter**
   uploade photos/vidéos.

---

## E. Finitions

- **Mentions légales / Confidentialité** : remplace les `[à compléter]` dans
  `src/pages/Legal/Legal.jsx` (nom, statut, SIRET, email de contact).
- **Contact footer** : renseigne `instagram` / `tel` dans `src/config.js` (objet
  `SITE.contact`) — le footer s'affiche automatiquement.
- **Prix** : modifiable dans `src/config.js` (et/ou table `prestations` en base).

---

## Récap des secrets / variables

| Où | Clé |
|---|---|
| Vercel + `.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Vercel + `.env` | `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` |
| Supabase secrets | `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`, `SITE_URL` |
