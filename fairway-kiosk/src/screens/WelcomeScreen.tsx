import { useEffect, useState } from 'react'

interface Props {
  bayName: string | null
  onStart: () => void
}

const TAGLINES = [
  'Every swing. Every session. Every improvement.',
  'Your game. Your data. Your edge.',
  'World-class bays. AI coaching. Great company.',
]

export default function WelcomeScreen({ bayName, onStart }: Props) {
  const [pulse, setPulse] = useState(false)
  const [tagline] = useState(() => TAGLINES[Math.floor(Date.now() / 1000) % TAGLINES.length])

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-10 cursor-pointer select-none"
      onClick={onStart}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-full border-2 border-[#C9A84C] flex items-center justify-center">
          <span className="text-[#C9A84C] text-4xl font-bold">F</span>
        </div>
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.4em] font-medium">Fairway Golf Club</p>
      </div>

      {/* Headline */}
      <div className="text-center flex flex-col gap-4">
        <h1 className="text-6xl font-bold text-white tracking-tight leading-[1.1]">
          Welcome,<br />
          <span className="text-[#C9A84C]">Golfer.</span>
        </h1>
        <p className="text-[#666] text-base max-w-xs mx-auto leading-relaxed">{tagline}</p>
        {bayName && (
          <p className="text-[#888] text-sm mt-1">{bayName}</p>
        )}
      </div>

      {/* Tap CTA */}
      <div className={`mt-4 flex flex-col items-center gap-3 transition-opacity duration-700 ${pulse ? 'opacity-100' : 'opacity-35'}`}>
        <div className="w-14 h-14 rounded-full border-2 border-[#C9A84C]/50 flex items-center justify-center">
          <span className="text-xl">👆</span>
        </div>
        <p className="text-[#555] text-sm uppercase tracking-[0.25em]">Tap anywhere to check in</p>
      </div>
    </div>
  )
}
