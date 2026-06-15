import { getCategorieMetier, isTargetBuildingActivity } from '@/lib/collecte/categories-naf'
import {
  isCapebProspectEmployeeRange,
  TARGET_DEPARTMENT,
  TARGET_DEPARTMENT_LABEL,
} from '@/lib/collecte/prospect-targeting'

const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search'
const PER_PAGE = 25

interface ApiDirigeant {
  nom?: string | null
  prenoms?: string | null
  denomination?: string | null
  qualite?: string | null
  type_dirigeant?: string | null
}

interface ApiEtablissement {
  activite_principale?: string | null
  adresse?: string | null
  code_postal?: string | null
  date_creation?: string | null
  date_debut_activite?: string | null
  departement?: string | null
  est_siege?: boolean | null
  etat_administratif?: string | null
  latitude?: string | null
  libelle_commune?: string | null
  liste_enseignes?: string | null
  liste_rge?: string | null
  longitude?: string | null
  nom_commercial?: string | null
  siret?: string | null
  tranche_effectif_salarie?: string | null
}

interface ApiEntreprise {
  siren?: string | null
  nom_complet?: string | null
  nom_raison_sociale?: string | null
  activite_principale?: string | null
  categorie_entreprise?: string | null
  date_creation?: string | null
  dirigeants?: ApiDirigeant[]
  siege?: ApiEtablissement | null
  tranche_effectif_salarie?: string | null
  matching_etablissements?: ApiEtablissement[]
}

interface ApiResponse {
  results?: ApiEntreprise[]
  total_results?: number
}

export interface ProspectArtisan {
  id: string
  nomEntreprise: string
  nomCommercial: string | null
  dirigeant: string | null
  qualiteDirigeant: string | null
  siret: string
  siren: string | null
  codeNaf: string | null
  categorieMetier: string
  adresse: string | null
  codePostal: string | null
  ville: string | null
  departement: string
  effectif: string | null
  dateCreationEntreprise: string | null
  dateCreationEtablissement: string | null
  rge: boolean
  latitude: string | null
  longitude: string | null
  source: string
  sourceUrl: string
  scorePriorite: number
  priorite: 'nouvelle' | 'forte' | 'standard'
  raisonsPriorite: string[]
  telephone: null
  mobile: null
  email: null
  siteWeb: null
}

export interface ProspectSearchResult {
  prospects: ProspectArtisan[]
  page: number
  perPage: number
  totalResults: number
  hasNextPage: boolean
  target: {
    departement: string
    label: string
    source: string
  }
}

function toText(value: unknown) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join(', ')
  return null
}

function firstValue(...values: unknown[]) {
  for (const value of values) {
    const text = toText(value)?.trim()
    if (text) return text
  }
  return null
}

function formatDirigeant(dirigeants?: ApiDirigeant[]) {
  const dirigeant = dirigeants?.find(item => item.type_dirigeant === 'personne physique') ?? dirigeants?.[0]
  if (!dirigeant) return { name: null, quality: null }

  const name = firstValue(
    [dirigeant.prenoms, dirigeant.nom].filter(Boolean).join(' '),
    dirigeant.denomination
  )

  return {
    name,
    quality: dirigeant.qualite ?? null,
  }
}

function monthsSince(date?: string | null) {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null

  const now = new Date()
  return (now.getFullYear() - parsed.getFullYear()) * 12 + now.getMonth() - parsed.getMonth()
}

function scoreProspect(input: {
  etablissement: ApiEtablissement
  entreprise: ApiEntreprise
  dirigeant: string | null
  rge: boolean
}) {
  const reasons: string[] = []
  let score = 40

  const establishmentAge = monthsSince(input.etablissement.date_creation ?? input.etablissement.date_debut_activite)
  const companyAge = monthsSince(input.entreprise.date_creation)
  const youngestAge = Math.min(
    establishmentAge ?? Number.POSITIVE_INFINITY,
    companyAge ?? Number.POSITIVE_INFINITY
  )

  if (youngestAge <= 24) {
    score += 30
    reasons.push('Entreprise ou établissement récent')
  } else if (youngestAge <= 60) {
    score += 15
    reasons.push('Entreprise créée depuis moins de 5 ans')
  }

  if (isCapebProspectEmployeeRange(input.etablissement.tranche_effectif_salarie ?? input.entreprise.tranche_effectif_salarie)) {
    score += 15
    reasons.push('Taille compatible CAPEB (<20 salariés ou effectif non renseigné)')
  }

  if (input.dirigeant) {
    score += 5
    reasons.push('Dirigeant identifié')
  }

  if (input.rge) {
    score += 5
    reasons.push('Signal RGE')
  }

  if (input.etablissement.latitude && input.etablissement.longitude) {
    score += 5
    reasons.push('Localisation exploitable')
  }

  return {
    score: Math.min(score, 100),
    reasons,
  }
}

