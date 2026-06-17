# Technical Audit - CRM-interne-contacts

Date: 2026-06-15

## 1. Synthese executive

Le projet est une application Next.js App Router servant aujourd'hui une grille de demonstration pour les artisans du batiment des departements 64 et 65, avec une premiere route d'import vers Supabase.

L'erreur 404 signalee n'a pas ete reproduite en local sur le code audite: le mode developpement et le mode production repondent correctement sur `/`, `/artisans` et `/login`. La cause technique corrigee est toutefois un point fragile de routage: la page racine `app/page.tsx` ne rendait rien et dependait exclusivement d'un redirect global dans `next.config.ts`. La racine `/` est desormais une route App Router explicite qui appelle `redirect('/artisans')`.

Cette correction supprime une source possible de 404 ou de page vide en environnement deploiement lorsque la configuration Next n'est pas appliquee, lorsqu'une ancienne revision est deployee, ou lorsque le projet Vercel pointe vers une sortie statique/root directory incorrecte.

## 2. Architecture actuelle

```text
/
├── app/
│   ├── page.tsx                    # Redirect racine vers /artisans
│   ├── layout.tsx                  # Layout global + police Inter
│   ├── globals.css                 # Tailwind CSS v4 + theme shadcn
│   ├── artisans/
│   │   ├── page.tsx                # Page principale, charge des donnees de demo API Etat
│   │   └── loading.tsx             # Etat de chargement route artisans
│   ├── login/page.tsx              # Formulaire Supabase Auth cote client
│   └── api/
│       ├── collecte/route.ts       # POST collecte + upsert Supabase
│       └── auth/logout/route.ts    # POST logout Supabase
├── components/
│   ├── artisans-table.tsx          # Table TanStack + filtres + export CSV + drawer
│   ├── artisan-drawer.tsx          # Fiche detail artisan
│   └── ui/                         # Composants shadcn/ui
├── lib/
│   ├── collecte/
│   │   ├── categories-naf.ts       # Mapping NAF -> categorie metier
│   │   ├── fetch-artisans.ts       # Collecte exhaustive API Recherche d'Entreprises
│   │   └── fetch-demo.ts           # Collecte courte pour demo UI
│   ├── db/schema.ts                # Schema Drizzle de la table artisans
│   └── supabase/
│       ├── client.ts               # Supabase browser client
│       └── server.ts               # Supabase server client via cookies
├── supabase/migrations/
│   └── 001_artisans.sql            # Migration SQL table artisans + RLS
├── docs/index.html                 # Prototype statique historique
├── next.config.ts                  # Configuration Next
├── package.json                    # Scripts npm et dependances
└── tsconfig.json                   # Alias @/* et configuration TypeScript
```

## 3. Technologies utilisees

- Next.js `16.2.7` avec App Router et Turbopack.
- React `19.2.4`.
- TypeScript `5`.
- Tailwind CSS `4`.
- shadcn/ui + Base UI.
- TanStack Table `8`.
- Supabase Auth / Database via `@supabase/ssr` et `@supabase/supabase-js`.
- Drizzle ORM / Drizzle Kit.
- API publique `https://recherche-entreprises.api.gouv.fr/search`.

Note: le contexte projet mentionne Next.js 15, mais le lockfile installe Next.js 16.2.7. Les futures modifications doivent donc continuer a lire la documentation locale Next presente dans `node_modules/next/dist/docs/`.

## 4. Diagnostic de la 404

### Verifications realisees

Commandes executees:

- `npm ci`
- lecture de la documentation locale Next sur `redirects()` et `redirect()`
- `npm run dev -- --hostname 127.0.0.1 --port 3000`
- tests HTTP sur `/`, `/artisans`, `/login`
- `npm run build`
- `npm run start -- --hostname 127.0.0.1 --port 3001`
- tests HTTP production sur `/`, `/artisans` et une route inconnue

Resultats:

- `/` repondait en `307 Temporary Redirect` vers `/artisans`.
- `/artisans` repondait en `200 OK`.
- `/login` repondait en `200 OK`.
- `/does-not-exist` repondait en `404 Not Found`, comportement normal.
- Le build production passe et liste les routes:
  - `/`
  - `/_not-found`
  - `/api/auth/logout`
  - `/api/collecte`
  - `/artisans`
  - `/login`

### Cause corrigee

La racine etait implementee ainsi:

```ts
// Redirect gere dans next.config.ts - cette page ne sera jamais servie
export default function Home() {
  return null
}
```

Et le redirect `/` -> `/artisans` etait defini dans `next.config.ts`.

Ce design cree deux risques:

