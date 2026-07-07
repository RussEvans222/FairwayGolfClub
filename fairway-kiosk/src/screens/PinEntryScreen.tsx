import { useState } from 'react'
import KeypadInput from '../components/KeypadInput'
import GoldButton from '../components/GoldButton'
import type { ScheduledSession, ScheduledPlayer } from '../types'

interface Props {
  session: ScheduledSession
  player: ScheduledPlayer
  onConfirm: (pin: string) => void
  onBack: () => void
  loading?: boolean
  error?: string | null
}

export default function PinEntryScreen({ session, player, onConfirm, onBack, loading = false, error }: Props) {
  const [pin, setPin] = useState('')

  function handleChange(val: string) {
    setPin(val)
    if (val.length === 4) onConfirm(val)
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-16">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-[#C9A84C]/15 flex items-center justify-center text-3xl font-bold text-[#C9A84C]">
          {player.displayName?.[0] ?? '?'}
        </div>
        <div className="text-center">
          <p className="text-white text-2xl font-bold">{player.displayName}</p>
          <p className="text-[#888] text-sm mt-1">{session.bayLabel} · {formatTime(session.startTime)}</p>
        </div>
      </div>

      {/* PIN */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <p className="text-[#888] text-sm">Enter your 4-digit PIN</p>
        <KeypadInput value={pin} onChange={handleChange} maxLength={4} masked label="" />
        {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
        {loading && <p className="text-[#C9A84C] text-sm mt-2">Verifying...</p>}
      </div>

      <GoldButton variant="ghost" onClick={onBack}>← Back to sessions</GoldButton>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
