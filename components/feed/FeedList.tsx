'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlbumScoreBadge } from '@/components/ui/AlbumScoreBadge'
import { formatRelativeTime } from '@/lib/ratings'
import { getBestImage } from '@/lib/spotify'
import { toggleLike, addReply } from '@/lib/actions/social'
import type { SpotifyAlbum } from '@/types/spotify'
import type { Profile } from '@/types/database'

interface FeedItem {
  user_id: string
  spotify_album_id: string
  updated_at: string
  track_count: number
  album_score: number | null
  profiles: Profile | Profile[]
}

interface FeedListProps {
  items: FeedItem[]
  currentUserId: string
  page: number
  hasMore: boolean
  hasPrev: boolean
}

export function FeedList({ items, currentUserId, page, hasMore, hasPrev }: FeedListProps) {
  const [albumCache, setAlbumCache] = useState<Record<string, SpotifyAlbum>>({})

  useEffect(() => {
    const missingIds = items
      .map(i => i.spotify_album_id)
      .filter(id => !albumCache[id])

    if (missingIds.length === 0) return

    Promise.all(
      missingIds.map(id =>
        fetch(`/api/album/${id}`)
          .then(r => r.json())
          .then(data => ({ id, album: data.album as SpotifyAlbum }))
          .catch(() => null)
      )
    ).then(results => {
      const updates: Record<string, SpotifyAlbum> = {}
      for (const r of results) {
        if (r?.album) updates[r.id] = r.album
      }
      setAlbumCache(prev => ({ ...prev, ...updates }))
    })
  }, [items])

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
        const album = albumCache[item.spotify_album_id]
        return (
          <FeedCard
            key={`${item.user_id}-${item.spotify_album_id}-${idx}`}
            item={item}
            profile={profile}
            album={album}
            currentUserId={currentUserId}
          />
        )
      })}

      {/* Pagination */}
      <div className="flex gap-3 justify-center pt-4">
        {hasPrev && (
          <Link href={`/feed?page=${page - 1}`} className="btn-secondary text-sm">
            Previous
          </Link>
        )}
        {hasMore && (
          <Link href={`/feed?page=${page + 1}`} className="btn-secondary text-sm">
            Next page
          </Link>
        )}
      </div>
    </div>
  )
}

interface FeedCardProps {
  item: FeedItem
  profile: Profile | undefined
  album: SpotifyAlbum | undefined
  currentUserId: string
}

function FeedCard({ item, profile, album, currentUserId }: FeedCardProps) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  const artUrl = album ? getBestImage(album.images, 100) : null
  const totalTracks = album?.total_tracks ?? '?'

  async function handleReply() {
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      // We use the album-level interaction type for feed items
      // In a real impl, we'd link to a specific rating ID
      await addReply('album_review', item.user_id, item.user_id, replyText.slice(0, 500))
      setReplyText('')
      setShowReplyInput(false)
    } finally {
      setSubmittingReply(false)
    }
  }

  return (
    <div className="card p-4 hover:border-border/80 transition-colors">
      <div className="flex items-start gap-3">
        {/* Album art */}
        <Link href={`/album/${item.spotify_album_id}`} className="flex-shrink-0 group">
          <div className="relative w-14 h-14 rounded-input overflow-hidden">
            {artUrl ? (
              <Image
                src={artUrl}
                alt={album?.name ?? 'Album'}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="56px"
              />
            ) : (
              <div className="w-full h-full bg-surface-elevated animate-pulse" />
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* Friend name */}
              <Link href={`/profile/${item.user_id}`} className="font-medium text-text-primary hover:text-accent transition-colors text-sm">
                {profile?.display_name ?? 'Unknown'}
              </Link>
              <span className="text-text-secondary text-sm"> rated </span>

              {/* Album name */}
              <Link href={`/album/${item.spotify_album_id}`} className="font-display text-sm text-text-primary hover:text-accent transition-colors">
                {album?.name ?? <span className="inline-block w-24 h-3 bg-surface-elevated rounded animate-pulse" />}
              </Link>

              {album && (
                <span className="text-text-secondary text-sm">
                  {' '}by {album.artists.map(a => a.name).join(', ')}
                </span>
              )}
            </div>

            {/* Score badge */}
            {item.album_score !== null && (
              <AlbumScoreBadge score={item.album_score} size="sm" className="flex-shrink-0" />
            )}
          </div>

          {/* Track count */}
          <p className="text-xs text-text-secondary mt-0.5">
            {item.track_count} of {totalTracks} tracks rated
          </p>

          {/* Actions row */}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-text-secondary">
              {formatRelativeTime(item.updated_at)}
            </span>
            <button
              onClick={() => setShowReplyInput(v => !v)}
              className="text-xs text-text-secondary hover:text-accent transition-colors"
            >
              Reply
            </button>
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value.slice(0, 500))}
                placeholder="Write a reply..."
                className="input text-sm py-1.5 flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleReply() }}
              />
              <button
                onClick={handleReply}
                disabled={submittingReply || !replyText.trim()}
                className="btn-primary text-sm px-3 py-1.5"
              >
                Send
              </button>
            </div>
          )}
        </div>

        {/* User avatar */}
        <Link href={`/profile/${item.user_id}`} className="flex-shrink-0">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name ?? ''}
              width={32}
              height={32}
              className="avatar w-8 h-8"
            />
          ) : (
            <div className="avatar w-8 h-8 bg-accent-muted flex items-center justify-center text-accent text-xs font-bold">
              {(profile?.display_name ?? 'U')[0].toUpperCase()}
            </div>
          )}
        </Link>
      </div>
    </div>
  )
}
