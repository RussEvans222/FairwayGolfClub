import { useState } from 'react'
import GoldButton from '../components/GoldButton'

interface Props {
  onFound: (data: { contactId: string; profileId: string | null; firstName: string; lastName: string; email: string }) => void
  onNotFound: () => void
  onBack: () => void
  loading: boolean
  error: string | null
  onSearch: (email: string) => Promise<{ contactId: string; profileId: string | null; firstName: string; lastName: string; email: string } | null>
}

export default function MemberWalkInScreen({ onFound, onNotFound, onBack, loading, error, onSearch }: Props) {
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSearch() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setLocalError('Enter a valid email address.')
      return
    }
    setLocalError(null)
    setSearching(true)
    try {
      const result = await onSearch(trimmed)
      if (result) {
        onFound(result)
      } else {
        setLocalError("We couldn't find a member account with that email.")
      }
    } catch {
      setLocalError('Something went wrong. Try again.')
    } finally {
      setSearching(false)
    }
  }

  const displayError = localError ?? error
  const busy = loading || searching

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-16">
      <div className="text-center">
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.4em] font-medium mb-2">Member Walk-In</p>
        <h2 className="text-4xl font-bold text-white">Welcome back!</h2>
        <p className="text-[#666] text-sm mt-2">Enter your email to find your account.</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setLocalError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
          disabled={busy}
          className="w-full bg-[#111] border border-[#2A2A2A] text-white placeholder-[#444] rounded-xl px-5 py-4 text-base focus:outline-none focus:border-[#C9A84C]/60 focus:ring-1 focus:ring-[#C9A84C]/30 disabled:opacity-50"
        />

        {displayError && (
          <p className="text-red-400 text-sm text-center">{displayError}</p>
        )}

        <GoldButton onClick={handleSearch} disabled={busy || !email.trim()} size="lg">
          {busy ? 'Searching…' : 'Find My Account'}
        </GoldButton>

        <button
          onClick={onNotFound}
          className="text-[#555] text-sm text-center hover:text-[#888] transition-colors mt-1"
        >
          Not a member yet? Check in as a guest →
        </button>
      </div>

      <GoldButton variant="ghost" onClick={onBack}>← Back</GoldButton>
    </div>
  )
}
