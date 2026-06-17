# Product Roadmap - CRM-interne-contacts

Date: 2026-06-15

## 1. Vision SaaS professionnelle

CRM-interne-contacts doit devenir une plateforme interne de developpement commercial pour identifier, qualifier, enrichir, segmenter et contacter les artisans du batiment du departement 65.

Le produit ne doit pas seulement stocker des contacts. Il doit aider un charge de developpement a repondre chaque jour a cinq questions:

1. Quels artisans sont nouveaux ou prioritaires ?
2. Quels contacts sont suffisamment qualifies pour etre contactes ?
3. Quelle action faut-il faire maintenant ?
4. Quelle campagne est en cours et avec quels resultats ?
5. Quels prospects avancent vers une adhesion, un rendez-vous ou une opportunite ?

Principes produit:

- usage interne, simple, rapide, dense;
- donnees fiables, sourcables et dedoublonnees;
- actions commerciales tracables;
- automatisations progressives mais controlables;
- conformite RGPD/CNIL B2B des le debut;
- architecture compatible email, SMS et IA sans enfermer le produit dans un fournisseur.

## 2. Perimetre cible

### Departement prioritaire

- Cible principale: Hautes-Pyrenees `65`.
- Extension possible: Pyrenees-Atlantiques `64`, deja partiellement presente dans le code.

Decision produit a valider: maintenir une base 64 + 65 ou recentrer immediatement le MVP sur le 65.

### Utilisateurs

- Charge de developpement.
- Direction / pilotage commercial.
- Administrateur interne.

### Donnees principales

Le contact commercial doit etre centre sur l'entreprise artisanale, avec une fiche enrichie et un historique d'interactions.

## 3. MVP - Gestion des contacts

### Champs obligatoires ou prioritaires

- entreprise;
- dirigeant;
- telephone;
- mobile;
- email;
- site web;
- adresse;
- code postal;
- ville;
- departement;
- SIREN;
- SIRET;
- activite;
- nombre d'employes;
- source du contact;
- date d'import.

### Champs systeme recommandes

- identifiant interne;
- statut pipeline;
- score qualite;
- score priorite;
- date de derniere mise a jour;
- date de dernier contact;
- responsable interne;
- opt-out email;
- opt-out SMS;
- consentement / base legale;
- tags;
- notes.

### Sources de contact

- API Recherche d'Entreprises;
- import CSV;
- import XLSX;
- enrichissement manuel;
- enrichissement fournisseur autorise;
- annuaire public legal;
- campagne entrante.

## 4. MVP - Categorisation

Filtres metier a exposer dans l'interface:

- macon;
- couvreur;
- charpentier;
- electricien;
- plombier;
- carreleur;
- peintre;
- menuisier;
- plaquiste;
- terrassier;
- chauffagiste;
- pisciniste;
- paysagiste;
- autres.

### Regle de categorisation

Mettre en place une table de mapping configurable:

```text
code_naf | libelle_source | categorie_metier | score_pertinence
```

Le mapping actuel dans `lib/collecte/categories-naf.ts` est un bon debut, mais il est code en dur et ne couvre pas encore tous les libelles metier demandes.

## 5. MVP - Scoring sur 100

Objectif: prioriser les prospects exploitables et signaler les fiches a enrichir.

### Score qualite du contact

Proposition initiale:

| Critere | Points |
|---|---:|
| Email present et format valide | 25 |
| Mobile present | 20 |
| Telephone fixe present | 10 |
| Site web present | 15 |
| Adresse complete | 10 |
| SIRET present et valide | 10 |
| Dirigeant present | 5 |
| Source fiable et datee | 5 |

Total: 100.

### Score priorite commerciale

Le score qualite ne suffit pas. Il faut aussi un score de priorite metier:

- activite correspondant aux offres CAPEB;
- taille de l'entreprise;
- anciennete;
- RGE;
- proximite geographique;
- signaux de croissance;
- statut non contacte ou relance a faire;
- absence d'opt-out.

Recommandation: conserver deux scores:

- `score_quality` pour la completude;
- `score_priority` pour la priorisation commerciale.

## 6. Moteur de prospection

### Sources envisagees

- donnees ouvertes legales;
- API Recherche d'Entreprises;
- annuaires professionnels avec conditions compatibles;
- imports manuels CSV/XLSX;
- fournisseurs d'enrichissement autorises;
- Google Business / Places API si les conditions d'utilisation sont respectees.

### Pages Jaunes et Google Business

Ne pas implementer de scraping illegal ou contraire aux conditions d'utilisation.

Architecture recommandee:

- connecteurs separes par source;
- chaque connecteur declare ses contraintes legales et techniques;
- stockage de `source`, `source_url`, `import_batch_id`, `collected_at`;
- validation humaine pour les sources sensibles;
- journal d'import pour audit.

### Pipeline d'import

```text
Source -> Normalisation -> Validation -> Deduplication -> Fusion -> Scoring -> Publication CRM
```

Fonctions requises:

- import CSV;
- import XLSX;
- mapping de colonnes;
- validation SIREN/SIRET;
- detection doublons par SIRET, SIREN, email, telephone, nom + ville;
- fusion automatique prudente;
- file de revue manuelle pour les conflits.

