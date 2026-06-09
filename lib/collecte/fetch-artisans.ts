import { getCategorieMetier } from './categories-naf'
import type { NewArtisan } from '@/lib/db/schema'

const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search'
const DELAY_MS = 200 // respect limite 7 req/s

interface ApiEntreprise {
  nom_complet: string
  siret: string
  siren: string
  libelle_activite_principale: string
  activite_principale: string
  adresse: string
  code_postal: string
  libelle_commune: string
  departement: string
  tranche_effectif_salarie: string
  date_creation: string
  est_rge: boolean
  finances?: { chiffre_affaires?: number }[]
}

interface ApiResponse {
  results: ApiEntreprise[]
  total_results: number
  page: number
  per_page: number
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function mapEntrepriseToArtisan(e: ApiEntreprise): NewArtisan {
  return {
    nom_entreprise:   e.nom_complet,
    siret:            e.siret,
    siren:            e.siren,
    activite:         e.libelle_activite_principale,
    code_naf:         e.activite_principale,
    categorie_metier: getCategorieMetier(e.activite_principale ?? ''),
    adresse:          e.adresse,
    code_postal:      e.code_postal,
    ville:            e.libelle_commune,
    departement:      e.departement,
    nombre_salaries:  e.tranche_effectif_salarie,
    date_creation:    e.date_creation,
    rge:              e.est_rge ?? false,
    chiffre_affaires: e.finances?.[0]?.chiffre_affaires?.toString() ?? null,
    source_donnees:   'api-recherche-entreprises',
    date_mise_a_jour: new Date(),
    statut:           'nouveau',
    nouveau_ce_mois:  true,
  }
}

export async function fetchAllArtisans(
  onProgress?: (fetched: number, total: number) => void
): Promise<NewArtisan[]> {
  const artisans: NewArtisan[] = []
  let page = 1
  let total = 0

  do {
    const url = `${API_BASE}?departement=64,65&section_activite_principale=F&etat_administratif=A&per_page=25&page=${page}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`API erreur ${res.status} page ${page}`)

    const data: ApiResponse = await res.json()
    total = data.total_results

    for (const e of data.results) {
      artisans.push(mapEntrepriseToArtisan(e))
    }

    onProgress?.(artisans.length, total)
    page++
    await sleep(DELAY_MS)
  } while (artisans.length < total && page <= 400) // garde-fou 10 000 max

  return artisans
}
