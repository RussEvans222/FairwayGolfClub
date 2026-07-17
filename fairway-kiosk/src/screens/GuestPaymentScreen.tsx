import { useState } from 'react'
import GoldButton from '../components/GoldButton'

interface Props {
  guestName: string
  onConfirm: () => void
  onBack: () => void
}

const RATE = 35 // $ per session

export default function GuestPaymentScreen({ guestName, onConfirm, onBack }: Props) {
  const [confirmed, setConfirmed] = useState(false)

  function handleConfirm() {
    setConfirmed(true)
    setTimeout(onConfirm, 800)
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-16">

      <div className="text-center">
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.4em] font-medium mb-2">Walk-In Session</p>
        <h2 className="text-4xl font-bold text-white">Session Fee</h2>
        <p className="text-[#888] mt-2 text-base">One session for <span className="text-white font-medium">{guestName}</span></p>
      </div>

      {/* Price card */}
      <div className="rounded-3xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-12 py-8 flex flex-col items-center gap-2">
        <p className="text-7xl font-bold text-white">${RATE}</p>
        <p className="text-[#888] text-sm">per session · 60 minutes</p>
      </div>

      {/* What's included */}
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] px-6 py-5 w-full max-w-sm flex flex-col gap-3">
        {[
          { icon: '⛳', text: 'Full bay access — your own simulator' },
          { icon: '📊', text: 'Free Golfer360 profile — stats tracked forever' },
          { icon: '🤖', text: 'AI coaching insights after your session' },
          { icon: '📧', text: 'Session summary emailed to you' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <p className="text-[#aaa] text-sm">{text}</p>
          </div>
        ))}
      </div>

      {/* Payment CTA */}
      {!confirmed ? (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <GoldButton size="lg" onClick={handleConfirm} className="w-full">
            Pay ${RATE} — Tap to Continue
          </GoldButton>
          <p className="text-[#444] text-xs text-center">
            Payment collected by staff at the front desk. Tap to confirm and proceed to your bay.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full border-2 border-green-400 flex items-center justify-center">
            <span className="text-green-400 text-2xl">✓</span>
          </div>
          <p className="text-green-400 font-semibold">Payment confirmed</p>
        </div>
      )}

      <GoldButton variant="ghost" onClick={onBack}>← Back</GoldButton>
    </div>
  )
}
