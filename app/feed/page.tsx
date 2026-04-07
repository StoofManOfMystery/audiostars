import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import { FeedList } from '@/components/feed/FeedList'
import type { Friendship, TrackRating, Profile } from '@/types/database'

interface FeedPageProps {
  searchParams: { page?: string }
}

const PAGE_SIZE = 25

interface FeedRow {
  user_id: string
  spotify_album_id: string
  updated_at: string
  profiles: Profile
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const user = await getUser()
  if (!user) redirect('/')

  const supabase = createClient()
  const page = parseInt(searchParams.page ?? '1', 10)
  const offset = (page - 1) * PAGE_SIZE

  const friendshipsResult = await table<Friendship>(supabase, 'friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const friendIds = ((friendshipsResult.data ?? []) as Pick<Friendship, 'requester_id' | 'addressee_id'>[]).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  const feedUserIds = [user.id, ...friendIds]

  // Fetch recent ratings with profile join
  const feedResult = await supabase
    .from('track_ratings')
    .select('user_id, spotify_album_id, updated_at, profiles!inner(id, display_name, avatar_url)')
    .in('user_id', feedUserIds)
    .order('updated_at', { ascending: false })
    .limit(500)

  const feedRaw = (feedResult.data ?? []) as unknown as FeedRow[]

  // Deduplicate: one entry per user+album combo
  const seen = new Set<string>()
  const feedItems: FeedRow[] = []
  for (const item of feedRaw) {
    const key = `${item.user_id}::${item.spotify_album_id}`
    if (!seen.has(key)) {
      seen.add(key)
      feedItems.push(item)
    }
  }

  const paged = feedItems.slice(offset, offset + PAGE_SIZE)

  const enriched = await Promise.all(
    paged.map(async item => {
      const ratingsResult = await table<TrackRating>(supabase, 'track_ratings')
        .select('score')
        .eq('user_id', item.user_id)
        .eq('spotify_album_id', item.spotify_album_id)

      const scores = (ratingsResult.data ?? []) as Pick<TrackRating, 'score'>[]
      const albumScore = scores.length > 0
        ? Math.round(scores.reduce((a, r) => a + r.score, 0) / scores.length * 10) / 10
        : null

      return {
        ...item,
        track_count: scores.length,
        album_score: albumScore,
      }
    })
  )

  const hasMore = feedItems.length > offset + PAGE_SIZE
  const hasPrev = page > 1

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl mb-6">Your Feed</h1>

      {enriched.length === 0 ? (
        <div className="card p-12 text-center text-text-secondary">
          <p className="text-lg mb-1">Your feed is quiet.</p>
          <p className="text-sm">Add some friends or rate an album to get started.</p>
        </div>
      ) : (
        <FeedList
          items={enriched}
          currentUserId={user.id}
          page={page}
          hasMore={hasMore}
          hasPrev={hasPrev}
        />
      )}
    </div>
  )
}
