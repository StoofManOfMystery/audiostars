import { createClient } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import Image from 'next/image'
import { AlbumScoreBadge } from '@/components/ui/AlbumScoreBadge'
import { calculateAlbumScore } from '@/lib/ratings'
import type { Profile } from '@/types/database'

interface FriendsScoreRowProps {
  friendsRatings: { user_id: string; score: number }[]
}

export async function FriendsScoreRow({ friendsRatings }: FriendsScoreRowProps) {
  if (friendsRatings.length === 0) return null

  const supabase = createClient()
  const ids = friendsRatings.map(r => r.user_id)
  const result = await table<Profile>(supabase, 'profiles')
    .select('id, display_name, avatar_url')
    .in('id', ids)

  const profileMap = Object.fromEntries(
    ((result.data ?? []) as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[])
      .map(p => [p.id, p])
  )
  const avgScore = calculateAlbumScore(friendsRatings.map(r => ({ score: r.score })))

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-secondary uppercase tracking-wide font-medium">
        Friends
      </span>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {friendsRatings.slice(0, 4).map(r => {
            const p = profileMap[r.user_id]
            return p?.avatar_url ? (
              <Image
                key={r.user_id}
                src={p.avatar_url}
                alt={p.display_name ?? ''}
                width={24}
                height={24}
                className="avatar w-6 h-6 border-2 border-surface"
              />
            ) : (
              <div
                key={r.user_id}
                className="avatar w-6 h-6 border-2 border-surface bg-accent-muted flex items-center justify-center text-accent text-[10px] font-bold"
              >
                {(p?.display_name ?? '?')[0].toUpperCase()}
              </div>
            )
          })}
        </div>
        {avgScore !== null && <AlbumScoreBadge score={avgScore} size="sm" />}
      </div>
    </div>
  )
}
