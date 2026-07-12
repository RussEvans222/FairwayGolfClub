import type { LiveSession } from '../types'
import GoldButton from '../components/GoldButton'

interface Props {
  sessions: LiveSession[]
  loading: boolean
  onSelect: (session: LiveSession) => void
  onBack: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function JoinPartyScreen({ sessions, loading, onSelect, onBack }: Props) {
  return (
    <div className="w-full h-full flex flex-col px-10 pt-10 pb-8 gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0">
        <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-8 w-auto hg-logo-white mb-2" />
        <h1 className="text-4xl font-bold text-white">Join a Party</h1>
        <p className="text-[#666] text-sm mt-1">Pick the bay your friends are already playing at.</p>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
            <p className="text-white text-lg font-semibold">No active sessions right now.</p>
            <p className="text-[#666] text-sm">Nobody's on the bays yet — try Walk-In Check-In instead.</p>
          </div>
        )}

        {!loading && sessions.map(s => (
          <button
            key={s.sessionId}
            onClick={() => onSelect(s)}
            className="rounded-2xl border border-[#2A2A2A] bg-[#111] hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5 px-6 py-5 flex items-center gap-5 transition-all active:scale-[0.98] text-left w-full flex-shrink-0"
          >
            <div className="w-11 h-11 rounded-full bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#C9A84C] text-sm font-bold">⛳</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-lg">{s.bayName}</p>
              <p className="text-[#666] text-sm mt-0.5">Started {formatTime(s.startTime)}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-500/15 text-green-400 flex-shrink-0">
              {s.participantCount} playing
            </span>
            <span className="text-[#444]">›</span>
          </button>
        ))}
      </div>

      <div className="flex-shrink-0">
        <GoldButton variant="ghost" onClick={onBack}>← Back</GoldButton>
      </div>
    </div>
  )
}
