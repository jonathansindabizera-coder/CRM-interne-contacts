import { NextResponse, type NextRequest } from 'next/server'

// Auth désactivée en mode démo — à réactiver quand Supabase sera configuré
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
