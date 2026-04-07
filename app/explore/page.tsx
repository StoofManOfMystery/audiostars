import { createClient } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import { getAlbum } from '@/lib/spotify'
import { getBestImage, getReleaseYear } from '@/lib/spotify'
import Image from 'next/image'
import Link from 'next/link'
import { AlbumScoreBadge } from '@/components/ui/AlbumScoreBadge'
import { formatRelativeTime } from '@/lib/ratings'
import type { TrackRating, Profile } from '@/types/database'

interface RatingWithProfile extends Pick<TrackRating, 'user_id' | 'spotify_album_id' | 'score' | 'updated_at'> {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'is_public'>
}

export default async function ExplorePage() {
  const supabase = createClient()

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Trending: most-rated albums by public users this week
  const trendingResult = await supabase
    .from('track_ratings')
    .select('spotify_album_id, user_id, profiles!inner(is_public)')
    .gte('created_at', oneWeekAgo)
    .eq('profiles.is_public', true)

  interface TrendingRow { spotify_album_id: string; user_id: string }
  const trendingRaw = (trendingResult.data ?? []) as unknown as TrendingRow[]

  const trendingCount: Record<string, Set<string>> = {}
  for (const r of trendingRaw) {
    if (!trendingCount[r.spotify_album_id]) trendingCount[r.spotify_album_id] = new Set()
    trendingCount[r.spotify_album_id].add(r.user_id)
  }
  const trendingAlbumIds = Object.entries(trendingCount)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10)
    .map(([id]) => id)

  // Highest rated: min 5 unique user ratings
  const allRatingsResult = await supabase
    .from('track_ratings')
    .select('spotify_album_id, user_id, score, profiles!inner(is_public)')
    .eq('profiles.is_public', true)

  interface AllRatingRow { spotify_album_id: string; user_id: string; score: number }
  const allRatings = (allRatingsResult.data ?? []) as unknown as AllRatingRow[]

  const albumStats: Record<string, { scores: number[]; users: Set<string> }> = {}
  for (const r of allRatings) {
    if (!albumStats[r.spotify_album_id]) {
      albumStats[r.spotify_album_id] = { scores: [], users: new Set() }
    }
    albumStats[r.spotify_album_id].scores.push(r.score)
    albumStats[r.spotify_album_id].users.add(r.user_id)
  }

  const highestRatedIds = Object.entries(albumStats)
    .filter(([, stats]) => stats.users.size >= 5)
    .map(([id, stats]) => ({
      id,
      avg: Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length * 10) / 10,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)

  // Recently rated public activity
  const recentResult = await supabase
    .from('track_ratings')
    .select('user_id, spotify_album_id, score, updated_at, profiles!inner(id, display_name, avatar_url, is_public)')
    .eq('profiles.is_public', true)
    .order('updated_at', { ascending: false })
    .limit(200)

  const recentRaw = (recentResult.data ?? []) as unknown as RatingWithProfile[]

  const seenRecent = new Set<string>()
  const recentActivity: RatingWithProfile[] = []
  for (const r of recentRaw) {
    const k = `${r.user_id}::${r.spotify_album_id}`
    if (!seenRecent.has(k)) {
      seenRecent.add(k)
      recentActivity.push(r)
    }
  }
  const recentSlice = recentActivity.slice(0, 25)

  const [trendingData, highestData, recentAlbums] = await Promise.all([
    Promise.all(
      trendingAlbumIds.map(id =>
        getAlbum(id)
          .then(album => ({ album, raterCount: trendingCount[id]?.size ?? 0 }))
          .catch(() => null)
      )
    ),
    Promise.all(
      highestRatedIds.map(({ id, avg }) =>
        getAlbum(id)
          .then(album => ({ album, avg }))
          .catch(() => null)
      )
    ),
    Promise.all(
      recentSlice.map(r =>
        getAlbum(r.spotify_album_id)
          .then(album => ({ album, activity: r }))
          .catch(() => null)
      )
    ),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      <h1 className="font-display text-3xl">Explore</h1>

      {/* Trending This Week */}
      <section>
        <h2 className="font-display text-2xl mb-4">Trending This Week</h2>
        {trendingData.filter(Boolean).length === 0 ? (
          <p className="text-text-secondary">No trending albums yet.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {trendingData.filter(Boolean).map((item, i) => {
              if (!item) return null
              return (
                <AlbumHScrollCard
                  key={item.album.id}
                  album={item.album}
                  badge={`${item.raterCount} raters`}
                  rank={i + 1}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Highest Rated */}
      <section>
        <h2 className="font-display text-2xl mb-4">Highest Rated</h2>
        {highestData.filter(Boolean).length === 0 ? (
          <p className="text-text-secondary">Not enough ratings yet (min 5 users per album).</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {highestData.filter(Boolean).map(item => {
              if (!item) return null
              return (
                <AlbumHScrollCard key={item.album.id} album={item.album} score={item.avg} />
              )
            })}
          </div>
        )}
      </section>

      {/* Recently Rated */}
      <section>
        <h2 className="font-display text-2xl mb-4">Recently Rated</h2>
        {recentAlbums.filter(Boolean).length === 0 ? (
          <p className="text-text-secondary">No public ratings yet.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {recentAlbums.filter(Boolean).map((item, i) => {
              if (!item) return null
              const profile = item.activity.profiles
              return (
                <div key={`${item.activity.user_id}-${item.album.id}-${i}`} className="flex-shrink-0 w-40">
                  <AlbumHScrollCard album={item.album} score={item.activity.score} />
                  <div className="flex items-center gap-1.5 mt-1.5 px-1">
                    <Link href={`/profile/${item.activity.user_id}`} className="text-xs text-text-secondary hover:text-accent transition-colors truncate">
                      {profile?.display_name ?? 'Unknown'}
                    </Link>
                    <span className="text-xs text-text-secondary flex-shrink-0">
                      &middot; {formatRelativeTime(item.activity.updated_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

interface AlbumHScrollCardProps {
  album: Awaited<ReturnType<typeof getAlbum>>
  score?: number
  badge?: string
  rank?: number
}

function AlbumHScrollCard({ album, score, badge, rank }: AlbumHScrollCardProps) {
  const artUrl = getBestImage(album.images, 200)
  const year = getReleaseYear(album.release_date)

  return (
    <Link
      href={`/album/${album.id}`}
      className="group flex-shrink-0 w-36 flex flex-col gap-2 card p-2 hover:border-accent/40 transition-all hover:shadow-card-hover"
    >
      <div className="relative aspect-square rounded-input overflow-hidden">
        {rank && (
          <div className="absolute top-1 left-1 z-10 bg-bg/80 text-text-secondary text-[10px] font-bold rounded px-1.5 py-0.5">
            #{rank}
          </div>
        )}
        <Image
          src={artUrl}
          alt={album.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="144px"
        />
        <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors" />
        {score !== undefined && (
          <div className="absolute bottom-1 right-1">
            <AlbumScoreBadge score={score} size="sm" />
          </div>
        )}
        {badge && (
          <div className="absolute bottom-1 left-1">
            <span className="bg-bg/80 text-text-secondary text-[10px] rounded px-1.5 py-0.5">{badge}</span>
          </div>
        )}
      </div>
      <div>
        <p className="font-display text-xs leading-tight line-clamp-2 group-hover:text-accent transition-colors">
          {album.name}
        </p>
        <p className="text-[11px] text-text-secondary truncate mt-0.5">
          {album.artists.map(a => a.name).join(', ')}
        </p>
        <p className="text-[11px] text-text-secondary">{year}</p>
      </div>
    </Link>
  )
}
