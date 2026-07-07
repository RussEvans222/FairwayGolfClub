import { useState, useCallback, useEffect } from 'react'
import { useSession } from './hooks/useSession'
import { useSalesforce, saveAuth, clearAuth } from './hooks/useSalesforce'
import type {
  Screen, SkillLevel, GolferProfile, Contact,
  ScheduledSession, ScheduledPlayer,
} from './types'

import WelcomeScreen from './screens/WelcomeScreen'
import ScheduledSessionsScreen from './screens/ScheduledSessionsScreen'
import PinEntryScreen from './screens/PinEntryScreen'
import BayDirectionScreen from './screens/BayDirectionScreen'
import PlayerTypeScreen from './screens/PlayerTypeScreen'
import GuestRegistrationScreen from './screens/GuestRegistrationScreen'
import SessionActiveScreen from './screens/SessionActiveScreen'
import SessionSummaryScreen from './screens/SessionSummaryScreen'
import StaffLoginScreen from './screens/StaffLoginScreen'
import SetupPinScreen from './screens/SetupPinScreen'

interface SummaryStats {
  avgBallSpeed: number | null
  avgCarryDistance: number | null
  bestCarry: number | null
  shotCount: number | null
  durationMinutes: number | null
}

interface CoachTipData {
  observation: string
  recommendation: string
  club?: string
  confidence?: number
}


