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
import { ProfileAlbumCard } from '@/components/profile/ProfileAlbumCard'
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

  const ratingsResult = await table<TrackRating>(supabase, 'track_ratings')
    .select('*')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false })

  const ratings = (ratingsResult.data ?? []) as TrackRating[]

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
        .then(album => ({ album, score: a.score, count: a.count, albumId: a.albumId }))
        .catch(() => null)
    )
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start gap-8 mb-14">

        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name ?? 'Profile'}
              width={112}
              height={112}
              className="rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-4xl text-accent font-display font-bold">
              {(profile.display_name ?? 'U')[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary mb-1">
            / Audiostars · Since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-text-primary leading-none mb-4 break-words">
            {profile.display_name ?? 'Anonymous'}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {isOwner && <PublicToggle isPublic={profile.is_public} />}
            {!isOwner && currentUser && (
              <FriendButton targetId={params.id} currentStatus={friendshipStatus} />
            )}
          </div>

          {isOwner ? (
            <ProfileEditSection initialBio={profile.bio ?? ''} />
          ) : (
            profile.bio && <p className="text-sm text-text-secondary max-w-xl leading-relaxed">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-8 mt-6 pt-6 border-t border-border">
            <StatBlock value={totalAlbums} label="Albums" />
            <StatBlock value={totalTracks} label="Tracks" />
            <StatBlock value={avgScore !== null ? avgScore.toString() : '—'} label="Avg Score" accent={avgScore !== null} />
            {favDecade && <StatBlock value={favDecade} label="Top Decade" />}
          </div>
        </div>
      </div>

      {/* ── Top Albums ── */}
      {topAlbumData.length > 0 && (
        <section className="mb-14">
          <SectionLabel>Top Albums</SectionLabel>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            {topAlbumData.filter(Boolean).map(item => {
              if (!item) return null
              const artUrl = getBestImage(item.album.images, 200)
              return (
                <Link
                  key={item.album.id}
                  href={`/album/${item.album.id}`}
                  className="group flex-shrink-0 relative w-20 h-20 sm:w-24 sm:h-24 rounded overflow-hidden ring-1 ring-border hover:ring-accent/50 transition-all"
                >
                  <Image
                    src={artUrl}
                    alt={item.album.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="96px"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute bottom-1 right-1">
                    <AlbumScoreBadge score={item.score} size="sm" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── All Ratings ── */}
      <section>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <SectionLabel>All Ratings</SectionLabel>
          <div className="flex gap-1">
            {(['recent', 'highest', 'lowest'] as const).map(s => (
              <Link
                key={s}
                href={`/profile/${params.id}?sort=${s}`}
                className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors ${
                  sort === s
                    ? 'text-accent bg-accent-muted'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>

        {gridAlbumData.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-text-secondary text-sm uppercase tracking-widest">
              {isOwner ? 'No ratings yet — search for an album to start.' : 'No ratings yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border-t border-border">
            {gridAlbumData.filter(Boolean).map(item => {
              if (!item) return null
              const artUrl = getBestImage(item.album.images, 300)
              return (
                <ProfileAlbumCard
                  key={item.album.id}
                  album={item.album}
                  score={item.score}
                  count={item.count}
                  ratings={albumRatingsMap[item.albumId] ?? []}
                  artUrl={artUrl}
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function StatBlock({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`font-display text-3xl font-bold leading-none ${accent ? 'text-accent' : 'text-text-primary'}`}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-[0.15em] text-text-secondary">{label}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary mb-4 flex items-center gap-3">
      <span>/ {children}</span>
      <span className="flex-1 h-px bg-border" />
    </p>
  )
}
