import { useEffect, useState } from 'react'
import { getEasternHour } from '../utils/time'
import type { ScheduledSession } from '../types'

interface BaySummary {
  bayId: string
  bayName: string
}

interface Props {
  bayName: string | null
  sessions: ScheduledSession[]
  bays: BaySummary[]
  onStart: () => void
}

const BAY_WORD_NUMS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
}

function shortBayName(name: string): string {
  const m = name.match(/Bay\s*(?:Number)?\s*(\w+)/i)
  if (!m) return name
  const raw = m[1].toLowerCase()
  return `Bay ${BAY_WORD_NUMS[raw] ?? m[1]}`
}

interface BayStatus extends BaySummary {
  active: boolean
  golferFirstName?: string
  minutesLeft?: number
}

function getBayStatuses(bays: BaySummary[], sessions: ScheduledSession[]): BayStatus[] {
  const now = Date.now()
  return bays.map(bay => {
    const session = sessions.find(s =>
      s.bayId === bay.bayId &&
      (s.status === 'Dispatched' || s.status === 'In Progress') &&
      new Date(s.endTime).getTime() > now
    )
    if (!session) return { ...bay, active: false }
    const golferFirstName = session.players[0]?.displayName?.split(' ')[0] || 'Golfer'
    const minutesLeft = Math.max(0, Math.round((new Date(session.endTime).getTime() - now) / 60_000))
    return { ...bay, active: true, golferFirstName, minutesLeft }
  })
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

// Only meaningful when EVERY bay is occupied — checked per bay via
// bayStatuses, not just "is anything active anywhere." A bay with zero
// sessions today (or one that already ended) must never be treated as
// occupied just because some *other* bay is busy.
function computeWaitMinutes(bays: BaySummary[], bayStatuses: BayStatus[]): number | null {
  if (bays.length === 0) return null
  const allOccupied = bayStatuses.every(b => b.active)
  if (!allOccupied) return null
  const soonest = Math.min(...bayStatuses.map(b => b.minutesLeft ?? 0))
  return Math.max(1, soonest)
}

function formatWait(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

export default function WelcomeScreen({ bayName, sessions, bays, onStart }: Props) {
  const [pulse, setPulse] = useState(false)
  const bayStatuses = getBayStatuses(bays, sessions)
  const [tagline] = useState(() => TAGLINES[Math.floor(Date.now() / 1000) % TAGLINES.length])
  const [waitSeconds, setWaitSeconds] = useState<number | null>(() => {
    const mins = computeWaitMinutes(bays, bayStatuses)
    return mins !== null ? mins * 60 : null
  })

  const hour = getEasternHour()
  const drink = getDrinkSuggestion(hour)
  const hasBaysAvailable = bays.length === 0 || bayStatuses.some(b => !b.active)

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

  // Re-compute when sessions/bays props change
  useEffect(() => {
    const mins = computeWaitMinutes(bays, getBayStatuses(bays, sessions))
    setWaitSeconds(mins !== null ? mins * 60 : null)
  }, [sessions, bays])

  return (
    <div className="relative w-full h-full cursor-pointer select-none" onClick={onStart}>
      {/* Full-bleed clubroom photography */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/welcome-bg.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 hg-vignette" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-8 px-10">
        {/* Logo */}
        <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-24 w-auto hg-logo-white" />

        {/* Headline */}
        <div className="text-center flex flex-col gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-6xl font-bold text-white tracking-tight leading-[1.1]">
            Welcome,<br />
            <span className="hg-gold-shimmer">Golfer.</span>
          </h1>
          <p className="text-[#ccc] text-base max-w-xs mx-auto leading-relaxed">{tagline}</p>
          {bayName && <p className="text-[#aaa] text-sm mt-1">{bayName}</p>}
        </div>

        {/* Bay availability / wait block */}
        {hasBaysAvailable ? (
          <div className="hg-glass-panel rounded-full px-6 py-3 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <p className="text-white text-xs font-semibold uppercase tracking-wider">Bays Available — Tap to Check In</p>
          </div>
        ) : waitSeconds !== null && waitSeconds > 0 ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            {/* Countdown */}
            <div className="hg-glass-panel rounded-2xl px-8 py-5 flex flex-col items-center gap-1 w-full">
              <p className="text-[#C9A84C]/80 text-xs uppercase tracking-widest">Next bay available in</p>
              <p className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#C9A84C] tabular-nums">{formatWait(waitSeconds)}</p>
            </div>

            {/* Drink suggestion */}
            <div className="hg-glass-panel rounded-2xl px-5 py-4 flex gap-3 items-start w-full">
              <span className="text-2xl flex-shrink-0">{drink.emoji}</span>
              <div>
                <p className="text-white text-sm font-medium">While you wait…</p>
                <p className="text-[#ccc] text-xs mt-0.5 leading-relaxed">{drink.line}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Active sessions — live status per bay */}
        {bayStatuses.length > 0 && (
          <div className="flex gap-3 flex-wrap justify-center max-w-lg">
            {bayStatuses.map(b => (
              <div
                key={b.bayId}
                className="hg-glass-panel rounded-xl px-4 py-2 flex items-center gap-2"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.active ? 'bg-[#C9A84C]' : 'bg-green-400'}`} />
                <span className="text-white text-xs font-medium">{shortBayName(b.bayName)}</span>
                {b.active ? (
                  <span className="text-[#ccc] text-xs">{b.golferFirstName} · {b.minutesLeft}m left</span>
                ) : (
                  <span className="text-green-400 text-xs">Open</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tap CTA */}
        <div className={`flex flex-col items-center gap-3 transition-opacity duration-700 ${pulse ? 'opacity-100' : 'opacity-60'}`}>
          <div className="hg-glass-button rounded-xl px-10 py-5 flex items-center gap-3">
            <span className="font-[family-name:var(--font-display)] text-[#C9A84C] text-2xl font-semibold tracking-widest uppercase">Tap to Start</span>
          </div>
          <p className="text-[#999] text-xs uppercase tracking-[0.25em]">Touch screen anywhere to begin</p>
        </div>
      </div>
    </div>
  )
}
