import * as cheerio from 'cheerio'
import {
  headersNavigateur, fetchAvecTimeout, estBloque,
  extraireTelephone, extraireEmail, nomCorrespond,
} from '../utils'
import type { ProspectInput, ContactTrouve } from '../types'

// LEBONCOIN — BEST-EFFORT TRÈS LIMITÉ
//
// Leboncoin utilise Datadome (protection anti-bot active) et interdit le scraping dans ses CGU.
// Règles strictes :
//   - Une seule tentative par fiche, pas de retry.
//   - Au moindre signal anti-bot (403, 429, CAPTCHA, page vide) → abandon immédiat.
//   - Si le taux de blocage global dépasse 3 occurrences, le caller doit désactiver cette source.

export async function scrapeLeboncoin(prospect: ProspectInput): Promise<ContactTrouve | null> {
  const q = encodeURIComponent(`${prospect.nom_entreprise} ${prospect.ville}`)
  // Catégorie 57 = "Artisans" / services professionnels bâtiment
  const url = `https://www.leboncoin.fr/recherche?q=${q}&category=57`

  let res: Response
  try {
    res = await fetchAvecTimeout(url, {
      headers: headersNavigateur('https://www.leboncoin.fr/'),
    }, 8000)
  } catch {
    throw new Error('Leboncoin - timeout/réseau - bloqué')
  }

  // Contrôle anti-bot strict : abandon immédiat dès le moindre signal
  if (res.status === 403 || res.status === 429 || res.status === 503) {
    throw new Error(`Leboncoin - HTTP ${res.status} - bloqué`)
  }

  const html = await res.text()

  if (estBloque(html, res.status)) {
    throw new Error('Leboncoin - anti-bot détecté (Datadome) - bloqué')
  }

  const $ = cheerio.load(html)

  // Recherche de l'annonce correspondant au prospect
  let resultat: ContactTrouve | null = null

  $('[data-qa-id="aditem"], article, [class*="ad_"], [class*="item"]').each((_, el) => {
    if (resultat) return false

    const titre = $('[data-qa-id="aditem_title"], h2, h3, [class*="title"]', el).first().text().trim()
    if (!nomCorrespond(titre, prospect.nom_entreprise)) return

    const texte = $(el).text()
    const tel = extraireTelephone(texte)
    const email = extraireEmail(texte)

    if (tel || email) {
      resultat = {
        telephone: tel,
        email,
        site_internet: null,
        source_contact: 'Leboncoin',
        // Leboncoin n'est pas une source officielle → confiance réduite
        niveau_confiance: 'trouvé - à vérifier',
      }
    }
  })

  return resultat
}
