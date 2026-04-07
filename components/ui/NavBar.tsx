'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { NotificationBell } from '@/components/ui/NotificationBell'

interface NavBarProps {
  user: User | null
  profile: Profile | null
}

const navLinks = [
  { href: '/feed', label: 'Feed' },
  { href: '/search', label: 'Search' },
  { href: '/explore', label: 'Explore' },
  { href: '/friends', label: 'Friends' },
]

export function NavBar({ user, profile }: NavBarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'user-read-private user-read-email',
      },
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    await fetch('/auth/signout', { method: 'POST' })
    window.location.replace('/')
  }

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-card">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={user ? '/feed' : '/'} className="flex items-center gap-2 flex-shrink-0">
          <span className="font-display text-xl text-accent font-bold tracking-tight">
            Audiostars
          </span>
        </Link>

        {/* Nav links — authenticated only */}
        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link px-3 py-2 rounded-btn transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'text-accent bg-accent-muted'
                    : 'hover:text-text-primary hover:bg-surface-elevated'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell userId={user.id} />

              <Link
                href={`/profile/${user.id}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name ?? 'Profile'}
                    width={32}
                    height={32}
                    className="avatar w-8 h-8"
                  />
                ) : (
                  <div className="avatar w-8 h-8 bg-accent-muted flex items-center justify-center text-accent text-sm font-bold">
                    {(profile?.display_name ?? 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:block text-sm text-text-secondary truncate max-w-[120px]">
                  {profile?.display_name ?? 'Profile'}
                </span>
              </Link>

              <button onClick={handleSignOut} className="btn-ghost text-xs">
                Sign out
              </button>
            </>
          ) : (
            <button onClick={handleSignIn} className="btn-primary text-sm">
              Sign in with Spotify
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {user && (
        <nav className="md:hidden flex border-t border-border">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 text-center py-2.5 text-xs font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? 'text-accent bg-accent-muted'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
