import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import { FriendsClient } from '@/components/friends/FriendsClient'
import type { Profile, Friendship, TrackRating } from '@/types/database'

export default async function FriendsPage() {
  const user = await getUser()
  if (!user) redirect('/')

  const supabase = createClient()

  const friendshipsResult = await table<Friendship>(supabase, 'friendships')
    .select('requester_id, addressee_id, status, created_at')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const friendships = (friendshipsResult.data ?? []) as Pick<Friendship, 'requester_id' | 'addressee_id' | 'status' | 'created_at'>[]

  const friendIds = friendships.map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  const requestsResult = await table<Friendship>(supabase, 'friendships')
    .select('requester_id, created_at')
    .eq('addressee_id', user.id)
    .eq('status', 'pending')

  const requests = (requestsResult.data ?? []) as Pick<Friendship, 'requester_id' | 'created_at'>[]
  const requesterIds = requests.map(r => r.requester_id)

  const allIds = Array.from(new Set([...friendIds, ...requesterIds]))

  const profilesResult = allIds.length > 0
    ? await table<Profile>(supabase, 'profiles').select('*').in('id', allIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    ((profilesResult.data ?? []) as Profile[]).map(p => [p.id, p])
  )

  const friendProfiles = friendIds.map(id => profileMap[id]).filter((p): p is Profile => !!p)
  const requesterProfiles = requesterIds.map(id => profileMap[id]).filter((p): p is Profile => !!p)

  const lastActivity: Record<string, { albumId: string; score: number; updatedAt: string } | null> = {}
  await Promise.all(
    friendIds.map(async id => {
      const result = await table<TrackRating>(supabase, 'track_ratings')
        .select('spotify_album_id, score, updated_at')
        .eq('user_id', id)
        .order('updated_at', { ascending: false })
        .limit(1)

      const rows = (result.data ?? []) as Pick<TrackRating, 'spotify_album_id' | 'score' | 'updated_at'>[]
      lastActivity[id] = rows[0]
        ? { albumId: rows[0].spotify_album_id, score: rows[0].score, updatedAt: rows[0].updated_at }
        : null
    })
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl mb-6">Friends</h1>
      <FriendsClient
        currentUserId={user.id}
        friends={friendProfiles}
        requests={requesterProfiles}
        lastActivity={lastActivity}
      />
    </div>
  )
}
