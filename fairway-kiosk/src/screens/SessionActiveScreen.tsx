import { useEffect, useState } from 'react'
import GoldButton from '../components/GoldButton'
import type { SessionState } from '../hooks/useSession'

interface Props {
  session: SessionState
  onEndSession: () => void
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function elapsed(start: Date | null): string {
  if (!start) return '00:00'
  const secs = Math.floor((Date.now() - start.getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${pad(m)}:${pad(s)}`
}

export default function SessionActiveScreen({ session, onEndSession }: Props) {
  const [time, setTime] = useState(() => elapsed(session.startTime))
  const [confirmEnd, setConfirmEnd] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTime(elapsed(session.startTime)), 1000)
    return () => clearInterval(t)
  }, [session.startTime])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-10 px-16">
      <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-10 w-auto hg-logo-white" />

      {/* Timer */}
      <div className="text-center">
        <p className="text-[#888] text-xs uppercase tracking-widest mb-2">Session Time</p>
        <p className="text-7xl font-bold text-white tabular-nums">{time}</p>
        <p className="text-[#C9A84C] text-sm mt-2 uppercase tracking-widest">{session.sessionType}</p>
      </div>

      {/* Bay info */}
      <div className="rounded-2xl bg-[#1A1A1A] px-8 py-4 flex items-center gap-4">
        <span className="text-2xl">⛳</span>
        <div>
          <p className="text-white font-semibold">{session.bayName ?? 'Bay'}</p>
          <p className="text-[#888] text-sm">{session.players.length} player{session.players.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Players */}
      <div className="flex gap-3">
        {session.players.map((p, i) => (
          <div key={i} className="rounded-2xl bg-[#111] border border-[#2A2A2A] px-5 py-3 flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] font-bold">
              {i + 1}
            </div>
            <p className="text-white text-sm font-medium">{p.displayName}</p>
            <p className="text-[#888] text-xs">{p.isGuest ? 'Guest' : 'Member'}</p>
          </div>
        ))}
      </div>

      {/* End session */}
      {!confirmEnd ? (
        <GoldButton variant="secondary" onClick={() => setConfirmEnd(true)}>End Session</GoldButton>
      ) : (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-white font-semibold text-center">End this session?</p>
          <p className="text-[#888] text-sm text-center">Your stats will be saved and emailed to players.</p>
          <div className="flex gap-3">
            <GoldButton variant="secondary" onClick={() => setConfirmEnd(false)}>Cancel</GoldButton>
            <GoldButton onClick={onEndSession}>End & View Summary</GoldButton>
          </div>
        </div>
      )}
    </div>
  )
}
