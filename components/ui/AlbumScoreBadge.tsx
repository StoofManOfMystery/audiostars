import { formatScore } from '@/lib/ratings'

interface AlbumScoreBadgeProps {
  score: number | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AlbumScoreBadge({ score, size = 'md', className = '' }: AlbumScoreBadgeProps) {
  if (score === null) return null

  const sizeClass = {
    sm: 'score-badge-sm',
    md: 'score-badge-md',
    lg: 'score-badge-lg',
  }[size]

  return (
    <span className={`${sizeClass} ${className}`}>
      {formatScore(score)}
    </span>
  )
}
