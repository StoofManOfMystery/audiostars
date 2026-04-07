'use client'

import { useState, useTransition } from 'react'
import { deleteAllAlbumRatings } from '@/lib/actions/ratings'

interface ClearRatingsButtonProps {
  spotifyAlbumId: string
}

export function ClearRatingsButton({ spotifyAlbumId }: ClearRatingsButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  function handleClick() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    startTransition(async () => {
      await deleteAllAlbumRatings(spotifyAlbumId)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={isPending}
      className={`text-xs transition-colors ${
        confirming
          ? 'text-red-400 hover:text-red-300'
          : 'text-text-secondary hover:text-red-400'
      } ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
    >
      {isPending ? 'Clearing…' : confirming ? 'Tap again to confirm' : 'Clear all ratings'}
    </button>
  )
}
