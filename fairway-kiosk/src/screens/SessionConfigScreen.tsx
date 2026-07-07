import { useState } from 'react'
import GoldButton from '../components/GoldButton'
import type { SessionType, PlayerSlot } from '../types'

interface Props {
  players: PlayerSlot[]
  initialType: SessionType
  onConfirm: (type: SessionType) => void
  onAddPlayer: () => void
  onBack: () => void
  loading?: boolean
}

const SESSION_TYPES: { type: SessionType; icon: string; desc: string }[] = [
  { type: 'Practice', icon: '🎯', desc: 'Focused range work & drills' },
  { type: 'Round', icon: '⛳', desc: 'Play a full simulated round' },
  { type: 'Game', icon: '🏆', desc: 'Compete with friends' },
]

export default function SessionConfigScreen({
  players, initialType, onConfirm, onAddPlayer, onBack, loading = false,
}: Props) {
  const [type, setType] = useState<SessionType>(initialType)

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-16">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-white">Session Setup</h2>
        <p className="text-[#888] mt-2">Choose your session type and confirm players.</p>
      </div>

      {/* Session type */}
      <div className="w-full max-w-2xl">
        <p className="text-[#888] text-xs uppercase tracking-widest mb-3">Session Type</p>
        <div className="grid grid-cols-3 gap-4">
          {SESSION_TYPES.map(({ type: t, icon, desc }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-2xl border p-6 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                type === t
                  ? 'border-[#C9A84C] bg-[#C9A84C]/10'
                  : 'border-[#2A2A2A] bg-[#111] hover:border-[#C9A84C]/40'
              }`}
            >
              <span className="text-3xl">{icon}</span>
              <p className={`font-semibold ${type === t ? 'text-[#C9A84C]' : 'text-white'}`}>{t}</p>
              <p className="text-[#888] text-xs text-center">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Players */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[#888] text-xs uppercase tracking-widest">Players ({players.length})</p>
          {players.length < 4 && (
            <button onClick={onAddPlayer} className="text-[#C9A84C] text-sm hover:text-[#E8C96A]">
              + Add Player
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {players.map((p, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#1A1A1A] rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] text-sm font-bold">
                {i + 1}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{p.displayName}</p>
                <p className="text-[#888] text-xs">{p.isGuest ? 'Guest' : 'Member'}</p>
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <p className="text-[#555] text-sm text-center py-4">No players added yet.</p>
          )}
        </div>
      </div>

      <div className="flex gap-4 w-full max-w-2xl">
        <GoldButton variant="secondary" onClick={onBack}>Back</GoldButton>
        <GoldButton onClick={() => onConfirm(type)} disabled={players.length === 0 || loading} className="flex-1">
          {loading ? 'Starting Session...' : 'Start Session'}
        </GoldButton>
      </div>
    </div>
  )
}
