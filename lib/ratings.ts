import type { TrackRating } from '@/types/database'

export function calculateAlbumScore(trackRatings: Pick<TrackRating, 'score'>[]): number | null {
  if (trackRatings.length === 0) return null
  const sum = trackRatings.reduce((acc, r) => acc + r.score, 0)
  return Math.round((sum / trackRatings.length) * 10) / 10
}

export function formatScore(score: number | null): string {
  if (score === null) return '—'
  return score.toFixed(1)
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffWeeks < 52) return `${diffWeeks}w ago`
  return date.toLocaleDateString()
}

export function getFavoriteDecade(releaseYears: string[]): string | null {
  if (releaseYears.length === 0) return null

  const decadeCounts: Record<string, number> = {}
  for (const year of releaseYears) {
    const decade = `${year.slice(0, 3)}0s`
    decadeCounts[decade] = (decadeCounts[decade] ?? 0) + 1
  }

  return Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0][0]
}
