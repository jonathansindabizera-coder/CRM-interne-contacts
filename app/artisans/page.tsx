import { ArtisansTable } from '@/components/artisans-table'
import { MembersUploadPanel } from '@/components/members-upload-panel'
import type { Artisan } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function ArtisansPage() {
  const artisans: Artisan[] = []

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-3 bg-red-700 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white/20 rounded" />
          <div>
            <span className="font-semibold text-sm">CAPEB Adour Pyrénées</span>
            <span className="text-red-200 text-xs ml-2">· Prospection artisans 65</span>
          </div>
        </div>
        <span className="text-xs bg-white/10 px-2 py-1 rounded text-red-100">
          Base réelle à construire · aucune donnée démo
        </span>
      </header>

      <div className="border-b bg-white px-6 py-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Prospection sortante artisans du bâtiment — Hautes-Pyrénées
            </h1>
            <p className="text-sm text-gray-500">
              Objectif : collecter les petites entreprises artisanales du 65, téléverser la liste adhérents CAPEB,
              puis isoler les prospects non adhérents à contacter.
            </p>
          </div>
          <div className="text-xs text-gray-400">
            Cible prioritaire : entreprises du bâtiment de moins de 20 salariés
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-400">Prospects collectés</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">0</p>
              <p className="mt-1 text-xs text-gray-500">En attente de collecte officielle</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-400">Adhérents 65 importés</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">0</p>
              <p className="mt-1 text-xs text-gray-500">Fichier adhérents à téléverser</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-400">Non-adhérents identifiés</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">0</p>
              <p className="mt-1 text-xs text-gray-500">Résultat après déduplication</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-400">Campagne email</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">Bientôt</p>
              <p className="mt-1 text-xs text-gray-500">Prévue après opt-out et modèles</p>
            </div>
          </div>

          <MembersUploadPanel />

          <div className="overflow-hidden rounded-xl border bg-white">
            <ArtisansTable data={artisans} />
          </div>
        </div>
      </div>
    </div>
  )
}
