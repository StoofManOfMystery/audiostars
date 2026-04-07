'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import type { Friendship, Like, Reply, Notification, Profile } from '@/types/database'

export async function sendFriendRequest(addresseeId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await table<Friendship>(supabase, 'friendships').insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: 'pending',
  })

  if (error) throw new Error(error.message)

  await table<Notification>(supabase, 'notifications').insert({
    user_id: addresseeId,
    type: 'friend_request',
    from_user_id: user.id,
    target_type: null,
    target_id: null,
  })

  revalidatePath('/friends')
}

export async function acceptFriendRequest(requesterId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await table<Friendship>(supabase, 'friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('addressee_id', user.id)

  if (error) throw new Error(error.message)

  await table<Notification>(supabase, 'notifications').insert({
    user_id: requesterId,
    type: 'friend_accepted',
    from_user_id: user.id,
    target_type: null,
    target_id: null,
  })

  revalidatePath('/friends')
}

export async function declineFriendRequest(requesterId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await table<Friendship>(supabase, 'friendships')
    .delete()
    .eq('requester_id', requesterId)
    .eq('addressee_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/friends')
}

export async function removeFriend(friendId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await table<Friendship>(supabase, 'friendships')
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )

  if (error) throw new Error(error.message)

  revalidatePath('/friends')
}

export async function toggleLike(
  targetType: 'track_rating' | 'album_review',
  targetId: string,
  targetUserId: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const existing = await table<Like>(supabase, 'likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle()

  if (existing.data) {
    await table<Like>(supabase, 'likes').delete().eq('id', existing.data.id)
  } else {
    await table<Like>(supabase, 'likes').insert({
      user_id: user.id,
      target_type: targetType,
      target_id: targetId,
    })
    if (targetUserId !== user.id) {
      await table<Notification>(supabase, 'notifications').insert({
        user_id: targetUserId,
        type: 'like',
        from_user_id: user.id,
        target_type: targetType,
        target_id: targetId,
      })
    }
  }

  revalidatePath('/feed')
}

export async function addReply(
  targetType: 'track_rating' | 'album_review',
  targetId: string,
  targetUserId: string,
  body: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await table<Reply>(supabase, 'replies').insert({
    user_id: user.id,
    target_type: targetType,
    target_id: targetId,
    body: body.slice(0, 500),
  })

  if (error) throw new Error(error.message)

  if (targetUserId !== user.id) {
    await table<Notification>(supabase, 'notifications').insert({
      user_id: targetUserId,
      type: 'reply',
      from_user_id: user.id,
      target_type: targetType,
      target_id: targetId,
    })
  }

  revalidatePath('/feed')
}

export async function markNotificationsRead(notificationIds: string[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await table<Notification>(supabase, 'notifications')
    .update({ read: true })
    .in('id', notificationIds)
    .eq('user_id', user.id)

  revalidatePath('/', 'layout')
}

export async function updateProfile(data: { bio?: string; is_public?: boolean; display_name?: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await table<Profile>(supabase, 'profiles')
    .update(data)
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/profile', 'layout')
}

export async function searchUsers(query: string): Promise<Partial<Profile>[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const result = await table<Profile>(supabase, 'profiles')
    .select('id, display_name, avatar_url, spotify_id')
    .ilike('display_name', `%${query}%`)
    .neq('id', user.id)
    .limit(20)

  return (result.data ?? []) as Partial<Profile>[]
}
