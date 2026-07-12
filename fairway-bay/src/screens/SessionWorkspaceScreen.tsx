import { useMemo, useState } from 'react'
import type { Bay, GolferLifetimeSummary, NormalizedTelemetryShot, PlayerSession, SessionTelemetryState } from '../types'

interface Props {
  bay: Bay
  players: PlayerSession[]
  activeIndex: number
  telemetry: SessionTelemetryState
  onChangeIndex: (index: number) => void
  onChangeBay: () => void
  onStartPlaying: () => void
}

type ChatMessage = { role: 'assistant' | 'user'; text: string; timestamp: string }

function formatNumber(value: number | null | undefined, suffix = '') {
  if (value == null) return '—'
  return `${value.toLocaleString()}${suffix}`
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function buildPracticeCards(summary: GolferLifetimeSummary | null, lastShot: NormalizedTelemetryShot | null) {
  const cards: Array<{ title: string; body: string }> = []

  if (summary?.currentFocus) {
    cards.push({
      title: 'Current focus',
      body: `Reinforce ${summary.currentFocus} on the first 5 swings before chasing distance.`,
    })
  }

  if (summary?.averageDriverCarry != null) {
    cards.push({
      title: 'Driver carry',
      body: `Your historical driver carry sits around ${summary.averageDriverCarry} yds. Build around that baseline.`,
    })
  }

  if (lastShot?.shotShape && lastShot.shotShape !== 'Straight') {
    cards.push({
      title: 'Shot shape',
      body: `Your latest ${lastShot.shotShape.toLowerCase()} suggests a short block of face-control work next.`,
    })
  } else if (summary?.average7IronCarry != null) {
    cards.push({
      title: '7-iron control',
      body: `Use 7-iron as the calibration club. You’re averaging ${summary.average7IronCarry} yds.`,
    })
  }

  if (summary?.favoriteClub) {
    cards.push({
      title: 'Scoring club',
      body: `Warm up with ${summary.favoriteClub} to lock in tempo before you expand the bag.`,
    })
  }

  return cards.slice(0, 3)
}

function buildCoachReply(message: string, player: PlayerSession, lastShot: NormalizedTelemetryShot | null) {
  const lower = message.toLowerCase()
  if (lower.includes('slice') || lower.includes('fade')) {
    return 'Your face is likely arriving open. Start with 3 half-swings and finish with the logo to the target.'
  }
  if (lower.includes('distance') || lower.includes('carry')) {
    return `Your carry baseline is ${formatNumber(player.lifetimeSummary?.averageDriverCarry, ' yds')} on driver. Optimize strike quality before chasing speed.`
  }
  if (lower.includes('warm') || lower.includes('start')) {
    return 'Begin with wedges and short irons. Build contact first, then shift into the driver.'
  }
  if (lastShot?.shotShape && lastShot.shotShape !== 'Straight') {
    return `That last ${lastShot.shotShape.toLowerCase()} says the pattern is moving. I’d stay with one club and calibrate face control.`
  }
  return 'Stay process-driven: target, setup, strike, then one adjustment at a time.'
}

function buildLifetimeStats(player: PlayerSession | null) {
  if (!player?.lifetimeSummary) {
    return [
      { label: 'Lifetime sessions', value: '—' },
      { label: 'Lifetime shots', value: '—' },
      { label: 'Avg driver carry', value: '—' },
      { label: 'Current focus', value: '—' },
    ]
  }

  const summary = player.lifetimeSummary
  return [
    { label: 'Lifetime sessions', value: formatNumber(summary.lifetimeSessions) },
    { label: 'Lifetime shots', value: formatNumber(summary.lifetimeShots) },
    { label: 'Avg driver carry', value: formatNumber(summary.averageDriverCarry, ' yds') },
    { label: 'Current focus', value: summary.currentFocus ?? '—' },
  ]
}

export function SessionWorkspaceScreen({
  bay,
  players,
  activeIndex,
  telemetry,
  onChangeIndex,
  onChangeBay,
  onStartPlaying,
}: Props) {
  const [started, setStarted] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Pro Golfer Agentforce Agent is ready. Ask for a warm-up, fix, or target-based recommendation.',
      timestamp: new Date().toISOString(),
    },
  ])

  const player = players[activeIndex] ?? players[0] ?? null
  const playerName = player?.displayName ?? 'Golfer'
  const lastTelemetryShot = telemetry.shots[telemetry.shots.length - 1] ?? null
  const lastShot = lastTelemetryShot ?? (player?.lastShot ? {
    source: 'salesforce',
    shotNumber: player.lastShot.shotNumber,
    capturedAt: new Date().toISOString(),
    club: player.lastShot.club,
    ballSpeed: player.lastShot.ballSpeed,
    carry: player.lastShot.carry,
    total: player.lastShot.total,
    launchAngle: player.lastShot.launchAngle,
    spinRate: player.lastShot.spinRate,
    clubSpeed: null,
    shotShape: player.lastShot.shotShape,
    dataTier: 'Ball Only' as const,
    raw: { source: 'salesforce' },
  } : null)
  const sessionShots = telemetry.shots.length + (player?.shotCount ?? 0)
  const totalCarry = useMemo(() => {
    const carries = telemetry.shots.map(shot => shot.carry).filter((carry): carry is number => carry != null)
    return carries.length ? Math.round(carries.reduce((sum, carry) => sum + carry, 0) / carries.length) : player?.lastShot?.carry ?? null
  }, [telemetry.shots, player?.lastShot?.carry])
  const practiceCards = useMemo(() => buildPracticeCards(player?.lifetimeSummary ?? null, lastShot), [player?.lifetimeSummary, lastShot])
  const lifetimeStats = useMemo(() => buildLifetimeStats(player), [player])

  function handleStart() {
    setStarted(true)
    onStartPlaying()
  }

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    const fallbackPlayer: PlayerSession = {
      participantId: '',
      profileId: '',
      displayName: 'Golfer',
      isGuest: true,
      slotNumber: 1,
      shotCount: 0,
      lastShot: null,
      clubAverages: [],
      bestCarry: null,
      lifetimeSummary: null,
    }
    setMessages(prev => [
      ...prev,
      { role: 'user', text, timestamp: new Date().toISOString() },
      { role: 'assistant', text: buildCoachReply(text, player ?? fallbackPlayer, lastShot), timestamp: new Date().toISOString() },
    ])
    setDraft('')
  }

  return (
    <div className="w-full h-full overflow-hidden px-4 py-4 lg:px-6 lg:py-6">
      <div className="grid h-full gap-5 xl:grid-cols-[minmax(0,1.08fr)_340px]">
        <section className="flex min-h-0 flex-col gap-5 rounded-[2rem] border border-[#2A2A2A] bg-[#0E0E0E] p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4 flex-shrink-0">
            <div>
              <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-9 w-auto bay-logo-white mb-3" />
              <p className="text-[#C9A84C] text-xs uppercase tracking-[0.4em] font-medium mb-2">Session workspace</p>
              <h1 className="text-4xl font-bold text-white">{bay.name}</h1>
              <p className="text-[#666] text-sm mt-1">Live shot tracking, recommendations, and coaching in one view.</p>
            </div>
            <button onClick={onChangeBay} className="text-[#666] text-xs hover:text-white transition-colors">Change Bay</button>
          </div>

          <div className="rounded-[1.5rem] border border-[#2A2A2A] bg-[#111] p-5 flex-shrink-0">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <p className="text-[#C9A84C] text-xs uppercase tracking-[0.4em] font-medium mb-2">Welcome back</p>
                <h2 className="text-4xl md:text-6xl font-black leading-[0.95] text-white">
                  Welcome, <span className="text-[#C9A84C]">{playerName}</span>
                </h2>
                <p className="mt-4 text-[#888] text-sm md:text-base max-w-2xl leading-relaxed">
                  Your lifetime performance summary is ready before the first swing. This screen is designed for the wall-mounted touch display beside the launch monitor PC.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleStart}
                  className="rounded-full bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
                >
                  Start live session
                </button>
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3">
                  <p className="text-[#666] text-[10px] uppercase tracking-[0.35em]">Display mode</p>
                  <p className="text-white text-sm font-semibold mt-1">Vertical touch monitor</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {lifetimeStats.map(stat => (
                <div key={stat.label} className="rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-4">
                  <p className="text-[#666] text-xs uppercase tracking-[0.3em]">{stat.label}</p>
                  <p className="text-white text-2xl font-bold mt-2">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3 flex-shrink-0">
            <MetricCard label="Session shots" value={String(sessionShots)} />
            <MetricCard label="Best carry" value={formatNumber(player?.bestCarry, ' yds')} />
            <MetricCard label="Avg carry" value={formatNumber(totalCarry, ' yds')} />
          </div>

          <div className="flex min-h-0 flex-col gap-5 rounded-3xl border border-[#2A2A2A] bg-[#111] p-5 flex-1">
            <div className="flex items-center justify-between gap-4 flex-shrink-0">
              <div>
                <p className="text-[#888] text-xs uppercase tracking-[0.3em]">Live performance</p>
                <h2 className="text-2xl font-bold text-white mt-1">Shot tracking</h2>
              </div>
              {!started && (
                <button
                  onClick={handleStart}
                  className="rounded-full bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
                >
                  Start session
                </button>
              )}
            </div>

            {player ? (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MiniStat label="Ball speed" value={formatNumber(lastShot?.ballSpeed, ' mph')} />
                  <MiniStat label="Carry" value={formatNumber(lastShot?.carry, ' yds')} />
                  <MiniStat label="Launch" value={formatNumber(lastShot?.launchAngle, '°')} />
                  <MiniStat label="Spin" value={formatNumber(lastShot?.spinRate, ' rpm')} />
                </div>

                <div className="rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[#888] text-xs uppercase tracking-[0.3em]">Last shot</p>
                      <p className="text-white text-lg font-semibold mt-1">{player.displayName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#666] text-xs">Current player</p>
                      <p className="text-[#C9A84C] font-semibold">{activeIndex + 1} of {players.length || 1}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <DetailRow label="Club" value={lastShot?.club ?? 'Awaiting shot'} />
                    <DetailRow label="Shot shape" value={lastShot?.shotShape ?? '—'} />
                    <DetailRow label="Total distance" value={formatNumber(lastShot?.total, ' yds')} />
                    <DetailRow label="Shot #" value={lastShot ? String(lastShot.shotNumber) : '—'} />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] p-4 min-h-0 overflow-y-auto">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[#888] text-xs uppercase tracking-[0.3em]">Player trends</p>
                      <p className="text-white font-semibold mt-1">Top clubs by carry</p>
                    </div>
                    <div className="flex gap-2">
                      {players.map((entry, index) => (
                        <button
                          key={entry.participantId}
                          onClick={() => onChangeIndex(index)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${index === activeIndex ? 'bg-[#C9A84C] text-black' : 'bg-[#1A1A1A] text-[#888] hover:text-white'}`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {player.clubAverages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#2A2A2A] bg-[#111] p-5 text-sm text-[#666]">
                      No shot history yet. The first strike will populate carry trends here.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {player.clubAverages.slice(0, 4).map(club => (
                        <div key={club.club} className="flex items-center justify-between rounded-xl border border-[#222] bg-[#111] px-4 py-3">
                          <div>
                            <p className="text-white font-medium">{club.club}</p>
                            <p className="text-[#666] text-xs">{club.shotCount} shot{club.shotCount !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#C9A84C] font-semibold">{club.avgCarry} yds</p>
                            <p className="text-[#555] text-xs">Best {club.maxCarry} yds</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <EmptyTelemetryState telemetry={telemetry} onStartPlaying={handleStart} />
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-5 rounded-[2rem] border border-[#2A2A2A] bg-[#0B0B0B] p-5 lg:p-6">
          <div className="rounded-3xl border border-[#2A2A2A] bg-[#111] p-5">
            <p className="text-[#888] text-xs uppercase tracking-[0.3em]">Suggested practice</p>
            <h2 className="text-2xl font-bold text-white mt-1">From Salesforce history</h2>
            <p className="text-[#666] text-sm mt-2">Recommendations change with the golfer’s history and the live shot pattern.</p>

            <div className="mt-4 space-y-3">
              {practiceCards.length > 0 ? practiceCards.map(card => (
                <div key={card.title} className="rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                  <p className="text-[#C9A84C] text-xs uppercase tracking-[0.3em]">{card.title}</p>
                  <p className="text-white text-sm mt-2 leading-relaxed">{card.body}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-[#2A2A2A] bg-[#0D0D0D] p-4 text-sm text-[#666]">
                  Historical data will populate this panel once the golfer has a tracked profile in Salesforce.
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-3xl border border-[#2A2A2A] bg-[#111] p-5 flex-1">
            <div>
              <p className="text-[#888] text-xs uppercase tracking-[0.3em]">Live agent</p>
              <h2 className="text-2xl font-bold text-white mt-1">Pro Golfer Agentforce Agent</h2>
              <p className="text-[#666] text-sm mt-2">Session context is attached to every exchange.</p>
            </div>

            <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {messages.map((message, index) => (
                <div
                  key={`${message.timestamp}-${index}`}
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'assistant'
                    ? 'bg-[#0D0D0D] border border-[#2A2A2A] text-[#ddd]'
                    : 'ml-8 bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`text-[10px] uppercase tracking-[0.3em] ${message.role === 'assistant' ? 'text-[#C9A84C]' : 'text-[#C9A84C]/70'}`}>
                      {message.role === 'assistant' ? 'Agentforce' : 'You'}
                    </span>
                    <span className="text-[#555] text-[10px]">{formatTime(message.timestamp)}</span>
                  </div>
                  {message.text}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] p-3">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Ask for a swing tip, a warm-up plan, or a fix for your miss..."
                className="w-full h-24 resize-none bg-transparent text-white placeholder-[#555] focus:outline-none"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-[#666] text-xs">
                  {telemetry.connectionState === 'connected'
                    ? `Telemetry live · ${telemetry.shots.length} shot${telemetry.shots.length === 1 ? '' : 's'} captured`
                    : 'Telemetry waiting for relay'}
                </div>
                <button
                  onClick={handleSend}
                  className="rounded-full bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] px-4 py-4">
      <p className="text-[#666] text-xs uppercase tracking-[0.3em]">{label}</p>
      <p className="text-white text-2xl font-bold mt-2">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-4">
      <p className="text-[#666] text-xs uppercase tracking-[0.3em]">{label}</p>
      <p className="text-white text-xl font-semibold mt-2">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#222] bg-[#111] px-4 py-3">
      <p className="text-[#666] text-xs uppercase tracking-[0.3em]">{label}</p>
      <p className="text-white text-sm font-semibold mt-1">{value}</p>
    </div>
  )
}

function EmptyTelemetryState({ telemetry, onStartPlaying }: { telemetry: SessionTelemetryState; onStartPlaying: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-[#2A2A2A] bg-[#0D0D0D] px-6 py-10 text-center">
      <div className="w-16 h-16 rounded-full border border-[#C9A84C]/25 bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] text-2xl">⛳</div>
      <div>
        <p className="text-white text-lg font-semibold">No live shots yet</p>
        <p className="text-[#666] text-sm mt-1 max-w-md">
          {telemetry.connectionState === 'connected'
            ? 'The workspace is connected, but no shot events have arrived yet.'
            : 'Waiting for a local relay to stream GSPro or launch-monitor telemetry into this bay.'}
        </p>
      </div>
      <button
        onClick={onStartPlaying}
        className="rounded-full bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
      >
        Start session
      </button>
    </div>
  )
}
