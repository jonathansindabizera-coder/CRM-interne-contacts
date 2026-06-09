export default function Loading() {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center px-6 py-3 bg-red-700 text-white shrink-0">
        <div className="w-7 h-7 bg-white/20 rounded mr-3" />
        <span className="font-semibold text-sm">CAPEB Adour Pyrénées</span>
        <span className="text-red-200 text-xs ml-2">· CRM Artisans</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Chargement des artisans 64 &amp; 65…</p>
        <p className="text-xs text-gray-400">Interrogation de l&apos;API officielle des entreprises</p>
      </div>
    </div>
  )
}
