import { useEffect, useState } from 'react'
import type { ScheduledSession } from '../types'

interface BaySummary {
  bayId: string
  bayName: string
}

interface QueuePosition {
  position: number
  totalInQueue: number
  displayName: string
  isMember: boolean
}

interface Props {
  queueInfo: QueuePosition
  sessions: ScheduledSession[]
  bays: BaySummary[]
  onDone: () => void
  autoReturnSeconds?: number
}

// Only meaningful when EVERY bay is occupied right now (checked per bay);
// a bay with no session today must never look "busy" just because some
// other bay's session is still running.
function computeWaitMinutes(bays: BaySummary[], sessions: ScheduledSession[]): number {
  if (bays.length === 0) return 0
  const now = Date.now()
  const endTimes = bays.map(bay => {
    const s = sessions.find(s =>
      s.bayId === bay.bayId &&
      (s.status === 'Dispatched' || s.status === 'In Progress') &&
      new Date(s.endTime).getTime() > now
    )
    return s ? new Date(s.endTime).getTime() : null
  })
  if (endTimes.some(t => t === null)) return 0
  const soonestEnd = Math.min(...(endTimes as number[]))
  return Math.max(0, Math.round((soonestEnd - now) / 60000))
}

export default function BayQueueScreen({
  queueInfo,
  sessions,
  bays,
  onDone,
  autoReturnSeconds = 30,
}: Props) {
  const [remaining, setRemaining] = useState(autoReturnSeconds)
  const waitMinutes = computeWaitMinutes(bays, sessions)
  const firstName = queueInfo.displayName.split(' ')[0]

  useEffect(() => {
    if (remaining <= 0) { onDone(); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, onDone])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-10 text-center">
      <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-10 w-auto hg-logo-white" />

      {/* Header */}
      <div>
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.4em] font-medium mb-3">Bay Queue</p>
        <h1 className="text-4xl font-bold text-white">You're in line, {firstName}!</h1>
        <p className="text-[#666] text-sm mt-2">We'll notify staff to wave you over as soon as a bay opens.</p>
      </div>

      {/* Queue position card */}
      <div className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-10 py-6 flex flex-col items-center gap-1 w-full max-w-xs">
        <p className="text-[#888] text-xs uppercase tracking-widest">Your Position</p>
        <p className="text-6xl font-bold text-[#C9A84C]">{queueInfo.position}</p>
        {queueInfo.totalInQueue > 1 && (
          <p className="text-[#555] text-sm">{queueInfo.totalInQueue} people ahead</p>
        )}
      </div>

      {/* Wait estimate */}
      {waitMinutes > 0 ? (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] px-6 py-4 flex flex-col items-center gap-1 w-full max-w-xs">
          <p className="text-[#888] text-xs uppercase tracking-widest">Estimated Wait</p>
          <p className="text-3xl font-bold text-white">~{waitMinutes} min</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 px-6 py-4 w-full max-w-xs">
          <p className="text-green-400 text-sm font-semibold text-center">A bay may open up shortly!</p>
        </div>
      )}

      {/* What to do while waiting */}
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] px-6 py-4 max-w-sm w-full text-left flex gap-3 items-start">
        <span className="text-2xl flex-shrink-0">🍺</span>
        <div>
          <p className="text-[#C9A84C] text-sm font-semibold">Head to the bar</p>
          <p className="text-[#666] text-xs mt-0.5 leading-relaxed">
            Grab a drink at the bar — staff will come get you the moment your bay opens. Don't go far!
          </p>
        </div>
      </div>

      {/* Member note */}
      {queueInfo.isMember && (
        <p className="text-[#444] text-xs max-w-xs">
          As a member, your session history and stats will be tracked automatically once you're on a bay.
        </p>
      )}

      {/* Countdown */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-[#333] text-xs">Returning to home screen in {remaining}s</p>
        <div className="w-40 h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C9A84C]/40 rounded-full transition-all duration-1000"
            style={{ width: `${(remaining / autoReturnSeconds) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
