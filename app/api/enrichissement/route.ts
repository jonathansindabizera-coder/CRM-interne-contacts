import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrichirProspect } from '@/lib/enrichissement/cascade'
import type { ProspectInput } from '@/lib/enrichissement/types'

// POST /api/enrichissement
// Body : { siret: string } — enrichit un seul artisan à la demande (depuis l'UI)
// Timeout Vercel : ~60s — suffisant pour une fiche unique

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let siret: string
  try {
    const body = await req.json()
    siret = body.siret
    if (!siret) throw new Error('siret manquant')
  } catch {
    return NextResponse.json({ error: 'Body invalide — attendu : { siret: string }' }, { status: 400 })
  }

  // Récupérer la fiche depuis Supabase
  const { data: artisan, error: fetchErr } = await supabase
    .from('artisans')
    .select('siret, nom_entreprise, categorie_metier, code_naf, ville, code_postal, departement, telephone, email')
    .eq('siret', siret)
    .single()

  if (fetchErr || !artisan) {
    return NextResponse.json({ error: 'Artisan non trouvé' }, { status: 404 })
  }

  try {
    const resultat = await enrichirProspect(artisan as ProspectInput)

    // Mettre à jour la fiche dans Supabase
    const { error: updateErr } = await supabase
      .from('artisans')
      .update({
        telephone:        resultat.telephone,
        email:            resultat.email,
        site_internet:    resultat.site_internet,
        source_contact:   resultat.source_contact,
        niveau_confiance: resultat.niveau_confiance,
        enrichi_le:       resultat.enrichi_le,
        date_mise_a_jour: new Date().toISOString(),
      })
      .eq('siret', siret)

    if (updateErr) throw updateErr

    return NextResponse.json({
      siret: resultat.siret,
      telephone: resultat.telephone,
      email: resultat.email,
      site_internet: resultat.site_internet,
      source_contact: resultat.source_contact,
      niveau_confiance: resultat.niveau_confiance,
      tentatives: resultat.tentatives.map(t => ({
        source: t.source,
        success: t.success,
        erreur: t.erreur,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
