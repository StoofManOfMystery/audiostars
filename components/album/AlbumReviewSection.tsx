'use client'

import { useState, useTransition } from 'react'
import { upsertAlbumReview } from '@/lib/actions/ratings'
import type { AlbumReview } from '@/types/database'

interface AlbumReviewSectionProps {
  spotifyAlbumId: string
  myReview: AlbumReview | null
  currentUserId: string
}

export function AlbumReviewSection({
  spotifyAlbumId,
  myReview,
  currentUserId,
}: AlbumReviewSectionProps) {
  const [body, setBody] = useState(myReview?.body ?? '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await upsertAlbumReview(spotifyAlbumId, body)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary block">
          Your Review
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value.slice(0, 2000))}
          placeholder="Write your thoughts about this album..."
          rows={5}
          className="textarea"
          maxLength={2000}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">{body.length}/2000</span>
          <button
            onClick={handleSave}
            disabled={isPending || body.trim().length === 0}
            className="btn-primary text-sm"
          >
            {isPending ? 'Saving...' : saved ? 'Saved!' : myReview ? 'Update Review' : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
