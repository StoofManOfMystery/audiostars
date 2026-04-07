'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AlbumScoreBadge } from '@/components/ui/AlbumScoreBadge'
import { getBestImage, getReleaseYear } from '@/lib/spotify'
import type { SpotifyAlbum } from '@/types/spotify'

interface SearchClientProps {
  initialQuery: string
  initialAlbums: SpotifyAlbum[] | null
  userAlbumScores: Record<string, number | null>
  isAuthenticated: boolean
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function SearchClient({
  initialQuery,
  initialAlbums,
  userAlbumScores,
  isAuthenticated,
}: SearchClientProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [albums, setAlbums] = useState<SpotifyAlbum[] | null>(initialAlbums)
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    if (debouncedQuery === initialQuery) return
    if (debouncedQuery.length < 2) {
      setAlbums(null)
      router.replace('/search', { scroll: false })
      return
    }

    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(data => {
        setAlbums(data.albums ?? [])
        router.replace(`/search?q=${encodeURIComponent(debouncedQuery)}`, { scroll: false })
      })
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  return (
    <div className="space-y-8">
      {/* Search bar */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search albums, artists..."
          autoFocus
          className="input pl-12 py-4 text-lg rounded-card"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        )}
      </div>

      {/* Results */}
      {albums === null && (
        <div className="text-center py-20 text-text-secondary">
          <p className="text-lg">Search for an album to get started</p>
          <p className="text-sm mt-1">Try an artist name, album title, or keyword</p>
        </div>
      )}

      {albums !== null && albums.length === 0 && (
        <div className="text-center py-20 text-text-secondary">
          <p className="text-lg">No albums found for &ldquo;{debouncedQuery}&rdquo;</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {albums !== null && albums.length > 0 && (
        <div>
          <p className="text-sm text-text-secondary mb-4">
            {albums.length} results for &ldquo;{debouncedQuery}&rdquo;
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {albums.map(album => (
              <AlbumCard
                key={album.id}
                album={album}
                userScore={userAlbumScores[album.id] ?? null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AlbumCard({
  album,
  userScore,
}: {
  album: SpotifyAlbum
  userScore: number | null
}) {
  const artUrl = getBestImage(album.images, 300)
  const year = getReleaseYear(album.release_date)

  return (
    <Link
      href={`/album/${album.id}`}
      className="group flex flex-col gap-2 card p-3 hover:border-accent/40 transition-all duration-200 hover:shadow-card-hover"
    >
      {/* Art */}
      <div className="relative aspect-square rounded-input overflow-hidden">
        <Image
          src={artUrl}
          alt={album.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
        />
        <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors duration-200" />
        {userScore !== null && (
          <div className="absolute top-1.5 right-1.5">
            <AlbumScoreBadge score={userScore} size="sm" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-0.5">
        <p className="font-display text-sm leading-tight line-clamp-2 text-text-primary group-hover:text-accent transition-colors">
          {album.name}
        </p>
        <p className="text-xs text-text-secondary truncate">
          {album.artists.map(a => a.name).join(', ')}
        </p>
        <p className="text-xs text-text-secondary">{year}</p>
      </div>
    </Link>
  )
}