function getCandidateEstablishments(entreprise: ApiEntreprise) {
  const candidates = [
    ...(entreprise.matching_etablissements ?? []),
    ...(entreprise.siege ? [entreprise.siege] : []),
  ]

  const seen = new Set<string>()
  return candidates.filter(etablissement => {
    if (!etablissement.siret || seen.has(etablissement.siret)) return false
    seen.add(etablissement.siret)

    const activity = etablissement.activite_principale
    const companyActivity = entreprise.activite_principale
    const isInTargetDepartment =
      etablissement.departement === TARGET_DEPARTMENT ||
      Boolean(etablissement.code_postal?.startsWith(TARGET_DEPARTMENT))

    return (
      isInTargetDepartment &&
      etablissement.etat_administratif !== 'F' &&
      (isTargetBuildingActivity(activity) || isTargetBuildingActivity(companyActivity)) &&
      isCapebProspectEmployeeRange(etablissement.tranche_effectif_salarie ?? entreprise.tranche_effectif_salarie)
    )
  })
}

function mapProspect(entreprise: ApiEntreprise, etablissement: ApiEtablissement): ProspectArtisan {
  const activity = (isTargetBuildingActivity(etablissement.activite_principale)
    ? etablissement.activite_principale
    : entreprise.activite_principale ?? etablissement.activite_principale) ?? null
  const dirigeant = formatDirigeant(entreprise.dirigeants)
  const rge = Boolean(etablissement.liste_rge)
  const scored = scoreProspect({
    etablissement,
    entreprise,
    dirigeant: dirigeant.name,
    rge,
  })

  const priorite = scored.reasons.includes('Entreprise ou établissement récent')
    ? 'nouvelle'
    : scored.score >= 70
      ? 'forte'
      : 'standard'

  return {
    id: etablissement.siret!,
    nomEntreprise: firstValue(entreprise.nom_complet, entreprise.nom_raison_sociale) ?? 'Entreprise sans nom',
    nomCommercial: firstValue(etablissement.nom_commercial, etablissement.liste_enseignes),
    dirigeant: dirigeant.name,
    qualiteDirigeant: dirigeant.quality,
    siret: etablissement.siret!,
    siren: entreprise.siren ?? null,
    codeNaf: activity,
    categorieMetier: getCategorieMetier(activity ?? ''),
    adresse: etablissement.adresse ?? null,
    codePostal: etablissement.code_postal ?? null,
    ville: etablissement.libelle_commune ?? null,
    departement: TARGET_DEPARTMENT,
    effectif: etablissement.tranche_effectif_salarie ?? entreprise.tranche_effectif_salarie ?? null,
    dateCreationEntreprise: entreprise.date_creation ?? null,
    dateCreationEtablissement: etablissement.date_creation ?? etablissement.date_debut_activite ?? null,
    rge,
    latitude: etablissement.latitude ?? null,
    longitude: etablissement.longitude ?? null,
    source: 'API Recherche d’Entreprises',
    sourceUrl: `https://annuaire-entreprises.data.gouv.fr/etablissement/${etablissement.siret}`,
    scorePriorite: scored.score,
    priorite,
    raisonsPriorite: scored.reasons,
    telephone: null,
    mobile: null,
    email: null,
    siteWeb: null,
  }
}

export async function searchOfficialBuildingProspects(page: number): Promise<ProspectSearchResult> {
  const currentPage = Math.max(1, page)
  const params = new URLSearchParams({
    departement: TARGET_DEPARTMENT,
    section_activite_principale: 'F',
    etat_administratif: 'A',
    per_page: String(PER_PAGE),
    page: String(currentPage),
  })

  const res = await fetch(`${API_BASE}?${params}`, {
    headers: {
      accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`API Recherche d’Entreprises indisponible (${res.status})`)
  }

  const data = (await res.json()) as ApiResponse
  const prospects = (data.results ?? []).flatMap(entreprise =>
    getCandidateEstablishments(entreprise).map(etablissement => mapProspect(entreprise, etablissement))
  )

  const totalResults = data.total_results ?? 0
  return {
    prospects,
    page: currentPage,
    perPage: PER_PAGE,
    totalResults,
    hasNextPage: currentPage * PER_PAGE < totalResults,
    target: {
      departement: TARGET_DEPARTMENT,
      label: TARGET_DEPARTMENT_LABEL,
      source: 'recherche-entreprises.api.gouv.fr',
    },
  }
}
