export interface SpotifyImage {
  url: string
  height: number | null
  width: number | null
}

export interface SpotifyArtist {
  id: string
  name: string
  href: string
}

export interface SpotifyAlbum {
  id: string
  name: string
  artists: SpotifyArtist[]
  images: SpotifyImage[]
  release_date: string
  release_date_precision: 'year' | 'month' | 'day'
  total_tracks: number
  album_type: 'album' | 'single' | 'compilation'
  genres: string[]
  href: string
  uri: string
  tracks?: SpotifyTrackListing
}

export interface SpotifyTrack {
  id: string
  name: string
  track_number: number
  disc_number: number
  duration_ms: number
  artists: SpotifyArtist[]
  href: string
  uri: string
  explicit: boolean
  preview_url: string | null
}

export interface SpotifyTrackListing {
  items: SpotifyTrack[]
  total: number
  limit: number
  offset: number
  next: string | null
  previous: string | null
}

export interface SpotifySearchResult {
  albums: {
    items: SpotifyAlbum[]
    total: number
    limit: number
    offset: number
    next: string | null
    previous: string | null
  }
}

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}
