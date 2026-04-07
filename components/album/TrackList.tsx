'use client'

import { useState } from 'react'
import { formatDuration } from '@/lib/spotify'
import { ScoreInput } from '@/components/ui/ScoreInput'
import type { SpotifyAlbum, SpotifyTrack } from '@/types/spotify'
import type { TrackRating } from '@/types/database'

interface TrackListProps {
  album: SpotifyAlbum
  isAuthenticated: boolean
  ratingMap: Record<string, TrackRating>
}

export function TrackList({ album, isAuthenticated, ratingMap }: TrackListProps) {
  const tracks = album.tracks?.items ?? []

  return (
    <div className="card divide-y divide-border">
      {tracks.map(track => (
        <TrackRow
          key={track.id}
          track={track}
          albumId={album.id}
          isAuthenticated={isAuthenticated}
          existingRating={ratingMap[track.id] ?? null}
        />
      ))}
    </div>
  )
}

interface TrackRowProps {
  track: SpotifyTrack
  albumId: string
  isAuthenticated: boolean
  existingRating: TrackRating | null
}

function TrackRow({ track, albumId, isAuthenticated, existingRating }: TrackRowProps) {
  const [localScore, setLocalScore] = useState<number | null>(existingRating?.score ?? null)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 hover:bg-surface-elevated/50 transition-colors group">
      {/* Track number */}
      <span className="text-text-secondary text-sm w-6 text-right flex-shrink-0 font-mono">
        {track.track_number}
      </span>

      {/* Track name + artist */}
      <div className="flex-1 min-w-0">
        <p className={`text-base leading-tight truncate ${localScore !== null ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary transition-colors'}`}>
          {track.name}
        </p>
        {track.artists.length > 1 && (
          <p className="text-xs text-text-secondary truncate mt-0.5">
            {track.artists.map(a => a.name).join(', ')}
          </p>
        )}
      </div>

      {/* Duration */}
      <span className="text-text-secondary text-xs font-mono flex-shrink-0 hidden sm:block">
        {formatDuration(track.duration_ms)}
      </span>

      {/* Score input */}
      {isAuthenticated ? (
        <div className="flex-shrink-0">
          <ScoreInput
            spotifyTrackId={track.id}
            spotifyAlbumId={albumId}
            initialScore={existingRating?.score ?? null}
            initialNote={existingRating?.note ?? null}
            onScoreChange={setLocalScore}
          />
        </div>
      ) : (
        <span className="text-xs text-text-secondary flex-shrink-0">
          Sign in to rate
        </span>
      )}
    </div>
  )
}
