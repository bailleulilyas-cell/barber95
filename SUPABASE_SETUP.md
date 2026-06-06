# Setup Supabase — BARBER95 (Phase 2)

Tant que `.env` n'est pas rempli, le site tourne en **mode démo** (données mockées,
aucune authentification). Suis ces étapes pour activer le vrai backend.

## 1. Créer le projet Supabase
1. Va sur https://supabase.com → **New project** (région Europe, ex. *eu-west-3 / Paris*).
2. Note le mot de passe de la base (tu pourras le retrouver plus tard).

## 2. Récupérer les clés
**Project Settings → API** :
- `Project URL` → `VITE_SUPABASE_URL`
- `anon` `public` key → `VITE_SUPABASE_ANON_KEY`

Crée un fichier `.env` à la racine (copie `.env.example`) :
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Puis relance `npm run dev`.

## 3. Exécuter la migration
Dans le dashboard → **SQL Editor** → colle le contenu de
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**.

Ça crée les 5 tables, les RLS, les fonctions de réservation atomiques, le trigger de
fidélité, et insère la prestation « Coupe » à 10 €.

> Note technique : les valeurs d'enum sont sans accent (`reserve_temporaire`, `confirme`,
> `terminee`, `annulee`) — équivalent fonctionnel des statuts du brief.

## 4. Activer Google OAuth
1. **Google Cloud Console** → crée un projet → *APIs & Services → Credentials* →
   **OAuth client ID** (type *Web application*).
2. *Authorized redirect URI* :
   `https://xxxx.supabase.co/auth/v1/callback` (ton URL Supabase).
3. Copie le **Client ID** et le **Client secret**.
4. Dans Supabase → **Authentication → Providers → Google** → colle les deux → *Enable*.
5. **Authentication → URL Configuration** → ajoute tes URLs de redirection :
   `http://localhost:5173` (dev) et l'URL Vercel (prod).

## 5. Se désigner admin (Adam)
1. Connecte-toi une première fois sur le site avec le compte Google d'Adam
   (ça crée automatiquement sa ligne dans `clients`).
2. Dans Supabase → **SQL Editor** :
   ```sql
   update public.clients set role = 'admin'
   where email = 'EMAIL_DE_ADAM@gmail.com';
   ```
3. `/admin` est alors accessible uniquement par ce compte (vérifié par RLS).

## Ce qui marche après ces étapes
- Connexion Google + création auto du profil.
- Redirection « Complète ton profil » à la première connexion ; réservation bloquée tant
  que prénom + tél ne sont pas remplis.
- `/admin` protégé par le rôle `admin`.
- Lecture publique des prestations / créneaux / avis visibles (RLS).

## Pas encore branché (Phase 3+)
- Affichage des vrais créneaux + réservation via les RPC `reserver_creneau` /
  `confirmer_reservation` (la page Réserver utilise encore des créneaux mockés).
- Crons (libération des verrous, rappel 30 min), emails Resend, galerie Cloudinary, PWA.
