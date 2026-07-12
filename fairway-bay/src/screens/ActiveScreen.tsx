import type { Bay, PlayerSession } from '../types'

interface Props {
  bay: Bay
  players: PlayerSession[]
  activeIndex: number
  onChangeIndex: (i: number) => void
  onChangeBay: () => void
  minutesRemaining?: number | null
  showExtendPrompt?: boolean
  extending?: boolean
  extendMessage?: string | null
  onExtend?: (minutes: number) => void
  onDismissExtendPrompt?: () => void
}

const CLUB_ORDER = ['Driver','3-Wood','5-Wood','4-Iron','5-Iron','6-Iron','7-Iron','8-Iron','9-Iron','PW','GW','SW','LW']

function sortClubs(averages: PlayerSession['clubAverages']) {
  return [...averages].sort((a, b) => {
    const ai = CLUB_ORDER.indexOf(a.club)
    const bi = CLUB_ORDER.indexOf(b.club)
    if (ai === -1 && bi === -1) return b.avgCarry - a.avgCarry
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatNumber(value: number | null | undefined, suffix = '') {
  if (value == null) return '—'
  return `${value.toLocaleString()}${suffix}`
}

function formatDecimal(value: number | null | undefined) {
  if (value == null) return '—'
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function shotShapeColor(shape: string | null): string {
  if (!shape) return '#ffffff40'
  if (shape === 'Straight') return '#4ade80'
  if (shape === 'Draw' || shape === 'Fade') return '#C9A84C'
  if (shape === 'Slice' || shape === 'Hook') return '#f87171'
  return '#ffffff60'
}

export function ActiveScreen({
  bay, players, activeIndex, onChangeIndex, onChangeBay,
  minutesRemaining, showExtendPrompt, extending, extendMessage, onExtend, onDismissExtendPrompt,
}: Props) {
  if (!players.length) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--dark)' }}>
        <div className="text-white/30">Loading session…</div>
      </div>
    )
  }

  const player = players[activeIndex]
  const sorted = sortClubs(player.clubAverages)
  const hasPrev = activeIndex > 0
  const hasNext = activeIndex < players.length - 1
  const lifetimeSummary = player.lifetimeSummary
  const hasWelcomeHero = player.shotCount === 0

  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--dark)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-10 pt-8 pb-4">
        <div>
          <div className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>FAIRWAY</div>
          <div className="text-white/30 text-xs tracking-widest uppercase">Golf Club</div>
        </div>
        <div className="text-center">
          <div className="text-white font-semibold">{bay.name}</div>
          {players.length > 1 && (
            <div className="flex items-center gap-2 mt-1 justify-center">
              {players.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onChangeIndex(i)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i === activeIndex ? 'var(--gold)' : '#ffffff30' }}
                />
              ))}
            </div>
          )}
        </div>
        <button onClick={onChangeBay} className="text-white/20 text-xs hover:text-white/40 transition-colors">
          Change Bay
        </button>
      </div>

      {/* Player name + shot count */}
      <div className="flex items-center justify-between px-10 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-black font-bold text-sm"
               style={{ background: 'var(--gold)' }}>
            {player.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-semibold text-xl">{player.displayName}</div>
            <div className="text-white/40 text-sm">
              {player.shotCount} shot{player.shotCount !== 1 ? 's' : ''} this session
              {player.isGuest && <span className="ml-2 text-white/30">· Guest</span>}
            </div>
          </div>
        </div>
        {player.bestCarry != null && (
          <div className="text-right">
            <div className="text-white/40 text-xs uppercase tracking-wider">Best Carry</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>{player.bestCarry} <span className="text-lg text-white/40">yds</span></div>
          </div>
        )}
      </div>

      {/* Main body */}
      {hasWelcomeHero ? (
        <div className="flex-1 px-10 pb-6 min-h-0 overflow-y-auto">
          <div
            className="relative h-full overflow-hidden rounded-[2rem] border"
            style={{
              borderColor: '#ffffff14',
              background:
                'radial-gradient(circle at 18% 18%, rgba(201, 168, 76, 0.24), transparent 28%), radial-gradient(circle at 82% 0%, rgba(255, 255, 255, 0.10), transparent 25%), linear-gradient(145deg, #121212 0%, #0b0b0b 45%, #151515 100%)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
            }} />
            <div className="absolute -left-24 top-16 h-64 w-64 rounded-full blur-3xl" style={{ background: 'rgba(201, 168, 76, 0.18)' }} />
            <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full blur-3xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }} />

            <div className="relative z-10 flex h-full flex-col justify-between p-10">
              <div className="max-w-4xl">
                <div className="text-white/55 text-xs uppercase tracking-[0.45em]">Salesforce lifetime stats</div>
                <div className="mt-4 text-6xl md:text-8xl font-black leading-[0.9] tracking-tight text-white">
                  Welcome, {player.displayName}
                </div>
                <div className="mt-6 max-w-2xl text-lg md:text-xl text-white/72">
                  Your lifetime performance summary is ready before your first shot.
                </div>

                {lifetimeSummary?.currentFocus && (
                  <div className="mt-6 inline-flex items-center rounded-full border px-4 py-2 text-sm text-white/85"
                       style={{ borderColor: '#ffffff18', background: '#ffffff08' }}>
                    Focus: {lifetimeSummary.currentFocus}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <HeroStat label="Lifetime Sessions" value={formatNumber(lifetimeSummary?.lifetimeSessions)} />
                <HeroStat label="Lifetime Shots" value={formatNumber(lifetimeSummary?.lifetimeShots)} />
                <HeroStat label="Avg Handicap" value={formatDecimal(lifetimeSummary?.avgHandicapTrend)} />
                <HeroStat label="Driver Carry" value={formatNumber(lifetimeSummary?.averageDriverCarry, ' yds')} />
                <HeroStat label="7-Iron Carry" value={formatNumber(lifetimeSummary?.average7IronCarry, ' yds')} />
                <HeroStat label="Favorite Club" value={lifetimeSummary?.favoriteClub ?? '—'} />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/65">
                {lifetimeSummary?.mostPlayedCourse && (
                  <span className="rounded-full border px-4 py-2" style={{ borderColor: '#ffffff18', background: '#ffffff08' }}>
                    Most played: {lifetimeSummary.mostPlayedCourse}
                  </span>
                )}
                {lifetimeSummary?.lastSessionDate && (
                  <span className="rounded-full border px-4 py-2" style={{ borderColor: '#ffffff18', background: '#ffffff08' }}>
                    Last session: {fmtDate(lifetimeSummary.lastSessionDate)}
                  </span>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
                <button
                  type="button"
                  className="rounded-full px-8 py-4 text-lg font-semibold tracking-wide transition-transform hover:scale-[1.02]"
                  style={{ background: 'var(--gold)', color: '#111' }}
                  onClick={() => {}}
                >
                  Click to start playing
                </button>
                <div className="text-white/35 text-sm">
                  {player.isGuest ? 'Guest walk-up' : 'Member welcome'} · live shots appear after the first swing
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="flex-1 flex gap-6 px-10 pb-6 min-h-0">

        {/* Last shot card */}
        <div className="w-72 flex-shrink-0 rounded-2xl p-6 flex flex-col gap-4"
             style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-white/40 text-xs uppercase tracking-wider">Last Shot</div>
          {player.lastShot ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-white font-bold text-2xl">{player.lastShot.club}</div>
                <div className="text-sm px-3 py-1 rounded-full font-medium"
                     style={{ background: `${shotShapeColor(player.lastShot.shotShape)}22`, color: shotShapeColor(player.lastShot.shotShape) }}>
                  {player.lastShot.shotShape ?? '—'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Carry" value={player.lastShot.carry} unit="yds" large />
                <Stat label="Total" value={player.lastShot.total} unit="yds" large />
                <Stat label="Ball Speed" value={player.lastShot.ballSpeed} unit="mph" />
                <Stat label="Launch" value={player.lastShot.launchAngle} unit="°" />
                <Stat label="Spin" value={player.lastShot.spinRate} unit="rpm" />
                <Stat label="Shot #" value={player.lastShot.shotNumber} unit="" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
              Waiting for first shot…
            </div>
          )}
        </div>

        {/* Club averages table */}
        <div className="flex-1 rounded-2xl p-6 overflow-y-auto"
             style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-white/40 text-xs uppercase tracking-wider mb-4">Session Averages</div>
          {sorted.length === 0 ? (
            <div className="text-white/20 text-sm">No shots recorded yet</div>
          ) : (
            <div className="space-y-2">
              {sorted.map(c => (
                <div key={c.club} className="flex items-center gap-4 rounded-xl px-4 py-3"
                     style={{ background: 'var(--surface2)' }}>
                  <div className="w-16 text-white font-semibold text-sm">{c.club}</div>
                  {/* Bar */}
                  <div className="flex-1 relative h-2 rounded-full overflow-hidden"
                       style={{ background: '#ffffff10' }}>
                    <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                         style={{
                           width: `${Math.min(100, (c.avgCarry / 300) * 100)}%`,
                           background: 'var(--gold)',
                         }} />
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-white font-bold">{c.avgCarry}</span>
                    <span className="text-white/40 text-xs ml-1">yds</span>
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-white/30 text-xs">↑{c.maxCarry}</span>
                  </div>
                  <div className="w-10 text-right text-white/30 text-xs">{c.shotCount}x</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Player nav arrows — only shown with multiple players */}
      {players.length > 1 && (
        <div className="flex items-center justify-center gap-6 pb-6">
          <button
            onClick={() => onChangeIndex(activeIndex - 1)}
            disabled={!hasPrev}
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all disabled:opacity-20"
            style={{ background: hasPrev ? 'var(--gold)' : 'var(--surface2)', color: hasPrev ? '#000' : '#fff' }}
          >
            ←
          </button>
          <div className="text-white/40 text-sm">
            Player {activeIndex + 1} of {players.length}
          </div>
          <button
            onClick={() => onChangeIndex(activeIndex + 1)}
            disabled={!hasNext}
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all disabled:opacity-20"
            style={{ background: hasNext ? 'var(--gold)' : 'var(--surface2)', color: hasNext ? '#000' : '#fff' }}
          >
            →
          </button>
        </div>
      )}

      {showExtendPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8" style={{ background: '#000000b0' }}>
          <div className="w-full max-w-md rounded-2xl p-8 text-center"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {extendMessage ? (
              <>
                <div className="text-white text-lg font-semibold mb-6">{extendMessage}</div>
                <button
                  onClick={onDismissExtendPrompt}
                  className="w-full py-3 rounded-xl font-semibold"
                  style={{ background: 'var(--gold)', color: '#000' }}
                >
                  Got it
                </button>
              </>
            ) : (
              <>
                <div className="text-white text-xl font-bold mb-2">
                  {minutesRemaining != null && minutesRemaining > 0
                    ? `${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'} left`
                    : 'Time’s almost up'}
                </div>
                <div className="text-white/50 text-sm mb-6">Want to keep playing?</div>
                <div className="flex gap-3">
                  <button
                    onClick={() => onExtend?.(15)}
                    disabled={extending}
                    className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
                    style={{ background: 'var(--gold)', color: '#000' }}
                  >
                    +15 min
                  </button>
                  <button
                    onClick={() => onExtend?.(30)}
                    disabled={extending}
                    className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
                    style={{ background: 'var(--gold)', color: '#000' }}
                  >
                    +30 min
                  </button>
                </div>
                <button
                  onClick={onDismissExtendPrompt}
                  disabled={extending}
                  className="mt-4 text-white/40 text-sm disabled:opacity-50"
                >
                  No thanks, I&apos;m good
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 backdrop-blur-sm"
         style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div className="text-white/45 text-[11px] uppercase tracking-[0.32em]">{label}</div>
      <div className="mt-3 text-2xl md:text-3xl font-bold text-white leading-none">{value}</div>
    </div>
  )
}

function Stat({ label, value, unit, large }: { label: string; value: number | null; unit: string; large?: boolean }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--surface2)' }}>
      <div className="text-white/40 text-xs mb-1">{label}</div>
      <div className={`font-bold ${large ? 'text-2xl' : 'text-lg'}`} style={{ color: value != null ? '#fff' : '#ffffff30' }}>
        {value != null ? value : '—'}
        {value != null && unit && <span className="text-white/40 text-xs ml-1">{unit}</span>}
      </div>
    </div>
  )
}
