#!/usr/bin/env tsx
/**
 * Script d'enrichissement de contacts — CAPEB Adour Pyrénées
 *
 * Usage :
 *   npx tsx scripts/enrichir-contacts.ts                     → tous les artisans sans contact
 *   npx tsx scripts/enrichir-contacts.ts --departement 65    → un département
 *   npx tsx scripts/enrichir-contacts.ts --limite 50         → les 50 premiers
 *   npx tsx scripts/enrichir-contacts.ts --siret 12345678901234 → un seul
 *   npx tsx scripts/enrichir-contacts.ts --reprendre         → reprend là où ça s'est arrêté
 *
 * Mode reprise : toujours actif par défaut (les SIRET déjà traités sont ignorés).
 * Pour repartir de zéro, supprimer data/enrichissement-etat.json
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { enrichirProspect } from '../lib/enrichissement/cascade'
import {
  chargerEtat, sauvegarderEtat, enregistrerResultat,
  dejaTraite, afficherResume, cheminCSV,
} from '../lib/enrichissement/state'
import type { ProspectInput } from '../lib/enrichissement/types'

// Charger .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// ── Paramètres CLI ────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

function arg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : undefined
}

const FILTRE_DEPT = arg('departement')
const FILTRE_SIRET = arg('siret')
const LIMITE = arg('limite') ? parseInt(arg('limite')!, 10) : undefined
const BATCH_SUPABASE = 10 // upsert Supabase toutes les N fiches traitées

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur : variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Chargement des prospects ───────────────────────────────────────────────────

async function chargerProspects(): Promise<ProspectInput[]> {
  let query = supabase
    .from('artisans')
    .select('siret, nom_entreprise, categorie_metier, code_naf, ville, code_postal, departement, telephone, email')
    // Priorité aux artisans sans contact enrichi
    .is('source_contact', null)

  if (FILTRE_DEPT) query = query.eq('departement', FILTRE_DEPT)
  if (FILTRE_SIRET) query = query.eq('siret', FILTRE_SIRET)
  if (LIMITE) query = query.limit(LIMITE)

  const { data, error } = await query
  if (error) throw new Error(`Supabase : ${error.message}`)
  return (data ?? []) as ProspectInput[]
}

// ── Mise à jour Supabase en batch ─────────────────────────────────────────────

interface MiseAJour {
  siret: string
  telephone: string | null
  email: string | null
  site_internet: string | null
  source_contact: string | null
  niveau_confiance: string
  enrichi_le: string
  date_mise_a_jour: string
}

const file: MiseAJour[] = []

async function viderFile() {
  if (file.length === 0) return
  const lot = file.splice(0, file.length)
  const { error } = await supabase
    .from('artisans')
    .upsert(
      lot.map(r => ({ ...r, date_mise_a_jour: new Date().toISOString() })),
      { onConflict: 'siret', ignoreDuplicates: false }
    )
  if (error) {
    console.error(`[Supabase] Erreur batch : ${error.message}`)
  } else {
    console.log(`[Supabase] ${lot.length} fiches mises à jour`)
  }
}

// ── Point d'entrée ─────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  Enrichissement de contacts — CAPEB')
  console.log('═══════════════════════════════════════════════')

  let prospects: ProspectInput[]
  try {
    prospects = await chargerProspects()
  } catch (err) {
    console.error('Impossible de charger les prospects :', err)
    process.exit(1)
  }

  if (prospects.length === 0) {
    console.log('Aucun prospect à enrichir (tous déjà traités ou aucun résultat).')
    return
  }

  console.log(`${prospects.length} artisan(s) à enrichir.`)

  const SESSION_ID = FILTRE_SIRET ?? (FILTRE_DEPT ?? 'tous')
  const etat = chargerEtat(SESSION_ID, prospects.length)

  let leboncoinBloque = etat.stats.leboncoin_bloque

  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i]

    if (dejaTraite(etat, p.siret)) {
      process.stdout.write(`  [${i + 1}/${prospects.length}] ${p.siret} — déjà traité, ignoré\n`)
      continue
    }

    process.stdout.write(`  [${i + 1}/${prospects.length}] ${p.nom_entreprise} (${p.ville})... `)

    try {
      const resultat = await enrichirProspect(p, {
        leboncoinBloque,
        onLeboncoinBloque: () => { leboncoinBloque++ },
      })

      enregistrerResultat(etat, resultat)

      const icone = resultat.telephone ? '📞' : resultat.email ? '📧' : '—'
      const src = resultat.source_contact ?? 'non trouvé'
      process.stdout.write(`${icone}  ${src}\n`)

      // Ajouter à la file Supabase
      file.push({
        siret: resultat.siret,
        telephone: resultat.telephone,
        email: resultat.email,
        site_internet: resultat.site_internet,
        source_contact: resultat.source_contact,
        niveau_confiance: resultat.niveau_confiance,
        enrichi_le: resultat.enrichi_le,
        date_mise_a_jour: new Date().toISOString(),
      })

      // Sauvegarder l'état + vider la file Supabase toutes les N fiches
      if (file.length >= BATCH_SUPABASE) {
        sauvegarderEtat(etat)
        await viderFile()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`\n  Erreur sur ${p.siret} : ${msg}`)
      // Ne pas planter — continuer avec la fiche suivante
    }
  }

  // Finalisation
  sauvegarderEtat(etat)
  await viderFile()

  if (leboncoinBloque >= 3) {
    console.warn('\n⚠  Leboncoin bloqué trop souvent dans cette session.')
    console.warn('   Recommandation : désactiver Leboncoin pour les prochaines sessions.')
  }

  afficherResume(etat)
  console.log(`CSV exporté : ${cheminCSV()}`)
}

main().catch(err => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})
