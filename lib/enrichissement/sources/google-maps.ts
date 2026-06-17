import * as cheerio from 'cheerio'
import {
  headersNavigateur, fetchAvecTimeout, estBloque,
  extraireTelephone, extraireEmail, slugifier, normaliser, nomCorrespond,
} from '../utils'
import type { ProspectInput, ContactTrouve } from '../types'

// --- Voie 1 : Google Places API (si GOOGLE_PLACES_API_KEY fournie) ---

interface PlacesResult {
  name: string
  formatted_phone_number?: string
  website?: string
}

async function viaPlacesAPI(prospect: ProspectInput, apiKey: string): Promise<ContactTrouve | null> {
  const query = encodeURIComponent(`${prospect.nom_entreprise} ${prospect.ville}`)
  const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name&key=${apiKey}`

  const searchRes = await fetchAvecTimeout(searchUrl)
  const searchData = await searchRes.json() as { candidates?: { place_id: string; name: string }[] }
  const candidat = searchData.candidates?.[0]
  if (!candidat) return null
  if (!nomCorrespond(candidat.name, prospect.nom_entreprise)) return null

  const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${candidat.place_id}&fields=formatted_phone_number,website&language=fr&key=${apiKey}`
  const detailRes = await fetchAvecTimeout(detailUrl)
  const detailData = await detailRes.json() as { result?: PlacesResult }
  const detail = detailData.result
  if (!detail) return null

  if (!detail.formatted_phone_number && !detail.website) return null

  const tel = detail.formatted_phone_number
    ? extraireTelephone(detail.formatted_phone_number)
    : null

  return {
    telephone: tel,
    email: null,
    site_internet: detail.website ?? null,
    source_contact: 'Google Maps',
    niveau_confiance: 'trouvé - certain',
  }
}

// --- Voie 2 : Google Search (pas de clé — scrape la SERP, fragile) ---

async function viaGoogleSearch(prospect: ProspectInput): Promise<ContactTrouve | null> {
  const q = encodeURIComponent(`"${prospect.nom_entreprise}" ${prospect.ville} téléphone`)
  const url = `https://www.google.fr/search?q=${q}&hl=fr&gl=fr`

  const res = await fetchAvecTimeout(url, { headers: headersNavigateur('https://www.google.fr/') })
  if (!res.ok || estBloque(await res.clone().text(), res.status)) return null

  const html = await res.text()
  const $ = cheerio.load(html)

  // Google affiche parfois le téléphone dans le panneau de connaissance (Knowledge Panel)
  // Sélecteurs potentiels — peuvent changer à tout moment avec les mises à jour de Google
  const candidats = [
    $('[data-dtype="d3ph"]').text(),          // panneau d'entité (téléphone)
    $('span[aria-label*="Téléphone"]').text(),
    $('[data-attrid="kc:/local:phone"]').text(),
    // texte brut de la page — filet de sécurité
    html,
  ]

  for (const texte of candidats) {
    const tel = extraireTelephone(texte)
    if (tel) {
      const email = extraireEmail(html)
      return {
        telephone: tel,
        email,
        site_internet: null,
        source_contact: 'Google Maps',
        niveau_confiance: 'trouvé - à vérifier',
      }
    }
  }
  return null
}

export async function scrapeGoogleMaps(prospect: ProspectInput): Promise<ContactTrouve | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (apiKey) {
    return viaPlacesAPI(prospect, apiKey)
  }
  return viaGoogleSearch(prospect)
}
