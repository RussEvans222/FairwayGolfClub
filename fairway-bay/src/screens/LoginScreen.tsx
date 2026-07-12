interface Props {
  onLogin: () => void
  error: string | null
}

export function LoginScreen({ onLogin, error }: Props) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8"
         style={{ background: 'var(--dark)' }}>
      <div className="text-center">
        <img src="/images/logo-text.png" alt="Fairway Golf Club" className="h-14 w-auto mx-auto mb-2" />
        <div className="text-white/40 text-sm tracking-[0.3em] uppercase">Bay Display</div>
      </div>
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