1. la route racine n'a aucun comportement utile par elle-meme;
2. le fonctionnement depend d'une couche de configuration globale, plus sensible aux erreurs de deploiement Vercel, aux anciens builds caches, a un root directory incorrect, ou a une sortie statique mal pointee.

La correction consiste a rendre la route racine autonome via l'API App Router:

```ts
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/artisans')
}
```

Le redirect global a ete retire de `next.config.ts` pour garder une seule source de verite.

### Analyse par categorie demandee

- Routing: cause principale corrigee. La racine dependait d'un redirect global; elle redirige maintenant directement depuis `app/page.tsx`.
- Frontend: pas de cause de 404 trouvee. Les composants React s'affichent sur `/artisans`.
- Backend: pas de cause de 404 trouvee. Les routes API existent; `/api/collecte` est une route POST protegee.
- API externe: pas de cause de 404 applicative. Si l'API Etat echoue, `app/artisans/page.tsx` affiche une grille vide.
- Build: pas de cause de 404 trouvee. Le build production passe.
- Vercel: risque residuel si le projet Vercel pointe vers un mauvais root directory, une ancienne revision, ou une sortie statique/prototype `docs`. A verifier dans les settings Vercel si la 404 persiste apres redeploiement.
- Next.js: le projet utilise Next 16.2.7; les APIs de redirect lues dans la documentation locale supportent la correction.
- React Router: non utilise.
- Express: non utilise par l'application. `express` apparait seulement dans l'arbre de dependances transitives.
- Configuration: `next.config.ts` ne porte plus le redirect racine.

## 5. Corrections appliquees

1. `app/page.tsx`
   - ajout de `import { redirect } from 'next/navigation'`;
   - `Home()` appelle `redirect('/artisans')`.

2. `next.config.ts`
   - suppression du redirect global `/` -> `/artisans`;
   - conservation d'une configuration vide typee `NextConfig`.

## 6. Verification apres correction

Etat actuel verifie:

- `npm run build`: succes.
- Le serveur production local demarre avec `next start`.
- La route `/` redirige vers `/artisans`.
- La route `/artisans` repond en `200 OK`.

## 7. Risques techniques identifies

### Risques critiques ou structurants

- Aucun middleware d'authentification ne protege encore `/artisans`; la page charge des donnees demo publiquement.
- Les variables Supabase sont dereferencees avec `!`; les routes ou pages utilisant Supabase peuvent echouer brutalement si `.env.local` est absent ou incomplet.
- Le schema Drizzle declare `id` comme `text` avec `default('gen_random_uuid()')`, tandis que la migration SQL declare `id UUID DEFAULT gen_random_uuid()`. Il y a une divergence ORM/base.
- La collecte exhaustive est declenchee depuis une route HTTP synchrone; elle peut depasser les limites d'execution serverless Vercel.
- L'upsert mensuel remet `nouveau_ce_mois` a `false` sur tous les artisans puis upsert tous les resultats comme nouveaux; la logique ne distingue pas encore les vrais nouveaux des existants.

### Risques securite

- `npm audit` signale 6 vulnerabilites au total:
  - 2 high liees a `esbuild` via `drizzle-kit`;
  - 4 moderate dont `postcss` transitif via Next.
- `npm audit --omit=dev` signale 2 vulnerabilites moderate en production via `postcss` embarque par Next.
- La correction automatique proposee par npm pour Next indique une version incoherente et ne doit pas etre appliquee aveuglement.
- Les politiques RLS Supabase autorisent tout utilisateur authentifie a lire/ecrire tous les artisans. Cela peut convenir en interne au demarrage, mais il faudra des roles metier.

### Risques produit / donnees

- Le produit vise le departement 65, mais plusieurs fichiers ciblent encore 64 et 65.
- Les champs dirigeant, mobile, source fine du contact, historique, taches, campagnes et pipeline ne sont pas modelises.
- Le scoring est present comme champ `score`, mais aucune regle de calcul n'existe.
- Le prototype statique `docs/index.html` peut creer de la confusion avec l'application Next.

## 8. Recommandations immediates

1. Redeployer la branche corrigee sur Vercel.
2. Si la 404 persiste, verifier dans Vercel:
   - Root Directory = racine du depot;
   - Framework Preset = Next.js;
   - Build Command = `npm run build`;
   - Output Directory non forcee vers `docs` ou `out`;
   - derniere revision deployee = commit contenant la correction.
3. Ajouter un guard d'authentification App Router pour proteger `/artisans`.
4. Aligner le schema Drizzle avec la migration SQL.
5. Sortir la collecte exhaustive des routes HTTP interactives vers un job planifie.
