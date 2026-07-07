import { useEffect, useState } from 'react'
import { getEasternHour } from '../utils/time'
import type { ScheduledSession } from '../types'

interface Props {
  bayName: string | null
  sessions: ScheduledSession[]
  onStart: () => void
}

const TAGLINES = [
  'Every swing. Every session. Every improvement.',
  'Your game. Your data. Your edge.',
  'World-class bays. AI coaching. Great company.',
]

function getDrinkSuggestion(hour: number): { emoji: string; line: string } {
  if (hour < 12) return { emoji: '☕', line: 'Fresh coffee & pastries from Creme de la Creme are at the bar.' }
  if (hour < 17) return { emoji: '🍺', line: 'The bar is open — grab a cold one while you wait.' }
  return { emoji: '🥃', line: 'Head to the bar for a craft cocktail.' }
}

function computeWaitMinutes(sessions: ScheduledSession[]): number | null {
  const now = Date.now()
  const active = sessions.filter(s => {
    const start = new Date(s.startTime).getTime()
    const end = new Date(s.endTime).getTime()
    return start <= now && end > now
  })
  if (active.length === 0) return null
  const soonest = Math.min(...active.map(s => new Date(s.endTime).getTime()))
  const mins = Math.round((soonest - now) / 60_000)
  return Math.max(1, mins)
}

function formatWait(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

export default function WelcomeScreen({ bayName, sessions, onStart }: Props) {
  const [pulse, setPulse] = useState(false)
  const [tagline] = useState(() => TAGLINES[Math.floor(Date.now() / 1000) % TAGLINES.length])
  const [waitSeconds, setWaitSeconds] = useState<number | null>(() => {
    const mins = computeWaitMinutes(sessions)
    return mins !== null ? mins * 60 : null
  })

  const hour = getEasternHour()
  const drink = getDrinkSuggestion(hour)
  const hasBaysAvailable = sessions.length === 0 || waitSeconds === null

  // Pulse the CTA
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1800)
    return () => clearInterval(t)
  }, [])

  // Count down the wait timer in real-time
  useEffect(() => {
    if (waitSeconds === null || waitSeconds <= 0) return
    const t = setInterval(() => {
      setWaitSeconds(w => {
        if (w === null || w <= 1) return null
        return w - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [waitSeconds === null])

  // Re-compute when sessions prop changes
  useEffect(() => {
    const mins = computeWaitMinutes(sessions)
    setWaitSeconds(mins !== null ? mins * 60 : null)
  }, [sessions])

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-8 cursor-pointer select-none px-10"
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
      <div className="text-center flex flex-col gap-3">
        <h1 className="text-6xl font-bold text-white tracking-tight leading-[1.1]">
          Welcome,<br />
          <span className="text-[#C9A84C]">Golfer.</span>
        </h1>
        <p className="text-[#666] text-base max-w-xs mx-auto leading-relaxed">{tagline}</p>
        {bayName && <p className="text-[#888] text-sm mt-1">{bayName}</p>}
      </div>

      {/* Bay availability / wait block */}
      {hasBaysAvailable ? (
        <div className="rounded-2xl border border-green-500/25 bg-green-500/5 px-6 py-4 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <p className="text-green-400 text-sm font-medium">Bays available now — tap to check in</p>
        </div>
      ) : waitSeconds !== null && waitSeconds > 0 ? (
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          {/* Countdown */}
          <div className="rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/5 px-8 py-5 flex flex-col items-center gap-1 w-full">
            <p className="text-[#888] text-xs uppercase tracking-widest">Next bay available in</p>
            <p className="text-4xl font-bold text-[#C9A84C] tabular-nums">{formatWait(waitSeconds)}</p>
          </div>

          {/* Drink suggestion */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] px-5 py-4 flex gap-3 items-start w-full">
            <span className="text-2xl flex-shrink-0">{drink.emoji}</span>
            <div>
              <p className="text-white text-sm font-medium">While you wait…</p>
              <p className="text-[#777] text-xs mt-0.5 leading-relaxed">{drink.line}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tap CTA */}
      <div className={`flex flex-col items-center gap-3 transition-opacity duration-700 ${pulse ? 'opacity-100' : 'opacity-35'}`}>
        <div className="w-14 h-14 rounded-full border-2 border-[#C9A84C]/50 flex items-center justify-center">
          <span className="text-xl">👆</span>
        </div>
        <p className="text-[#555] text-sm uppercase tracking-[0.25em]">Tap anywhere to check in</p>
      </div>
    </div>
  )
}
