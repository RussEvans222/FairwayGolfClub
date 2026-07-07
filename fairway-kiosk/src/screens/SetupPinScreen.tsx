import { useState } from 'react'
import type { ScheduledPlayer, ScheduledSession } from '../types'
import KeypadInput from '../components/KeypadInput'

interface Props {
  session: ScheduledSession
  player: ScheduledPlayer
  onConfirm: (pin: string) => void
  onBack: () => void
  loading: boolean
  error: string | null
}

export default function SetupPinScreen({ session, player, onConfirm, onBack, loading, error }: Props) {
  const [step, setStep] = useState<'create' | 'confirm'>('create')
  const [firstPin, setFirstPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const initial = player.displayName?.[0]?.toUpperCase() ?? '?'

  function handleFirst(val: string) {
    setFirstPin(val)
    setMismatch(false)
    if (val.length === 4) setStep('confirm')
  }

  function handleConfirm(val: string) {
    setConfirmPin(val)
    setMismatch(false)
    if (val.length === 4) {
      if (val !== firstPin) {
        setMismatch(true)
        setConfirmPin('')
        setStep('create')
        setFirstPin('')
      } else {
        onConfirm(val)
      }
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 px-8">
      {/* Avatar */}
      <div className="w-20 h-20 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
        <span className="text-[#C9A84C] text-3xl font-bold">{initial}</span>
      </div>

      <div className="text-center">
        <h2 className="text-white text-2xl font-bold">{player.displayName}</h2>
        <p className="text-[#888] text-sm mt-1">{session.bayLabel} · {new Date(session.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${step === 'create' ? 'bg-[#C9A84C]' : 'bg-[#C9A84C]/40'}`} />
        <div className={`w-2 h-2 rounded-full ${step === 'confirm' ? 'bg-[#C9A84C]' : 'bg-[#C9A84C]/20'}`} />
      </div>

      <div className="text-center">
        <p className="text-white font-semibold text-lg">
          {step === 'create' ? 'Create your 4-digit PIN' : 'Confirm your PIN'}
        </p>
        <p className="text-[#666] text-sm mt-1">
          {step === 'create' ? "You'll use this every time you check in" : 'Enter the same PIN again'}
        </p>
      </div>

      {(mismatch || error) && (
        <p className="text-red-400 text-sm text-center">
          {mismatch ? "PINs didn't match — try again" : error}
        </p>
      )}

      <KeypadInput
        key={step}
        value={step === 'create' ? firstPin : confirmPin}
        onChange={step === 'create' ? handleFirst : handleConfirm}
        masked
        maxLength={4}
        disabled={loading}
      />

      <button
        onClick={onBack}
        className="text-[#555] text-sm hover:text-[#888] transition-colors mt-2"
      >
        ← Back to sessions
      </button>
    </div>
  )
}
