# CLAUDE.md — CRM Prospection Artisans · CAPEB Adour Pyrénées

> Fichier de contexte projet. Claude Code doit le lire et le respecter à chaque session.
> Mets-le à jour au fur et à mesure que le projet avance (section « Journal » en bas).

---

## 1. Le projet en une phrase

Outil **interne** à la **CAPEB Adour Pyrénées** qui va chercher automatiquement **tous les artisans du bâtiment des départements 65 (Hautes-Pyrénées) et 64 (Pyrénées-Atlantiques)**, les classe proprement dans une base unique, et permettra ensuite de leur adresser nos services (plaquettes, campagnes). L'outil doit être **moderne, rapide et très simple à utiliser**.

## 2. Objectif

1. Constituer et tenir à jour un annuaire fiable et bien rangé des artisans du bâtiment du 64 et du 65.
2. Permettre une recherche / un tri / un filtrage instantanés et lisibles.
3. **Aller chercher de nouveaux contacts chaque mois automatiquement** (les nouvelles immatriculations) sans intervention manuelle.
4. Servir de base à de futures actions : envoi de plaquettes de services, campagnes email/SMS, suivi des adhérents vs prospects.

## 3. Utilisateurs

Équipe interne CAPEB (chargé·e de développement en premier). Quelques utilisateurs, authentifiés. Pas de compte public.

