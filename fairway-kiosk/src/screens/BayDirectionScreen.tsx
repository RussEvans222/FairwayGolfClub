import { useEffect, useState, useCallback } from 'react'
import type { ScheduledSession, ScheduledPlayer } from '../types'

interface GreetingData {
  firstName: string
  bayName: string
  avgCarry: number | null
  lifetimeSessions: number
  skillSegment: string | null
  currentFocus: string | null
  insightObservation: string | null
  insightRecommendation: string | null
  insightClub: string | null
  aiGreeting: string
}

interface Props {
  session: ScheduledSession
  player: ScheduledPlayer
  onDone: () => void
  autoReturnSeconds?: number
  fetchGreeting?: (appointmentId: string) => Promise<GreetingData | null>
}

export default function BayDirectionScreen({
  session, player, onDone, autoReturnSeconds = 20, fetchGreeting,
}: Props) {
  const [remaining, setRemaining] = useState(autoReturnSeconds)
  const [greeting, setGreeting] = useState<GreetingData | null>(null)
  const [greetingLoading, setGreetingLoading] = useState(false)

  const loadGreeting = useCallback(async () => {
    if (!fetchGreeting || !session.reservationId) return
    setGreetingLoading(true)
    try {
      const g = await fetchGreeting(session.reservationId)
      setGreeting(g)
    } catch {
      // fall back to static display
    } finally {
      setGreetingLoading(false)
    }
  }, [fetchGreeting, session.reservationId])

  useEffect(() => { loadGreeting() }, [loadGreeting])

  useEffect(() => {
    if (remaining <= 0) { onDone(); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, onDone])

  const isWalkIn = session.reservationId === 'walk-in' || player.isGuest
  const firstName = greeting?.firstName ?? player.displayName?.split(' ')[0] ?? 'Golfer'
  const bayLabel = greeting?.bayName ?? session.bayLabel
  const initial = firstName[0]?.toUpperCase() ?? '?'
  const welcomeLine = isWalkIn ? `Let's get you started, ${firstName}!` : `Welcome back, ${firstName}.`

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-7 px-10 text-center overflow-y-auto py-8">

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center">
          <span className="text-[#C9A84C] text-3xl font-bold">{initial}</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">
            <span className="text-[#C9A84C]">{welcomeLine}</span>
          </h1>
          {!isWalkIn && (
            <p className="text-[#666] text-sm mt-1">
              {formatTime(session.startTime)} – {formatTime(session.endTime)}
            </p>
          )}
        </div>
      </div>

      {/* Bay direction */}
      <div className="rounded-2xl border border-[#C9A84C]/40 bg-[#C9A84C]/5 px-10 py-6 flex flex-col items-center gap-1">
        <p className="text-[#888] text-xs uppercase tracking-widest">Head to</p>
        <p className="text-5xl font-bold text-[#C9A84C]">{bayLabel}</p>
      </div>

      {/* AI Greeting */}
      {greetingLoading && (
        <div className="flex gap-2 items-center text-[#555] text-sm">
          <div className="w-4 h-4 border border-[#C9A84C]/40 border-t-[#C9A84C] rounded-full animate-spin" />
          Loading your session brief…
        </div>
      )}

      {!greetingLoading && greeting?.aiGreeting && (
        <div className="rounded-2xl border border-[#333] bg-[#111] px-6 py-4 max-w-sm flex gap-3 text-left">
          <span className="text-xl flex-shrink-0">🤖</span>
          <p className="text-[#ccc] text-sm leading-relaxed">{greeting.aiGreeting}</p>
        </div>
      )}

      {/* Stats chips */}
      {greeting && (
        <div className="flex gap-3 flex-wrap justify-center">
          {greeting.avgCarry && (
            <div className="bg-[#111] border border-[#222] rounded-xl px-4 py-2 flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-lg">{greeting.avgCarry} yds</span>
              <span className="text-[#555] text-xs uppercase tracking-wide">Driver Avg</span>
            </div>
          )}
          {greeting.lifetimeSessions > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl px-4 py-2 flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-lg">{greeting.lifetimeSessions}</span>
              <span className="text-[#555] text-xs uppercase tracking-wide">Sessions</span>
            </div>
          )}
          {greeting.skillSegment && (
            <div className="bg-[#111] border border-[#222] rounded-xl px-4 py-2 flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-sm">{greeting.skillSegment}</span>
              <span className="text-[#555] text-xs uppercase tracking-wide">Level</span>
            </div>
          )}
        </div>
      )}

      {/* Latest insight */}
      {greeting?.insightRecommendation && (
        <div className="rounded-2xl border border-[#C9A84C]/30 bg-[#111] px-6 py-4 max-w-sm w-full text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">💡</span>
            <span className="text-[#C9A84C] text-xs font-bold uppercase tracking-wide">Today's Focus</span>
            {greeting.insightClub && (
              <span className="ml-auto text-xs bg-[#C9A84C]/15 text-[#C9A84C] rounded-full px-2 py-0.5">{greeting.insightClub}</span>
            )}
          </div>
          {greeting.insightObservation && (
            <p className="text-[#888] text-xs mb-1">{greeting.insightObservation}</p>
          )}
          <p className="text-white text-sm font-medium">{greeting.insightRecommendation}</p>
        </div>
      )}

      {/* Countdown */}
      <div className="flex flex-col items-center gap-1 mt-2">
        <p className="text-[#444] text-xs">Returning to home screen in {remaining}s</p>
        <div className="w-40 h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C9A84C]/50 rounded-full transition-all duration-1000"
            style={{ width: `${(remaining / autoReturnSeconds) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
