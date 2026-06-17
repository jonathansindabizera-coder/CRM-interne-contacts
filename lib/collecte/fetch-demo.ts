import { getCategorieMetier } from './categories-naf'
import type { Artisan } from '@/lib/db/schema'

const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search'

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
}

export async function fetchDemoArtisans(pages = 4): Promise<{ artisans: Artisan[]; total: number }> {
  const artisans: Artisan[] = []
  let total = 0

  for (let page = 1; page <= pages; page++) {
    const url = `${API_BASE}?departement=64,65&section_activite_principale=F&etat_administratif=A&per_page=25&page=${page}`

    let data: ApiResponse
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) break
      data = await res.json()
    } catch {
      break
    }

    total = data.total_results ?? 0

    for (const e of (data.results ?? [])) {
      artisans.push({
        id:                   e.siret,
        nom_entreprise:       e.nom_complet ?? '',
        siret:                e.siret,
        siren:                e.siren ?? null,
        activite:             e.libelle_activite_principale ?? null,
        code_naf:             e.activite_principale ?? null,
        categorie_metier:     getCategorieMetier(e.activite_principale ?? ''),
        adresse:              e.adresse ?? null,
        code_postal:          e.code_postal ?? null,
        ville:                e.libelle_commune ?? null,
        departement:          e.departement ?? null,
        telephone:            null,
        email:                null,
        site_internet:        null,
        reseaux_sociaux:      null,
        nombre_salaries:      e.tranche_effectif_salarie ?? null,
        chiffre_affaires:     e.finances?.[0]?.chiffre_affaires?.toString() ?? null,
        date_creation:        e.date_creation ?? null,
        rge:                  e.est_rge ?? false,
        source_donnees:       'api-recherche-entreprises',
        date_mise_a_jour:     new Date(),
        statut:               'nouveau',
        est_adherent:         false,
        tags:                 null,
        notes:                null,
        score:                0,
        date_dernier_contact: null,
        cree_le:              new Date(),
        nouveau_ce_mois:      false,
        source_contact:       null,
        niveau_confiance:     null,
        enrichi_le:           null,
      })
    }
  }

  return { artisans, total }
}
