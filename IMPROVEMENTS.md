# Improvements - CRM-interne-contacts

Date: 2026-06-15

## 1. Objectif du document

Ce document liste les ameliorations techniques a traiter avant de transformer le prototype actuel en outil interne de prospection B2B robuste.

Les elements sont classes en:

- quick wins;
- ameliorations moyen terme;
- ameliorations long terme.

## 2. Quick wins

### Routage et deploiement

- Conserver le redirect racine dans `app/page.tsx` via `redirect('/artisans')`.
- Verifier les settings Vercel:
  - root directory a la racine du repo;
  - framework Next.js;
  - build command `npm run build`;
  - pas d'output directory force vers `docs` ou `out`.
- Renommer `package.json` de `crm-temp` vers `crm-interne-contacts`.
- Mettre a jour le README avec les vraies commandes, variables d'environnement et routes.

### Securite

- Ajouter une protection d'authentification sur `/artisans`.
- Afficher un message clair si `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` manque.
- Eviter les assertions non-null `process.env.X!` dans les helpers Supabase.
- Documenter les politiques RLS et leur perimetre.
- Ne pas exposer de donnees enrichies avant auth.

### Qualite des donnees

- Aligner le schema Drizzle avec la migration Supabase:
  - `id` doit etre `uuid`, pas `text`;
  - le default doit utiliser l'API Drizzle adaptee, pas une string simple.
- Ajouter une contrainte de format SIRET/SIREN cote import.
- Normaliser les telephones, emails et URLs.
- Clarifier si le MVP cible `65` uniquement ou `64,65`.

### Code

- Extraire les libelles de statuts dupliques entre `artisans-table.tsx` et `artisan-drawer.tsx`.
- Remplacer les `alert()` / `confirm()` par des composants UI.
- Ajouter un etat d'erreur visible quand la collecte demo echoue.
- Ajouter un bouton ou une navigation claire vers `/login`.
- Supprimer ou archiver `docs/index.html` si le prototype statique n'est plus utilise.

### Verification

- Ajouter un script `npm run typecheck`.
- Ajouter un script `npm run lint` si la configuration lint est retenue.
- Ajouter un test minimal de smoke routing:
  - `/` redirige;
  - `/artisans` repond;
  - `/login` repond.

## 3. Ameliorations moyen terme

### Architecture applicative

- Introduire une structure par domaine:

```text
features/
├── contacts/
├── imports/
├── campaigns/
├── pipeline/
├── tasks/
└── auth/
```

- Separer clairement:
  - composants UI purs;
  - composants metier;
  - acces donnees;
  - services d'import;
  - fonctions de scoring.

### Authentification et autorisations

- Ajouter un middleware ou un layout protege pour les routes internes.
- Creer des roles:
  - admin;
  - charge de developpement;
  - lecture seule.
- Auditer les actions sensibles:
  - import;
  - export CSV;
  - suppression;
  - envoi campagne;
  - modification opt-out.

### Base de donnees

Tables recommandees:

- `contacts` ou `artisans`;
- `contact_sources`;
- `import_batches`;
- `interactions`;
- `tasks`;
- `pipeline_events`;
- `campaigns`;
- `campaign_recipients`;
- `message_templates`;
- `email_events`;
- `sms_events`;
- `opt_outs`;
- `audit_logs`.

Indexes prioritaires:

- `siret unique`;
- `siren`;
- `departement`;
- `categorie_metier`;
- `statut`;
- `score_quality`;
- `score_priority`;
- `date_dernier_contact`;
- index full-text sur entreprise, dirigeant, ville, activite.

### Import et deduplication

- Creer un modele `import_batches` pour tracer chaque import.
- Implementer une file de validation pour les doublons ambigus.
- Definir une strategie de fusion:
  - SIRET identique: upsert automatique;
  - SIREN identique + etablissement different: lier mais ne pas fusionner;
  - email/telephone identique: suspicion;
  - nom + ville proche: revue manuelle.

### Collecte

- Sortir la collecte exhaustive de `/api/collecte` vers un job:
  - GitHub Actions;
  - Vercel Cron;
  - Supabase Edge Function;
  - worker externe.
- Gerer:
  - rate limit;
  - retry;
  - reprise sur erreur;
  - logs d'import;
  - metriques.

### Performance

- Remplacer le chargement demo multi-pages au rendu serveur par une source controlee ou un cache.
- Passer la table en pagination serveur lorsque la base grossit.
- Ajouter debouncing sur la recherche globale.
- Eviter de charger tous les contacts cote client a terme.

## 4. Ameliorations long terme

### CRM avance

