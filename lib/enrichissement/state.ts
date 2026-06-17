import fs from 'fs'
import path from 'path'
import type { EtatSession, ResultatEnrichissement } from './types'

const DOSSIER_DATA = path.join(process.cwd(), 'data')
const FICHIER_ETAT = path.join(DOSSIER_DATA, 'enrichissement-etat.json')
const FICHIER_CSV = path.join(DOSSIER_DATA, 'enrichissement-resultats.csv')

function assurerDossier() {
  if (!fs.existsSync(DOSSIER_DATA)) {
    fs.mkdirSync(DOSSIER_DATA, { recursive: true })
  }
}

export function chargerEtat(sessionId: string, total: number): EtatSession {
  assurerDossier()
  if (fs.existsSync(FICHIER_ETAT)) {
    try {
      const contenu = fs.readFileSync(FICHIER_ETAT, 'utf-8')
      const etat: EtatSession = JSON.parse(contenu)
      // Reprendre la session si même session_id, sinon repartir proprement
      if (etat.session_id === sessionId || etat.total === total) {
        console.log(`[état] Reprise trouvée : ${etat.processed}/${etat.total} déjà traités.`)
        return etat
      }
    } catch {
      // Fichier corrompu → on repart de zéro
    }
  }
  return creerEtatInitial(sessionId, total)
}

function creerEtatInitial(sessionId: string, total: number): EtatSession {
  return {
    session_id: sessionId,
    started_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    total,
    processed: 0,
    resultats: {},
    stats: {
      par_source: {},
      leboncoin_bloque: 0,
      total_telephone: 0,
      total_email: 0,
      total_non_trouve: 0,
    },
  }
}

export function sauvegarderEtat(etat: EtatSession) {
  assurerDossier()
  etat.last_updated = new Date().toISOString()
  fs.writeFileSync(FICHIER_ETAT, JSON.stringify(etat, null, 2), 'utf-8')
}

export function enregistrerResultat(etat: EtatSession, resultat: ResultatEnrichissement) {
  etat.resultats[resultat.siret] = resultat
  etat.processed++

  // Mise à jour des stats
  if (resultat.telephone) etat.stats.total_telephone++
  if (resultat.email) etat.stats.total_email++
  if (resultat.niveau_confiance === 'non trouvé') etat.stats.total_non_trouve++
  if (resultat.source_contact) {
    const src = resultat.source_contact
    etat.stats.par_source[src] = (etat.stats.par_source[src] ?? 0) + 1
  }

  // Compter les blocages Leboncoin
  const blocageLBC = resultat.tentatives.find(
    t => t.source === 'Leboncoin' && t.erreur?.includes('bloqué')
  )
  if (blocageLBC) etat.stats.leboncoin_bloque++

  // Écriture CSV progressive (append)
  ecrireCSV(resultat)
}

function ecrireCSV(resultat: ResultatEnrichissement) {
  assurerDossier()
  const entete = !fs.existsSync(FICHIER_CSV)
  const ligne = [
    resultat.siret,
    resultat.telephone ?? '',
    resultat.email ?? '',
    resultat.site_internet ?? '',
    resultat.source_contact ?? '',
    resultat.niveau_confiance,
    resultat.enrichi_le,
  ]
    .map(v => `"${v.replace(/"/g, '""')}"`)
    .join(',')

  if (entete) {
    const enteteLigne = '"siret","telephone","email","site_internet","source_contact","niveau_confiance","enrichi_le"\n'
    fs.writeFileSync(FICHIER_CSV, enteteLigne, 'utf-8')
  }
  fs.appendFileSync(FICHIER_CSV, ligne + '\n', 'utf-8')
}

export function dejaTraite(etat: EtatSession, siret: string): boolean {
  return siret in etat.resultats
}

export function afficherResume(etat: EtatSession) {
  console.log('\n═══════════════ RÉSUMÉ ═══════════════')
  console.log(`Total traité    : ${etat.processed} / ${etat.total}`)
  console.log(`Téléphones      : ${etat.stats.total_telephone}`)
  console.log(`Emails          : ${etat.stats.total_email}`)
  console.log(`Non trouvé      : ${etat.stats.total_non_trouve}`)
  console.log(`Leboncoin bloqué: ${etat.stats.leboncoin_bloque} fois`)
  if (etat.stats.leboncoin_bloque >= 3) {
    console.warn('⚠  Leboncoin bloqué trop souvent — désactiver cette source pour la suite.')
  }
  console.log('\nContacts par source :')
  for (const [src, count] of Object.entries(etat.stats.par_source)) {
    console.log(`  ${src.padEnd(20)} ${count}`)
  }
  console.log(`\nFichiers exportés dans ./data/`)
  console.log('═══════════════════════════════════════')
}

export function cheminCSV(): string {
  return FICHIER_CSV
}
