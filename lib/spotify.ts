import type {
  SpotifyAlbum,
  SpotifySearchResult,
  SpotifyTokenResponse,
  SpotifyTrackListing,
} from '@/types/spotify'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

let cachedToken: { access_token: string; expires_at: number } | null = null

async function getClientCredentialsToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables. ' +
      'Copy .env.local.example to .env.local and fill in your Spotify app credentials.'
    )
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`Failed to get Spotify token: ${response.statusText}`)
  }

  const data: SpotifyTokenResponse = await response.json()
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  }

  return cachedToken.access_token
}

async function spotifyFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getClientCredentialsToken()
  const url = `${SPOTIFY_API_BASE}${endpoint}`
  console.log('[spotify] GET', url)

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '(no body)')
    console.error('[spotify] error response body:', body)
    throw new Error(`Spotify API error ${response.status}: ${response.statusText} — ${body}`)
  }

  return response.json() as Promise<T>
}

export async function searchAlbums(
  query: string,
  limit = 20,
  offset = 0
): Promise<SpotifySearchResult> {
  const params = new URLSearchParams({
    q: query,
    type: 'album',
    limit: String(limit),
    offset: String(offset),
  })

  return spotifyFetch<SpotifySearchResult>(`/search?${params}`)
}

export async function getAlbum(albumId: string): Promise<SpotifyAlbum> {
  return spotifyFetch<SpotifyAlbum>(`/albums/${albumId}`)
}

export async function getAlbumTracks(
  albumId: string,
  limit = 50,
  offset = 0
): Promise<SpotifyTrackListing> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  return spotifyFetch<SpotifyTrackListing>(`/albums/${albumId}/tracks?${params}`)
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function getReleaseYear(releaseDate: string): string {
  return releaseDate.split('-')[0]
}

export function getBestImage(images: SpotifyAlbum['images'], preferredSize = 300): string {
  if (!images || images.length === 0) return '/placeholder-album.png'

  const sorted = [...images].sort((a, b) => {
    const aSize = a.width ?? 0
    const bSize = b.width ?? 0
    return Math.abs(aSize - preferredSize) - Math.abs(bSize - preferredSize)
  })

  return sorted[0].url
}
