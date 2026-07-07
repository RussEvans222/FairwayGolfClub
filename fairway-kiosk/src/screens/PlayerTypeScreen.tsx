import GoldButton from '../components/GoldButton'

interface Props {
  onGuest: () => void
  onMember: () => void
  onWalkInMember: () => void
  onBack: () => void
}

const OPTIONS = [
  {
    label: 'I Have a Reservation',
    sub: 'Find your scheduled tee time.',
    icon: '📅',
    action: 'member',
  },
  {
    label: 'Member Walk-In',
    sub: 'No reservation — find my account.',
    icon: '⛳',
    action: 'walkin-member',
  },
  {
    label: 'New Guest',
    sub: "First time? Let's get you set up.",
    icon: '🆕',
    action: 'guest',
  },
]

export default function PlayerTypeScreen({ onGuest, onMember, onWalkInMember, onBack }: Props) {
  function handle(action: string) {
    if (action === 'guest') onGuest()
    else if (action === 'walkin-member') onWalkInMember()
    else onMember()
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-10 px-16">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-white">Who's playing?</h2>
        <p className="text-[#888] mt-2">Choose how you'd like to get started.</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        {OPTIONS.map(o => (
          <button
            key={o.action}
            onClick={() => handle(o.action)}
            className="rounded-2xl border border-[#2A2A2A] bg-[#111] hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5 px-6 py-5 flex items-center gap-5 transition-all active:scale-[0.98] text-left w-full"
          >
            <span className="text-4xl flex-shrink-0">{o.icon}</span>
            <div>
              <p className="text-white font-semibold text-lg">{o.label}</p>
              <p className="text-[#666] text-sm mt-0.5">{o.sub}</p>
            </div>
            <span className="ml-auto text-[#444]">›</span>
          </button>
        ))}
      </div>

      <GoldButton variant="ghost" onClick={onBack}>← Back</GoldButton>
    </div>
  )
}
