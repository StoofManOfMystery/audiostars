import type { Metadata } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/ui/NavBar'
import { getUser } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/server'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Audiostars — Rate every track. Own your taste.',
  description: 'Rate songs on albums and share your music taste with friends.',
  icons: { icon: '/favicon.ico' },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  const profile = user ? await getProfile(user.id) : null

  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
      <body className="bg-bg text-text-primary font-body antialiased min-h-screen">
        <NavBar user={user} profile={profile} />
        <main className="min-h-[calc(100vh-56px)]">{children}</main>
      </body>
    </html>
  )
}
