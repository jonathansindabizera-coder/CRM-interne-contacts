import * as cheerio from 'cheerio'
import {
  headersNavigateur, fetchAvecTimeout, estBloque,
  slugifier, normaliser, extraireTelephone, extraireEmail, nomCorrespond,
} from '../utils'
import type { ProspectInput, ContactTrouve } from '../types'

// Mapping catégorie métier → slug AlloVoisins
// Référence : https://www.allovoisins.com/liste-services
const SLUGS_METIER: Array<[string, string]> = [
  ['maçonnerie', 'maconnerie'],
  ['gros œuvre', 'maconnerie'],
  ['couverture', 'couverture-toiture'],
  ['charpente', 'couverture-toiture'],
  ['plomberie', 'plomberie-installation-sanitaire'],
  ['chauffage', 'chauffage'],
  ['électricité', 'installation-electrique'],
  ['menuiserie', 'menuiserie'],
  ['plâtrerie', 'platrage-isolation'],
  ['isolation', 'platrage-isolation'],
  ['peinture', 'peinture'],
  ['finition', 'peinture'],
  ['terrassement', 'terrassement'],
  ['étanchéité', 'etancheite'],
  ['métallerie', 'metallerie'],
  ['démolition', 'demolition'],
]

function slugMetierAlloVoisins(categorieMetier: string): string | null {
  const cat = normaliser(categorieMetier)
  for (const [mot, slug] of SLUGS_METIER) {
    if (cat.includes(normaliser(mot))) return slug
  }
  return null
}

export async function scrapeAlloVoisins(prospect: ProspectInput): Promise<ContactTrouve | null> {
  const slugMetier = slugMetierAlloVoisins(prospect.categorie_metier)
  if (!slugMetier) return null  // métier sans équivalent sur AlloVoisins

  const slugVille = slugifier(prospect.ville)
  const url = `https://www.allovoisins.com/v/${slugMetier}/${slugVille}`

  const res = await fetchAvecTimeout(url, {
    headers: headersNavigateur('https://www.allovoisins.com/'),
  })

  if (estBloque('', res.status)) throw new Error(`AlloVoisins HTTP ${res.status} - bloqué`)
  const html = await res.text()
  if (estBloque(html, res.status)) throw new Error('AlloVoisins - anti-bot détecté')

  const $ = cheerio.load(html)
  let trouvé: ContactTrouve | null = null

  // Sélecteurs basés sur la structure observée sur allovoisins.com (mid-2025)
  // Chaque profil prestataire est dans un container avec data-provider ou class *provider*
  const selectors = [
    '[data-provider]',
    '[class*="provider"]',
    '[class*="Profile"]',
    '[class*="artisan"]',
    'article',
    '.card',
  ]

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      if (trouvé) return false

      const nomEl = $(el)
        .find('[class*="name"], [class*="title"], [class*="prenom"], h2, h3, strong')
        .first()
        .text()
        .trim()

      if (!nomEl || !nomCorrespond(nomEl, prospect.nom_entreprise)) return

      // Récupérer site web externe si mentionné (rarement visible sans connexion)
      const siteLien = $(el)
        .find('a[href^="http"]')
        .filter((_, a) => !$(a).attr('href')?.includes('allovoisins.com'))
        .first()
        .attr('href') ?? null

      // Le téléphone est masqué sur AlloVoisins sans mise en relation
      // Mais on peut parfois trouver un n° dans le corps de texte
      const texte = $(el).text()
      const tel = extraireTelephone(texte)
      const email = extraireEmail(texte)

      if (tel || email || siteLien) {
        trouvé = {
          telephone: tel,
          email,
          site_internet: siteLien,
          source_contact: 'AlloVoisins',
          niveau_confiance: tel ? 'trouvé - certain' : 'trouvé - à vérifier',
        }
      }
    })
    if (trouvé) break
  }

  return trouvé
}
