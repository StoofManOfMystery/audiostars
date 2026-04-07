'use client'

import { useState } from 'react'
import { ShareCardModal } from './ShareCardModal'
import type { SpotifyAlbum } from '@/types/spotify'

interface ShareCardButtonProps {
  album: SpotifyAlbum
  score: number
  ratedCount: number
  totalTracks: number
}

export function ShareCardButton({ album, score, ratedCount, totalTracks }: ShareCardButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary text-sm self-start flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share your rating
      </button>

      {open && (
        <ShareCardModal
          album={album}
          score={score}
          ratedCount={ratedCount}
          totalTracks={totalTracks}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
