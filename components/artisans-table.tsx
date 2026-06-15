'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState,
  type ColumnFiltersState, type VisibilityState,
} from '@tanstack/react-table'
import type { Artisan } from '@/lib/db/schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArtisanDrawer } from '@/components/artisan-drawer'

const STATUT_COLORS: Record<string, string> = {
  nouveau: 'bg-blue-100 text-blue-800',
  a_contacter: 'bg-yellow-100 text-yellow-800',
  contacte: 'bg-purple-100 text-purple-800',
  relance: 'bg-orange-100 text-orange-800',
  rdv: 'bg-teal-100 text-teal-800',
  adherent: 'bg-green-100 text-green-800',
  prospect_perdu: 'bg-gray-100 text-gray-600',
  opt_out: 'bg-red-100 text-red-700',
}

const STATUT_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  a_contacter: 'À contacter',
  contacte: 'Contacté',
  relance: 'Relance',
  rdv: 'RDV',
  adherent: 'Adhérent',
  prospect_perdu: 'Perdu',
  opt_out: 'Opt-out',
}

function exportCsv(data: Artisan[]) {
  const headers = ['Entreprise', 'SIRET', 'Métier', 'Ville', 'Département', 'Téléphone', 'Email', 'Statut', 'RGE', 'Adhérent']
  const rows = data.map(a => [
    a.nom_entreprise, a.siret, a.categorie_metier ?? '', a.ville ?? '',
    a.departement ?? '', a.telephone ?? '', a.email ?? '',
    STATUT_LABELS[a.statut ?? 'nouveau'] ?? '', a.rge ? 'Oui' : 'Non', a.est_adherent ? 'Oui' : 'Non',
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `artisans-capeb-${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export function ArtisansTable({ data }: { data: Artisan[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null)
  const [deptFilter, setDeptFilter] = useState('tous')
  const [metierFilter, setMetierFilter] = useState('tous')
  const [statutFilter, setStatutFilter] = useState('tous')
  const [rgeFilter, setRgeFilter] = useState('tous')
  const [collecteLoading, setCollecteLoading] = useState(false)

  const metiers = useMemo(() => [...new Set(data.map(a => a.categorie_metier).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() => data.filter(a => {
    if (deptFilter !== 'tous' && a.departement !== deptFilter) return false
    if (metierFilter !== 'tous' && a.categorie_metier !== metierFilter) return false
    if (statutFilter !== 'tous' && a.statut !== statutFilter) return false
    if (rgeFilter === 'oui' && !a.rge) return false
    if (rgeFilter === 'non' && a.rge) return false
    return true
  }), [data, deptFilter, metierFilter, statutFilter, rgeFilter])

  const columns: ColumnDef<Artisan>[] = [
    { accessorKey: 'nom_entreprise', header: 'Entreprise', cell: i => <span className="font-medium">{i.getValue() as string}</span> },
    { accessorKey: 'categorie_metier', header: 'Métier' },
    { accessorKey: 'ville', header: 'Ville' },
    { accessorKey: 'telephone', header: 'Téléphone' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'site_internet', header: 'Site web' },
    { accessorKey: 'nombre_salaries', header: 'Effectif' },
    { accessorKey: 'statut', header: 'Statut', cell: i => {
      const s = i.getValue() as string
      return <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[s] ?? ''}`}>{STATUT_LABELS[s] ?? s}</span>
    }},
    { accessorKey: 'rge', header: 'RGE', size: 60, cell: i => i.getValue() ? <Badge className="bg-green-100 text-green-800 text-xs">RGE</Badge> : null },
    { accessorKey: 'est_adherent', header: 'Adhérent', size: 80, cell: i => i.getValue() ? <Badge className="bg-blue-100 text-blue-800 text-xs">Oui</Badge> : null },
  ]

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  async function lancerCollecte() {
    if (!confirm('Lancer la collecte officielle des artisans du bâtiment du 65 ? Cela peut prendre plusieurs minutes.')) return
    setCollecteLoading(true)
    try {
      const res = await fetch('/api/collecte', { method: 'POST' })
      const json = await res.json()
      if (json.success) alert(`Collecte terminée : ${json.count} artisans 65 importés.`)
      else alert('Erreur : ' + json.error)
    } finally {
      setCollecteLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-white">
        <Input
          placeholder="Rechercher entreprise, ville…"
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-64"
        />
        <Select value={deptFilter} onValueChange={v => setDeptFilter(v ?? 'tous')}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Département" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous dép.</SelectItem>
            <SelectItem value="65">65 — Htes-Pyr.</SelectItem>
          </SelectContent>
        </Select>
        <Select value={metierFilter} onValueChange={v => setMetierFilter(v ?? 'tous')}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Métier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous métiers</SelectItem>
            {metiers.map(m => <SelectItem key={m!} value={m!}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statutFilter} onValueChange={v => setStatutFilter(v ?? 'tous')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous statuts</SelectItem>
            {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={rgeFilter} onValueChange={v => setRgeFilter(v ?? 'tous')}>
          <SelectTrigger className="w-28"><SelectValue placeholder="RGE" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous</SelectItem>
            <SelectItem value="oui">RGE uniquement</SelectItem>
            <SelectItem value="non">Non RGE</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(table.getFilteredRowModel().rows.map(r => r.original))}
            disabled={table.getFilteredRowModel().rows.length === 0}
          >
            Exporter CSV
          </Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={lancerCollecte} disabled={collecteLoading}>
            {collecteLoading ? 'Collecte en cours…' : 'Collecter artisans 65'}
          </Button>
        </div>
      </div>

      {/* Compteur */}
      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b">
        {table.getFilteredRowModel().rows.length.toLocaleString('fr')} artisan{table.getFilteredRowModel().rows.length > 1 ? 's' : ''} affichés sur {data.length.toLocaleString('fr')} au total
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b cursor-pointer select-none whitespace-nowrap"
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={`cursor-pointer border-b hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                onClick={() => setSelectedArtisan(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2 text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-gray-400">
                  Aucune donnée démo. Lancez la collecte officielle du 65, puis téléversez la liste adhérents pour identifier les non-adhérents.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-white text-sm">
        <span className="text-gray-500">
          Page {table.getPageCount() === 0 ? 0 : table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Précédent</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Suivant</Button>
        </div>
      </div>

      {selectedArtisan && (
        <ArtisanDrawer artisan={selectedArtisan} onClose={() => setSelectedArtisan(null)} />
      )}
    </div>
  )
}
