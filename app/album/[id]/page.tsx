import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getAlbum } from '@/lib/spotify'
import { getBestImage, getReleaseYear } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import { calculateAlbumScore } from '@/lib/ratings'
import { AlbumScoreBadge } from '@/components/ui/AlbumScoreBadge'
import { TrackList } from '@/components/album/TrackList'
import { AlbumReviewSection } from '@/components/album/AlbumReviewSection'
import { FriendsScoreRow } from '@/components/album/FriendsScoreRow'
import { ShareCardButton } from '@/components/share/ShareCardButton'
import type { TrackRating, AlbumReview, Friendship } from '@/types/database'

interface AlbumPageProps {
  params: { id: string }
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const [album, user] = await Promise.all([
    getAlbum(params.id).catch(() => null),
    getUser(),
  ])

  if (!album) notFound()

  const supabase = createClient()
  let myRatings: TrackRating[] = []
  let myReview: AlbumReview | null = null
  let friendsRatings: { user_id: string; score: number }[] = []

  if (user) {
    const [ratingsResult, reviewResult] = await Promise.all([
      table<TrackRating>(supabase, 'track_ratings')
        .select('*')
        .eq('user_id', user.id)
        .eq('spotify_album_id', params.id),
      table<AlbumReview>(supabase, 'album_reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('spotify_album_id', params.id)
        .maybeSingle(),
    ])

    myRatings = (ratingsResult.data ?? []) as TrackRating[]
    myReview = (reviewResult.data ?? null) as AlbumReview | null

    const friendsResult = await table<Friendship>(supabase, 'friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const friendIds = ((friendsResult.data ?? []) as Friendship[]).map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    )

    if (friendIds.length > 0) {
      const fRatingsResult = await table<TrackRating>(supabase, 'track_ratings')
        .select('user_id, score')
        .eq('spotify_album_id', params.id)
        .in('user_id', friendIds)

      const byUser: Record<string, number[]> = {}
      for (const r of (fRatingsResult.data ?? []) as Pick<TrackRating, 'user_id' | 'score'>[]) {
        if (!byUser[r.user_id]) byUser[r.user_id] = []
        byUser[r.user_id].push(r.score)
      }
      friendsRatings = Object.entries(byUser).map(([uid, scores]) => ({
        user_id: uid,
        score: calculateAlbumScore(scores.map(s => ({ score: s }))) ?? 0,
      }))
    }
  }

  const myScore = calculateAlbumScore(myRatings)
  const artUrl = getBestImage(album.images, 600)
  const year = getReleaseYear(album.release_date)
  const ratingMap = Object.fromEntries(myRatings.map(r => [r.spotify_track_id, r]))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Album Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        <div className="flex-shrink-0 group relative">
          <div className="relative w-56 h-56 md:w-64 md:h-64 rounded-card overflow-hidden shadow-card-hover">
            <Image
              src={artUrl}
              alt={album.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors duration-200 rounded-card" />
          </div>
        </div>

        <div className="flex flex-col justify-end gap-3">
          <span className="pill capitalize text-xs">{album.album_type}</span>

          <h1 className="font-display text-3xl text-text-primary leading-tight">
            {album.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-text-secondary">
            <span className="text-lg font-medium">
              {album.artists.map(a => a.name).join(', ')}
            </span>
            <span>&middot;</span>
            <span>{year}</span>
            <span>&middot;</span>
            <span>{album.total_tracks} tracks</span>
          </div>

          {album.genres && album.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {album.genres.slice(0, 4).map(g => (
                <span key={g} className="pill capitalize">{g}</span>
              ))}
            </div>
          )}

          {user && (
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-text-secondary uppercase tracking-wide font-medium">
                  Your Score
                </span>
                <div className="flex items-center gap-2">
                  {myScore !== null ? (
                    <AlbumScoreBadge score={myScore} size="lg" />
                  ) : (
                    <span className="text-text-secondary text-base">Not rated yet</span>
                  )}
                  <span className="text-sm text-text-secondary">
                    {myRatings.length} of {album.total_tracks} tracks
                  </span>
                </div>
              </div>

              {friendsRatings.length > 0 && (
                <FriendsScoreRow friendsRatings={friendsRatings} />
              )}
            </div>
          )}

          {user && myScore !== null && (
            <ShareCardButton
              album={album}
              score={myScore}
              ratedCount={myRatings.length}
              totalTracks={album.total_tracks}
            />
          )}
        </div>
      </div>

      {/* Track List */}
      <section className="mb-12">
        <h2 className="font-display text-2xl mb-4">Tracks</h2>
        <TrackList
          album={album}
          isAuthenticated={!!user}
          ratingMap={ratingMap}
        />
      </section>

      {/* Album Review Section */}
      {user && (
        <section>
          <h2 className="font-display text-2xl mb-4">Reviews</h2>
          <AlbumReviewSection
            spotifyAlbumId={params.id}
            myReview={myReview}
            currentUserId={user.id}
          />
        </section>
      )}
    </div>
  )
}
