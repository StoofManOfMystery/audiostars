import { searchAlbums } from '@/lib/spotify'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import { SearchClient } from '@/components/album/SearchClient'
import type { TrackRating } from '@/types/database'

interface SearchPageProps {
  searchParams: { q?: string }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q?.trim() ?? ''
  const user = await getUser()

  let albums = null
  const userAlbumScores: Record<string, number | null> = {}

  if (query.length >= 2) {
    const result = await searchAlbums(query, 24).catch(() => null)
    // Keep null on error so the client knows to retry via the API route
    albums = result ? (result.albums?.items ?? []) : null

    if (user && albums && albums.length > 0) {
      const albumIds = albums.map(a => a.id)
      const supabase = createClient()
      const ratingsResult = await table<TrackRating>(supabase, 'track_ratings')
        .select('spotify_album_id, score')
        .eq('user_id', user.id)
        .in('spotify_album_id', albumIds)

      const grouped: Record<string, number[]> = {}
      for (const r of (ratingsResult.data ?? []) as Pick<TrackRating, 'spotify_album_id' | 'score'>[]) {
        if (!grouped[r.spotify_album_id]) grouped[r.spotify_album_id] = []
        grouped[r.spotify_album_id].push(r.score)
      }
      for (const [albumId, scores] of Object.entries(grouped)) {
        const sum = scores.reduce((a, b) => a + b, 0)
        userAlbumScores[albumId] = Math.round((sum / scores.length) * 10) / 10
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SearchClient
        initialQuery={query}
        initialAlbums={albums}
        userAlbumScores={userAlbumScores}
        isAuthenticated={!!user}
      />
    </div>
  )
}
