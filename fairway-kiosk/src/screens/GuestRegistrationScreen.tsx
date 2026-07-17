import { useState } from 'react'
import GoldButton from '../components/GoldButton'
import SkillPicker from '../components/SkillPicker'
import type { SkillLevel } from '../types'

interface Props {
  onComplete: (data: { firstName: string; lastName: string; email: string; skill: SkillLevel }) => void
  onBack: () => void
  loading?: boolean
}

type Step = 'name' | 'email' | 'skill'

export default function GuestRegistrationScreen({ onComplete, onBack, loading = false }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [skill, setSkill] = useState<SkillLevel | null>(null)

  function nextFromName() {
    if (firstName.trim() && lastName.trim()) setStep('email')
  }

  function nextFromEmail() {
    if (email.includes('@')) setStep('skill')
  }

  function submit() {
    if (skill) onComplete({ firstName, lastName, email, skill })
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-16">
      {/* Step indicator */}
      <div className="flex gap-2">
        {(['name', 'email', 'skill'] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 rounded-full transition-all ${
              s === step ? 'w-8 bg-[#C9A84C]' : i < (['name','email','skill'] as Step[]).indexOf(step) ? 'w-4 bg-[#C9A84C]/50' : 'w-4 bg-[#333]'
            }`}
          />
        ))}
      </div>

      {step === 'name' && (
        <div className="w-full max-w-md flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-white text-center">What's your name?</h2>
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nextFromName()}
              style={{ userSelect: 'text' }}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-5 py-4 text-white text-lg placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nextFromName()}
              style={{ userSelect: 'text' }}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-5 py-4 text-white text-lg placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
          <GoldButton onClick={nextFromName} disabled={!firstName.trim() || !lastName.trim()}>
            Continue
          </GoldButton>
        </div>
      )}

      {step === 'email' && (
        <div className="w-full max-w-md flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-white text-center">Email address</h2>
          <p className="text-[#888] text-center text-sm">We'll send your session summary here.</p>
          <input
            autoFocus
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && nextFromEmail()}
            style={{ userSelect: 'text' }}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-5 py-4 text-white text-lg placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
          />
          <div className="flex gap-3">
            <GoldButton variant="secondary" onClick={() => setStep('name')}>Back</GoldButton>
            <GoldButton onClick={nextFromEmail} disabled={!email.includes('@')} className="flex-1">
              Continue
            </GoldButton>
          </div>
        </div>
      )}

      {step === 'skill' && (
        <div className="w-full max-w-md flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-white text-center">Skill level?</h2>
          <SkillPicker value={skill} onChange={setSkill} />
          <div className="flex gap-3">
            <GoldButton variant="secondary" onClick={() => setStep('email')}>Back</GoldButton>
            <GoldButton onClick={submit} disabled={!skill || loading} className="flex-1">
              {loading ? 'Setting up...' : "Let's Play"}
            </GoldButton>
          </div>
        </div>
      )}

      <GoldButton variant="ghost" onClick={onBack}>← Cancel</GoldButton>
    </div>
  )
}
