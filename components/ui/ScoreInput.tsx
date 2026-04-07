'use client'

import { useState, useTransition } from 'react'
import { upsertTrackRating, deleteTrackRating } from '@/lib/actions/ratings'

interface ScoreInputProps {
  spotifyTrackId: string
  spotifyAlbumId: string
  initialScore?: number | null
  initialNote?: string | null
  onScoreChange?: (score: number | null) => void
}

export function ScoreInput({
  spotifyTrackId,
  spotifyAlbumId,
  initialScore = null,
  initialNote = null,
  onScoreChange,
}: ScoreInputProps) {
  const [score, setScore] = useState<number | null>(initialScore)
  const [hoveredScore, setHoveredScore] = useState<number | null>(null)
  const [note, setNote] = useState(initialNote ?? '')
  const [showNote, setShowNote] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleScoreClick(value: number) {
    if (isPending) return

    const newScore = value === score ? null : value
    const prevScore = score
    setScore(newScore)
    onScoreChange?.(newScore)

    startTransition(async () => {
      try {
        if (newScore === null) {
          await deleteTrackRating(spotifyTrackId, spotifyAlbumId)
        } else {
          await upsertTrackRating(spotifyTrackId, spotifyAlbumId, newScore, note || undefined)
        }
      } catch {
        // Revert optimistic update
        setScore(prevScore)
        onScoreChange?.(prevScore)
      }
    })
  }

  function handleNoteBlur() {
    if (score !== null && note !== (initialNote ?? '')) {
      startTransition(async () => {
        try {
          await upsertTrackRating(spotifyTrackId, spotifyAlbumId, score, note || undefined)
        } catch {
          // silent fail for note update
        }
      })
    }
  }

  const displayScore = hoveredScore ?? score

  return (
    <div className="flex flex-col gap-1.5">
      {/* Dot row */}
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Rate this track"
        onMouseLeave={() => setHoveredScore(null)}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map(value => {
          const filled = displayScore !== null && value <= displayScore
          const isActive = score !== null && value <= score

          return (
            <button
              key={value}
              type="button"
              onClick={() => handleScoreClick(value)}
              onMouseEnter={() => setHoveredScore(value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') handleScoreClick(value)
                if (e.key === 'ArrowRight' && value < 10) {
                  ;(e.currentTarget.nextElementSibling as HTMLElement)?.focus()
                }
                if (e.key === 'ArrowLeft' && value > 1) {
                  ;(e.currentTarget.previousElementSibling as HTMLElement)?.focus()
                }
              }}
              className={`
                w-5 h-5 rounded-full border transition-all duration-100 focus:outline-none focus:ring-1 focus:ring-accent/50
                ${isPending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
                ${
                  filled
                    ? 'bg-accent border-accent shadow-[0_0_6px_rgba(232,131,42,0.4)]'
                    : hoveredScore !== null && value <= hoveredScore
                    ? 'bg-accent/40 border-accent/60'
                    : isActive
                    ? 'bg-accent border-accent'
                    : 'bg-transparent border-border hover:border-accent/60'
                }
              `}
              aria-label={`Rate ${value} out of 10`}
              aria-pressed={score === value}
              tabIndex={0}
            />
          )
        })}

        {/* Score number */}
        {score !== null && (
          <span className="ml-1.5 text-xs font-bold text-accent min-w-[20px]">
            {score}
          </span>
        )}

        {/* Note toggle */}
        {score !== null && (
          <button
            type="button"
            onClick={() => setShowNote(v => !v)}
            className="ml-1 text-xs text-text-secondary hover:text-accent transition-colors"
            title="Add a note"
          >
            {showNote ? '↑' : '✎'}
          </button>
        )}
      </div>

      {/* Note field */}
      {showNote && score !== null && (
        <div className="flex flex-col gap-1">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 280))}
            onBlur={handleNoteBlur}
            placeholder="Add a note about this track..."
            rows={2}
            maxLength={280}
            className="textarea text-sm py-1.5"
          />
          <span className="text-xs text-text-secondary text-right">
            {note.length}/280
          </span>
        </div>
      )}
    </div>
  )
}
