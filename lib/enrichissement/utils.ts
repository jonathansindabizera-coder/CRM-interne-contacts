// Délai aléatoire entre requêtes — évite les patterns détectables
export function delaiAleatoire(minMs = 800, maxMs = 2800): Promise<void> {
  const delai = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise(resolve => setTimeout(resolve, delai))
}

// Normalise une chaîne pour le matching (sans accents, minuscules)
export function normaliser(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Génère un slug URL (tirets, pas d'accents)
export function slugifier(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Extrait le premier numéro de téléphone français valide d'un texte
export function extraireTelephone(texte: string): string | null {
  const regex = /(?:\+33\s?|0033\s?|0)[1-9](?:[\s.\-]?\d{2}){4}/g
  const matches = texte.match(regex)
  if (!matches) return null
  const nettoye = matches[0]
    .replace(/[\s.\-]/g, '')
    .replace(/^0033/, '0')
    .replace(/^\+33/, '0')
  if (nettoye.length !== 10) return null
  return nettoye
}

// Extrait le premier email valide d'un texte (filtre les faux positifs évidents)
export function extraireEmail(texte: string): string | null {
  const regex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const matches = texte.match(regex)
  if (!matches) return null
  const blacklist = ['example.com', 'test.com', 'noreply', 'no-reply', 'donotreply', 'sentry.io', 'w3.org']
  const valides = matches.filter(m => !blacklist.some(bl => m.includes(bl)))
  return valides[0] ?? null
}

// Matching approximatif entre deux noms d'entreprise
export function nomCorrespond(nom1: string, nom2: string, seuilMots = 1): boolean {
  const n1 = normaliser(nom1)
  const n2 = normaliser(nom2)
  if (n1 === n2) return true
  if (n1.includes(n2) || n2.includes(n1)) return true
  const motsSignificatifs = (s: string) => s.split(' ').filter(m => m.length > 3)
  const mots1 = motsSignificatifs(n1)
  const mots2 = motsSignificatifs(n2)
  const enCommun = mots1.filter(m => mots2.includes(m))
  return enCommun.length >= seuilMots
}

// Headers navigateur réalistes pour réduire la détection anti-bot
export function headersNavigateur(referer?: string): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
  }
  if (referer) h['Referer'] = referer
  return h
}

// Fetch avec timeout et gestion des erreurs (AbortSignal)
export async function fetchAvecTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

// Détecte les signaux anti-bot dans le HTML reçu
export function estBloque(html: string, status: number): boolean {
  if (status === 403 || status === 429 || status === 503) return true
  const lower = html.toLowerCase()
  return (
    lower.includes('captcha') ||
    lower.includes('datadome') ||
    lower.includes('access denied') ||
    lower.includes('blocked') ||
    lower.includes('robot') ||
    lower.includes('bot detection') ||
    (html.length < 500 && status !== 200)
  )
}
