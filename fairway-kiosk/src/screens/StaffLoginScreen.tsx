// OAuth 2.0 Implicit (User-Agent) flow
// Salesforce redirects back with #access_token=...&instance_url=... in the URL hash
// No CORS token exchange needed — token lands directly in the browser

const SF_CLIENT_ID = import.meta.env.VITE_SF_CLIENT_ID as string
const SF_LOGIN_URL = (import.meta.env.VITE_SF_LOGIN_URL as string) || 'https://login.salesforce.com'

interface Props {
  onSkip: () => void
  error?: string | null
}

export default function StaffLoginScreen({ onSkip, error }: Props) {
  function handleLogin() {
    const redirectUri = window.location.origin + window.location.pathname
    const params = new URLSearchParams({
      response_type: 'token',
      client_id: SF_CLIENT_ID,
      redirect_uri: redirectUri,
    })
    window.location.href = `${SF_LOGIN_URL}/services/oauth2/authorize?${params}`
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-10 px-12">
      <div className="text-center">
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.4em] font-medium mb-3">Fairway Golf Club</p>
        <h1 className="text-4xl font-bold text-white mb-2">Kiosk Setup</h1>
        <p className="text-[#888] text-base">Sign in once each morning to activate today's sessions</p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-500/40 text-red-300 text-sm px-6 py-3 rounded-xl max-w-sm text-center">
          {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={!SF_CLIENT_ID}
        className="bg-[#C9A84C] hover:bg-[#E8C96A] active:scale-95 transition-all
                   text-black font-semibold text-lg px-12 py-4 rounded-2xl
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Sign in with Salesforce
      </button>

      {!SF_CLIENT_ID && (
        <p className="text-[#555] text-xs text-center max-w-xs">
          VITE_SF_CLIENT_ID not set in .env
        </p>
      )}

      <button
        onClick={onSkip}
        className="text-[#333] text-xs hover:text-[#555] transition-colors"
      >
        Use environment token
      </button>
    </div>
  )
}
