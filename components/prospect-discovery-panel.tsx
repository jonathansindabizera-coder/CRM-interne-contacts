'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProspectArtisan, ProspectSearchResult } from '@/lib/prospects/recherche-entreprises'

const PAGE_DELAY_MS = 170
const MAX_PAGES = 160

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function csvValue(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function exportProspectsCsv(prospects: ProspectArtisan[]) {
  const headers = [
    'priorite',
    'score',
    'entreprise',
    'nom_commercial',
    'dirigeant',
    'qualite_dirigeant',
    'siret',
    'siren',
    'metier',
    'code_naf',
    'adresse',
    'code_postal',
    'ville',
    'effectif',
    'date_creation_entreprise',
    'date_creation_etablissement',
    'rge',
    'source',
    'source_url',
    'telephone',
    'mobile',
    'email',
    'site_web',
  ]

  const rows = prospects.map(prospect => [
    prospect.priorite,
    prospect.scorePriorite,
    prospect.nomEntreprise,
    prospect.nomCommercial,
    prospect.dirigeant,
    prospect.qualiteDirigeant,
    prospect.siret,
    prospect.siren,
    prospect.categorieMetier,
    prospect.codeNaf,
    prospect.adresse,
    prospect.codePostal,
    prospect.ville,
    prospect.effectif,
    prospect.dateCreationEntreprise,
    prospect.dateCreationEtablissement,
    prospect.rge ? 'oui' : 'non',
    prospect.source,
    prospect.sourceUrl,
    prospect.telephone,
    prospect.mobile,
    prospect.email,
    prospect.siteWeb,
  ])

  const csv = [headers, ...rows].map(row => row.map(csvValue).join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `prospects-artisans-65-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function priorityLabel(priority: ProspectArtisan['priorite']) {
  if (priority === 'nouvelle') return 'Nouvelle'
  if (priority === 'forte') return 'Priorité forte'
  return 'Standard'
}

function priorityClass(priority: ProspectArtisan['priorite']) {
  if (priority === 'nouvelle') return 'bg-green-100 text-green-800'
  if (priority === 'forte') return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-600'
}

export function ProspectDiscoveryPanel() {
  const [prospects, setProspects] = useState<ProspectArtisan[]>([])
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('Recherche non lancée')
  const [error, setError] = useState<string | null>(null)

  const visibleProspects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return prospects
      .filter(prospect => !removed.has(prospect.siret))
      .filter(prospect => {
        if (!normalizedQuery) return true
        return [
          prospect.nomEntreprise,
          prospect.nomCommercial,
          prospect.dirigeant,
          prospect.categorieMetier,
          prospect.ville,
          prospect.codePostal,
          prospect.siret,
          prospect.siren,
        ].some(value => value?.toLowerCase().includes(normalizedQuery))
      })
      .sort((a, b) => {
        if (a.priorite !== b.priorite) {
          const weights = { nouvelle: 3, forte: 2, standard: 1 }
          return weights[b.priorite] - weights[a.priorite]
        }
        return b.scorePriorite - a.scorePriorite
      })
  }, [prospects, query, removed])

  const newProspectsCount = visibleProspects.filter(prospect => prospect.priorite === 'nouvelle').length
  const removedCount = removed.size

  async function fetchOfficialProspects() {
    setLoading(true)
    setError(null)
    setProgress('Démarrage de la recherche officielle 65...')
    setProspects([])
    setRemoved(new Set())

    const bySiret = new Map<string, ProspectArtisan>()

    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await fetch(`/api/prospects/recherche?page=${page}`)
        const json = await res.json()

        if (!res.ok || 'error' in json) {
          throw new Error(typeof json.error === 'string' ? json.error : 'Recherche impossible')
        }

        const result = json as ProspectSearchResult

        for (const prospect of result.prospects) {
          bySiret.set(prospect.siret, prospect)
        }

        setProspects([...bySiret.values()])
        setProgress(
          `Page ${result.page} analysée · ${bySiret.size} prospects bâtiment 65 retenus sur ${result.totalResults.toLocaleString('fr')} résultats officiels`
        )

        if (!result.hasNextPage) break
        await sleep(PAGE_DELAY_MS)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur pendant la recherche')
    } finally {
      setLoading(false)
    }
  }

  function removeProspect(siret: string) {
    setRemoved(previous => new Set(previous).add(siret))
  }

  function restoreRemoved() {
    setRemoved(new Set())
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Recherche de prospects
            </p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">
              Liste qualitative d’artisans du bâtiment du 65
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-600">
              La recherche démarre par la source officielle Recherche d’Entreprises. Les sources privées
              comme Leboncoin, Facebook ou Instagram ne seront pas scrapées illégalement ; elles seront ajoutées
              plus tard via imports, liens publics fournis ou API autorisées.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="bg-red-700 hover:bg-red-800" onClick={fetchOfficialProspects} disabled={loading}>
              {loading ? 'Recherche en cours...' : 'Rechercher un maximum d’artisans 65'}
            </Button>
            <Button
              variant="outline"
              onClick={() => exportProspectsCsv(visibleProspects)}
              disabled={visibleProspects.length === 0}
            >
              Exporter la liste nettoyée
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">Prospects retenus</p>
            <p className="text-xl font-semibold text-gray-900">{visibleProspects.length.toLocaleString('fr')}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs text-green-700">Nouveaux prioritaires</p>
            <p className="text-xl font-semibold text-green-900">{newProspectsCount.toLocaleString('fr')}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">Supprimés par vous</p>
            <p className="text-xl font-semibold text-gray-900">{removedCount.toLocaleString('fr')}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">Source actuelle</p>
            <p className="text-sm font-medium text-gray-900">API État + enrichissement à venir</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            placeholder="Rechercher nom, ville, SIRET, métier..."
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="md:max-w-md"
          />
          {removedCount > 0 && (
            <Button variant="outline" size="sm" onClick={restoreRemoved}>
              Restaurer les entreprises supprimées
            </Button>
          )}
          <span className="text-xs text-gray-500">{progress}</span>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Priorité</th>
              <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Entreprise</th>
              <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Dirigeant</th>
              <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Métier</th>
              <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Ville</th>
              <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Effectif</th>
              <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Création</th>
              <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Source</th>
              <th className="border-b px-3 py-2 text-right text-xs font-semibold uppercase text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleProspects.map(prospect => (
              <tr key={prospect.siret} className="border-b hover:bg-blue-50/50">
                <td className="px-3 py-2 align-top">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${priorityClass(prospect.priorite)}`}>
                    {priorityLabel(prospect.priorite)}
                  </span>
                  <p className="mt-1 text-xs text-gray-400">Score {prospect.scorePriorite}/100</p>
                </td>
                <td className="px-3 py-2 align-top">
                  <p className="font-medium text-gray-900">{prospect.nomEntreprise}</p>
                  {prospect.nomCommercial && <p className="text-xs text-gray-500">{prospect.nomCommercial}</p>}
                  <p className="mt-1 text-xs text-gray-400">SIRET {prospect.siret}</p>
                  {prospect.rge && <p className="mt-1 text-xs font-medium text-green-700">RGE</p>}
                </td>
                <td className="px-3 py-2 align-top text-gray-700">
                  {prospect.dirigeant ?? <span className="text-gray-400">À enrichir</span>}
                  {prospect.qualiteDirigeant && <p className="text-xs text-gray-400">{prospect.qualiteDirigeant}</p>}
                </td>
                <td className="px-3 py-2 align-top text-gray-700">
                  {prospect.categorieMetier}
                  {prospect.codeNaf && <p className="text-xs text-gray-400">NAF {prospect.codeNaf}</p>}
                </td>
                <td className="px-3 py-2 align-top text-gray-700">
                  {prospect.ville ?? '—'}
                  <p className="text-xs text-gray-400">{prospect.codePostal ?? ''}</p>
                </td>
                <td className="px-3 py-2 align-top text-gray-700">{prospect.effectif ?? 'Non renseigné'}</td>
                <td className="px-3 py-2 align-top text-gray-700">
                  {prospect.dateCreationEtablissement ?? prospect.dateCreationEntreprise ?? '—'}
                </td>
                <td className="px-3 py-2 align-top">
                  <a
                    href={prospect.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Annuaire officiel
                  </a>
                  <p className="mt-1 text-xs text-gray-400">Téléphone/email/site à enrichir</p>
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <Button variant="outline" size="sm" onClick={() => removeProspect(prospect.siret)}>
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
            {visibleProspects.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-gray-400">
                  Lancez la recherche pour construire la première liste qualifiée de prospects artisans du 65.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