export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Scheduled sessions state
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null)
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number>(0)

  // Walk-in / active session state
  const { session, addPlayer, reset } = useSession()
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    avgBallSpeed: null, avgCarryDistance: null, bestCarry: null, shotCount: null, durationMinutes: null,
  })
  const [coachTip, setCoachTip] = useState<CoachTipData | null>(null)

  const { auth, refreshAuth, query, create, patch } = useSalesforce()

  // ── Handle OAuth implicit callback (token in URL hash) ──────────────────
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const instanceUrl = params.get('instance_url')
    const oauthError = params.get('error_description')

    // Always clean the hash from the URL
    window.history.replaceState(null, '', window.location.pathname)

    if (oauthError) {
      setAuthError(decodeURIComponent(oauthError))
      return
    }
    if (accessToken && instanceUrl) {
      saveAuth({ accessToken, instanceUrl: decodeURIComponent(instanceUrl) })
      refreshAuth()
    }
  }, [refreshAuth])

  // ── Staff logout helper ──────────────────────────────────────────────
  // Exposed via hidden tap: 5 taps on the header area resets auth
  function handleStaffLogout() {
    clearAuth()
    refreshAuth()
  }

  // ── Load today's schedule ─────────────────────────────────────────────

  const loadSchedule = useCallback(async () => {
    setSessionsLoading(true)
    try {
      // Query Salesforce Scheduler — ServiceAppointments for today with assigned bay
      type ApptRow = {
        Id: string
        Status: string
        SchedStartTime: string
        SchedEndTime: string
        Contact: { Id: string; FirstName: string; LastName: string } | null
        ContactId: string | null
        ServiceResources: {
          records: Array<{
            ServiceResource: { Id: string; Name: string } | null
          }>
        } | null
      }
      const appointments = await query<ApptRow>(
        `SELECT Id, Status, SchedStartTime, SchedEndTime,
                ContactId, Contact.Id, Contact.FirstName, Contact.LastName,
                (SELECT ServiceResource.Id, ServiceResource.Name FROM ServiceResources LIMIT 1)
         FROM ServiceAppointment
         WHERE SchedStartTime = TODAY
           AND Status IN ('Scheduled','Dispatched','In Progress','Completed')
         ORDER BY SchedStartTime ASC`
      )

      const built: ScheduledSession[] = await Promise.all(
        appointments.map(async (appt) => {
          const bayResource = appt.ServiceResources?.records?.[0]?.ServiceResource ?? null
          const bayName = bayResource?.Name ?? 'Bay'
          // Extract bay number from name e.g. "Bay Number One" → "1"
          const bayLabel = bayName

          // Load the Contact's golfer profile + PIN
          type ProfileRow = {
            Id: string
            Member_PIN__c: string | null
            Contact__c: string
          }
          let pin: string | null = null
          let profileId: string | null = null

          if (appt.ContactId) {
            const profiles = await query<ProfileRow>(
              `SELECT Id, Member_PIN__c, Contact__c
               FROM Golfer_Profile__c WHERE Contact__c = '${appt.ContactId}' LIMIT 1`
            )
            if (profiles.length > 0) {
              pin = profiles[0].Member_PIN__c ?? null
              profileId = profiles[0].Id
            }
          }

          const displayName = appt.Contact
            ? `${appt.Contact.FirstName ?? ''} ${appt.Contact.LastName ?? ''}`.trim()
            : 'Guest'

          const players: ScheduledPlayer[] = [{
            profileId,
            contactId: appt.ContactId ?? null,
            displayName,
            isGuest: !appt.ContactId,
            checkedIn: appt.Status === 'In Progress' || appt.Status === 'Completed',
            pin,
          }]

          return {
            reservationId: appt.Id,
            sessionId: null,
            bayId: bayResource?.Id ?? '',
            bayName: bayLabel,
            bayLabel,
            startTime: appt.SchedStartTime,
            endTime: appt.SchedEndTime,
            status: appt.Status,
            players,
          }
        })
      )

      setScheduledSessions(built)
    } catch (e) {
      console.error('Failed to load schedule', e)
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
        clearAuth(); refreshAuth()
      }
      setScheduledSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [query])

  // Reload schedule when we navigate to the sessions screen
  useEffect(() => {
    if (screen === 'scheduled-sessions') loadSchedule()
  }, [screen, loadSchedule])

  // ── Screen handlers ───────────────────────────────────────────────────

  function handleStart() {
    setError(null)
    setScreen('scheduled-sessions')
  }

  function handleReset() {
    reset()
    setError(null)
    setSelectedSession(null)
    setSummaryStats({ avgBallSpeed: null, avgCarryDistance: null, bestCarry: null, shotCount: null, durationMinutes: null })
    setCoachTip(null)
    setScreen('welcome')
  }

  function handleSelectPlayer(s: ScheduledSession, playerIndex: number) {
    setSelectedSession(s)
    setSelectedPlayerIndex(playerIndex)
    setError(null)
    setScreen('pin-entry')
  }

  const handlePinConfirm = useCallback(async (pin: string) => {
    if (!selectedSession) return
    const player = selectedSession.players[selectedPlayerIndex]
    setLoading(true)
    setError(null)

    try {
      // Verify PIN
      if (player.pin && player.pin !== pin) {
        setError('Incorrect PIN. Try again.')
        setLoading(false)
        return
      }

      // If no PIN set — route to setup flow instead of auto-accepting
      if (!player.pin) {
        setLoading(false)
        setScreen('pin-setup')
        return
      }

      // Mark checked in locally
      setScheduledSessions(prev => prev.map(s =>
        s.reservationId !== selectedSession.reservationId ? s : {
          ...s,
          players: s.players.map((p, i) => i === selectedPlayerIndex ? { ...p, checkedIn: true } : p),
        }
      ))

      // Update appointment status to Dispatched (checked in, bay assigned)
      if (selectedSession.status === 'Scheduled') {
        await patch('ServiceAppointment', selectedSession.reservationId, {
          Status: 'Dispatched',
        })
        setSelectedSession(s => s ? { ...s, status: 'Dispatched' } : s)
      }

      setScreen('bay-direction')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed.')
    } finally {
      setLoading(false)
    }
  }, [selectedSession, selectedPlayerIndex, patch])

  const handlePinSetup = useCallback(async (pin: string) => {
    if (!selectedSession) return
    const player = selectedSession.players[selectedPlayerIndex]
    setLoading(true)
    setError(null)
    try {
      if (player.profileId) {
        await patch('Golfer_Profile__c', player.profileId, { Member_PIN__c: pin })
      }
      setScheduledSessions(prev => prev.map(s =>
        s.reservationId !== selectedSession.reservationId ? s : {
          ...s,
          players: s.players.map((p, i) => i === selectedPlayerIndex ? { ...p, pin, checkedIn: true } : p),
        }
      ))
      if (selectedSession.status === 'Scheduled') {
        await patch('ServiceAppointment', selectedSession.reservationId, { Status: 'Dispatched' })
        setSelectedSession(s => s ? { ...s, status: 'Dispatched' } : s)
      }
      setScreen('bay-direction')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PIN setup failed.')
    } finally {
      setLoading(false)
    }
  }, [selectedSession, selectedPlayerIndex, patch])

  // Walk-in flow handlers
  const handleGuestComplete = useCallback(async (data: {
    firstName: string; lastName: string; email: string; skill: SkillLevel
  }) => {
    setLoading(true)
    setError(null)
    try {
      const contacts = await query<Contact>(
        `SELECT Id, FirstName, LastName, Email FROM Contact WHERE Email = '${data.email}' LIMIT 1`
      )
      let contact: Contact
      if (contacts.length > 0) {
        contact = contacts[0]
      } else {
        const r = await create<{ id: string }>('Contact', {
          FirstName: data.firstName, LastName: data.lastName, Email: data.email,
        })
        contact = { Id: r.id, FirstName: data.firstName, LastName: data.lastName, Email: data.email, Phone: null }
      }

      const profiles = await query<GolferProfile>(
        `SELECT Id, Name, Skill_Segment__c FROM Golfer_Profile__c WHERE Contact__c = '${contact.Id}' LIMIT 1`
      )
      let profile: GolferProfile
      if (profiles.length > 0) {
        profile = profiles[0]
      } else {
        const pr = await create<{ id: string }>('Golfer_Profile__c', {
          Contact__c: contact.Id, Skill_Segment__c: data.skill,
        })
        profile = {
          Id: pr.id, Name: `${data.firstName} ${data.lastName}`, Skill_Segment__c: data.skill,
          Handicap__c: null, AI_Coaching_Enabled__c: false, Current_Focus__c: null,
          Average_7_Iron_Carry__c: null, Average_Driver_Carry__c: null,
        }
      }
      addPlayer({
        slot: session.players.length + 1, contact, profile,
        displayName: `${data.firstName} ${data.lastName}`, isGuest: true,
      })
      // Walk-ins go straight to session active (staff will configure bay separately)
      // For now route to session active placeholder
      setScreen('session-active')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [query, create, session.players.length, addPlayer])

  const fetchGreeting = useCallback(async (appointmentId: string) => {
    type GreetingRow = {
      firstName: string; bayName: string; avgCarry: number | null
      lifetimeSessions: number; skillSegment: string | null; currentFocus: string | null
      insightObservation: string | null; insightRecommendation: string | null
      insightClub: string | null; aiGreeting: string
    }
    // Call Apex via REST anonymous — POST to apexrest or just use SOQL chain
    // We replicate the logic client-side using the REST query API (no custom endpoint needed)
    if (!selectedSession) return null
    const appt = await query<{
      Id: string; Contact: { FirstName: string; LastName: string; Id: string } | null
    }>(
      `SELECT Id, Contact.FirstName, Contact.LastName, Contact.Id
       FROM ServiceAppointment WHERE Id = '${appointmentId}' LIMIT 1`
    )
    if (!appt.length || !appt[0].Contact) return null
    const contact = appt[0].Contact

    const profiles = await query<{
      Id: string; Average_Driver_Carry__c: number | null; Lifetime_Sessions__c: number | null
      Skill_Segment__c: string | null; Current_Focus__c: string | null
    }>(
      `SELECT Id, Average_Driver_Carry__c, Lifetime_Sessions__c, Skill_Segment__c, Current_Focus__c
       FROM Golfer_Profile__c WHERE Contact__c = '${contact.Id}' LIMIT 1`
    )

    const profile = profiles[0] ?? null
    let insightObs = null, insightRec = null, insightClub = null
    if (profile) {
      const insights = await query<{
        Observation__c: string; Recommendation__c: string; Club__c: string | null
      }>(
        `SELECT Observation__c, Recommendation__c, Club__c
         FROM Practice_Insight__c WHERE Golfer_Profile__c = '${profile.Id}'
         ORDER BY CreatedDate DESC LIMIT 1`
      )
      if (insights.length) {
        insightObs = insights[0].Observation__c
        insightRec = insights[0].Recommendation__c
        insightClub = insights[0].Club__c ?? null
      }
    }

    const firstName = contact.FirstName ?? 'Golfer'
    const sessions = profile?.Lifetime_Sessions__c ?? 0
    const carry = profile?.Average_Driver_Carry__c ?? null
    const focus = profile?.Current_Focus__c ?? null

    const parts: string[] = [`Welcome back, ${firstName}!`]
    if (sessions > 1) parts.push(`This is session #${sessions} at Fairway.`)
    if (focus) parts.push(`Your current focus is ${focus}.`)
    if (insightRec) parts.push(`Last session: ${insightRec}`)
    else if (carry) parts.push(`Driver carry avg ${Math.round(carry)} yds — let's push further today.`)

    const g: GreetingRow = {
      firstName,
      bayName: selectedSession.bayLabel,
      avgCarry: carry,
      lifetimeSessions: Number(sessions),
      skillSegment: profile?.Skill_Segment__c ?? null,
      currentFocus: focus,
      insightObservation: insightObs,
      insightRecommendation: insightRec,
      insightClub,
      aiGreeting: parts.join(' '),
    }
    return g
  }, [selectedSession, query])

  const handleEndSession = useCallback(async () => {
    setLoading(true)
    try {
      if (session.sessionId) {
        await patch('Golf_Session__c', session.sessionId, { Status__c: 'Completed' })
        const shots = await query<{ Id: string }>(
          `SELECT Id FROM Golf_Shot__c WHERE Golf_Session__c = '${session.sessionId}'`
        )
        setSummaryStats(s => ({ ...s, shotCount: shots.length }))

        const memberPlayer = session.players.find(p => !p.isGuest && p.profile?.Id)
        if (memberPlayer?.profile?.Id) {
          const tips = await query<{
            Observation__c: string; Recommendation__c: string; Club__c: string | null; Confidence_Score__c: number | null
          }>(
            `SELECT Observation__c, Recommendation__c, Club__c, Confidence_Score__c
             FROM Practice_Insight__c WHERE Golfer_Profile__c = '${memberPlayer.profile.Id}'
             ORDER BY CreatedDate DESC LIMIT 1`
          )
          if (tips.length > 0) {
            setCoachTip({
              observation: tips[0].Observation__c,
              recommendation: tips[0].Recommendation__c,
              club: tips[0].Club__c ?? undefined,
              confidence: tips[0].Confidence_Score__c ?? undefined,
            })
          }
        }
      }
      setScreen('session-summary')
    } catch {
      setScreen('session-summary')
    } finally {
      setLoading(false)
    }
  }, [session.sessionId, session.players, patch, query])


  // ── Render ────────────────────────────────────────────────────────────

  const currentPlayer = selectedSession?.players[selectedPlayerIndex] ?? null

  // Show login if no valid auth
  if (!auth) {
    return (
      <div className="w-screen h-screen bg-[#0A0A0A] overflow-hidden select-none">
        <StaffLoginScreen onSkip={() => refreshAuth()} error={authError} />
      </div>
    )
  }

  return (
    <div className="w-screen h-screen bg-[#0A0A0A] overflow-hidden select-none"
         onDoubleClick={(e) => { if ((e.target as HTMLElement).dataset.logout) handleStaffLogout() }}>
      {screen === 'welcome' && (
        <WelcomeScreen bayName={null} onStart={handleStart} />
      )}
      {screen === 'scheduled-sessions' && (
        <ScheduledSessionsScreen
          sessions={scheduledSessions}
          loading={sessionsLoading}
          onSelectPlayer={handleSelectPlayer}
          onWalkIn={() => setScreen('player-type')}
        />
      )}
      {screen === 'pin-entry' && selectedSession && currentPlayer && (
        <PinEntryScreen
          session={selectedSession}
          player={currentPlayer}
          onConfirm={handlePinConfirm}
          onBack={() => setScreen('scheduled-sessions')}
          loading={loading}
          error={error}
        />
      )}
      {screen === 'pin-setup' && selectedSession && currentPlayer && (
        <SetupPinScreen
          session={selectedSession}
          player={currentPlayer}
          onConfirm={handlePinSetup}
          onBack={() => setScreen('scheduled-sessions')}
          loading={loading}
          error={error}
        />
      )}
      {screen === 'bay-direction' && selectedSession && currentPlayer && (
        <BayDirectionScreen
          session={selectedSession}
          player={currentPlayer}
          onDone={handleReset}
          fetchGreeting={fetchGreeting}
        />
      )}
      {screen === 'player-type' && (
        <PlayerTypeScreen
          onGuest={() => setScreen('guest-registration')}
          onMember={() => setScreen('scheduled-sessions')}
          onBack={() => setScreen('scheduled-sessions')}
        />
      )}
      {screen === 'guest-registration' && (
        <GuestRegistrationScreen
          onComplete={handleGuestComplete}
          onBack={() => setScreen('player-type')}
          loading={loading}
        />
      )}
      {screen === 'session-active' && (
        <SessionActiveScreen session={session} onEndSession={handleEndSession} />
      )}
      {screen === 'session-summary' && (
        <SessionSummaryScreen
          session={session}
          stats={summaryStats}
          coachTip={coachTip}
          onDone={handleReset}
        />
      )}

      {error && !['pin-entry', 'guest-registration'].includes(screen) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-500/50 text-white px-6 py-3 rounded-full text-sm max-w-sm text-center">
          {error}
        </div>
      )}
      {loading && screen !== 'pin-entry' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-12 h-12 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
