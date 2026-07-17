import type { Bay, PlayerSession } from '../types'

interface Props {
  bay: Bay
  players: PlayerSession[]
  activeIndex: number
  onChangeIndex: (i: number) => void
  onStartPlaying: () => void
  onChangeBay: () => void
}

export function IdleScreen({ bay, players, activeIndex, onChangeIndex, onStartPlaying, onChangeBay }: Props) {
  const activePlayer = players[activeIndex] ?? players[0] ?? null
  const welcomeName = activePlayer?.displayName ?? 'Golfer'

  return (
    <div className="w-full h-full flex items-center justify-center p-8" style={{ background: 'var(--dark)' }}>
      <div
        className="w-full max-w-5xl rounded-[2rem] border p-8 md:p-10"
        style={{
          borderColor: '#ffffff14',
          background:
            'radial-gradient(circle at 16% 16%, rgba(201, 168, 76, 0.22), transparent 28%), radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.08), transparent 24%), linear-gradient(145deg, #121212 0%, #0b0b0b 45%, #151515 100%)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <img src="/images/logo-text.png" alt="Fairway Golf Club" className="bay-logo-white h-14 md:h-16 w-auto" />
          <div className="text-right">
            <div className="text-white font-semibold text-lg">{bay.name}</div>
            <div className="text-white/40 text-sm">{bay.bayNumber}</div>
          </div>
        </div>

        <div className="mt-10">
          <div className="text-white/50 text-xs uppercase tracking-[0.45em]">Welcome</div>
          <div className="mt-4 text-5xl md:text-7xl font-black leading-[0.92] tracking-tight text-white">
            Welcome, {welcomeName}
          </div>
          <div className="mt-5 max-w-2xl text-lg md:text-xl text-white/72">
            Touch screen to begin.
          </div>
        </div>

        {players.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {players.map((player, index) => (
              <button
                key={player.participantId}
                type="button"
                onClick={() => onChangeIndex(index)}
                className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  borderColor: index === activeIndex ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.12)',
                  background: index === activeIndex ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.06)',
                  color: index === activeIndex ? 'var(--gold-light)' : 'rgba(255,255,255,0.8)',
                }}
              >
                {player.displayName}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onStartPlaying}
          className="mt-10 w-full rounded-full px-6 py-4 text-lg font-semibold tracking-wide transition-transform hover:scale-[1.01]"
          style={{ background: 'var(--gold)', color: '#111' }}
        >
          Touch screen to begin
        </button>

        <div className="mt-6 flex items-center justify-between text-white/30 text-xs uppercase tracking-[0.3em]">
          <span>Bay ready</span>
          <button onClick={onChangeBay} className="hover:text-white/50 transition-colors">
            Change Bay
          </button>
        </div>
      </div>
    </div>
  )
}
