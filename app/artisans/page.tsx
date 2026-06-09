import { ArtisansTable } from '@/components/artisans-table'
import { fetchDemoArtisans } from '@/lib/collecte/fetch-demo'

export const revalidate = 3600 // re-fetch toutes les heures

export default async function ArtisansPage() {
  const { artisans, total } = await fetchDemoArtisans(10)

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-3 bg-red-700 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white/20 rounded" />
          <div>
            <span className="font-semibold text-sm">CAPEB Adour Pyrénées</span>
            <span className="text-red-200 text-xs ml-2">· CRM Artisans</span>
          </div>
        </div>
        <span className="text-xs bg-white/10 px-2 py-1 rounded text-red-100">
          Démo — {total.toLocaleString('fr')} artisans disponibles
        </span>
      </header>

      <div className="px-6 py-2 bg-white border-b flex items-baseline gap-2">
        <h1 className="text-sm font-semibold text-gray-700">Artisans du bâtiment — 64 &amp; 65</h1>
        <span className="text-xs text-gray-400">
          Données officielles · {artisans.length} artisans chargés sur {total.toLocaleString('fr')} au total
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        <ArtisansTable data={artisans} demoMode />
      </div>
    </div>
  )
}
