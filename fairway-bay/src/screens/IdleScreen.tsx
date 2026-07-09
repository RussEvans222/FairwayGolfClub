import type { Bay, LastSessionRecap } from '../types'

interface Props {
  bay: Bay
  recap: LastSessionRecap | null
  onChangeBay: () => void
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function IdleScreen({ bay, recap, onChangeBay }: Props) {
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
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-10">

        {/* Idle message */}
        <div className="text-center">
          <div className="text-6xl font-bold text-white/10 tracking-widest uppercase mb-2">
            READY
          </div>
          <div className="text-white/30 text-lg">Check in at the kiosk to start your session</div>
        </div>

        {/* Last session recap */}
        {recap && (
          <div className="w-full max-w-2xl rounded-2xl p-8"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Last Session</div>
                <div className="text-white font-semibold text-xl">{recap.playerName}</div>
                <div className="text-white/40 text-sm">{fmt(recap.sessionDate)} · {recap.totalShots} shots</div>
              </div>
              {recap.bestCarry != null && (
                <div className="text-right">
                  <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Best Carry</div>
                  <div className="text-4xl font-bold" style={{ color: 'var(--gold)' }}>
                    {recap.bestCarry}
                  </div>
                  <div className="text-white/40 text-sm">{recap.bestCarryClub} · yds</div>
                </div>
              )}
            </div>

            {recap.topClubs.length > 0 && (
              <>
                <div className="text-white/30 text-xs uppercase tracking-wider mb-3">Club Averages</div>
                <div className="grid grid-cols-5 gap-3">
                  {recap.topClubs.map(c => (
                    <div key={c.club} className="flex flex-col items-center rounded-xl p-3"
                         style={{ background: 'var(--surface2)' }}>
                      <div className="text-white/50 text-xs mb-1">{c.club}</div>
                      <div className="text-white font-bold text-lg">{c.avgCarry}</div>
                      <div className="text-white/30 text-xs">yds avg</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!recap && (
          <div className="text-white/20 text-sm">No previous sessions on this bay</div>
        )}
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
