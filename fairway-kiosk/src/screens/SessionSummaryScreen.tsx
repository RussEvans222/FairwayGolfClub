import { useState } from 'react'
import GoldButton from '../components/GoldButton'
import StatCard from '../components/StatCard'
import CoachTip from '../components/CoachTip'
import QrCodeModal from '../components/QrCodeModal'
import type { SessionState } from '../hooks/useSession'

interface SummaryStats {
  avgBallSpeed: number | null
  avgCarryDistance: number | null
  bestCarry: number | null
  shotCount: number | null
  durationMinutes: number | null
}

interface CoachTipData {
  observation: string
  recommendation: string
  club?: string
  confidence?: number
}

interface Props {
  session: SessionState
  stats: SummaryStats
  coachTip: CoachTipData | null
  isGuest?: boolean
  onDone: () => void
}

export default function SessionSummaryScreen({ session, stats, coachTip, isGuest = false, onDone }: Props) {
  const [qrFor, setQrFor] = useState<{ contactId: string; displayName: string } | null>(null)
  const playersWithContact = session.players.filter(p => p.contact?.Id)

  return (
    <div className="w-full h-full flex flex-col items-center justify-start gap-8 px-16 pt-16 pb-10 overflow-y-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-2 border-[#C9A84C] flex items-center justify-center mx-auto mb-4">
          <span className="text-[#C9A84C] text-2xl">✓</span>
        </div>
        <h2 className="text-4xl font-bold text-white">Session Complete</h2>
        <p className="text-[#888] mt-1">
          {session.sessionType} · {session.bayName ?? 'Bay'} · {session.players.length} player{session.players.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats grid */}
      <div className="w-full max-w-2xl grid grid-cols-2 gap-4">
        <StatCard label="Avg Ball Speed" value={stats.avgBallSpeed} unit="mph" highlight />
        <StatCard label="Avg Carry" value={stats.avgCarryDistance} unit="yds" highlight />
        <StatCard label="Best Carry" value={stats.bestCarry} unit="yds" />
        <StatCard label="Shots Tracked" value={stats.shotCount} />
        <StatCard label="Session Duration" value={stats.durationMinutes} unit="min" />
      </div>

      {/* Coach tip */}
      {coachTip && (
        <div className="w-full max-w-2xl">
          <CoachTip
            observation={coachTip.observation}
            recommendation={coachTip.recommendation}
            club={coachTip.club}
            confidence={coachTip.confidence}
          />
        </div>
      )}

      {/* Players */}
      <div className="w-full max-w-2xl">
        <p className="text-[#888] text-xs uppercase tracking-widest mb-3">Session Summary Sent To</p>
        <div className="flex flex-col gap-2">
          {session.players
            .filter(p => p.contact?.Email)
            .map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-[#C9A84C]">✉</span>
                <span className="text-white">{p.displayName}</span>
                <span className="text-[#888]">{p.contact?.Email}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Permanent check-in QR codes */}
      {playersWithContact.length > 0 && (
        <div className="w-full max-w-2xl rounded-2xl border border-[#2A2A2A] bg-[#111] px-6 py-5">
          <p className="text-white font-semibold text-sm">Save your check-in code</p>
          <p className="text-[#888] text-xs mt-1 leading-relaxed">
            This code is yours to keep — scan it next visit to skip the line, with or without a reservation.
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            {playersWithContact.map((p, i) => (
              <button
                key={i}
                onClick={() => setQrFor({ contactId: p.contact!.Id, displayName: p.displayName })}
                className="border border-[#C9A84C]/30 text-[#C9A84C] text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#C9A84C]/10 active:scale-95 transition-all"
              >
                ▦ {p.displayName}'s code
              </button>
            ))}
          </div>
        </div>
      )}

      {qrFor && (
        <QrCodeModal
          value={qrFor.contactId}
          title={qrFor.displayName}
          subtitle="Your permanent Fairway QR code"
          onClose={() => setQrFor(null)}
        />
      )}

      {/* Guest upsell */}
      {isGuest && (
        <div className="w-full max-w-2xl rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">🏌️</span>
            <div>
              <p className="text-[#C9A84C] font-semibold text-base">Want to see your stats every session?</p>
              <p className="text-[#888] text-sm mt-1 leading-relaxed">
                Your Golfer360 profile is already created — it's free. Sign up at the front desk to unlock your full stats history, AI coaching insights, and track your improvement over time.
              </p>
              <p className="text-white text-sm font-medium mt-2">Membership starts at $X/month. First session free.</p>
            </div>
          </div>
        </div>
      )}

      <GoldButton size="lg" onClick={onDone} className="mt-4">
        Done — Back to Start
      </GoldButton>
    </div>
  )
}
