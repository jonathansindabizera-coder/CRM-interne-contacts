'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Artisan } from '@/lib/db/schema'

const STATUT_LABELS: Record<string, string> = {
  nouveau: 'Nouveau', a_contacter: 'À contacter', contacte: 'Contacté',
  relance: 'Relance', rdv: 'RDV', adherent: 'Adhérent',
  prospect_perdu: 'Perdu', opt_out: 'Opt-out',
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  )
}

export function ArtisanDrawer({ artisan, onClose }: { artisan: Artisan; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">{artisan.nom_entreprise}</SheetTitle>
          <div className="flex flex-wrap gap-2 mt-1">
            {artisan.statut && <Badge variant="outline">{STATUT_LABELS[artisan.statut] ?? artisan.statut}</Badge>}
            {artisan.rge && <Badge className="bg-green-100 text-green-800">RGE</Badge>}
            {artisan.est_adherent && <Badge className="bg-blue-100 text-blue-800">Adhérent</Badge>}
            {artisan.nouveau_ce_mois && <Badge className="bg-orange-100 text-orange-800">Nouveau ce mois</Badge>}
          </div>
        </SheetHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Row label="SIRET" value={artisan.siret} />
            <Row label="SIREN" value={artisan.siren} />
            <Row label="Métier" value={artisan.categorie_metier} />
            <Row label="Code NAF" value={artisan.code_naf} />
            <Row label="Activité" value={artisan.activite} />
            <Row label="Département" value={artisan.departement} />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <Row label="Adresse" value={artisan.adresse} />
            <Row label="Code postal" value={artisan.code_postal} />
            <Row label="Ville" value={artisan.ville} />
            <Row label="Téléphone" value={artisan.telephone} />
            <Row label="Email" value={artisan.email} />
            <Row label="Site internet" value={artisan.site_internet} />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <Row label="Effectif" value={artisan.nombre_salaries} />
            <Row label="Chiffre d'affaires" value={artisan.chiffre_affaires ? `${Number(artisan.chiffre_affaires).toLocaleString('fr')} €` : null} />
            <Row label="Création" value={artisan.date_creation ?? null} />
            <Row label="Source" value={artisan.source_donnees} />
            <Row label="Mise à jour" value={artisan.date_mise_a_jour ? new Date(artisan.date_mise_a_jour).toLocaleDateString('fr') : null} />
          </div>

          {artisan.notes && (
            <>
              <Separator />
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Notes</span>
                <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{artisan.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
