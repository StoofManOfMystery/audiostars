import { NextResponse } from 'next/server'
import { getAlbum } from '@/lib/spotify'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const album = await getAlbum(params.id)
    return NextResponse.json({ album })
  } catch {
    return NextResponse.json({ album: null }, { status: 404 })
  }
}
