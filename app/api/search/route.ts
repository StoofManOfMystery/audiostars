import { NextResponse } from 'next/server'
import { searchAlbums } from '@/lib/spotify'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json({ albums: [] })
  }

  try {
    const result = await searchAlbums(q, 24)
    return NextResponse.json({ albums: result.albums?.items ?? [] })
  } catch {
    return NextResponse.json({ albums: [] }, { status: 500 })
  }
}
