import { useState } from 'react'
import GoldButton from '../components/GoldButton'
import KeypadInput from '../components/KeypadInput'

interface Props {
  onEmailLogin: (email: string) => void
  onBack: () => void
  loading?: boolean
  error?: string | null
}

type Mode = 'choose' | 'email' | 'pin'

export default function MemberLoginScreen({ onEmailLogin, onBack, loading = false, error }: Props) {
  const [mode, setMode] = useState<Mode>('choose')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')

  function submitEmail() {
    if (email.includes('@')) onEmailLogin(email)
  }

  // PIN lookup not yet implemented — shows same flow as email for now
  function submitPin() {
    if (pin.length === 4) onEmailLogin(`pin:${pin}`)
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-16">
      {mode === 'choose' && (
        <>
          <h2 className="text-4xl font-bold text-white">Member Sign-In</h2>
          <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
            <button
              onClick={() => setMode('email')}
              className="rounded-3xl border border-[#2A2A2A] bg-[#111] hover:border-[#C9A84C]/60 p-8 flex flex-col items-center gap-3 transition-all active:scale-95"
            >
              <span className="text-4xl">✉️</span>
              <p className="text-white font-semibold">Email</p>
            </button>
            <button
              onClick={() => setMode('pin')}
              className="rounded-3xl border border-[#2A2A2A] bg-[#111] hover:border-[#C9A84C]/60 p-8 flex flex-col items-center gap-3 transition-all active:scale-95"
            >
              <span className="text-4xl">🔢</span>
              <p className="text-white font-semibold">4-Digit PIN</p>
            </button>
          </div>
          <GoldButton variant="ghost" onClick={onBack}>← Back</GoldButton>
        </>
      )}

      {mode === 'email' && (
        <div className="w-full max-w-md flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-white text-center">Enter your email</h2>
          <input
            autoFocus
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitEmail()}
            style={{ userSelect: 'text' }}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-5 py-4 text-white text-lg placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex gap-3">
            <GoldButton variant="secondary" onClick={() => setMode('choose')}>Back</GoldButton>
            <GoldButton onClick={submitEmail} disabled={!email.includes('@') || loading} className="flex-1">
              {loading ? 'Looking up...' : 'Sign In'}
            </GoldButton>
          </div>
        </div>
      )}

      {mode === 'pin' && (
        <div className="w-full max-w-xs flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-white text-center">Enter your PIN</h2>
          <KeypadInput value={pin} onChange={setPin} maxLength={4} masked label="4-digit PIN" />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex gap-3">
            <GoldButton variant="secondary" onClick={() => { setPin(''); setMode('choose') }}>Back</GoldButton>
            <GoldButton onClick={submitPin} disabled={pin.length < 4 || loading} className="flex-1">
              {loading ? 'Looking up...' : 'Sign In'}
            </GoldButton>
          </div>
        </div>
      )}
    </div>
  )
}
