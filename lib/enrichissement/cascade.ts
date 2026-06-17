import { delaiAleatoire } from './utils'
import { scrapeGoogleMaps } from './sources/google-maps'
import { scrapeSiteWeb } from './sources/site-web'
import { scrapePagesJaunes } from './sources/pages-jaunes'
import { scrapeAlloVoisins } from './sources/allovoisins'
import { scrapeAnnuaires } from './sources/annuaires'
import { scrapeSocieteCom } from './sources/societe-com'
import { scrapeLeboncoin } from './sources/leboncoin'
import type { ProspectInput, ResultatEnrichissement, ResultatSource, ContactTrouve } from './types'

// Nombre max de blocages Leboncoin avant de désactiver la source pour la session
const MAX_BLOCAGES_LBC = 3

interface Options {
  leboncoinBloque?: number         // compteur de blocages cumulés sur la session
  onLeboncoinBloque?: () => void   // callback si seuil atteint
}

async function tenterSource(
  nom: ResultatSource['source'],
  fn: () => Promise<ContactTrouve | null>
): Promise<ResultatSource> {
  try {
    const contact = await fn()
    if (contact) {
      return { source: nom, success: true, contact }
    }
    return { source: nom, success: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { source: nom, success: false, erreur: msg }
  }
}

export async function enrichirProspect(
  prospect: ProspectInput,
  options: Options = {}
): Promise<ResultatEnrichissement> {
  const tentatives: ResultatSource[] = []
  let contact: ContactTrouve | null = null

  // Cascade des sources dans l'ordre défini
  // On s'arrête dès qu'on a un téléphone OU un email

  // 1. Google Maps / Google Business
  await delaiAleatoire()
  const googleRes = await tenterSource('Google Maps', () => scrapeGoogleMaps(prospect))
  tentatives.push(googleRes)
  if (googleRes.contact?.telephone || googleRes.contact?.email) {
    contact = googleRes.contact!
  }

  // 2. Site web propre (si Google Maps a trouvé un site mais pas de contact direct)
  if (!contact && googleRes.contact?.site_internet) {
    await delaiAleatoire(300, 800)
    const siteRes = await tenterSource('Site web propre', () =>
      scrapeSiteWeb(googleRes.contact!.site_internet!)
    )
    tentatives.push(siteRes)
    if (siteRes.contact?.telephone || siteRes.contact?.email) {
      contact = siteRes.contact!
    }
  }

  // 3. Pages Jaunes
  if (!contact) {
    await delaiAleatoire()
    const pjRes = await tenterSource('Pages Jaunes', () => scrapePagesJaunes(prospect))
    tentatives.push(pjRes)
    if (pjRes.contact?.telephone || pjRes.contact?.email) {
      contact = pjRes.contact!
    }
    // Si Pages Jaunes a trouvé un site web mais pas de contact, on tente le site
    if (!contact && pjRes.contact?.site_internet) {
      await delaiAleatoire(300, 800)
      const siteRes2 = await tenterSource('Site web propre', () =>
        scrapeSiteWeb(pjRes.contact!.site_internet!)
      )
      tentatives.push(siteRes2)
      if (siteRes2.contact?.telephone || siteRes2.contact?.email) {
        contact = siteRes2.contact!
      }
    }
  }

  // 4. AlloVoisins
  if (!contact) {
    await delaiAleatoire()
    const avRes = await tenterSource('AlloVoisins', () => scrapeAlloVoisins(prospect))
    tentatives.push(avRes)
    if (avRes.contact?.telephone || avRes.contact?.email) {
      contact = avRes.contact!
    }
    if (!contact && avRes.contact?.site_internet) {
      await delaiAleatoire(300, 800)
      const siteRes3 = await tenterSource('Site web propre', () =>
        scrapeSiteWeb(avRes.contact!.site_internet!)
      )
      tentatives.push(siteRes3)
      if (siteRes3.contact?.telephone || siteRes3.contact?.email) {
        contact = siteRes3.contact!
      }
    }
  }

  // 5. Annuaires sectoriels (Hellopro, Batirenov, artisans.fr, Kompass)
  if (!contact) {
    await delaiAleatoire()
    const annRes = await tenterSource('Hellopro', () => scrapeAnnuaires(prospect))
    tentatives.push(annRes)
    if (annRes.contact?.telephone || annRes.contact?.email) {
      contact = annRes.contact!
    }
  }

  // 6. Societe.com / Pappers (SIRET + dirigeant)
  if (!contact) {
    await delaiAleatoire()
    const scRes = await tenterSource('Societe.com', () => scrapeSocieteCom(prospect))
    tentatives.push(scRes)
    if (scRes.contact?.telephone || scRes.contact?.email) {
      contact = scRes.contact!
    }
    if (!contact && scRes.contact?.site_internet) {
      await delaiAleatoire(300, 800)
      const siteRes4 = await tenterSource('Site web propre', () =>
        scrapeSiteWeb(scRes.contact!.site_internet!)
      )
      tentatives.push(siteRes4)
      if (siteRes4.contact?.telephone || siteRes4.contact?.email) {
        contact = siteRes4.contact!
      }
    }
  }

  // 7. Leboncoin (best-effort très limité — en tout dernier)
  const nbBlocages = options.leboncoinBloque ?? 0
  if (!contact && nbBlocages < MAX_BLOCAGES_LBC) {
    await delaiAleatoire(1500, 3000) // délai plus long pour Leboncoin
    const lbcRes = await tenterSource('Leboncoin', () => scrapeLeboncoin(prospect))
    tentatives.push(lbcRes)
    if (lbcRes.contact?.telephone || lbcRes.contact?.email) {
      contact = lbcRes.contact!
    }
    // Si bloqué, avertir le caller pour incrémenter le compteur global
    if (lbcRes.erreur?.includes('bloqué')) {
      options.onLeboncoinBloque?.()
    }
  } else if (nbBlocages >= MAX_BLOCAGES_LBC) {
    tentatives.push({
      source: 'Leboncoin',
      success: false,
      erreur: 'Leboncoin désactivé (seuil de blocages atteint)',
    })
  }

  return {
    siret: prospect.siret,
    telephone: contact?.telephone ?? null,
    email: contact?.email ?? null,
    site_internet: contact?.site_internet ?? null,
    source_contact: contact?.source_contact ?? null,
    niveau_confiance: contact ? contact.niveau_confiance : 'non trouvé',
    tentatives,
    enrichi_le: new Date().toISOString(),
  }
}
