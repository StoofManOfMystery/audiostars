'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import type { TrackRating, AlbumReview } from '@/types/database'

export async function upsertTrackRating(
  spotifyTrackId: string,
  spotifyAlbumId: string,
  score: number,
  note?: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await table<TrackRating>(supabase, 'track_ratings').upsert(
    {
      user_id: user.id,
      spotify_track_id: spotifyTrackId,
      spotify_album_id: spotifyAlbumId,
      score,
      note: note ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,spotify_track_id' }
  )

  if (error) throw new Error(error.message)

  revalidatePath(`/album/${spotifyAlbumId}`)
  revalidatePath('/feed')
}

export async function deleteTrackRating(spotifyTrackId: string, spotifyAlbumId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await table<TrackRating>(supabase, 'track_ratings')
    .delete()
    .eq('user_id', user.id)
    .eq('spotify_track_id', spotifyTrackId)

  if (error) throw new Error(error.message)

  revalidatePath(`/album/${spotifyAlbumId}`)
  revalidatePath('/feed')
}

export async function upsertAlbumReview(spotifyAlbumId: string, body: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await table<AlbumReview>(supabase, 'album_reviews').upsert(
    {
      user_id: user.id,
      spotify_album_id: spotifyAlbumId,
      body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,spotify_album_id' }
  )

  if (error) throw new Error(error.message)

  revalidatePath(`/album/${spotifyAlbumId}`)
}

export async function getMyAlbumRatings(spotifyAlbumId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ratings: [], review: null }

  const [ratingsResult, reviewResult] = await Promise.all([
    table<TrackRating>(supabase, 'track_ratings')
      .select('*')
      .eq('user_id', user.id)
      .eq('spotify_album_id', spotifyAlbumId),
    table<AlbumReview>(supabase, 'album_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('spotify_album_id', spotifyAlbumId)
      .maybeSingle(),
  ])

  return {
    ratings: (ratingsResult.data ?? []) as TrackRating[],
    review: (reviewResult.data ?? null) as AlbumReview | null,
  }
}
