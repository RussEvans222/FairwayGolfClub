interface Props {
  onGuest: () => void
  onMember: () => void
  onWalkInMember: () => void
  onBack: () => void
}

const RESERVATION = {
  label: 'I Have a\nReservation',
  sub: 'Pre-Booked Tee Times',
  icon: '📅',
  bg: '/images/checkin-reservation.jpg',
  action: 'member',
}

const SIDE_OPTIONS = [
  {
    label: 'Member\nWalk-In',
    sub: 'Authorized Members',
    icon: '⛳',
    bg: '/images/checkin-member.jpg',
    action: 'walkin-member',
  },
  {
    label: 'New\nGuest',
    sub: 'Register & Play',
    icon: '🆕',
    bg: '/images/checkin-guest.jpg',
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
    <div className="relative w-full h-full overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-30 px-16 pt-8 flex flex-col items-center pointer-events-none">
        <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-10 w-auto hg-logo-white drop-shadow-2xl mb-3" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white tracking-tight drop-shadow-2xl">
          Who's Playing?
        </h1>
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.3em] mt-1 opacity-90">
          Choose How You'd Like To Start
        </p>
      </header>

      {/* Asymmetric grid */}
      <main className="flex h-full w-full">
        {/* Reservation — large hero, 2/3 width */}
        <button
          onClick={() => handle(RESERVATION.action)}
          className="group relative w-2/3 h-full text-left overflow-hidden border-r border-white/5 active:scale-[0.98] transition-transform duration-150"
        >
          <img src={RESERVATION.bg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/90" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center z-10">
            <span className="text-6xl mb-6 opacity-90">{RESERVATION.icon}</span>
            <h2 className="font-[family-name:var(--font-display)] text-6xl text-white mb-4 leading-tight whitespace-pre-line">
              {RESERVATION.label}
            </h2>
            <p className="text-[#C9A84C] text-sm uppercase tracking-[0.2em] font-semibold">{RESERVATION.sub}</p>
            <div className="mt-10 w-20 h-0.5 bg-[#C9A84C]/40" />
          </div>
        </button>

        {/* Right column — Member Walk-In / New Guest, 1/3 width */}
        <div className="flex flex-col w-1/3 h-full">
          {SIDE_OPTIONS.map((o, i) => (
            <button
              key={o.action}
              onClick={() => handle(o.action)}
              className={`group relative flex-1 text-left overflow-hidden active:scale-[0.97] transition-transform duration-150 ${i === 0 ? 'border-b border-white/5' : ''}`}
            >
              <img src={o.bg} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/90" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-10">
                <span className="text-4xl mb-3 opacity-90">{o.icon}</span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-white mb-2 leading-tight whitespace-pre-line">
                  {o.label}
                </h2>
                <p className="text-[#C9A84C] text-[11px] uppercase tracking-[0.15em] font-semibold">{o.sub}</p>
                <div className="mt-6 w-10 h-0.5 bg-[#C9A84C]/40" />
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Back button */}
      <footer className="fixed bottom-0 left-0 w-full z-30 p-10 flex justify-center pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-3 px-8 py-4 hg-glass-panel rounded-full shadow-2xl active:scale-95 transition-all"
        >
          <span className="text-[#C9A84C]">←</span>
          <span className="text-white text-xs uppercase tracking-widest font-semibold">Back</span>
        </button>
      </footer>

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none hg-vignette z-20" />
    </div>
  )
}
