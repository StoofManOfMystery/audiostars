'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markNotificationsRead } from '@/lib/actions/social'
import { formatRelativeTime } from '@/lib/ratings'
import type { Notification } from '@/types/database'

interface NotificationBellProps {
  userId: string
}

const NOTIF_LABELS: Record<Notification['type'], string> = {
  friend_request: 'sent you a friend request',
  friend_accepted: 'accepted your friend request',
  like: 'liked your rating',
  reply: 'replied to your rating',
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchNotifications()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications((data ?? []) as Notification[])
  }

  async function handleOpen() {
    setOpen(prev => !prev)
    const unread = notifications.filter(n => !n.read).map(n => n.id)
    if (unread.length > 0) {
      await markNotificationsRead(unread)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-text-secondary hover:text-text-primary transition-colors rounded-btn"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-accent text-bg text-[10px] font-bold rounded-pill flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 card shadow-card-hover z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <span className="font-display text-base">Notifications</span>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-secondary text-sm">
              No notifications yet
            </div>
          ) : (
            <ul>
              {notifications.map(n => (
                <li key={n.id} className={`px-4 py-3 border-b border-border last:border-0 ${!n.read ? 'bg-accent-muted' : ''}`}>
                  <p className="text-sm text-text-primary">
                    {NOTIF_LABELS[n.type as Notification['type']] ?? n.type}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