## 4. Stack technique (imposée — moderne, simple à déployer)

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (UI moderne, épurée, accessible)
- **TanStack Table** pour la grille de données (tri, filtres à facettes, pagination, colonnes masquables)
- **Supabase** : base **PostgreSQL** + **Auth** (utilisateurs internes) + **Storage** (futures plaquettes PDF)
- **Drizzle ORM** (ou Prisma si plus simple) pour le schéma et les migrations
- **Déploiement : Vercel** (l'app) + **Supabase** (la base) + **GitHub Actions** (le cron mensuel de collecte)
- Tout doit tourner sur les offres gratuites au démarrage.

> Le dépôt git existe déjà. Travailler en branches + commits clairs.

## 5. Modèle de données

Table principale `artisans`. **Clé d'unicité = `siret`** (dédoublonnage et upsert toujours par SIRET).

| Champ | Type | Source |
|---|---|---|
| `nom_entreprise` | text | API État |
| `siret` | text **unique** | API État |
| `siren` | text | API État |
| `activite` | text (libellé NAF) | API État |
| `code_naf` | text | API État |
| `categorie_metier` | text (regroupement métier, voir §7) | calculé depuis le NAF |
| `adresse` | text | API État |
| `code_postal` | text | API État |
| `ville` | text | API État |
| `departement` | text ('64' / '65') | API État |
| `telephone` | text | enrichissement |
| `email` | text | enrichissement |
| `site_internet` | text | enrichissement |
| `reseaux_sociaux` | jsonb (facebook, instagram, linkedin) | enrichissement |
| `nombre_salaries` | text (tranche d'effectif) | API État |
| `chiffre_affaires` | numeric (nullable, « si disponible ») | API État (champ `finances`) ou Pappers |
| `date_creation` | date | API État |
| `rge` | boolean | API État (`complements.est_rge`) |
| `source_donnees` | text | renseigné par le pipeline |
| `date_mise_a_jour` | timestamp | renseigné par le pipeline |

**Champs CRM additionnels** (gestion interne) :
`statut` (nouveau, a_contacter, contacte, relance, rdv, adherent, prospect_perdu, opt_out), `est_adherent` (bool), `tags` (text[]), `notes` (text), `score` (int), `date_dernier_contact` (timestamp), `cree_le` (timestamp), `nouveau_ce_mois` (bool, posé par la collecte mensuelle).

Tables annexes : `utilisateurs` (via Supabase Auth), `interactions` (historique par artisan), `campagnes` (plus tard), `liste_opt_out` (désinscrits, exclus de tout envoi).

## 6. Source de données (officielle, gratuite, sans clé)

**API Recherche d'Entreprises** : `https://recherche-entreprises.api.gouv.fr/search`
- Filtrer 64 **et** 65 : `?departement=64,65&section_activite_principale=F&etat_administratif=A`
- Limite 7 req/s, `per_page=25` max, pagination via `page`.
- Fournit : nom, SIRET, SIREN, NAF, adresse, CP, ville, dirigeants, tranche d'effectif, date de création, indicateur RGE, et `finances` (chiffre d'affaires **si la société a déposé ses comptes** — souvent absent pour les EI/micro).
- **Ne fournit PAS** : téléphone, email, site, réseaux sociaux → étape d'enrichissement.

Un script Python de référence existe déjà (`collecte_artisans_65.py`) : le porter en TypeScript (route + cron) ou le réutiliser tel quel dans le GitHub Action, au choix le plus propre.

## 7. Catégories métier (regroupement lisible depuis le NAF)

Maçonnerie / gros œuvre (43.99C, 41.20A/B) · Couverture / charpente (43.91A/B) · Plomberie / chauffage (43.22A/B) · Électricité (43.21A/B) · Menuiserie (43.32A/B/C) · Plâtrerie / isolation (43.31Z, 43.29A) · Peinture / finition (43.34Z, 43.33Z, 43.39Z) · Terrassement / VRD (43.12A/B) · Étanchéité / métallerie (43.99A/B) · Démolition / autres (43.11Z, 43.99D/E).

## 8. Enrichissement des coordonnées (Phase 2)

L'API officielle ne donne pas de contact. Pipeline d'enrichissement, dans l'ordre :
1. **Google Places API** (clé en `.env`) : nom + ville → téléphone + site internet.
2. **Scraping du site** trouvé → email + liens réseaux sociaux (page contact / footer). À faire avec mesure.
3. **Pappers API** (optionnel, payant) : compléments financiers / dirigeants.
Toujours horodater (`date_mise_a_jour`) et tracer (`source_donnees`).

## 9. Automatisation mensuelle

GitHub Action planifiée (cron `0 6 1 * *`, le 1er de chaque mois) qui :
1. relance la collecte 64+65,
2. **upsert par SIRET** (met à jour l'existant, insère les nouveaux),
3. marque les vrais nouveaux avec `nouveau_ce_mois = true` (les autres repassent à false),
4. relance l'enrichissement sur les nouveaux,
5. écrit dans Supabase.
Une vue « Nouveautés du mois » dans l'app liste les `nouveau_ce_mois`.

## 10. Contraintes légales (CNIL / RGPD — à respecter dès la conception)

Prospection **B2B** : régime **opt-out**. Donc l'outil doit, dès qu'on enverra des messages :
- identifier clairement l'expéditeur (CAPEB Adour Pyrénées) ;
- inclure un **lien/moyen de désinscription** dans chaque message ;
- tenir une **liste d'opt-out** exclue de tout envoi ;
- **purger ou archiver les contacts inactifs au bout de 3 ans** sans contact ;
- email d'abord ; le SMS est plus encadré, à réserver aux relances.
Données strictement à usage interne CAPEB. Beaucoup d'artisans sont en entreprise individuelle → prudence (frontière B2B/B2C).

## 11. Fonctionnalités par phase

**Phase 1 — Socle (à faire en premier)**
- Scaffold Next.js + Supabase + Auth (login interne).
- Schéma `artisans` complet + migrations.
- Collecte 64+65 depuis l'API État → remplissage de la base (avec `source_donnees`, `date_mise_a_jour`, `categorie_metier` calculée).
- Grille TanStack Table moderne : recherche globale, tri par colonne, filtres à facettes (département, catégorie métier, ville, RGE, statut), colonnes masquables, pagination.
- Panneau de détail (fiche artisan) en drawer.
- Export CSV.
- Déploiement sur Vercel.

**Phase 2 — Enrichissement + auto-collecte mensuelle** (§8 et §9).

**Phase 3 — Diffusion** : envoi de plaquettes/services par email (Brevo ou Resend), templates, lien de désinscription, stockage des PDF dans Supabase Storage. SMS ensuite.

**Phase 4 — Pilotage** : scoring de prospect, tableaux de bord (adhérents vs prospects, couverture par métier/ville), séquences automatiques.

## 12. Manière de travailler (consignes à Claude Code)

- **Avant de coder la Phase 1 : propose-moi un plan court + l'arborescence du projet, puis attends ma validation.**
- Ne fais **que la Phase 1** pour l'instant. On ouvrira les phases suivantes une par une.
- Code en français pour les libellés UI, en anglais pour le code.
- Mets les secrets (clés Supabase, Google) dans `.env.local`, jamais en dur, et explique-moi où les récupérer.
- Commits petits et explicites. Mets à jour le « Journal » ci-dessous à chaque étape.
- UI : sobre, dense, lisible, pro — pas de gadget. Pense « cockpit de prospection ».

## Journal (tenu par Claude Code)

- 2026-06-09 : Initialisation du dépôt — CLAUDE.md ajouté, remote GitHub configuré.
- 2026-06-09 : Étape 1 — Scaffold Next.js 15 + TypeScript + Tailwind + App Router installé.
- 2026-06-17 : Phase 2 enrichissement — module `lib/enrichissement/` complet.
  - Cascade en 7 étapes (Google Maps → Site web → Pages Jaunes → AlloVoisins → Annuaires → Societe.com → Leboncoin).
  - `scripts/enrichir-contacts.ts` : CLI avec reprise d'état, export CSV progressif, batch Supabase.
  - `app/api/enrichissement/route.ts` : enrichissement à la demande d'une fiche depuis l'UI.
  - Migration `002_enrichissement.sql` : 3 nouveaux champs (`source_contact`, `niveau_confiance`, `enrichi_le`).
  - Dépendances ajoutées : `cheerio`, `tsx`, `dotenv`.
  - Règles Leboncoin respectées (1 tentative max, abandon immédiat si bloqué, seuil 3 blocages).