## 7. CRM professionnel

### Dashboard

Indicateurs MVP:

- nombre total de prospects;
- prospects nouveaux;
- prospects contactes;
- taux de reponse;
- campagnes en cours;
- relances dues;
- repartition par metier;
- repartition par ville / secteur;
- volume opt-out.

### Fiches contacts

Chaque fiche doit contenir:

- resume entreprise;
- coordonnees;
- dirigeant;
- score;
- statut pipeline;
- historique des interactions;
- notes;
- taches;
- relances;
- campagnes recues;
- pieces jointes ou plaquettes envoyees.

### Pipeline commercial

Colonnes:

- Nouveau;
- A contacter;
- Contacte;
- Relance;
- Rendez-vous;
- Opportunite;
- Client;
- Perdu.

Fonctionnalites:

- drag & drop;
- raison de perte;
- date de prochaine action;
- responsable;
- vues filtrees par metier, commune, score, campagne.

## 8. Emailing

### Architecture fournisseur

Prevoir une interface d'envoi abstraite:

```ts
interface EmailProvider {
  sendTransactionalEmail(input: EmailInput): Promise<EmailResult>
  createCampaign?(input: CampaignInput): Promise<CampaignResult>
}
```

Fournisseurs compatibles:

- SMTP generique;
- Microsoft 365;
- Gmail Workspace;
- Brevo;
- autre fournisseur transactionnel si besoin.

### Fonctionnalites

- modeles d'emails;
- personnalisation;
- variables dynamiques;
- suivi des envois;
- suivi des ouvertures;
- suivi des clics;
- campagnes planifiees;
- gestion des erreurs;
- liste opt-out;
- preuve de desinscription.

### Variables dynamiques initiales

- `{{entreprise}}`;
- `{{dirigeant}}`;
- `{{ville}}`;
- `{{metier}}`;
- `{{prenom_utilisateur}}`;
- `{{lien_desinscription}}`.

## 9. SMS

### Fournisseurs compatibles

- Twilio;
- OVH SMS;
- Brevo SMS.

### Fonctionnalites

- modeles SMS;
- campagnes SMS;
- historique par contact;
- statut d'envoi;
- gestion STOP / opt-out;
- relances ciblees.

Important: le SMS est plus sensible juridiquement. Le MVP doit d'abord poser les fondations opt-out et l'historique avant les campagnes de masse.

## 10. IA

Cas d'usage a preparer:

- generation automatique de messages;
- generation de relances;
- resume des echanges;
- scoring intelligent;
- recommandations de prospects prioritaires;
- detection de contacts incomplets;
- suggestion de prochaine action.

Garde-fous:

- validation humaine avant envoi;
- journal des prompts et sorties utiles;
- pas d'envoi automatique sans approbation;
- minimisation des donnees personnelles envoyees au modele.

## 11. Modules applicatifs proposes

```text
contacts
├── listing
├── fiche detail
├── import
├── deduplication
└── scoring

prospection
├── pipeline
├── taches
├── relances
└── interactions

campaigns
├── templates
├── email
├── sms
├── tracking
└── opt-out

data
├── sources
├── enrichissement
├── batches
└── audit log

ai
├── generation messages
├── resume
└── recommandations
```

## 12. Plan d'action propose avant gros refactorings

### Etape 1 - Stabilisation technique

- valider le deploiement de la correction 404;
- proteger `/artisans` par auth;
- clarifier le ciblage 65 seul ou 64 + 65;
- aligner schema Drizzle et migration SQL;
- documenter les variables `.env.local`.

### Etape 2 - Socle donnees CRM

- creer les tables `contacts/artisans`, `interactions`, `tasks`, `import_batches`, `opt_out`;
- ajouter les champs dirigeant, mobile, source detaillee, date import;
- implementer un calcul de score qualite.

### Etape 3 - Import et deduplication

- import CSV;
- import XLSX;
- mapping de colonnes;
- validation SIRET/SIREN;
- detection doublons;
- revue de fusion.

### Etape 4 - Usage quotidien

- dashboard;
- fiche contact complete;
- notes et historique;
- taches et relances;
- pipeline drag & drop.

### Etape 5 - Campagnes

- modeles email;
- fournisseur email initial;
- opt-out;
- historique des envois;
- tracking compatible fournisseur.

### Etape 6 - Enrichissement et IA

- connecteurs autorises;
- scoring priorite;
- generation de messages;
- recommandations.

## 13. Decisions a valider

1. Le produit doit-il couvrir uniquement le 65 au MVP, ou garder le 64 + 65 ?
2. Supabase reste-t-il la base cible pour toute la V1 ?
3. Quel fournisseur email prioritaire: Microsoft 365, Gmail Workspace, Brevo ou SMTP ?
4. Le SMS est-il reserve aux relances individuelles ou aux campagnes ?
5. Quel niveau de roles internes faut-il: admin, commercial, lecture seule ?
6. Les contacts adherents CAPEB seront-ils importes dans la meme table avec `est_adherent`, ou dans une table separee liee ?
