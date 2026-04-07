import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import { getAlbum } from '@/lib/spotify'
import { getBestImage, getReleaseYear } from '@/lib/spotify'
import { calculateAlbumScore, getFavoriteDecade } from '@/lib/ratings'
import { AlbumScoreBadge } from '@/components/ui/AlbumScoreBadge'
import { ProfileEditSection } from '@/components/profile/ProfileEditSection'
import { PublicToggle } from '@/components/profile/PublicToggle'
import { FriendButton } from '@/components/profile/FriendButton'
import type { TrackRating, Profile, Friendship } from '@/types/database'

interface ProfilePageProps {
  params: { id: string }
  searchParams: { sort?: 'recent' | 'highest' | 'lowest' }
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const supabase = createClient()
  const currentUser = await getUser()

  const profileResult = await table<Profile>(supabase, 'profiles')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  const profile = profileResult.data as Profile | null
  if (!profile) notFound()

  const isOwner = currentUser?.id === params.id

  // Privacy check
  let canView = isOwner || profile.is_public
  if (!canView && currentUser) {
    const friendResult = await table<Friendship>(supabase, 'friendships')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${params.id}),and(requester_id.eq.${params.id},addressee_id.eq.${currentUser.id})`)
      .maybeSingle()
    canView = !!friendResult.data
  }

  if (!canView) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl mb-2">Private Profile</h1>
        <p className="text-text-secondary">This profile is private. Add them as a friend to see their ratings.</p>
      </div>
    )
  }

  // Friendship status
  let friendshipStatus: 'none' | 'pending' | 'accepted' | 'requested' = 'none'
  if (currentUser && !isOwner) {
    const fResult = await table<Friendship>(supabase, 'friendships')
      .select('status, requester_id')
      .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${params.id}),and(requester_id.eq.${params.id},addressee_id.eq.${currentUser.id})`)
      .maybeSingle()

    const friendship = fResult.data as Pick<Friendship, 'status' | 'requester_id'> | null
    if (friendship) {
      if (friendship.status === 'accepted') friendshipStatus = 'accepted'
      else if (friendship.requester_id === currentUser.id) friendshipStatus = 'pending'
      else friendshipStatus = 'requested'
    }
  }

  // All ratings
  const ratingsResult = await table<TrackRating>(supabase, 'track_ratings')
    .select('*')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false })

  const ratings = (ratingsResult.data ?? []) as TrackRating[]

  // Group by album
  const albumRatingsMap: Record<string, TrackRating[]> = {}
  for (const r of ratings) {
    if (!albumRatingsMap[r.spotify_album_id]) albumRatingsMap[r.spotify_album_id] = []
    albumRatingsMap[r.spotify_album_id].push(r)
  }

  const albumScores = Object.entries(albumRatingsMap).map(([albumId, rs]) => ({
    albumId,
    score: calculateAlbumScore(rs) ?? 0,
    count: rs.length,
    latestRating: rs[0]?.updated_at ?? rs[0]?.created_at ?? '',
  }))

  const sort = searchParams.sort ?? 'recent'
  const sortedAlbums = [...albumScores].sort((a, b) => {
    if (sort === 'highest') return b.score - a.score
    if (sort === 'lowest') return a.score - b.score
    return new Date(b.latestRating).getTime() - new Date(a.latestRating).getTime()
  })

  const topAlbums = [...albumScores].sort((a, b) => b.score - a.score).slice(0, 10)

  const topAlbumData = await Promise.all(
    topAlbums.slice(0, 8).map(a =>
      getAlbum(a.albumId)
        .then(album => ({ album, score: a.score }))
        .catch(() => null)
    )
  )

  const totalTracks = ratings.length
  const totalAlbums = albumScores.length
  const avgScore = totalTracks > 0
    ? Math.round(ratings.reduce((s, r) => s + r.score, 0) / totalTracks * 10) / 10
    : null

  const albumYears = topAlbumData
    .filter(Boolean)
    .map(item => item?.album?.release_date ? getReleaseYear(item.album.release_date) : null)
    .filter((y): y is string => y !== null)

  const favDecade = getFavoriteDecade(albumYears)

  const gridAlbumData = await Promise.all(
    sortedAlbums.slice(0, 20).map(a =>
      getAlbum(a.albumId)
        .then(album => ({ album, score: a.score, count: a.count }))
        .catch(() => null)
    )
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
        <div className="flex-shrink-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name ?? 'Profile'}
              width={96}
              height={96}
              className="avatar w-24 h-24"
            />
          ) : (
            <div className="avatar w-24 h-24 bg-accent-muted flex items-center justify-center text-3xl text-accent font-bold font-display">
              {(profile.display_name ?? 'U')[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-3 mb-1">
            <h1 className="font-display text-3xl">{profile.display_name ?? 'Anonymous'}</h1>
            {isOwner && <PublicToggle isPublic={profile.is_public} />}
            {!isOwner && currentUser && (
              <FriendButton targetId={params.id} currentStatus={friendshipStatus} />
            )}
          </div>
          <p className="text-text-secondary text-sm mb-3">
            Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>

          {isOwner ? (
            <ProfileEditSection initialBio={profile.bio ?? ''} />
          ) : (
            profile.bio && <p className="text-base text-text-secondary max-w-xl">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-6 mt-4">
            <Stat label="Albums" value={totalAlbums} />
            <Stat label="Tracks" value={totalTracks} />
            <Stat label="Avg Score" value={avgScore !== null ? `${avgScore}` : '—'} />
            {favDecade && <Stat label="Fav Decade" value={favDecade} />}
          </div>
        </div>
      </div>

      {/* Top Albums Shelf */}
      {topAlbumData.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-2xl mb-4">Top Albums</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {topAlbumData.filter(Boolean).map(item => {
              if (!item) return null
              const artUrl = getBestImage(item.album.images, 200)
              return (
                <Link
                  key={item.album.id}
                  href={`/album/${item.album.id}`}
                  className="group flex-shrink-0 relative w-24 h-24 rounded-card overflow-hidden"
                >
                  <Image
                    src={artUrl}
                    alt={item.album.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="96px"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute bottom-1 right-1">
                    <AlbumScoreBadge score={item.score} size="sm" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* All Ratings Grid */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display text-2xl">All Ratings</h2>
          <div className="flex gap-1">
            {(['recent', 'highest', 'lowest'] as const).map(s => (
              <Link
                key={s}
                href={`/profile/${params.id}?sort=${s}`}
                className={`btn-ghost text-xs capitalize ${sort === s ? 'text-accent bg-accent-muted' : ''}`}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>

        {gridAlbumData.length === 0 ? (
          <div className="card p-12 text-center text-text-secondary">
            <p className="text-lg">No ratings yet</p>
            <p className="text-sm mt-1">
              {isOwner ? 'Search for an album to start rating.' : "This user hasn't rated anything yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {gridAlbumData.filter(Boolean).map(item => {
              if (!item) return null
              const artUrl = getBestImage(item.album.images, 300)
              return (
                <Link
                  key={item.album.id}
                  href={`/album/${item.album.id}`}
                  className="group flex flex-col gap-2 card p-3 hover:border-accent/40 transition-all hover:shadow-card-hover"
                >
                  <div className="relative aspect-square rounded-input overflow-hidden">
                    <Image
                      src={artUrl}
                      alt={item.album.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, 20vw"
                    />
                    <div className="absolute top-1.5 right-1.5">
                      <AlbumScoreBadge score={item.score} size="sm" />
                    </div>
                  </div>
                  <div>
                    <p className="font-display text-sm leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                      {item.album.name}
                    </p>
                    <p className="text-xs text-text-secondary truncate mt-0.5">
                      {item.album.artists.map(a => a.name).join(', ')}
                    </p>
                    <p className="text-xs text-text-secondary">{item.count} tracks rated</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-secondary uppercase tracking-wide font-medium">{label}</span>
      <span className="text-xl font-display font-bold text-text-primary">{value}</span>
    </div>
  )
}
