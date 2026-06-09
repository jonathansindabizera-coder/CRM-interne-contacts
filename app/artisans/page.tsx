import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArtisansTable } from '@/components/artisans-table'
import type { Artisan } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function ArtisansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('artisans')
    .select('*')
    .order('nom_entreprise', { ascending: true })

  if (error) console.error('Erreur chargement artisans:', error)

  const artisans: Artisan[] = data ?? []

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-red-700 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white/20 rounded" />
          <div>
            <span className="font-semibold text-sm">CAPEB Adour Pyrénées</span>
            <span className="text-red-200 text-xs ml-2">· CRM Artisans</span>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button className="text-xs text-red-200 hover:text-white">Déconnexion</button>
        </form>
      </header>

      {/* Sous-titre */}
      <div className="px-6 py-2 bg-white border-b flex items-baseline gap-2">
        <h1 className="text-sm font-semibold text-gray-700">Artisans du bâtiment — 64 & 65</h1>
        {artisans.length === 0 && (
          <span className="text-xs text-gray-400">Base vide — lancez la collecte pour importer les données</span>
        )}
      </div>

      {/* Grille */}
      <div className="flex-1 overflow-hidden">
        <ArtisansTable data={artisans} />
      </div>
    </div>
  )
}
