import { useMemo, useState } from 'react'
import type { ScheduledSession } from '../types'
import { getEasternHour } from '../utils/time'
import QrCodeModal from '../components/QrCodeModal'

interface BaySummary {
  bayId: string
  bayName: string
}

interface Props {
  sessions: ScheduledSession[]
  bays: BaySummary[]
  loading: boolean
  onSelectPlayer: (session: ScheduledSession, playerIndex: number) => void
  onMemberWalkIn: () => void
  onAddGuest: (session: ScheduledSession) => void
  onBack?: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getHour() {
  return getEasternHour()
}

// Sessions starting within the next 60 minutes or currently active
function upcomingSessions(sessions: ScheduledSession[]) {
  const now = Date.now()
  const cutoff = now + 60 * 60 * 1000
  return sessions.filter(s => {
    const start = new Date(s.startTime).getTime()
    const end = new Date(s.endTime).getTime()
    // include if: starts within next hour OR currently underway
    return (start >= now && start <= cutoff) || (start <= now && end >= now)
  })
}

// Estimate next available bay in minutes — only meaningful when EVERY bay is
// occupied right now (checked per bay, not "is anything active anywhere");
// otherwise there's an open bay and the wait is zero.
function estimateWaitMinutes(bays: BaySummary[], sessions: ScheduledSession[]) {
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
  if (endTimes.some(t => t === null)) return 0 // at least one bay is open
  const soonestEnd = Math.min(...(endTimes as number[]))
  return Math.max(0, Math.round((soonestEnd - now) / 60000))
}

function WaitSuggestion({ waitMinutes }: { waitMinutes: number }) {
  const hour = getHour()
  const isMorning = hour < 12
  const isAfternoon = hour >= 12 && hour < 17
  const isEvening = hour >= 17

  if (waitMinutes === 0) return null

  let suggestion: { emoji: string; headline: string; body: string }

  if (isMorning) {
    suggestion = {
      emoji: '☕',
      headline: 'Grab a coffee while you wait',
      body: `Fresh coffee and pastries from Creme de la Creme are available at the bar. Your bay will be ready in about ${waitMinutes} min.`,
    }
  } else if (isAfternoon) {
    suggestion = {
      emoji: '🍺',
      headline: 'Head to the bar',
      body: `The bar is open — grab a drink and settle in. We'll have a bay ready for you in about ${waitMinutes} min.`,
    }
  } else {
    suggestion = {
      emoji: '🥃',
      headline: "The bar's open",
      body: `Kick back with a craft cocktail while you wait. A bay opens up in about ${waitMinutes} min.`,
    }
  }

  // Warm-up tip alongside
  const warmup = isEvening
    ? 'Or loosen up with some practice putts near the entrance.'
    : 'Or grab a few practice putts to warm up your touch.'

  return (
    <div className="rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/5 px-5 py-4 flex gap-4 items-start">
      <span className="text-3xl flex-shrink-0">{suggestion.emoji}</span>
      <div>
        <p className="text-[#C9A84C] font-semibold text-sm">{suggestion.headline}</p>
        <p className="text-[#888] text-xs mt-0.5 leading-relaxed">
          {suggestion.body} {warmup}
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ status, isLate }: { status: string; isLate: boolean }) {
  if (isLate) return (
    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-500/15 text-red-400">Late</span>
  )
  if (status === 'Dispatched' || status === 'In Progress') return (
    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-500/15 text-green-400">Active</span>
  )
  if (status === 'Completed') return (
    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-[#2A2A2A] text-[#555]">Done</span>
  )
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-[#1A1A1A] text-[#888]">Upcoming</span>
  )
}

export default function ScheduledSessionsScreen({ sessions, bays, loading, onSelectPlayer, onMemberWalkIn, onAddGuest, onBack }: Props) {
  const now = Date.now()
  const [qrFor, setQrFor] = useState<{ contactId: string; displayName: string } | null>(null)

  const upcoming = useMemo(() => upcomingSessions(sessions), [sessions])
  const waitMinutes = useMemo(() => estimateWaitMinutes(bays, sessions), [bays, sessions])
  const allBaysBusy = waitMinutes > 0

  const hour = getHour()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="w-full h-full flex flex-col px-10 pt-10 pb-8 gap-6 overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-8 w-auto hg-logo-white mb-2" />
          <h1 className="text-4xl font-bold text-white">{greeting}, Golfer!</h1>
          <p className="text-[#666] text-sm mt-1">Find your session below or check in as a walk-in.</p>
        </div>
        <p className="text-[#555] text-xs pt-1">
          {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>

      {/* Walk-in wait suggestion */}
      {!loading && allBaysBusy && (
        <WaitSuggestion waitMinutes={waitMinutes} />
      )}

      {/* Sessions in the next hour */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0">

        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
        )}

        {!loading && upcoming.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
            <p className="text-white text-lg font-semibold">No sessions in the next hour.</p>
            <p className="text-[#666] text-sm">Walk-ins are welcome — all bays available.</p>
          </div>
        )}

        {!loading && upcoming.length > 0 && (
          <>
            <p className="text-[#555] text-xs uppercase tracking-wider flex-shrink-0">Sessions in the next hour</p>
            {upcoming.map((s) => {
              const isLate = s.status === 'Scheduled' && new Date(s.startTime).getTime() < now
              return (
                <div key={s.reservationId}
                  className={`rounded-2xl border bg-[#111] overflow-hidden flex-shrink-0 ${
                    isLate ? 'border-red-500/30' : 'border-[#2A2A2A]'
                  }`}>
                  {/* Session header row */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E1E1E]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#C9A84C] text-xs font-bold">⛳</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{s.bayLabel}</p>
                        <p className="text-[#666] text-xs">
                          {formatTime(s.startTime)} – {formatTime(s.endTime)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={s.status} isLate={isLate} />
                  </div>

                  {/* Player row */}
                  <div className="flex divide-x divide-[#1E1E1E]">
                    {s.players.map((p, pi) => {
                      const initial = p.displayName?.[0]?.toUpperCase() ?? '?'
                      return (
                        <div key={pi} className="flex-1 flex items-stretch">
                          <button
                            onClick={() => !p.checkedIn && onSelectPlayer(s, pi)}
                            disabled={p.checkedIn}
                            className={`flex-1 flex items-center gap-3 px-5 py-4 transition-all text-left
                              ${p.checkedIn
                                ? 'cursor-default opacity-40'
                                : 'hover:bg-[#C9A84C]/5 active:bg-[#C9A84C]/10 active:scale-[0.98] cursor-pointer'
                              }`}
                          >
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0
                              ${p.checkedIn
                                ? 'bg-green-500/15 text-green-400'
                                : 'bg-[#1A1A1A] text-[#C9A84C] border border-[#2A2A2A]'
                              }`}>
                              {p.checkedIn ? '✓' : initial}
                            </div>
                            <div>
                              <p className={`font-medium text-sm ${p.checkedIn ? 'text-[#555]' : 'text-white'}`}>
                                {p.displayName ?? `Player ${pi + 1}`}
                              </p>
                              <p className="text-[#555] text-xs">
                                {p.checkedIn ? 'Checked in' : p.isGuest ? 'Guest' : 'Tap to check in →'}
                              </p>
                            </div>
                          </button>
                          {!p.checkedIn && p.contactId && (
                            <button
                              onClick={() => setQrFor({ contactId: p.contactId!, displayName: p.displayName ?? `Player ${pi + 1}` })}
                              title="Show their permanent Fairway QR code"
                              className="px-3 flex items-center justify-center text-[#555] hover:text-[#C9A84C] transition-colors flex-shrink-0"
                            >
                              <span className="text-lg">▦</span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Add Guest — only shown when at least one player is checked in */}
                  {s.players.some(p => p.checkedIn) && (
                    <button
                      onClick={() => onAddGuest(s)}
                      className="w-full flex items-center gap-3 px-5 py-3 border-t border-[#1E1E1E] hover:bg-[#C9A84C]/5 active:bg-[#C9A84C]/10 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-full border border-dashed border-[#C9A84C]/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#C9A84C] text-sm">+</span>
                      </div>
                      <div>
                        <p className="text-[#C9A84C] text-sm font-medium">Add a Guest</p>
                        <p className="text-[#555] text-xs">Guests pay $35/session · get a free Golfer360 profile</p>
                      </div>
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Walk-in footer */}
      <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-5 flex-shrink-0 gap-3">
        <div>
          <p className="text-white text-sm font-medium">No reservation today?</p>
          <p className="text-[#555] text-xs">
            {waitMinutes > 0 ? `Next bay available in ~${waitMinutes} min` : 'Bays available now'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="border border-[#2A2A2A] text-[#888] font-semibold text-sm px-5 py-3 rounded-xl hover:border-[#C9A84C]/40 hover:text-[#C9A84C] active:scale-95 transition-all"
            >
              ← Back
            </button>
          )}
          <button
            onClick={onMemberWalkIn}
            className="bg-[#C9A84C] text-black font-semibold text-sm px-6 py-3 rounded-xl hover:bg-[#E8C96A] active:scale-95 transition-all"
          >
            Member Walk-In
          </button>
        </div>
      </div>

      {qrFor && (
        <QrCodeModal
          value={qrFor.contactId}
          title={qrFor.displayName}
          subtitle="Your permanent Fairway QR code"
          onClose={() => setQrFor(null)}
        />
      )}
    </div>
  )
}
