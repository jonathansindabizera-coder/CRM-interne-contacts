import { NextRequest, NextResponse } from 'next/server'
import { searchOfficialBuildingProspects } from '@/lib/prospects/recherche-entreprises'

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get('page')
  const page = pageParam ? Number(pageParam) : 1

  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: 'Paramètre page invalide' }, { status: 400 })
  }

  try {
    const result = await searchOfficialBuildingProspects(page)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 502 }
    )
  }
}
