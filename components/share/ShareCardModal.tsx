'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { getBestImage, getReleaseYear } from '@/lib/spotify'
import { formatScore } from '@/lib/ratings'
import type { SpotifyAlbum } from '@/types/spotify'

interface ShareCardModalProps {
  album: SpotifyAlbum
  score: number
  ratedCount: number
  totalTracks: number
  onClose: () => void
}

export function ShareCardModal({
  album,
  score,
  ratedCount,
  totalTracks,
  onClose,
}: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const artUrl = getBestImage(album.images, 600)
  const year = getReleaseYear(album.release_date)

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleDownload() {
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current!, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1A1612',
        width: 540,
        height: 540,
      })
      const link = document.createElement('a')
      link.download = `audiostars-${album.name.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col items-center gap-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        {/* The shareable card */}
        <div
          ref={cardRef}
          className="w-full aspect-square bg-bg rounded-card overflow-hidden p-8 flex flex-col items-center justify-between shadow-card-hover"
          style={{ background: 'linear-gradient(135deg, #1A1612 0%, #252019 100%)' }}
        >
          {/* Wordmark */}
          <div className="w-full flex justify-start">
            <span className="font-display text-accent text-sm font-bold tracking-wide">
              Audiostars
            </span>
          </div>

          {/* Album art */}
          <div className="relative w-48 h-48 rounded-card overflow-hidden shadow-card-hover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artUrl}
              alt={album.name}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          </div>

          {/* Album info */}
          <div className="w-full flex flex-col items-center gap-1 text-center">
            <h3 className="font-display text-xl text-text-primary leading-tight">
              {album.name}
            </h3>
            <p className="text-text-secondary text-sm">
              {album.artists.map(a => a.name).join(', ')} &middot; {year}
            </p>

            {/* Score */}
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-display font-bold text-accent">
                {formatScore(score)}
              </span>
              <span className="text-text-secondary text-lg">/ 10</span>
            </div>
            <p className="text-text-secondary text-xs">
              {ratedCount} of {totalTracks} tracks rated
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <button onClick={handleDownload} disabled={downloading} className="btn-primary flex-1">
            {downloading ? 'Generating...' : 'Download PNG'}
          </button>
          <button onClick={onClose} className="btn-secondary px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
