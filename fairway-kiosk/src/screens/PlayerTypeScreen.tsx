import GoldButton from '../components/GoldButton'

interface Props {
  onGuest: () => void
  onMember: () => void
  onBack: () => void
}

const OPTIONS = [
  {
    label: 'New Guest',
    sub: "First time here? Let's get you set up.",
    icon: '🆕',
    action: 'guest',
  },
  {
    label: 'Member Check-In',
    sub: 'Sign in with email or PIN.',
    icon: '⛳',
    action: 'member',
  },
]

export default function PlayerTypeScreen({ onGuest, onMember, onBack }: Props) {
  function handle(action: string) {
    if (action === 'guest') onGuest()
    else onMember()
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-10 px-16">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-white">Who's playing?</h2>
        <p className="text-[#888] mt-2">Choose how you'd like to get started.</p>
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
        {OPTIONS.map(o => (
          <button
            key={o.action}
            onClick={() => handle(o.action)}
            className="rounded-3xl border border-[#2A2A2A] bg-[#111] hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5 p-8 flex flex-col items-center gap-4 transition-all active:scale-95"
          >
            <span className="text-5xl">{o.icon}</span>
            <div className="text-center">
              <p className="text-white font-semibold text-xl">{o.label}</p>
              <p className="text-[#888] text-sm mt-1">{o.sub}</p>
            </div>
          </button>
        ))}
      </div>

      <GoldButton variant="ghost" onClick={onBack}>← Back</GoldButton>
    </div>
  )
}
