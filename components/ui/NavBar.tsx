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
    <header className="sticky top-0 z-50 bg-bg border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href={user ? '/feed' : '/'} className="flex items-center gap-3">
          <span className="font-display text-2xl text-accent tracking-wider leading-none">
            Audiostars
          </span>
          {user && (
            <span className="hidden sm:block text-[9px] uppercase tracking-[0.2em] text-text-secondary border-l border-border pl-3">
              / Your Taste
            </span>
          )}
        </Link>

        {/* Nav links */}
        {user && (
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[11px] uppercase tracking-widest font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'text-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <NotificationBell userId={user.id} />
              <Link
                href={`/profile/${user.id}`}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              >
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name ?? 'Profile'}
                    width={28}
                    height={28}
                    className="rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-accent text-xs font-bold font-display">
                    {(profile?.display_name ?? 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:block text-[11px] uppercase tracking-widest text-text-secondary truncate max-w-[100px]">
                  {profile?.display_name ?? 'Profile'}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="text-[11px] uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
              >
                Out
              </button>
            </>
          ) : (
            <button onClick={handleSignIn} className="btn-primary">
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
              className={`flex-1 text-center py-2.5 text-[10px] uppercase tracking-widest font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? 'text-accent border-t border-accent -mt-px'
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
