'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/lib/actions/social'

interface ProfileEditSectionProps {
  initialBio: string
}

export function ProfileEditSection({ initialBio }: ProfileEditSectionProps) {
  const [bio, setBio] = useState(initialBio)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await updateProfile({ bio })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  if (!editing) {
    return (
      <div className="group flex items-start gap-2 max-w-xl">
        <p className="text-base text-text-secondary flex-1">
          {bio || <span className="italic">No bio yet. Click to add one.</span>}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="btn-ghost text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          Edit
        </button>
        {saved && <span className="text-xs text-success">Saved!</span>}
      </div>
    )
  }

  return (
    <div className="space-y-2 max-w-xl">
      <textarea
        value={bio}
        onChange={e => setBio(e.target.value.slice(0, 300))}
        placeholder="Tell people about your taste..."
        rows={3}
        className="textarea text-sm"
        autoFocus
        maxLength={300}
      />
      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={isPending} className="btn-primary text-sm">
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button onClick={() => { setBio(initialBio); setEditing(false) }} className="btn-ghost text-sm">
          Cancel
        </button>
        <span className="text-xs text-text-secondary ml-auto">{bio.length}/300</span>
      </div>
    </div>
  )
}
