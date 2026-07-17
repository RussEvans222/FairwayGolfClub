import type { LiveSession } from '../types'
import GoldButton from '../components/GoldButton'

interface Props {
  sessions: LiveSession[]
  loading: boolean
  selectedSessionId: string | null
  onSelect: (session: LiveSession) => void
  onMemberJoin: () => void
  onGuestJoin: () => void
  onBack: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function JoinPartyScreen({
  sessions,
  loading,
  selectedSessionId,
  onSelect,
  onMemberJoin,
  onGuestJoin,
  onBack,
}: Props) {
  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId) ?? null
  const hasSelection = !!selectedSession

  return (
    <div className="w-full h-full overflow-hidden px-6 py-6 lg:px-10 lg:py-8">
      <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        {/* Left: active parties */}
        <section className="flex min-h-0 flex-col gap-5 rounded-[2rem] border border-[#2A2A2A] bg-[#0E0E0E] p-6 lg:p-8">
          <div className="flex-shrink-0">
            <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-10 w-auto hg-logo-white mb-3" />
            <h1 className="text-4xl font-bold text-white">Join a Party</h1>
            <p className="text-[#666] text-sm mt-1">
              Select the bay your friends are already playing at.
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {loading && (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
              </div>
            )}

            {!loading && sessions.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[#2A2A2A] bg-[#111] px-6 py-10 text-center">
                <p className="text-white text-lg font-semibold">No active sessions right now.</p>
                <p className="text-[#666] text-sm max-w-sm">
                  Nobody's on the bays yet. Use the back button and check in as a walk-in instead.
                </p>
              </div>
            )}

            {!loading && sessions.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[#555] text-xs uppercase tracking-wider">Active sessions</p>
                {sessions.map(s => {
                  const isSelected = s.sessionId === selectedSessionId
                  return (
                    <button
                      key={s.sessionId}
                      onClick={() => onSelect(s)}
                      className={`rounded-3xl border px-6 py-5 flex items-center gap-5 transition-all text-left w-full flex-shrink-0 active:scale-[0.99]
                        ${isSelected
                          ? 'border-[#C9A84C]/70 bg-[#C9A84C]/10 shadow-[0_0_0_1px_rgba(201,168,76,0.35)]'
                          : 'border-[#2A2A2A] bg-[#111] hover:border-[#C9A84C]/55 hover:bg-[#C9A84C]/5'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'bg-[#C9A84C]/20' : 'bg-[#C9A84C]/10'}`}>
                        <span className="text-[#C9A84C] text-sm font-bold">⛳</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="text-white font-semibold text-lg truncate">{s.bayName}</p>
                          {isSelected && (
                            <span className="rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/15 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[#C9A84C]">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[#666] text-sm mt-0.5">Started {formatTime(s.startTime)}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-500/15 text-green-400 flex-shrink-0">
                        {s.participantCount} playing
                      </span>
                      <span className="text-[#444] text-xl">›</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right: join choice */}
        <aside className="flex min-h-0 flex-col gap-5 rounded-[2rem] border border-[#2A2A2A] bg-[#0B0B0B] p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[#C9A84C] text-xs uppercase tracking-[0.4em] font-medium mb-2">New User Path</p>
              <h2 className="text-3xl font-bold text-white">Join as a guest</h2>
              <p className="text-[#666] text-sm mt-2 max-w-sm">
                Tap a party on the left, then choose how you're joining. New users can register and join the live session in one flow.
              </p>
            </div>
            <div className="hidden rounded-2xl border border-[#2A2A2A] bg-[#111] px-4 py-3 text-right lg:block">
              <p className="text-[#888] text-[11px] uppercase tracking-[0.3em]">Step</p>
              <p className="text-white text-sm font-semibold">{hasSelection ? '2 of 2' : '1 of 2'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#2A2A2A] bg-[#111] p-5">
            {!hasSelection ? (
              <div className="flex flex-col gap-4">
                <p className="text-white font-semibold">Start by selecting an active party.</p>
                <div className="space-y-3 text-sm text-[#aaa]">
                  <div className="flex gap-3">
                    <span className="text-[#C9A84C] font-semibold">1.</span>
                    <span>Tap the bay your friends are already playing at.</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#C9A84C] font-semibold">2.</span>
                    <span>Choose whether you're joining as a member or a new guest.</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-[#2A2A2A] bg-[#0D0D0D] px-4 py-4 text-sm text-[#666]">
                  The new-user pathway opens up after you select a live party.
                </div>
                <GoldButton variant="secondary" disabled className="w-full">
                  Select a Party First
                </GoldButton>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-4 py-4">
                  <p className="text-[#C9A84C] text-xs uppercase tracking-[0.3em] font-medium">Selected Party</p>
                  <p className="text-white text-2xl font-bold mt-1">{selectedSession.bayName}</p>
                  <p className="text-[#666] text-sm mt-1">
                    Started {formatTime(selectedSession.startTime)} · {selectedSession.participantCount} playing
                  </p>
                </div>

                <div className="rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                  <p className="text-white font-semibold">Choose your path</p>
                  <p className="text-[#666] text-sm mt-1">
                    Members can sign in normally. New users should use the guest path so we can register them before joining.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <GoldButton variant="secondary" onClick={onMemberJoin} className="w-full">
                    Member Sign In
                  </GoldButton>
                  <GoldButton size="lg" onClick={onGuestJoin} className="w-full">
                    New User / Join as Guest
                  </GoldButton>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] px-5 py-4">
            <p className="text-[#C9A84C] text-xs uppercase tracking-[0.3em] font-medium">Need help?</p>
            <p className="text-[#888] text-sm mt-2">
              If you don't know which bay your friends are on, ask staff and then come back here.
            </p>
          </div>

          <div className="flex-shrink-0 pt-1">
            <GoldButton variant="ghost" onClick={onBack}>← Back</GoldButton>
          </div>
        </aside>
      </div>
    </div>
  )
}
