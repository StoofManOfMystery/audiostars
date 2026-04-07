import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { table } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/feed'

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const existing = await table<Profile>(supabase, 'profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!existing.data) {
        const meta = data.user.user_metadata
        await table<Profile>(supabase, 'profiles').insert({
          id: data.user.id,
          spotify_id: meta.provider_id ?? null,
          display_name: meta.full_name ?? meta.name ?? null,
          avatar_url: meta.avatar_url ?? meta.picture ?? null,
        })
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/?error=auth', requestUrl.origin))
}
