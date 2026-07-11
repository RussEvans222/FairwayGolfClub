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
      {player.shotCount === 0 && player.lastSessionRecap ? (
        /* Welcome back — no shots yet today, show this golfer's own last session */
        <div className="flex-1 px-10 pb-6 min-h-0 overflow-y-auto">
          <div className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Welcome back — Last Session</div>
                <div className="text-white/40 text-sm">
                  {fmtDate(player.lastSessionRecap.sessionDate)} · {player.lastSessionRecap.totalShots} shots
                </div>
              </div>
              {player.lastSessionRecap.bestCarry != null && (
                <div className="text-right">
                  <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Best Carry</div>
                  <div className="text-4xl font-bold" style={{ color: 'var(--gold)' }}>
                    {player.lastSessionRecap.bestCarry}
                  </div>
                  <div className="text-white/40 text-sm">{player.lastSessionRecap.bestCarryClub} · yds</div>
                </div>
              )}
            </div>

            {player.lastSessionRecap.topClubs.length > 0 && (
              <>
                <div className="text-white/30 text-xs uppercase tracking-wider mb-3">Club Averages</div>
                <div className="grid grid-cols-5 gap-3">
                  {player.lastSessionRecap.topClubs.map(c => (
                    <div key={c.club} className="flex flex-col items-center rounded-xl p-3"
                         style={{ background: 'var(--surface2)' }}>
                      <div className="text-white/50 text-xs mb-1">{c.club}</div>
                      <div className="text-white font-bold text-lg">{c.avgCarry} <span className="text-white/30 text-xs">yds</span></div>
                      <div className="text-white/30 text-xs">{c.shotCount} shot{c.shotCount !== 1 ? 's' : ''}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="text-white/20 text-xs text-center mt-4">Your live stats will appear here once you hit your first shot</div>
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
