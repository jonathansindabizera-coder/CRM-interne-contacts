import * as cheerio from 'cheerio'
import {
  headersNavigateur, fetchAvecTimeout, estBloque,
  extraireTelephone, extraireEmail, slugifier, normaliser, nomCorrespond,
} from '../utils'
import type { ProspectInput, ContactTrouve, SourceNom } from '../types'

interface AnnuaireConfig {
  nom: SourceNom
  buildUrl: (p: ProspectInput) => string
  referer: string
  parseResultat: ($: cheerio.CheerioAPI, prospect: ProspectInput) => ContactTrouve | null
}

// --- Parseurs spécifiques à chaque annuaire ---

function parseHellopro($: cheerio.CheerioAPI, prospect: ProspectInput): ContactTrouve | null {
  // hellopro.fr : liste d'entreprises avec tel parfois visible
  let resultat: ContactTrouve | null = null
  $('[class*="company"], [class*="provider"], article, .result').each((_, el) => {
    if (resultat) return false
    const nom = $('h2, h3, [class*="name"], [class*="title"]', el).first().text().trim()
    if (!nomCorrespond(nom, prospect.nom_entreprise)) return
    const texte = $(el).text()
    const tel = extraireTelephone(texte)
    const email = extraireEmail(texte)
    if (tel || email) {
      resultat = {
        telephone: tel, email, site_internet: null,
        source_contact: 'Hellopro', niveau_confiance: tel ? 'trouvé - certain' : 'trouvé - à vérifier',
      }
    }
  })
  return resultat
}

function parseBatirenov($: cheerio.CheerioAPI, prospect: ProspectInput): ContactTrouve | null {
  let resultat: ContactTrouve | null = null
  $('[class*="artisan"], [class*="pro"], article, .item').each((_, el) => {
    if (resultat) return false
    const nom = $('h2, h3, .name, .title', el).first().text().trim()
    if (!nomCorrespond(nom, prospect.nom_entreprise)) return
    const texte = $(el).text()
    const tel = extraireTelephone(texte)
    const email = extraireEmail(texte)
    const site = $('a[href^="http"]', el)
      .filter((_, a) => !$(a).attr('href')?.includes('batirenov'))
      .first().attr('href') ?? null
    if (tel || email || site) {
      resultat = {
        telephone: tel, email, site_internet: site,
        source_contact: 'Batirenov', niveau_confiance: tel ? 'trouvé - certain' : 'trouvé - à vérifier',
      }
    }
  })
  return resultat
}

function parseArtisansFr($: cheerio.CheerioAPI, prospect: ProspectInput): ContactTrouve | null {
  let resultat: ContactTrouve | null = null
  $('[class*="artisan"], [class*="pro"], .result, article').each((_, el) => {
    if (resultat) return false
    const nom = $('h2, h3, .name', el).first().text().trim()
    if (!nomCorrespond(nom, prospect.nom_entreprise)) return
    const texte = $(el).text()
    const tel = extraireTelephone(texte)
    const email = extraireEmail(texte)
    if (tel || email) {
      resultat = {
        telephone: tel, email, site_internet: null,
        source_contact: 'artisans.fr', niveau_confiance: tel ? 'trouvé - certain' : 'trouvé - à vérifier',
      }
    }
  })
  return resultat
}

function parseKompass($: cheerio.CheerioAPI, prospect: ProspectInput): ContactTrouve | null {
  let resultat: ContactTrouve | null = null
  $('[class*="company"], [class*="result"], article').each((_, el) => {
    if (resultat) return false
    const nom = $('h2, h3, .company-name, [class*="name"]', el).first().text().trim()
    if (!nomCorrespond(nom, prospect.nom_entreprise)) return
    const texte = $(el).text()
    const tel = extraireTelephone(texte)
    const site = $('a[href^="http"]', el)
      .filter((_, a) => !$(a).attr('href')?.includes('kompass'))
      .first().attr('href') ?? null
    if (tel || site) {
      resultat = {
        telephone: tel, email: null, site_internet: site,
        source_contact: 'Kompass', niveau_confiance: tel ? 'trouvé - certain' : 'trouvé - à vérifier',
      }
    }
  })
  return resultat
}

// --- Configuration des 4 annuaires ---

const ANNUAIRES: AnnuaireConfig[] = [
  {
    nom: 'Hellopro',
    buildUrl: (p) =>
      `https://www.hellopro.fr/search?query=${encodeURIComponent(p.nom_entreprise)}&location=${encodeURIComponent(p.ville)}`,
    referer: 'https://www.hellopro.fr/',
    parseResultat: parseHellopro,
  },
  {
    nom: 'Batirenov',
    buildUrl: (p) =>
      `https://www.batirenov.com/artisans/${slugifier(p.ville)}?q=${encodeURIComponent(p.nom_entreprise)}`,
    referer: 'https://www.batirenov.com/',
    parseResultat: parseBatirenov,
  },
  {
    nom: 'artisans.fr',
    buildUrl: (p) =>
      `https://www.artisans.fr/search?q=${encodeURIComponent(p.nom_entreprise)}&ville=${encodeURIComponent(p.ville)}`,
    referer: 'https://www.artisans.fr/',
    parseResultat: parseArtisansFr,
  },
  {
    nom: 'Kompass',
    buildUrl: (p) =>
      `https://fr.kompass.com/searchCompanies?search=${encodeURIComponent(p.nom_entreprise)}&loc=${encodeURIComponent(p.ville)}`,
    referer: 'https://fr.kompass.com/',
    parseResultat: parseKompass,
  },
]

// Tente les 4 annuaires dans l'ordre, s'arrête au premier résultat
export async function scrapeAnnuaires(prospect: ProspectInput): Promise<ContactTrouve | null> {
  for (const annuaire of ANNUAIRES) {
    try {
      const url = annuaire.buildUrl(prospect)
      const res = await fetchAvecTimeout(url, {
        headers: headersNavigateur(annuaire.referer),
      })
      if (estBloque('', res.status)) continue
      const html = await res.text()
      if (estBloque(html, res.status)) continue

      const $ = cheerio.load(html)
      const contact = annuaire.parseResultat($, prospect)
      if (contact) return contact
    } catch {
      // Erreur réseau sur cet annuaire → passer au suivant
    }
  }
  return null
}
