import type { Bay } from '../types'

interface Props {
  bay: Bay
  onChangeBay: () => void
}

export function IdleScreen({ bay, onChangeBay }: Props) {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--dark)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-10 pt-8 pb-4">
        <div>
          <img src="/images/logo-text.png" alt="Fairway Golf Club" className="bay-logo-white h-40 w-auto" />
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
                Welcome to Bay {bay.bayNumber}
              </div>
              <div className="mt-6 max-w-2xl text-lg md:text-xl text-white/72">
                Your bay is ready. Check in at the kiosk to start your next session.
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl p-6 backdrop-blur-sm"
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

              <div className="rounded-2xl p-6 backdrop-blur-sm"
                   style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="text-white/45 text-[11px] uppercase tracking-[0.32em]">Bay</div>
                <div className="mt-3 text-3xl font-black text-white">{bay.name}</div>
                <div className="mt-3 text-white/60 text-sm leading-6">
                  Insert the golfer at the kiosk, then the welcome screen will switch to live Salesforce stats.
                </div>
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
