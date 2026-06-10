# BARBER95 — Guide Claude Code

Site officiel de **BARBER95**, coiffeur barbier (Adam) dans le Val-d'Oise (95).
PWA React déployée sur Vercel, backend Supabase, emails Resend, médias Cloudinary.

## Commandes

```bash
npm run dev       # serveur de dev Vite
npm run build     # build de production (vérifie que tout compile)
npm run preview   # sert le build
npm test          # tests unitaires (vitest, helpers purs dans src/lib)
```

## Stack & architecture

- **React 18 + Vite** (JavaScript, pas de TypeScript côté front), **react-router-dom v6**.
- **CSS Modules** : chaque composant/page a son `X.module.css` à côté. Variables de
  design dans `src/index.css` (`--bg`, `--surface`, `--gold`, `--r`, `--shadow`…).
  DA « Elite Cuts » : fond #111, surfaces #1a1a1a, or #c9a84c, Inter uniquement,
  coins arrondis + ombres douces. Les anciens alias (`--kaki`, `--noir`…) pointent
  vers la nouvelle palette.
- **Supabase** : auth Google OAuth uniquement, Postgres + RLS, RPC `security definer`
  pour toute écriture sensible (réservation atomique, annulation, parrainage),
  Realtime sur `creneaux`/`reservations`/`avis`. Projet ref `gzohgrntluuucloiytme`.
- **Edge Functions** (Deno, TypeScript) dans `supabase/functions/` :
  `notify` (emails transactionnels), `rappels` (cron 5 min), `relance` (cron hebdo).
  Helpers partagés dans `_shared/email.ts` (gabarit HTML aux couleurs BARBER95).
- **Resend** pour les emails (canal principal — pas de push web). **Cloudinary**
  pour la galerie. **PWA** : `public/manifest.webmanifest` + `public/sw.js`.

### Organisation du code

```
src/
  config.js            # valeurs business par défaut (SITE, PRESTATIONS, FIDELITE)
  lib/
    supabase.js        # client + flag `configured` (false = mode démo)
    api.js             # TOUTE la couche d'accès Supabase (une fonction par besoin)
    stats.js, tarif.js # helpers purs testés (calculs dashboard, prix ami)
    referral.js        # code parrainage / source en localStorage
  context/             # AuthContext (session+profil clients), ToastContext, ContentContext
  components/          # composants réutilisables (Nav, Skeleton, MagneticButton…)
  pages/<Page>/        # une page = un dossier (JSX + module.css)
supabase/
  migrations/          # SQL numéroté 0001…, à exécuter dans l'ordre (SQL Editor)
  functions/           # Edge Functions Deno
```

## Conventions (importantes)

- **Tout le domaine est en français** : noms de fonctions (`reserverCreneau`,
  `marquerTerminee`), colonnes (`prenom`, `points_fidelite`), enums **sans accent**
  (`confirmee`, `terminee`, `reserve_temporaire`), commentaires, UI.
- La table des utilisateurs s'appelle **`clients`** (pas `profiles`). 1 ligne par
  user auth, créée par le trigger `handle_new_user`. Admin = `role = 'admin'`.
- **Mode démo** : si `.env` absent, `configured === false` → les pages affichent les
  mocks de `src/data/mock.js` et un bandeau « mode démo ». Toute nouvelle page doit
  gérer ce cas (ne jamais appeler `api.js` si `!configured`).
- **`src/lib/api.js`** est la seule porte vers Supabase côté front. Les écritures
  sensibles passent par des RPC (jamais d'update direct sur les tables verrouillées
  par RLS). Les emails partent via `notifier(type, resaId)` — best-effort, jamais
  bloquant.
- **RLS** : lecture publique pour creneaux/prestations/avis visibles ; le client ne
  voit que ses lignes ; `public.is_admin()` (security definer) pour l'admin.
- UI : skeletons (`components/Skeleton`) pendant les fetchs, toasts via `useToast()`,
  boutons `MagneticButton`, icônes SVG dans `components/Icons.jsx`, dates formatées
  `toLocaleDateString('fr-FR', …)`.
- Une seule prestation (« Coupe », 30 min) ; pas de choix de barbier (Adam seul).
- Fidélité : **+1 point uniquement au passage `terminee`** (trigger SQL `bump_fidelite`).
- Tarif ami : `clients.is_friend` + `prestations.prix_ami` — voir `src/lib/tarif.js`
  (`prixPour(profile, prestation)`) ; le client ne doit pas savoir qu'il a un tarif ami.

## Règles client (Ilyas — à respecter absolument)

- **Signaler les problèmes/incohérences avant de coder.**
- **Ne prendre aucune décision visuelle seul** — suivre la DA existante ; pour tout
  nouveau parti pris visuel, le signaler dans le récap.
- Google OAuth refuse les IP locales → test mobile uniquement via l'URL Vercel.

## Déploiement

Voir `DEPLOIEMENT.md` (à maintenir à jour : chaque nouvelle migration ou Edge
Function doit y être ajoutée). Secrets Edge Functions : `RESEND_API_KEY`,
`EMAIL_FROM`, `ADMIN_EMAIL`, `SITE_URL`. Env front : `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_CLOUDINARY_*`. Les migrations se lancent à la main
dans le SQL Editor Supabase — toujours les écrire idempotentes
(`if not exists`, `drop policy if exists`…).
