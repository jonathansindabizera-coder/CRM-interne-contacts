import {
  pgTable, text, boolean, integer, numeric, date,
  timestamp, jsonb, pgEnum
} from 'drizzle-orm/pg-core'

export const statutEnum = pgEnum('statut_artisan', [
  'nouveau', 'a_contacter', 'contacte', 'relance',
  'rdv', 'adherent', 'prospect_perdu', 'opt_out'
])

export const artisans = pgTable('artisans', {
  id:                  text('id').primaryKey().default('gen_random_uuid()'),
  nom_entreprise:      text('nom_entreprise').notNull(),
  siret:               text('siret').unique().notNull(),
  siren:               text('siren'),
  activite:            text('activite'),
  code_naf:            text('code_naf'),
  categorie_metier:    text('categorie_metier'),
  adresse:             text('adresse'),
  code_postal:         text('code_postal'),
  ville:               text('ville'),
  departement:         text('departement'),
  telephone:           text('telephone'),
  email:               text('email'),
  site_internet:       text('site_internet'),
  reseaux_sociaux:     jsonb('reseaux_sociaux'),
  nombre_salaries:     text('nombre_salaries'),
  chiffre_affaires:    numeric('chiffre_affaires'),
  date_creation:       date('date_creation'),
  rge:                 boolean('rge').default(false),
  source_donnees:      text('source_donnees'),
  date_mise_a_jour:    timestamp('date_mise_a_jour', { withTimezone: true }),
  // CRM
  statut:              statutEnum('statut').default('nouveau'),
  est_adherent:        boolean('est_adherent').default(false),
  tags:                text('tags').array(),
  notes:               text('notes'),
  score:               integer('score').default(0),
  date_dernier_contact: timestamp('date_dernier_contact', { withTimezone: true }),
  cree_le:             timestamp('cree_le', { withTimezone: true }).defaultNow(),
  nouveau_ce_mois:     boolean('nouveau_ce_mois').default(false),
  // Enrichissement contacts
  source_contact:      text('source_contact'),
  niveau_confiance:    text('niveau_confiance'),
  enrichi_le:          timestamp('enrichi_le', { withTimezone: true }),
})

export type Artisan = typeof artisans.$inferSelect
export type NewArtisan = typeof artisans.$inferInsert
