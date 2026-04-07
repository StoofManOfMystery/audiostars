'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { SpotifyAlbum } from '@/types/spotify'
import type { TrackRating } from '@/types/database'

interface Props {
  album: SpotifyAlbum
  score: number
  count: number
  ratings: TrackRating[]
  artUrl: string
}

export function ProfileAlbumCard({ album, score, count, ratings, artUrl }: Props) {
  const [expanded, setExpanded] = useState(false)
  const ratingMap = Object.fromEntries(ratings.map(r => [r.spotify_track_id, r.score]))
  const tracks = album.tracks?.items ?? []

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-4 py-4 group">
        <Link href={`/album/${album.id}`} className="flex-shrink-0">
          <div className="relative w-14 h-14 rounded overflow-hidden ring-1 ring-border group-hover:ring-accent/40 transition-all">
            <Image src={artUrl} alt={album.name} fill className="object-cover" sizes="56px" />
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/album/${album.id}`}>
            <p className="font-display text-sm sm:text-base text-text-primary hover:text-accent transition-colors line-clamp-1 leading-tight">
              {album.name}
            </p>
          </Link>
          <p className="text-xs text-text-secondary mt-0.5 truncate">
            {album.artists.map((a: { name: string }) => a.name).join(', ')}
          </p>
          <p className="text-xs text-text-secondary/60 mt-0.5 uppercase tracking-wide">
            {count} / {album.total_tracks} tracks
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-display text-2xl font-bold text-accent tabular-nums">
            {score % 1 === 0 ? score.toFixed(0) : score.toFixed(1)}
          </span>
          {tracks.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[10px] uppercase tracking-widest text-text-secondary hover:text-accent transition-colors w-12 text-right"
            >
              {expanded ? 'Hide' : 'Tracks'}
            </button>
          )}
        </div>
      </div>

      {expanded && tracks.length > 0 && (
        <div className="pb-4 pl-[72px] pr-2">
          <div className="border-l border-border/40 pl-4 space-y-0.5">
            {tracks.map((track: { id: string; track_number: number; name: string }) => {
              const trackScore = ratingMap[track.id]
              return (
                <div key={track.id} className="flex items-center gap-3 py-1">
                  <span className="text-[11px] text-text-secondary/40 w-4 text-right font-mono flex-shrink-0">
                    {track.track_number}
                  </span>
                  <span className={`text-xs flex-1 truncate ${trackScore !== undefined ? 'text-text-primary' : 'text-text-secondary/40'}`}>
                    {track.name}
                  </span>
                  {trackScore !== undefined ? (
                    <span className="text-xs font-bold text-accent font-mono w-5 text-right flex-shrink-0">
                      {trackScore}
                    </span>
                  ) : (
                    <span className="text-xs text-text-secondary/20 w-5 text-right flex-shrink-0">—</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
