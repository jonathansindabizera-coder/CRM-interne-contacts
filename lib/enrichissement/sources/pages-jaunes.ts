import * as cheerio from 'cheerio'
import {
  headersNavigateur, fetchAvecTimeout, estBloque,
  extraireTelephone, extraireEmail, normaliser, nomCorrespond,
} from '../utils'
import type { ProspectInput, ContactTrouve } from '../types'

export async function scrapePagesJaunes(prospect: ProspectInput): Promise<ContactTrouve | null> {
  const quoi = encodeURIComponent(prospect.nom_entreprise)
  const ou = encodeURIComponent(prospect.ville)
  const url = `https://www.pagesjaunes.fr/recherche/siret/${prospect.siret}`

  const res = await fetchAvecTimeout(url, {
    headers: headersNavigateur('https://www.pagesjaunes.fr/'),
  })

  if (estBloque('', res.status)) throw new Error(`Pages Jaunes HTTP ${res.status} - bloqué`)
  const html = await res.text()
  if (estBloque(html, res.status)) throw new Error('Pages Jaunes - anti-bot détecté')

  const $ = cheerio.load(html)

  // --- Recherche par SIRET (URL directe, la plus fiable) ---
  // Si redirigé vers une fiche directe, extraire les coordonnées
  const pageTel = extraireTelephone($('body').text())
  const pageEmail = extraireEmail($('body').text())
  const pageSite = $('a[href^="http"]')
    .filter((_, el) => {
      const href = $(el).attr('href') ?? ''
      return !href.includes('pagesjaunes.fr') && !href.includes('google') && !href.includes('facebook')
    })
    .first()
    .attr('href') ?? null

  if (!pageTel && !pageEmail) {
    // Fallback : recherche textuelle si SIRET n'a pas abouti
    return await rechercheTextuelle(prospect)
  }

  return {
    telephone: pageTel,
    email: pageEmail,
    site_internet: pageSite,
    source_contact: 'Pages Jaunes',
    niveau_confiance: pageTel ? 'trouvé - certain' : 'trouvé - à vérifier',
  }
}

async function rechercheTextuelle(prospect: ProspectInput): Promise<ContactTrouve | null> {
  const quoi = encodeURIComponent(prospect.nom_entreprise)
  const ou = encodeURIComponent(`${prospect.code_postal} ${prospect.ville}`)
  const url = `https://www.pagesjaunes.fr/recherche?quoiqui=${quoi}&ou=${ou}`

  const res = await fetchAvecTimeout(url, {
    headers: headersNavigateur('https://www.pagesjaunes.fr/'),
  })
  if (!res.ok) return null
  const html = await res.text()
  if (estBloque(html, res.status)) return null

  const $ = cheerio.load(html)

  // Sélecteurs Pages Jaunes (structure en vigueur mi-2025)
  // Chaque résultat est un article.bi-pro ou li.bi-pro
  let resultat: ContactTrouve | null = null

  $('article, li.bi-pro, [class*="result"]').each((_, el) => {
    if (resultat) return false

    const nom = $(el).find('[class*="denomination"], h2, h3, .name').first().text().trim()
    if (!nomCorrespond(nom, prospect.nom_entreprise)) return

    const ville = $(el).find('[class*="city"], [class*="localite"]').first().text().trim()
    if (ville && !normaliser(ville).includes(normaliser(prospect.ville))) return

    const texte = $(el).text()
    const tel = extraireTelephone(texte)

    const siteLien = $(el).find('a[href^="http"]')
      .filter((_, a) => {
        const href = $(a).attr('href') ?? ''
        return !href.includes('pagesjaunes') && !href.includes('google') && !href.includes('facebook')
      })
      .first()
      .attr('href') ?? null

    if (tel || siteLien) {
      resultat = {
        telephone: tel,
        email: null,
        site_internet: siteLien,
        source_contact: 'Pages Jaunes',
        niveau_confiance: tel ? 'trouvé - certain' : 'trouvé - à vérifier',
      }
    }
  })

  return resultat
}
