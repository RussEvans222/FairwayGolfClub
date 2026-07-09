interface Props {
  onLogin: () => void
  error: string | null
}

export function LoginScreen({ onLogin, error }: Props) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8"
         style={{ background: 'var(--dark)' }}>
      <div className="text-center">
        <div className="text-5xl font-bold mb-2" style={{ color: 'var(--gold)' }}>
          FAIRWAY
        </div>
        <div className="text-white/50 text-lg tracking-widest uppercase">Golf Club</div>
      </div>
      <div className="text-white/40 text-sm">Bay Display</div>
      {error && (
        <div className="text-red-400 text-sm px-6 py-3 rounded-lg"
             style={{ background: '#2a0a0a' }}>
          {error}
        </div>
      )}
      <button
        onClick={onLogin}
        className="px-8 py-3 rounded-lg font-semibold text-black transition-opacity hover:opacity-90"
        style={{ background: 'var(--gold)' }}
      >
        Connect to Salesforce
      </button>
    </div>
  )
}
