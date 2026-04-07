import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { table } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/feed'

  // Log everything Supabase is sending back
  console.log('[auth/callback] params:', Object.fromEntries(requestUrl.searchParams))

  const supabaseError = requestUrl.searchParams.get('error')
  const supabaseErrorDesc = requestUrl.searchParams.get('error_description')
  if (supabaseError) {
    console.error('[auth/callback] Supabase error:', supabaseError, supabaseErrorDesc)
    return NextResponse.redirect(new URL(`/?error=${supabaseError}&msg=${encodeURIComponent(supabaseErrorDesc ?? '')}`, requestUrl.origin))
  }

  if (code) {
    const cookieStore = cookies()
    // Build the redirect response first so we can attach session cookies to it
    const response = NextResponse.redirect(new URL(next, requestUrl.origin))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                maxAge: options.maxAge ?? 60 * 60 * 24 * 365,
              })
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message, error)
      return NextResponse.redirect(new URL(`/?error=auth&msg=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }

    if (data.user) {
      // Create profile if this is a new user
      try {
        const existing = await table<Profile>(supabase, 'profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!existing.data) {
          const meta = data.user.user_metadata
          const { error: insertError } = await table<Profile>(supabase, 'profiles').insert({
            id: data.user.id,
            spotify_id: meta.provider_id ?? null,
            display_name: meta.full_name ?? meta.name ?? null,
            avatar_url: meta.avatar_url ?? meta.picture ?? null,
          })
          if (insertError) console.error('[auth/callback] profile insert error:', insertError.message)
        }
      } catch (e) {
        console.error('[auth/callback] profile creation failed:', e)
      }

      return response
    }

    console.error('[auth/callback] no user after code exchange')
  }

  return NextResponse.redirect(new URL('/?error=auth', requestUrl.origin))
}
