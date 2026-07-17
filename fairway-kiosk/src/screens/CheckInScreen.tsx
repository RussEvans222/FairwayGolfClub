import { useQrScanner } from '../hooks/useQrScanner'

interface Props {
  onScan: (contactId: string) => Promise<string | null>
  onNewGuest: () => void
  onWalkIn: () => void
  onJoinParty: () => void
}

const OPTIONS = [
  {
    label: 'New\nUser',
    sub: 'Register & Play',
    icon: '🆕',
    bg: '/images/checkin-guest.jpg',
    action: 'new-guest',
  },
  {
    label: 'Walk-In\nCheck-In',
    sub: "Today's Reservations",
    icon: '📅',
    bg: '/images/checkin-reservation.jpg',
    action: 'walk-in',
  },
  {
    label: 'Join a\nParty',
    sub: 'Already Playing With Friends',
    icon: '⛳',
    bg: '/images/checkin-join.jpg',
    action: 'join-party',
  },
]

export default function CheckInScreen({ onScan, onNewGuest, onWalkIn, onJoinParty }: Props) {
  const { videoRef, cameraError, scanError, checking } = useQrScanner(onScan)

  function handle(action: string) {
    if (action === 'new-guest') onNewGuest()
    else if (action === 'join-party') onJoinParty()
    else onWalkIn()
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-30 px-16 pt-8 flex flex-col items-center pointer-events-none">
        <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-10 w-auto hg-logo-white drop-shadow-2xl mb-3" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white tracking-tight drop-shadow-2xl">
          Check In
        </h1>
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.3em] mt-1 opacity-90">
          Scan Your Code, Or Choose Below
        </p>
      </header>

      {/* Asymmetric grid: live QR scanner hero (2/3) + 3 equal-weight tiles (1/3) */}
      <main className="flex h-full w-full">
        {/* Scanner — large hero, 2/3 width */}
        <div className="relative w-2/3 h-full flex flex-col items-center justify-center px-10 border-r border-white/5 hg-vignette">
          <div className="absolute inset-0 bg-gradient-to-b from-[#16241D] to-black" />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden hg-glass-panel">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {checking && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-[#C9A84C] text-sm uppercase tracking-[0.2em] font-semibold">Scan Your Fairway Code</p>
              <p className="text-[#999] text-xs mt-1">Hold your check-in QR code up to the camera</p>
            </div>
            {cameraError && <p className="text-red-400 text-sm text-center max-w-sm">{cameraError}</p>}
            {scanError && <p className="text-red-400 text-sm text-center max-w-sm">{scanError}</p>}
          </div>
        </div>

        {/* Right column — New User / Walk-In Check-In / Join a Party, 1/3 width */}
        <div className="flex flex-col w-1/3 h-full">
          {OPTIONS.map((o, i) => (
            <button
              key={o.action}
              onClick={() => handle(o.action)}
              className={`group relative flex-1 text-left overflow-hidden active:scale-[0.97] transition-transform duration-150 ${i < OPTIONS.length - 1 ? 'border-b border-white/5' : ''}`}
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

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none hg-vignette z-20" />
    </div>
  )
}