- Pipeline drag & drop avec historique de changement de statut.
- Taches recurrentes et rappels.
- Vue agenda des relances.
- Attribution de prospects par utilisateur.
- Objectifs commerciaux.
- Tableaux de bord par territoire et metier.

### Campagnes email

- Moteur de templates avec variables.
- Previsualisation avant envoi.
- Segments sauvegardes.
- Envois planifies.
- Tracking ouvertures/clics via fournisseur.
- Gestion bounce, unsubscribed, complained.
- Respect strict opt-out.

### SMS

- Fournisseur interchangeable.
- Gestion STOP.
- Quotas et couts.
- Historique par contact.
- Limites d'envoi pour eviter les abus.

### IA

- Assistant de redaction controle par l'utilisateur.
- Resume automatique des interactions.
- Recommandations de priorisation.
- Detection de contacts a enrichir.
- Scoring intelligent explique.
- Evaluation et journalisation des suggestions IA.

### Observabilite

- Logs structures.
- Monitoring erreurs frontend/backend.
- Alerting sur echec import.
- Dashboard qualite donnees.
- Audit trail des actions utilisateurs.

## 5. Dette technique identifiee

### Dette actuelle

- `README.md` est encore celui de create-next-app.
- `package.json` porte le nom `crm-temp`.
- Le prototype statique `docs/index.html` coexiste avec l'app Next.
- Les statuts et libelles metier sont partiellement dupliques.
- Les erreurs d'API demo sont silencieuses.
- La collecte longue est exposee via une route HTTP.
- Les champs CRM futurs ne sont pas encore modelises hors table principale.
- Les secrets Supabase ne sont pas valides proprement.

### Dette potentielle

- Si tous les modules futurs sont ajoutes dans la table `artisans`, le schema deviendra difficile a maintenir.
- Si l'enrichissement n'est pas source et horodate, la confiance dans les donnees chutera.
- Si l'emailing est implemente directement contre un fournisseur, le changement de provider deviendra couteux.
- Si le scoring n'est pas explique, les utilisateurs ne lui feront pas confiance.

## 6. Composants inutilises ou ambigus

- `docs/index.html`: prototype statique historique. A conserver uniquement comme archive produit, sinon supprimer pour eviter toute confusion de deploiement.
- `@neondatabase/serverless`: dependance presente mais aucune integration lue dans le code audite.
- `postgres`: dependance presente mais non utilisee directement dans les fichiers lus.
- `drizzle-orm`: schema present, mais l'application utilise surtout Supabase client aujourd'hui.
- `drizzle-kit`: present pour migrations, mais aucune commande npm de migration n'est exposee.

## 7. Duplication de code

Duplications a reduire:

- `STATUT_LABELS` dans table et drawer.
- mapping statut -> couleur uniquement local a la table.
- interfaces API `ApiEntreprise` et `ApiResponse` dupliquees entre `fetch-demo.ts` et `fetch-artisans.ts`.
- mapping API Etat -> artisan duplique partiellement.

Proposition:

```text
lib/
├── constants/
│   ├── statuses.ts
│   └── business-categories.ts
├── data-sources/
│   └── recherche-entreprises/
│       ├── types.ts
│       ├── mapper.ts
│       └── client.ts
└── scoring/
    └── contact-quality.ts
```

## 8. Risques de performance

- TanStack Table cote client fonctionne pour un volume limite; prevoir pagination serveur au-dela de quelques milliers de lignes.
- L'export CSV cote navigateur peut devenir lent sur gros volumes.
- La route `/artisans` appelle l'API externe en rendu serveur; il faut eviter qu'une indisponibilite externe degrade l'usage quotidien.
- La collecte exhaustive peut atteindre plusieurs milliers de requetes et doit etre traitee hors cycle request/response.

## 9. Risques RGPD / CNIL

- Les artisans en entreprise individuelle peuvent etre proches de donnees personnelles.
- L'outil doit conserver:
  - source de chaque donnee;
  - date de collecte;
  - opt-out;
  - historique des envois;
  - base legale de prospection B2B;
  - mecanisme de purge ou archivage apres inactivite prolongee.
- Les campagnes email et SMS ne doivent pas etre lancees avant la mise en place d'une liste d'exclusion fiable.

## 10. Plan d'action technique recommande

1. Stabiliser routage, auth et environnement.
2. Aligner base et ORM.
3. Ajouter tests de smoke et scripts qualite.
4. Refondre le modele autour contacts/imports/interactions/tasks.
5. Implementer import CSV/XLSX et deduplication.
6. Ajouter scoring qualite.
7. Construire dashboard et pipeline.
8. Ajouter emailing avec opt-out.
9. Ajouter SMS.
10. Ajouter IA avec validation humaine.
