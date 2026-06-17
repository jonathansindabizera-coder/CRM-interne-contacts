import * as cheerio from 'cheerio'
import {
  headersNavigateur, fetchAvecTimeout, estBloque,
  extraireTelephone, extraireEmail, normaliser, nomCorrespond,
} from '../utils'
import type { ProspectInput, ContactTrouve } from '../types'

// Societe.com : SIRET + nom dirigeant + parfois contact
// Pappers : alternative gratuite avec données publiques

export async function scrapeSocieteCom(prospect: ProspectInput): Promise<ContactTrouve | null> {
  // Recherche par SIRET en priorité (plus fiable)
  const siret = prospect.siret.replace(/\s/g, '')

  const resultatSiret = await rechercheParSiret(siret)
  if (resultatSiret) return resultatSiret

  // Fallback : Pappers (données publiques + parfois contact)
  return rechercheParPappers(prospect)
}

async function rechercheParSiret(siret: string): Promise<ContactTrouve | null> {
  const url = `https://www.societe.com/cgi-bin/search?champs=${siret}`
  const res = await fetchAvecTimeout(url, {
    headers: headersNavigateur('https://www.societe.com/'),
  })

  if (estBloque('', res.status)) return null
  const html = await res.text()
  if (estBloque(html, res.status)) return null

  const $ = cheerio.load(html)

  // societe.com redirige souvent vers la fiche directe avec SIRET exact
  // La fiche peut contenir un tel ou un site
  const texte = $('body').text()
  const tel = extraireTelephone(texte)
  const email = extraireEmail(texte)

  // Site internet de l'entreprise (parfois dans les infos publiques)
  const site = $('a[href^="http"]')
    .filter((_, el) => {
      const href = $(el).attr('href') ?? ''
      return (
        !href.includes('societe.com') &&
        !href.includes('google') &&
        !href.includes('facebook') &&
        !href.includes('twitter') &&
        !href.includes('linkedin')
      )
    })
    .first()
    .attr('href') ?? null

  if (!tel && !email && !site) return null

  return {
    telephone: tel,
    email,
    site_internet: site,
    source_contact: 'Societe.com',
    niveau_confiance: tel ? 'trouvé - certain' : 'trouvé - à vérifier',
  }
}

async function rechercheParPappers(prospect: ProspectInput): Promise<ContactTrouve | null> {
  const q = encodeURIComponent(prospect.siret)
  const url = `https://www.pappers.fr/entreprise/${q}`

  const res = await fetchAvecTimeout(url, {
    headers: headersNavigateur('https://www.pappers.fr/'),
  })

  if (!res.ok) return null
  const html = await res.text()
  if (estBloque(html, res.status)) return null

  const $ = cheerio.load(html)
  const texte = $('body').text()

  const tel = extraireTelephone(texte)
  const email = extraireEmail(texte)
  const site = $('a[href^="http"]')
    .filter((_, el) => {
      const href = $(el).attr('href') ?? ''
      return !href.includes('pappers.fr') && !href.includes('infogreffe') && !href.includes('societe.com')
    })
    .first()
    .attr('href') ?? null

  if (!tel && !email && !site) return null

  return {
    telephone: tel,
    email,
    site_internet: site,
    source_contact: 'Pappers',
    niveau_confiance: tel ? 'trouvé - certain' : 'trouvé - à vérifier',
  }
}
