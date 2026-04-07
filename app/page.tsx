import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { LandingSignIn } from '@/components/ui/LandingSignIn'

export default async function LandingPage() {
  const user = await getUser()
  if (user) redirect('/feed')

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-4 sm:px-8 py-20 max-w-6xl mx-auto w-full">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-text-secondary mb-6">
            / Rate every track · Own your taste
          </p>
          <h1 className="font-display text-[clamp(80px,18vw,200px)] leading-none text-text-primary">
            Audio
            <span className="text-accent">stars</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary mt-4 max-w-xs">
            Score every song. See what your taste really looks like.
          </p>
        </div>

        <div className="mt-12 flex items-center gap-6 flex-wrap">
          <LandingSignIn />
          <span className="text-[10px] uppercase tracking-widest text-text-secondary">
            Free · No playback required
          </span>
        </div>

        {/* Value props — editorial table style */}
        <div className="mt-20 border-t border-border">
          {[
            { label: '01', title: 'Rate Track by Track', desc: 'Score every song 1–10. Your album score reflects what you\'ve actually heard.' },
            { label: '02', title: 'Share Your Taste', desc: 'Generate a shareable card for any album rating. Your taste, your identity.' },
            { label: '03', title: 'Discover With Friends', desc: 'See what friends are rating. Find albums through people you trust.' },
          ].map(item => (
            <div key={item.label} className="flex gap-8 py-6 border-b border-border group">
              <span className="text-[10px] uppercase tracking-widest text-text-secondary/40 w-8 flex-shrink-0 mt-1">
                {item.label}
              </span>
              <div className="flex-1">
                <h3 className="font-display text-2xl text-text-primary group-hover:text-accent transition-colors mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mock scores */}
        <div className="mt-16">
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary mb-8 flex items-center gap-4">
            <span>/ What it looks like</span>
            <span className="flex-1 h-px bg-border" />
          </p>
          <div className="grid sm:grid-cols-3 gap-px bg-border border border-border">
            {MOCK_CARDS.map(card => (
              <MockAlbumCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-5 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-display text-accent text-lg tracking-wider">Audiostars</span>
          <span className="text-[10px] uppercase tracking-widest text-text-secondary">
            Built with Next.js &amp; Supabase
          </span>
        </div>
      </footer>
    </div>
  )
}

const MOCK_CARDS = [
  { title: 'In Rainbows', artist: 'Radiohead', year: '2007', score: 9.2, tracksRated: 10, totalTracks: 10, color: '#2a4a3e' },
  { title: 'Blonde', artist: 'Frank Ocean', year: '2016', score: 8.7, tracksRated: 14, totalTracks: 17, color: '#3a2a1a' },
  { title: 'To Pimp a Butterfly', artist: 'Kendrick Lamar', year: '2015', score: 9.6, tracksRated: 16, totalTracks: 16, color: '#1a2a3a' },
]

function MockAlbumCard({ title, artist, year, score, tracksRated, totalTracks, color }: typeof MOCK_CARDS[number]) {
  return (
    <div className="bg-surface p-5 flex flex-col gap-4">
      <div
        className="aspect-square flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${color} 0%, #111 100%)` }}
      >
        <span className="font-display text-5xl text-text-secondary/20">♪</span>
      </div>
      <div>
        <p className="font-display text-xl text-text-primary leading-tight">{title}</p>
        <p className="text-[11px] uppercase tracking-widest text-text-secondary mt-1">{artist} · {year}</p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[10px] uppercase tracking-widest text-text-secondary">{tracksRated}/{totalTracks} tracks</span>
        <span className="font-display text-3xl text-accent">{score.toFixed(1)}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className={`h-1 flex-1 ${i < Math.round(score) ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>
    </div>
  )
}
