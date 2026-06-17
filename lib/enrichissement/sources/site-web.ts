import * as cheerio from 'cheerio'
import {
  headersNavigateur, fetchAvecTimeout, estBloque,
  extraireTelephone, extraireEmail,
} from '../utils'
import type { ContactTrouve } from '../types'

// Scrape le site web propre de l'artisan (trouvé via une autre source)
// Inspecte la page d'accueil + /contact + mentions légales pour téléphone et email

const PAGES_A_TESTER = ['', '/contact', '/contact.html', '/nous-contacter', '/mentions-legales']

export async function scrapeSiteWeb(siteUrl: string): Promise<ContactTrouve | null> {
  const base = siteUrl.replace(/\/$/, '')
  let tel: string | null = null
  let email: string | null = null

  for (const chemin of PAGES_A_TESTER) {
    const url = `${base}${chemin}`
    try {
      const res = await fetchAvecTimeout(url, { headers: headersNavigateur(base) }, 8000)
      if (!res.ok || estBloque('', res.status)) continue

      const html = await res.text()
      if (estBloque(html, res.status)) continue

      const $ = cheerio.load(html)
      const texte = $('body').text()

      if (!tel) tel = extraireTelephone(texte)
      if (!email) email = extraireEmail(texte)

      // Dès qu'on a les deux, on arrête de parcourir les pages
      if (tel && email) break
    } catch {
      // Erreur réseau sur cette page → page suivante
    }
  }

  if (!tel && !email) return null

  return {
    telephone: tel,
    email,
    site_internet: siteUrl,
    source_contact: 'Site web propre',
    niveau_confiance: tel ? 'trouvé - certain' : 'trouvé - à vérifier',
  }
}
