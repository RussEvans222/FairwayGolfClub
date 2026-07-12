import type { Bay, LastSessionRecap } from '../types'

interface Props {
  bay: Bay
  recap: LastSessionRecap | null
  onChangeBay: () => void
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatNumber(value: number | null | undefined, suffix = '') {
  if (value == null) return '—'
  return `${value.toLocaleString()}${suffix}`
}

export function IdleScreen({ bay, recap, onChangeBay }: Props) {
  const displayName = recap?.playerName ?? 'Golfer'
  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--dark)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-10 pt-8 pb-4">
        <div>
          <div className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>FAIRWAY</div>
          <div className="text-white/30 text-xs tracking-widest uppercase">Golf Club</div>
        </div>
        <div className="text-right">
          <div className="text-white font-semibold text-lg">{bay.name}</div>
          <div className="text-white/40 text-sm">{bay.bayNumber}</div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-10 pb-6 min-h-0 overflow-y-auto">
        <div
          className="relative h-full overflow-hidden rounded-[2rem] border"
          style={{
            borderColor: '#ffffff14',
            background:
              'radial-gradient(circle at 16% 16%, rgba(201, 168, 76, 0.24), transparent 28%), radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.10), transparent 24%), linear-gradient(145deg, #121212 0%, #0b0b0b 45%, #151515 100%)',
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
              <div className="text-white/55 text-xs uppercase tracking-[0.45em]">Bay ready</div>
              <div className="mt-4 text-6xl md:text-8xl font-black leading-[0.9] tracking-tight text-white">
                Welcome, {displayName}
              </div>
              <div className="mt-6 max-w-2xl text-lg md:text-xl text-white/72">
                Your bay is ready. Check in at the kiosk to start your next session.
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard label="Bay" value={bay.name} />
              <InfoCard label="Last Session" value={recap ? fmt(recap.sessionDate) : '—'} />
              <InfoCard label="Total Shots" value={formatNumber(recap?.totalShots)} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl p-6 backdrop-blur-sm"
                   style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <div className="text-white/45 text-[11px] uppercase tracking-[0.32em]">Last Session</div>
                    <div className="mt-2 text-2xl font-bold text-white">{recap?.playerName ?? 'No session yet'}</div>
                  </div>
                  {recap?.bestCarry != null ? (
                    <div className="text-right">
                      <div className="text-white/45 text-[11px] uppercase tracking-[0.32em]">Best Carry</div>
                      <div className="mt-2 text-4xl font-black text-white" style={{ color: 'var(--gold)' }}>
                        {recap.bestCarry}
                      </div>
                    </div>
                  ) : null}
                </div>

                {recap?.topClubs.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {recap.topClubs.map(c => (
                      <div key={c.club} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className="text-white/50 text-xs mb-1">{c.club}</div>
                        <div className="text-white font-bold text-lg">{c.avgCarry} <span className="text-white/30 text-xs">yds</span></div>
                        <div className="text-white/30 text-xs">{c.shotCount} shot{c.shotCount !== 1 ? 's' : ''}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-white/30 text-sm">No prior session data on this bay yet.</div>
                )}
              </div>

              <div className="flex flex-col justify-between rounded-2xl p-6 backdrop-blur-sm"
                   style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div>
                  <div className="text-white/45 text-[11px] uppercase tracking-[0.32em]">Ready</div>
                  <div className="mt-3 text-3xl font-black text-white">Tap the bay to begin</div>
                  <div className="mt-3 text-white/60 text-sm leading-6">
                    Step into the bay, then start your next round or practice session from the kiosk.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {}}
                  className="mt-6 w-full rounded-full px-6 py-4 text-lg font-semibold tracking-wide transition-transform hover:scale-[1.02]"
                  style={{ background: 'var(--gold)', color: '#111' }}
                >
                  Click to start playing
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-10 pb-6">
        <div className="text-white/20 text-xs">Updates every 20s</div>
        <button onClick={onChangeBay} className="text-white/20 text-xs hover:text-white/40 transition-colors">
          Change Bay
        </button>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 backdrop-blur-sm"
         style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div className="text-white/45 text-[11px] uppercase tracking-[0.32em]">{label}</div>
      <div className="mt-3 text-xl font-bold text-white leading-none">{value}</div>
    </div>
  )
}
