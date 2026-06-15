'use client'

import { useState } from 'react'

const EXPECTED_COLUMNS = [
  'nom_entreprise',
  'siret',
  'siren',
  'dirigeant',
  'email',
  'telephone',
  'ville',
]

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function splitHeader(line: string) {
  const separator = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ','
  return line.split(separator).map(value => value.trim().replace(/^"|"$/g, '')).filter(Boolean)
}

export function MembersUploadPanel() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [message, setMessage] = useState('Aucune liste adhérents téléversée pour le moment.')

  function handleFile(file?: File) {
    if (!file) return

    setFileName(file.name)
    setFileSize(formatFileSize(file.size))
    setColumns([])

    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv')
    if (!isCsv) {
      setMessage('Fichier sélectionné. La lecture XLS/XLSX sera reliée à l’import base dans la prochaine étape.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const firstLine = text.split(/\r?\n/).find(Boolean)
      setColumns(firstLine ? splitHeader(firstLine).slice(0, 12) : [])
      setMessage('Fichier CSV prêt pour la future comparaison adhérents / prospects.')
    }
    reader.onerror = () => {
      setMessage('Impossible de lire ce fichier localement. Réessayez avec un CSV exporté proprement.')
    }
    reader.readAsText(file.slice(0, 4096), 'utf-8')
  }

  return (
    <section className="rounded-xl border border-dashed border-red-200 bg-red-50/40 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Liste adhérents CAPEB 65
          </p>
          <h2 className="mt-1 text-base font-semibold text-gray-900">
            Téléverser la liste adhérents pour isoler les non-adhérents
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Cette zone prépare le rapprochement entre les artisans collectés officiellement et votre fichier
            adhérents. La déduplication se fera en priorité par SIRET, puis SIREN, puis nom + ville.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXPECTED_COLUMNS.map(column => (
              <span key={column} className="rounded-full bg-white px-2 py-1 text-xs text-gray-600 ring-1 ring-red-100">
                {column}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <input
            id="members-upload"
            type="file"
            accept=".csv,.xls,.xlsx,text/csv"
            className="sr-only"
            onChange={event => handleFile(event.target.files?.[0])}
          />
          <label
            htmlFor="members-upload"
            className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-red-700 px-3 text-sm font-medium text-white transition-colors hover:bg-red-800"
          >
            Choisir un fichier
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-white p-3 text-sm ring-1 ring-red-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-800">{fileName ?? 'Aucun fichier sélectionné'}</span>
          {fileSize && <span className="text-xs text-gray-400">({fileSize})</span>}
        </div>
        <p className="mt-1 text-xs text-gray-500">{message}</p>
        {columns.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Colonnes détectées : <span className="text-gray-700">{columns.join(', ')}</span>
          </p>
        )}
      </div>
    </section>
  )
}
