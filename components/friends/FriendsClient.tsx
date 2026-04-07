'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { acceptFriendRequest, declineFriendRequest, removeFriend, sendFriendRequest, searchUsers } from '@/lib/actions/social'
import { formatRelativeTime } from '@/lib/ratings'
import type { Profile } from '@/types/database'

interface FriendsClientProps {
  currentUserId: string
  friends: Profile[]
  requests: Profile[]
  lastActivity: Record<string, { albumId: string; score: number; updatedAt: string } | null>
}

export function FriendsClient({ currentUserId, friends, requests, lastActivity }: FriendsClientProps) {
  const [tab, setTab] = useState<'friends' | 'requests'>('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Partial<Profile>[]>([])
  const [searching, setSearching] = useState(false)
  const [friendsList, setFriendsList] = useState(friends)
  const [requestsList, setRequestsList] = useState(requests)
  const [pendingSent, setPendingSent] = useState<Set<string>>(new Set())
  const searchTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    clearTimeout(searchTimer.current)
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const results = await searchUsers(searchQuery)
      setSearchResults(results)
      setSearching(false)
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  async function handleAccept(requesterId: string) {
    await acceptFriendRequest(requesterId)
    const accepted = requestsList.find(r => r.id === requesterId)
    if (accepted) {
      setFriendsList(prev => [...prev, accepted])
      setRequestsList(prev => prev.filter(r => r.id !== requesterId))
    }
  }

  async function handleDecline(requesterId: string) {
    await declineFriendRequest(requesterId)
    setRequestsList(prev => prev.filter(r => r.id !== requesterId))
  }

  async function handleRemove(friendId: string) {
    await removeFriend(friendId)
    setFriendsList(prev => prev.filter(f => f.id !== friendId))
  }

  async function handleAddFriend(userId: string) {
    await sendFriendRequest(userId)
    setPendingSent(prev => new Set(prev).add(userId))
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Find users by name..."
          className="input pl-9 text-sm"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        )}

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 card shadow-card-hover z-10 max-h-64 overflow-y-auto">
            {searchResults.map(user => {
              const isFriend = friendsList.some(f => f.id === user.id)
              const isPending = pendingSent.has(user.id!)
              return (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-elevated">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt={user.display_name ?? ''} width={32} height={32} className="avatar w-8 h-8" />
                  ) : (
                    <div className="avatar w-8 h-8 bg-accent-muted flex items-center justify-center text-accent text-sm font-bold">
                      {(user.display_name ?? 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 text-sm">{user.display_name}</span>
                  {!isFriend && !isPending && (
                    <button
                      onClick={() => handleAddFriend(user.id!)}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      Add friend
                    </button>
                  )}
                  {isPending && <span className="text-xs text-text-secondary">Pending</span>}
                  {isFriend && <span className="text-xs text-success">Friends</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('friends')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'friends' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Friends ({friendsList.length})
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${
            tab === 'requests' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Requests
          {requestsList.length > 0 && (
            <span className="ml-2 bg-accent text-bg text-xs rounded-pill px-1.5 py-0.5 font-bold">
              {requestsList.length}
            </span>
          )}
        </button>
      </div>

      {/* Friends tab */}
      {tab === 'friends' && (
        <div className="space-y-2">
          {friendsList.length === 0 ? (
            <div className="card p-12 text-center text-text-secondary">
              <p>No friends yet. Use the search above to find people.</p>
            </div>
          ) : (
            friendsList.map(friend => (
              <FriendCard
                key={friend.id}
                friend={friend}
                lastActivity={lastActivity[friend.id] ?? null}
                onRemove={() => handleRemove(friend.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        <div className="space-y-2">
          {requestsList.length === 0 ? (
            <div className="card p-12 text-center text-text-secondary">
              <p>No pending friend requests.</p>
            </div>
          ) : (
            requestsList.map(requester => (
              <div key={requester.id} className="card p-4 flex items-center gap-4">
                <Link href={`/profile/${requester.id}`}>
                  {requester.avatar_url ? (
                    <Image src={requester.avatar_url} alt={requester.display_name ?? ''} width={40} height={40} className="avatar w-10 h-10" />
                  ) : (
                    <div className="avatar w-10 h-10 bg-accent-muted flex items-center justify-center text-accent font-bold">
                      {(requester.display_name ?? 'U')[0].toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${requester.id}`} className="font-medium hover:text-accent transition-colors">
                    {requester.display_name}
                  </Link>
                  <p className="text-xs text-text-secondary">Sent you a friend request</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(requester.id)} className="btn-primary text-sm">
                    Accept
                  </button>
                  <button onClick={() => handleDecline(requester.id)} className="btn-secondary text-sm">
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function FriendCard({
  friend,
  lastActivity,
  onRemove,
}: {
  friend: Profile
  lastActivity: { albumId: string; score: number; updatedAt: string } | null
  onRemove: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="card p-4 flex items-center gap-4">
      <Link href={`/profile/${friend.id}`}>
        {friend.avatar_url ? (
          <Image src={friend.avatar_url} alt={friend.display_name ?? ''} width={40} height={40} className="avatar w-10 h-10" />
        ) : (
          <div className="avatar w-10 h-10 bg-accent-muted flex items-center justify-center text-accent font-bold">
            {(friend.display_name ?? 'U')[0].toUpperCase()}
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${friend.id}`} className="font-medium hover:text-accent transition-colors block truncate">
          {friend.display_name}
        </Link>
        {lastActivity ? (
          <p className="text-xs text-text-secondary truncate">
            Rated an album &middot; {formatRelativeTime(lastActivity.updatedAt)}
          </p>
        ) : (
          <p className="text-xs text-text-secondary">No activity yet</p>
        )}
      </div>
      <Link href={`/profile/${friend.id}`} className="btn-secondary text-sm hidden sm:block">
        View Profile
      </Link>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="btn-ghost p-2 text-text-secondary"
          aria-label="More options"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 card shadow-card-hover z-10 min-w-[140px]">
            <button
              onClick={() => { onRemove(); setMenuOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-surface-elevated transition-colors"
            >
              Remove friend
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
