export type NiveauConfiance = 'trouvé - certain' | 'trouvé - à vérifier' | 'non trouvé'

export type SourceNom =
  | 'Google Maps'
  | 'Site web propre'
  | 'Pages Jaunes'
  | 'AlloVoisins'
  | 'Hellopro'
  | 'Batirenov'
  | 'artisans.fr'
  | 'Kompass'
  | 'Societe.com'
  | 'Pappers'
  | 'Leboncoin'

export interface ContactTrouve {
  telephone: string | null
  email: string | null
  site_internet: string | null
  source_contact: SourceNom
  niveau_confiance: NiveauConfiance
}

export interface ResultatSource {
  source: SourceNom
  success: boolean
  contact?: ContactTrouve
  erreur?: string
}

export interface ProspectInput {
  siret: string
  nom_entreprise: string
  categorie_metier: string
  code_naf?: string
  ville: string
  code_postal: string
  departement: string
  telephone?: string | null
  email?: string | null
}

export interface ResultatEnrichissement {
  siret: string
  telephone: string | null
  email: string | null
  site_internet: string | null
  source_contact: SourceNom | null
  niveau_confiance: NiveauConfiance
  tentatives: ResultatSource[]
  enrichi_le: string
}

export interface EtatSession {
  session_id: string
  started_at: string
  last_updated: string
  total: number
  processed: number
  resultats: Record<string, ResultatEnrichissement>
  stats: {
    par_source: Partial<Record<SourceNom, number>>
    leboncoin_bloque: number
    total_telephone: number
    total_email: number
    total_non_trouve: number
  }
}
