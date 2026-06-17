-- Migration 002 : champs d'enrichissement des contacts
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query

ALTER TABLE artisans
  ADD COLUMN IF NOT EXISTS source_contact   TEXT,
  ADD COLUMN IF NOT EXISTS niveau_confiance TEXT
    CHECK (niveau_confiance IN ('trouvé - certain', 'trouvé - à vérifier', 'non trouvé')),
  ADD COLUMN IF NOT EXISTS enrichi_le       TIMESTAMPTZ;

-- Index pour filtrer les artisans enrichis / non enrichis
CREATE INDEX IF NOT EXISTS idx_artisans_source_contact   ON artisans (source_contact);
CREATE INDEX IF NOT EXISTS idx_artisans_niveau_confiance ON artisans (niveau_confiance);
CREATE INDEX IF NOT EXISTS idx_artisans_enrichi_le       ON artisans (enrichi_le);

COMMENT ON COLUMN artisans.source_contact   IS 'Source ayant fourni le téléphone/email (ex: Google Maps, Pages Jaunes...)';
COMMENT ON COLUMN artisans.niveau_confiance IS 'Fiabilité de la correspondance trouvée';
COMMENT ON COLUMN artisans.enrichi_le       IS 'Date du dernier passage du moteur d''enrichissement';
