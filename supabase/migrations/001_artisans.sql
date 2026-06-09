-- Migration 001 : table artisans + politiques RLS
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query

CREATE TYPE statut_artisan AS ENUM (
  'nouveau', 'a_contacter', 'contacte', 'relance',
  'rdv', 'adherent', 'prospect_perdu', 'opt_out'
);

CREATE TABLE IF NOT EXISTS artisans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_entreprise       TEXT NOT NULL,
  siret                TEXT UNIQUE NOT NULL,
  siren                TEXT,
  activite             TEXT,
  code_naf             TEXT,
  categorie_metier     TEXT,
  adresse              TEXT,
  code_postal          TEXT,
  ville                TEXT,
  departement          TEXT,
  telephone            TEXT,
  email                TEXT,
  site_internet        TEXT,
  reseaux_sociaux      JSONB,
  nombre_salaries      TEXT,
  chiffre_affaires     NUMERIC,
  date_creation        DATE,
  rge                  BOOLEAN DEFAULT FALSE,
  source_donnees       TEXT,
  date_mise_a_jour     TIMESTAMPTZ,
  -- CRM
  statut               statut_artisan DEFAULT 'nouveau',
  est_adherent         BOOLEAN DEFAULT FALSE,
  tags                 TEXT[],
  notes                TEXT,
  score                INTEGER DEFAULT 0,
  date_dernier_contact TIMESTAMPTZ,
  cree_le              TIMESTAMPTZ DEFAULT NOW(),
  nouveau_ce_mois      BOOLEAN DEFAULT FALSE
);

-- Index pour les recherches fréquentes
CREATE INDEX ON artisans (departement);
CREATE INDEX ON artisans (categorie_metier);
CREATE INDEX ON artisans (statut);
CREATE INDEX ON artisans (rge);
CREATE INDEX ON artisans (nouveau_ce_mois);
CREATE INDEX ON artisans USING GIN (to_tsvector('french', nom_entreprise || ' ' || COALESCE(ville, '')));

-- RLS : seuls les utilisateurs authentifiés peuvent lire/écrire
ALTER TABLE artisans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture : utilisateurs authentifiés"
  ON artisans FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Écriture : utilisateurs authentifiés"
  ON artisans FOR ALL
  USING (auth.role() = 'authenticated');
