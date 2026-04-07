'use client'

import { useState, useTransition } from 'react'
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } from '@/lib/actions/social'

interface FriendButtonProps {
  targetId: string
  currentStatus: 'none' | 'pending' | 'accepted' | 'requested'
}

export function FriendButton({ targetId, currentStatus }: FriendButtonProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isPending, startTransition] = useTransition()

  function handleAddFriend() {
    setStatus('pending')
    startTransition(async () => {
      await sendFriendRequest(targetId)
    })
  }

  function handleAccept() {
    setStatus('accepted')
    startTransition(async () => {
      await acceptFriendRequest(targetId)
    })
  }

  function handleDecline() {
    setStatus('none')
    startTransition(async () => {
      await declineFriendRequest(targetId)
    })
  }

  function handleRemove() {
    setStatus('none')
    startTransition(async () => {
      await removeFriend(targetId)
    })
  }

  if (status === 'none') {
    return (
      <button onClick={handleAddFriend} disabled={isPending} className="btn-primary text-sm">
        Add friend
      </button>
    )
  }

  if (status === 'pending') {
    return (
      <button disabled className="btn-secondary text-sm opacity-60 cursor-not-allowed">
        Pending
      </button>
    )
  }

  if (status === 'requested') {
    return (
      <div className="flex gap-2">
        <button onClick={handleAccept} disabled={isPending} className="btn-primary text-sm">
          Accept
        </button>
        <button onClick={handleDecline} disabled={isPending} className="btn-secondary text-sm">
          Decline
        </button>
      </div>
    )
  }

  return (
    <button onClick={handleRemove} disabled={isPending} className="btn-secondary text-sm">
      Friends ✓
    </button>
  )
}
