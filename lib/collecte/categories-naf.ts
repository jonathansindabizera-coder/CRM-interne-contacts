const MAP: Record<string, string> = {
  '4120A': 'Maçonnerie / gros œuvre',
  '4120B': 'Maçonnerie / gros œuvre',
  '4399C': 'Maçonnerie / gros œuvre',
  '4391A': 'Couverture / charpente',
  '4391B': 'Couverture / charpente',
  '4322A': 'Plomberie / chauffage',
  '4322B': 'Plomberie / chauffage',
  '4321A': 'Électricité',
  '4321B': 'Électricité',
  '4332A': 'Menuiserie',
  '4332B': 'Menuiserie',
  '4332C': 'Menuiserie',
  '4331Z': 'Plâtrerie / isolation',
  '4329A': 'Plâtrerie / isolation',
  '4334Z': 'Peinture / finition',
  '4333Z': 'Peinture / finition',
  '4339Z': 'Peinture / finition',
  '4312A': 'Terrassement / VRD',
  '4312B': 'Terrassement / VRD',
  '4399A': 'Étanchéité / métallerie',
  '4399B': 'Étanchéité / métallerie',
  '4311Z': 'Démolition / autres',
  '4399D': 'Démolition / autres',
  '4399E': 'Démolition / autres',
}

export function getCategorieMetier(codeNaf: string): string {
  const normalized = codeNaf.replace('.', '').toUpperCase()
  return MAP[normalized] ?? 'Autres travaux'
}
