import type { Bay } from '../types'

interface Props {
  bays: Bay[]
  onSelect: (bay: Bay) => void
}

export function BaySelectScreen({ bays, onSelect }: Props) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-10"
         style={{ background: 'var(--dark)' }}>
      <div className="text-center">
        <img src="/images/logo-text.png" alt="Fairway Golf Club" className="bay-logo-white h-56 w-auto mx-auto mb-4" />
        <div className="text-white/50 tracking-widest uppercase text-sm">Select Bay</div>
      </div>

      {bays.length === 0 ? (
        <div className="text-white/30 text-lg">Loading bays…</div>
      ) : (
        <div className="flex gap-6">
          {bays.map(bay => (
            <button
              key={bay.id}
              onClick={() => onSelect(bay)}
              className="flex flex-col items-center justify-center w-48 h-48 rounded-2xl border-2 transition-all hover:scale-105"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--gold)',
              }}
            >
              <div className="text-5xl mb-3">⛳</div>
              <div className="text-white font-semibold text-lg">{bay.name}</div>
              <div className="text-white/40 text-sm mt-1">{bay.bayNumber}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
