import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { LandingSignIn } from '@/components/ui/LandingSignIn'

export default async function LandingPage() {
  const user = await getUser()
  if (user) redirect('/feed')

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Wordmark */}
          <div className="space-y-2">
            <h1 className="font-display text-[64px] leading-none text-text-primary">
              Audio<span className="text-accent">stars</span>
            </h1>
            <p className="font-display text-2xl text-text-secondary italic">
              Rate every track. Own your taste.
            </p>
          </div>

          {/* CTA */}
          <LandingSignIn />

          {/* Value props */}
          <div className="grid sm:grid-cols-3 gap-6 mt-16 text-left">
            <ValueProp
              icon="★"
              title="Rate track by track"
              description="Score every song on an album from 1–10. Your album score is calculated from what you've actually heard."
            />
            <ValueProp
              icon="♫"
              title="Share your taste"
              description="Generate a beautiful shareable card for any album rating. Post it anywhere — your taste, your identity."
            />
            <ValueProp
              icon="◎"
              title="Discover with friends"
              description="Follow friends and see what they're listening to. Find albums through people you trust."
            />
          </div>
        </div>
      </section>

      {/* Mock album cards */}
      <section className="max-w-4xl mx-auto px-4 pb-20 w-full">
        <h2 className="font-display text-xl text-text-secondary text-center mb-6">
          See what your taste looks like
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {MOCK_CARDS.map(card => (
            <MockAlbumCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-text-secondary text-xs">
        <span className="font-display text-accent">Audiostars</span>
        {' '}&mdash; Built with Next.js &amp; Supabase
      </footer>
    </div>
  )
}

function ValueProp({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="card p-5 space-y-2">
      <div className="text-accent text-2xl">{icon}</div>
      <h3 className="font-display text-lg">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
    </div>
  )
}

const MOCK_CARDS = [
  {
    title: 'In Rainbows',
    artist: 'Radiohead',
    year: '2007',
    score: 9.2,
    tracksRated: 10,
    totalTracks: 10,
    color: '#2a4a3e',
  },
  {
    title: 'Blonde',
    artist: 'Frank Ocean',
    year: '2016',
    score: 8.7,
    tracksRated: 14,
    totalTracks: 17,
    color: '#3a2a1a',
  },
  {
    title: 'To Pimp a Butterfly',
    artist: 'Kendrick Lamar',
    year: '2015',
    score: 9.6,
    tracksRated: 16,
    totalTracks: 16,
    color: '#1a2a3a',
  },
]

function MockAlbumCard({
  title,
  artist,
  year,
  score,
  tracksRated,
  totalTracks,
  color,
}: typeof MOCK_CARDS[number]) {
  return (
    <div
      className="card p-5 flex flex-col gap-3"
      style={{ borderColor: `${color}80` }}
    >
      {/* Mock album art */}
      <div
        className="aspect-square rounded-input flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${color} 0%, #1A1612 100%)` }}
      >
        <span className="font-display text-3xl text-text-secondary opacity-40">♪</span>
      </div>

      <div className="space-y-1">
        <p className="font-display text-base leading-tight">{title}</p>
        <p className="text-text-secondary text-xs">{artist} &middot; {year}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{tracksRated}/{totalTracks} tracks</span>
        <span className="score-badge-md">{score.toFixed(1)}</span>
      </div>

      {/* Dot row preview */}
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full ${i < Math.round(score) ? 'bg-accent' : 'border border-border'}`}
          />
        ))}
      </div>
    </div>
  )
}
