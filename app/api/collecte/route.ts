import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAllArtisans } from '@/lib/collecte/fetch-artisans'
import { TARGET_DEPARTMENT, TARGET_DEPARTMENT_LABEL } from '@/lib/collecte/prospect-targeting'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const artisans = await fetchAllArtisans()

    // Reset nouveau_ce_mois avant upsert
    await supabase.from('artisans').update({ nouveau_ce_mois: false }).neq('id', '')

    const { error } = await supabase
      .from('artisans')
      .upsert(artisans, { onConflict: 'siret', ignoreDuplicates: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      count: artisans.length,
      target: {
        departement: TARGET_DEPARTMENT,
        label: TARGET_DEPARTMENT_LABEL,
        profile: 'Artisans du bâtiment, entreprises de moins de 20 salariés quand l’effectif est connu',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
