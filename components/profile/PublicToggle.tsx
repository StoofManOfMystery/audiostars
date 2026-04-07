'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/lib/actions/social'

interface PublicToggleProps {
  isPublic: boolean
}

export function PublicToggle({ isPublic }: PublicToggleProps) {
  const [value, setValue] = useState(isPublic)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !value
    setValue(next)
    startTransition(async () => {
      await updateProfile({ is_public: next })
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`pill flex items-center gap-2 cursor-pointer hover:border-accent/40 transition-colors ${isPending ? 'opacity-60' : ''}`}
    >
      <span
        className={`w-3 h-3 rounded-full ${value ? 'bg-success' : 'bg-text-secondary'} transition-colors`}
      />
      <span>{value ? 'Public' : 'Private'}</span>
    </button>
  )
}
