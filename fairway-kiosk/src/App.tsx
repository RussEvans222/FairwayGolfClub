import { useState, useCallback, useEffect } from 'react'
import { useSession } from './hooks/useSession'
import { useSalesforce, saveAuth, clearAuth } from './hooks/useSalesforce'
import type {
  Screen, SkillLevel, GolferProfile, Contact,
  ScheduledSession, ScheduledPlayer, QueueEntry, LiveSession, JoinPartyResult,
} from './types'

import WelcomeScreen from './screens/WelcomeScreen'
import CheckInScreen from './screens/CheckInScreen'
import ScheduledSessionsScreen from './screens/ScheduledSessionsScreen'
import PinEntryScreen from './screens/PinEntryScreen'
import BayDirectionScreen from './screens/BayDirectionScreen'
import JoinPartyScreen from './screens/JoinPartyScreen'
import MemberWalkInScreen from './screens/MemberWalkInScreen'
import GuestRegistrationScreen from './screens/GuestRegistrationScreen'
import SessionActiveScreen from './screens/SessionActiveScreen'
import SessionSummaryScreen from './screens/SessionSummaryScreen'
import StaffLoginScreen from './screens/StaffLoginScreen'
import SetupPinScreen from './screens/SetupPinScreen'
import GuestPaymentScreen from './screens/GuestPaymentScreen'
import BayQueueScreen from './screens/BayQueueScreen'

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
  // Authoritative bay list (all active ServiceResources) — never inferred from the schedule,
  // otherwise a bay with zero bookings today would look like it doesn't exist.
  const [allBays, setAllBays] = useState<{ bayId: string; bayName: string }[]>([])
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null)
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number>(0)

  // Walk-in / active session state
  const [walkInSession, setWalkInSession] = useState<ScheduledSession | null>(null)
  const [walkInPlayer, setWalkInPlayer] = useState<ScheduledPlayer | null>(null)
  // Pending guest data — held between registration and payment confirmation
  const [pendingGuest, setPendingGuest] = useState<{ firstName: string; lastName: string; email: string; skill: SkillLevel } | null>(null)
  // Member walk-in lookup result — held through payment screen
  const [pendingMember, setPendingMember] = useState<{ contactId: string; accountId: string | null; profileId: string | null; firstName: string; lastName: string; email: string } | null>(null)
  // Bay queue
  const [bayQueue, setBayQueue] = useState<QueueEntry[]>([])
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null)
  const { session, addPlayer, reset } = useSession()
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    avgBallSpeed: null, avgCarryDistance: null, bestCarry: null, shotCount: null, durationMinutes: null,
  })
  const [coachTip, setCoachTip] = useState<CoachTipData | null>(null)

  // Join-a-party state
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const [liveSessionsLoading, setLiveSessionsLoading] = useState(false)
  const [selectedJoinSession, setSelectedJoinSession] = useState<LiveSession | null>(null)

  const { auth, refreshAuth, query, create, patch, postApexRest } = useSalesforce()

  const upsertScheduledSession = useCallback((nextSession: ScheduledSession) => {
    setScheduledSessions(prev => {
      const index = prev.findIndex(s => s.reservationId === nextSession.reservationId)
      if (index === -1) return [...prev, nextSession]

      const next = [...prev]
      next[index] = nextSession
      return next
    })
  }, [])

  // Writes ServiceAppointment.Status through the full check-in ladder —
  // "Checked In" (identity confirmed) immediately followed by "Dispatched"
  // (bay known) — instead of jumping straight to Dispatched. Every check-in
  // path resolves the bay in the same action today, so the gap between the
  // two writes is milliseconds, but this keeps a real Checked In entry in
  // the record's history rather than skipping it. Requires "Checked In" to
  // exist as an active value on ServiceAppointment.Status in the org first
  // — see "Checked In status prerequisite" in SESSION_SYNC.md.
  const markCheckedIn = useCallback(async (appointmentId: string) => {
    await patch('ServiceAppointment', appointmentId, { Status: 'Checked In' })
    await patch('ServiceAppointment', appointmentId, { Status: 'Dispatched' })
  }, [patch])

  // Best-effort: creates the Golf_Session__c/Session_Participant__c tracking
  // records for this check-in (see FairwaySessionCheckinApi.cls), so staff
  // can see who's checked into a bay session's ServiceAppointment. Never
  // blocks or errors out the check-in flow — this is a tracking enhancement,
  // not core to getting the golfer to their bay. Swallows all failures
  // internally so every call site can just `await` it with no try/catch.
  const ensureKioskSession = useCallback(async (
    serviceAppointmentId: string,
    golferProfileId: string | null,
    displayName: string,
    isGuest: boolean,
  ): Promise<void> => {
    try {
      await postApexRest('/FairwaySessionCheckin/', {
        serviceAppointmentId, golferProfileId, displayName, isGuest,
      })
    } catch (e) {
      console.error('[FairwaySessionCheckin] failed to ensure session for', serviceAppointmentId, e)
    }
  }, [postApexRest])

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

  // Reload schedule when we navigate to welcome, check-in, or sessions screen
  useEffect(() => {
    if (screen === 'welcome' || screen === 'check-in' || screen === 'scheduled-sessions') loadSchedule()
  }, [screen, loadSchedule])

  // ── Load in-progress sessions a late arrival can join ──────────────────
  const loadLiveSessions = useCallback(async () => {
    setLiveSessionsLoading(true)
    try {
      type SessionRow = {
        Id: string
        Session_Start__c: string
        Bay__r: { Name: string } | null
        Session_Participants__r: { records: Array<{ Id: string }> } | null
      }
      const rows = await query<SessionRow>(
        `SELECT Id, Session_Start__c, Bay__r.Name, (SELECT Id FROM Session_Participants__r)
         FROM Golf_Session__c
         WHERE Status__c = 'In Progress'
         ORDER BY Session_Start__c ASC`
      )
      setLiveSessions(rows.map(r => ({
        sessionId: r.Id,
        bayName: r.Bay__r?.Name ?? 'Bay',
        startTime: r.Session_Start__c,
        participantCount: r.Session_Participants__r?.records?.length ?? 0,
      })))
    } catch (e) {
      console.error('Failed to load live sessions', e)
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
        clearAuth(); refreshAuth()
      }
      setLiveSessions([])
    } finally {
      setLiveSessionsLoading(false)
    }
  }, [query, refreshAuth])

  useEffect(() => {
    if (screen === 'join-party') loadLiveSessions()
  }, [screen, loadLiveSessions])

  // Load the real bay list once auth is available — this is the source of truth
  // for "which bays exist," independent of whether they have any bookings today.
  const loadBays = useCallback(async () => {
    try {
      const bays = await query<{ Id: string; Name: string }>(
        `SELECT Id, Name FROM ServiceResource WHERE IsActive = true ORDER BY Name ASC`
      )
      setAllBays(bays.map(b => ({ bayId: b.Id, bayName: b.Name })))
    } catch (e) {
      console.error('Failed to load bay list', e)
    }
  }, [query])

  useEffect(() => {
    if (auth) loadBays()
  }, [auth, loadBays])

  // ── Screen handlers ───────────────────────────────────────────────────

  function handleStart() {
    setError(null)
    setScreen('check-in')
  }

  function handleReset() {
    reset()
    setError(null)
    setSelectedSession(null)
    setWalkInSession(null)
    setWalkInPlayer(null)
    setPendingGuest(null)
    setPendingMember(null)
    setSelectedJoinSession(null)
    setQueueEntry(null)
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
      const checkedInSession: ScheduledSession = {
        ...selectedSession,
        status: selectedSession.status === 'Scheduled' ? 'Dispatched' : selectedSession.status,
        players: selectedSession.players.map((p, i) => i === selectedPlayerIndex ? { ...p, checkedIn: true } : p),
      }
      upsertScheduledSession(checkedInSession)
      setSelectedSession(checkedInSession)

      // Checked in, bay assigned
      if (selectedSession.status === 'Scheduled') {
        await markCheckedIn(selectedSession.reservationId)
      }

      await ensureKioskSession(selectedSession.reservationId, player.profileId, player.displayName ?? 'Golfer', player.isGuest)

      setScreen('bay-direction')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed.')
    } finally {
      setLoading(false)
    }
  }, [selectedSession, selectedPlayerIndex, markCheckedIn, ensureKioskSession, upsertScheduledSession])

  const handlePinSetup = useCallback(async (pin: string) => {
    if (!selectedSession) return
    const player = selectedSession.players[selectedPlayerIndex]
    setLoading(true)
    setError(null)
    try {
      if (player.profileId) {
        await patch('Golfer_Profile__c', player.profileId, { Member_PIN__c: pin })
      }
      const checkedInSession: ScheduledSession = {
        ...selectedSession,
        status: selectedSession.status === 'Scheduled' ? 'Dispatched' : selectedSession.status,
        players: selectedSession.players.map((p, i) => i === selectedPlayerIndex ? { ...p, pin, checkedIn: true } : p),
      }
      upsertScheduledSession(checkedInSession)
      setSelectedSession(checkedInSession)
      if (selectedSession.status === 'Scheduled') {
        await markCheckedIn(selectedSession.reservationId)
      }

      await ensureKioskSession(selectedSession.reservationId, player.profileId, player.displayName ?? 'Golfer', player.isGuest)

      setScreen('bay-direction')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PIN setup failed.')
    } finally {
      setLoading(false)
    }
  }, [selectedSession, selectedPlayerIndex, patch, markCheckedIn, ensureKioskSession, upsertScheduledSession])

  // Tiered pricing: golfers with an Active/Complimentary Membership__c record
  // get the "Member Pricing" Pricebook; everyone else gets the org's Standard
  // Pricebook (walk-in/non-member rate — a premium over the member rate,
  // deliberately, since no membership is required). Falls back to Standard
  // if the membership lookup itself fails for any reason.
  const resolvePricebookId = useCallback(async (contactId: string): Promise<string | null> => {
    let pricebookName: string | null = null
    try {
      const memberships = await query<{ Id: string }>(
        `SELECT Id FROM Membership__c WHERE Contact__c = '${contactId}' AND Status__c IN ('Active','Complimentary') LIMIT 1`
      )
      if (memberships.length) pricebookName = 'Member Pricing'
    } catch (e) {
      console.error('Membership lookup failed, defaulting to walk-in pricing', e)
    }

    const pbs = await query<{ Id: string }>(
      pricebookName
        ? `SELECT Id FROM Pricebook2 WHERE Name = '${pricebookName}' AND IsActive = true LIMIT 1`
        : `SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1`
    )
    return pbs.length ? pbs[0].Id : null
  }, [query])

  // ── Resolve the "Fairway Golf Club" ServiceTerritory ─────────────────────
  // Every ServiceAppointment needs this set, or Field Service scheduling
  // automation can leave it in a state that never lets Status reach
  // Completed — that's what left SA-005/SA-006 stuck open indefinitely.
  // Appointments created by the Experience Cloud booking flow already get
  // this from Salesforce Scheduler's own candidate-matching; this kiosk path
  // is the one spot that was creating appointments by hand and missing it.
  const resolveServiceTerritoryId = useCallback(async (): Promise<string | null> => {
    const territories = await query<{ Id: string }>(
      `SELECT Id FROM ServiceTerritory WHERE Name = 'Fairway Golf Club' AND IsActive = true LIMIT 1`
    )
    return territories.length ? territories[0].Id : null
  }, [query])

  // ── Resolve the "In Person" Engagement Channel Type ──────────────────────
  // Lets Business Stats (FairwayOpsDashboardController.getChannelSplit) tell
  // walk-ins apart from appointments booked ahead through the Experience
  // Cloud portal or by phone. Silently no-ops (leaves EngagementChannelTypeId
  // unset) if the channel record hasn't been seeded yet — see
  // scripts/seed-engagement-channels.apex in fairway-sf.
  const resolveWalkInChannelId = useCallback(async (): Promise<string | null> => {
    try {
      const channels = await query<{ Id: string }>(
        `SELECT Id FROM EngagementChannelType WHERE Name = 'In Person' AND IsActive = true LIMIT 1`
      )
      return channels.length ? channels[0].Id : null
    } catch (e) {
      console.error('Engagement channel lookup failed, leaving EngagementChannelTypeId unset', e)
      return null
    }
  }, [query])

  // ── Record the session fee owed for one player ──────────────────────────
  // Creates an individual Order + OrderItem — one per player, not one shared
  // across a party — for the base session fee. This does NOT collect or
  // confirm payment; it just records what's owed. A visit can rack up
  // multiple charges (base fee + N extensions), so a single static amount
  // can't represent that — the Order is the running tab, and extendSession
  // (session console) adds further OrderItems to it as the golfer extends.
  // `appointmentId` is omitted for a join-a-party joiner, who has no
  // ServiceAppointment of their own (Order.Service_Appointment__c is
  // optional) — actual payment collection happens at a not-yet-designed bay
  // checkout step, not here.
  const createSessionOrder = useCallback(async (
    contactId: string,
    accountId: string,
    startIso: string,
    appointmentId?: string,
  ): Promise<void> => {
    const pricebookId = await resolvePricebookId(contactId)
    const priceEntries = pricebookId
      ? await query<{ Id: string; UnitPrice: number }>(
          `SELECT Id, UnitPrice FROM PricebookEntry
           WHERE Product2.Name = 'Bay Session' AND Pricebook2Id = '${pricebookId}' AND IsActive = true
           LIMIT 1`
        )
      : []
    // If the "Bay Session" product/pricebook entry isn't seeded yet, the
    // check-in still proceeds — just without a revenue record. See
    // SESSION_SYNC.md "Revenue tracking" for the seed script.
    if (!priceEntries.length || !pricebookId) return

    const pe = priceEntries[0]
    const order = await create<{ id: string }>('Order', {
      AccountId:    accountId,
      EffectiveDate: startIso.slice(0, 10),
      Status:       'Draft',
      Pricebook2Id: pricebookId,
      ...(appointmentId ? { Service_Appointment__c: appointmentId } : {}),
    })
    await create('OrderItem', {
      OrderId:          order.id,
      PricebookEntryId: pe.Id,
      Quantity:         1,
      UnitPrice:        pe.UnitPrice,
    })
  }, [create, query, resolvePricebookId])

  // ── Create a real ServiceAppointment in Salesforce for walk-ins ─────────
  const createWalkInAppointment = useCallback(async (
    contactId: string,
    accountId: string,
    bayResourceId: string,
    startIso: string,
    endIso: string,
  ): Promise<string> => {
    const workTypeId  = import.meta.env.VITE_SF_WALKIN_WORK_TYPE_ID  as string
    const territoryId = await resolveServiceTerritoryId()
    const channelId   = await resolveWalkInChannelId()

    const appt = await create<{ id: string }>('ServiceAppointment', {
      ParentRecordId:         accountId,
      ContactId:              contactId,
      WorkTypeId:             workTypeId,
      ServiceTerritoryId:     territoryId,
      EngagementChannelTypeId: channelId,
      SchedStartTime:         startIso,
      SchedEndTime:           endIso,
      Status:                 'Checked In', // immediately followed by Dispatched below, once the bay is assigned
      Description:            'Walk-in via kiosk',
    })
    await create('AssignedResource', {
      ServiceAppointmentId: appt.id,
      ServiceResourceId:    bayResourceId,
    })
    await patch('ServiceAppointment', appt.id, { Status: 'Dispatched' })

    await createSessionOrder(contactId, accountId, startIso, appt.id)

    return appt.id
  }, [create, patch, resolveServiceTerritoryId, resolveWalkInChannelId, createSessionOrder])

  // Find the next available (unoccupied) bay, checked against the real bay list —
  // never inferred from today's schedule, and never a hardcoded guess. A bay with
  // zero appointments today is still a real bay and must still count as available.
  function findAvailableBay(): { bayId: string; bayName: string; bayLabel: string } | null {
    const now = Date.now()
    // Build set of bay IDs currently occupied:
    // Dispatched = member heading to bay (regardless of clock time)
    // In Progress = session underway
    // Scheduled but past start = late, still counts
    const occupiedBayIds = new Set(
      scheduledSessions
        .filter(s => {
          const end = new Date(s.endTime).getTime()
          if (end <= now) return false // session already over
          return s.status === 'Dispatched' || s.status === 'In Progress' ||
            (s.status === 'Scheduled' && new Date(s.startTime).getTime() <= now)
        })
        .map(s => s.bayId)
        .filter(Boolean)
    )

    for (const bay of allBays) {
      if (!occupiedBayIds.has(bay.bayId)) {
        return { bayId: bay.bayId, bayName: bay.bayName, bayLabel: bay.bayName }
      }
    }

    return null // all bays occupied (or the bay list hasn't loaded yet) — route to queue
  }

  // ── Member walk-in: look up by email ─────────────────────────────────────
  // Returns the Person Account ID for a given email, creating one if none exists.
  // ServiceAppointment.ParentRecordId must be a Person Account — business accounts are rejected.
  const resolvePersonAccount = useCallback(async (
    email: string, firstName: string, lastName: string
  ): Promise<string> => {
    // 1. Look for an existing Person Account by email
    const existing = await query<{ Id: string }>(
      `SELECT Id FROM Account WHERE PersonEmail = '${email}' AND IsPersonAccount = true LIMIT 1`
    )
    if (existing.length) return existing[0].Id

    // 2. None found — create one using the Person Account record type
    const rtResult = await query<{ Id: string }>(
      `SELECT Id FROM RecordType WHERE SObjectType = 'Account' AND IsPersonType = true LIMIT 1`
    )
    if (!rtResult.length) throw new Error('Person Account record type not found in org')
    const acct = await create<{ id: string }>('Account', {
      FirstName: firstName,
      LastName: lastName,
      PersonEmail: email,
      RecordTypeId: rtResult[0].Id,
    })
    return acct.id
  }, [query, create])

  const handleMemberSearch = useCallback(async (email: string) => {
    const contacts = await query<Contact & { AccountId: string | null }>(
      `SELECT Id, FirstName, LastName, Email, AccountId FROM Contact WHERE Email = '${email}' LIMIT 1`
    )
    if (!contacts.length) return null
    const c = contacts[0]

    const accountId = await resolvePersonAccount(email, c.FirstName ?? '', c.LastName ?? '')

    const profiles = await query<{ Id: string; Name: string; Skill_Segment__c: string; Member_PIN__c: string | null }>(
      `SELECT Id, Name, Skill_Segment__c, Member_PIN__c FROM Golfer_Profile__c WHERE Contact__c = '${c.Id}' LIMIT 1`
    )
    return {
      contactId: c.Id,
      accountId,
      profileId: profiles.length ? profiles[0].Id : null,
      firstName: c.FirstName,
      lastName: c.LastName,
      email: c.Email,
      pin: profiles[0]?.Member_PIN__c ?? null,
    }
  }, [query])

  // QR check-in: scans a permanent, per-person code (their Contact Id) — not tied
  // to any one booking. If they have a not-yet-checked-in reservation today, check
  // them in the same way PIN entry does. Otherwise fast-track them straight into
  // the walk-in flow using their already-known identity — skips the email search
  // and PIN screen, but still goes through payment/bay-assignment like any walk-in.
  const handleQrCheckIn = useCallback(async (contactId: string): Promise<string | null> => {
    const now = Date.now()
    for (const s of scheduledSessions) {
      // A Scheduled reservation whose window already passed (e.g. a no-show from
      // earlier today) is stale — treat as no reservation, not a free pass in.
      if (new Date(s.endTime).getTime() <= now) continue
      const playerIndex = s.players.findIndex(p => p.contactId === contactId && !p.checkedIn)
      if (playerIndex === -1) continue
      const player = s.players[playerIndex]
      try {
        setSelectedSession(s)
        setSelectedPlayerIndex(playerIndex)
        setScheduledSessions(prev => prev.map(sess =>
          sess.reservationId !== s.reservationId ? sess : {
            ...sess,
            players: sess.players.map((p, i) => i === playerIndex ? { ...p, checkedIn: true } : p),
          }
        ))
        if (s.status === 'Scheduled') {
          await markCheckedIn(s.reservationId)
          setSelectedSession(sel => sel ? { ...sel, status: 'Dispatched' } : sel)
        }
        await ensureKioskSession(s.reservationId, player.profileId, player.displayName ?? 'Golfer', player.isGuest)
        const nextSession: ScheduledSession = {
          ...s,
          status: s.status === 'Scheduled' ? 'Dispatched' : s.status,
          players: s.players.map((p, i) => i === playerIndex ? { ...p, checkedIn: true } : p),
        }
        upsertScheduledSession(nextSession)
        setSelectedSession(nextSession)
        setScreen('bay-direction')
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'Check-in failed.'
      }
    }

    // No reservation today — look them up and fast-track as a walk-in.
    try {
      const contacts = await query<Contact & { AccountId: string | null }>(
        `SELECT Id, FirstName, LastName, Email, AccountId FROM Contact WHERE Id = '${contactId}' LIMIT 1`
      )
      if (!contacts.length) return "We don't recognize that code. Try Reservation or Walk-In check-in instead."
      const c = contacts[0]

      const accountId = await resolvePersonAccount(c.Email, c.FirstName ?? '', c.LastName ?? '')
      const profiles = await query<{ Id: string; Member_PIN__c: string | null }>(
        `SELECT Id, Member_PIN__c FROM Golfer_Profile__c WHERE Contact__c = '${c.Id}' LIMIT 1`
      )

      setPendingMember({
        contactId: c.Id,
        accountId,
        profileId: profiles.length ? profiles[0].Id : null,
        firstName: c.FirstName,
        lastName: c.LastName,
        email: c.Email,
      })
      setScreen('guest-payment')
      return null
    } catch (e) {
      return e instanceof Error ? e.message : "We couldn't look up that code."
    }
  }, [scheduledSessions, patch, query, resolvePersonAccount, markCheckedIn, ensureKioskSession, upsertScheduledSession])

  // Called when member is identified — route to PIN screen first
  function handleMemberWalkInFound(data: { contactId: string; accountId?: string | null; profileId: string | null; firstName: string; lastName: string; email: string; pin?: string | null }) {
    setPendingMember({ ...data, accountId: data.accountId ?? null })
    setScreen('member-walkin-pin')
  }

  // PIN verified (or no PIN set) → advance to payment
  const handleMemberWalkInPin = useCallback(async (enteredPin: string) => {
    if (!pendingMember) return
    setLoading(true)
    setError(null)
    try {
      // Fetch the stored PIN from the profile
      if (pendingMember.profileId) {
        const profiles = await query<{ Member_PIN__c: string | null }>(
          `SELECT Member_PIN__c FROM Golfer_Profile__c WHERE Id = '${pendingMember.profileId}' LIMIT 1`
        )
        const storedPin = profiles[0]?.Member_PIN__c ?? null
        if (storedPin && storedPin !== enteredPin) {
          setError('Incorrect PIN. Try again.')
          setLoading(false)
          return
        }
        // If no PIN on file yet, accept any entry and save it
        if (!storedPin && pendingMember.profileId) {
          await patch('Golfer_Profile__c', pendingMember.profileId, { Member_PIN__c: enteredPin })
        }
      }
      setError(null)
      setScreen('guest-payment')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PIN check failed.')
    } finally {
      setLoading(false)
    }
  }, [pendingMember, query, patch])

  // After payment, assign bay or add to queue
  const handleMemberWalkInComplete = useCallback(async () => {
    if (!pendingMember) return
    setLoading(true)
    setError(null)
    try {
      const bay = findAvailableBay()
      const now = new Date().toISOString()
      const endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      if (bay) {
        const personAccountId = pendingMember.accountId
          ?? await resolvePersonAccount(pendingMember.email, pendingMember.firstName, pendingMember.lastName)
        const appointmentId = await createWalkInAppointment(
          pendingMember.contactId, personAccountId, bay.bayId, now, endTime
        )
        await ensureKioskSession(appointmentId, pendingMember.profileId, `${pendingMember.firstName} ${pendingMember.lastName}`, false)
        const syntheticSession: ScheduledSession = {
          reservationId: appointmentId,
          sessionId: null,
          bayId: bay.bayId,
          bayName: bay.bayName,
          bayLabel: bay.bayLabel,
          startTime: now,
          endTime,
          status: 'Dispatched',
          players: [{
            profileId: pendingMember.profileId,
            contactId: pendingMember.contactId,
            displayName: `${pendingMember.firstName} ${pendingMember.lastName}`,
            isGuest: false,
            checkedIn: true,
            pin: null,
          }],
        }
        setWalkInSession(syntheticSession)
        setWalkInPlayer(syntheticSession.players[0])
        upsertScheduledSession(syntheticSession)
        setScreen('bay-direction')
      } else {
        // All bays occupied — add to queue
        const entry: QueueEntry = {
          id: `q-${Date.now()}`,
          displayName: `${pendingMember.firstName} ${pendingMember.lastName}`,
          contactId: pendingMember.contactId,
          profileId: pendingMember.profileId,
          skill: 'Intermediate',
          isMember: true,
          joinedAt: Date.now(),
        }
        setBayQueue(prev => [...prev, entry])
        setQueueEntry(entry)
        setScreen('bay-queue')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMember, scheduledSessions, allBays, createWalkInAppointment, ensureKioskSession, upsertScheduledSession])

  // Walk-in flow handlers

  // Step 1: collect info → hold it, show payment screen
  function handleGuestRegistered(data: { firstName: string; lastName: string; email: string; skill: SkillLevel }) {
    setPendingGuest(data)
    setScreen('guest-payment')
  }

  // Find-or-create the Contact (+ Person Account) and Golfer_Profile__c for a
  // guest, from the name/email/skill collected by GuestRegistrationScreen.
  // Shared by the normal new-guest walk-in path and the join-a-party guest
  // path, so this identity-resolution logic doesn't drift into two copies.
  const resolveGuestIdentity = useCallback(async (data: {
    firstName: string; lastName: string; email: string; skill: SkillLevel
  }): Promise<{ contact: Contact & { AccountId: string | null }; profile: GolferProfile }> => {
    const contacts = await query<Contact & { AccountId: string | null }>(
      `SELECT Id, FirstName, LastName, Email, AccountId FROM Contact WHERE Email = '${data.email}' LIMIT 1`
    )
    let contact: Contact & { AccountId: string | null }
    if (contacts.length > 0) {
      contact = contacts[0]
    } else {
      // Create a Person Account — this auto-creates the linked Contact in SF.
      // We then re-query to get the shadow Contact ID so we have a ContactId for the appointment.
      await resolvePersonAccount(data.email, data.firstName, data.lastName)
      const newContacts = await query<Contact & { AccountId: string | null }>(
        `SELECT Id, FirstName, LastName, Email, AccountId FROM Contact WHERE Email = '${data.email}' AND AccountId != null LIMIT 1`
      )
      if (!newContacts.length) throw new Error('Contact not found after Person Account creation')
      contact = newContacts[0]
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

    return { contact, profile }
  }, [query, create, resolvePersonAccount])

  // Step 2: payment confirmed → create SF records, assign bay
  const handleGuestComplete = useCallback(async (data: {
    firstName: string; lastName: string; email: string; skill: SkillLevel
  }) => {
    setLoading(true)
    setError(null)
    try {
      const { contact, profile } = await resolveGuestIdentity(data)

      addPlayer({
        slot: session.players.length + 1, contact, profile,
        displayName: `${data.firstName} ${data.lastName}`, isGuest: true,
      })

      // Assign the next available bay (not currently occupied)
      const bay = findAvailableBay()
      const now = new Date().toISOString()
      const endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      if (bay) {
        const personAccountId = await resolvePersonAccount(data.email, data.firstName, data.lastName)
        const appointmentId = await createWalkInAppointment(
          contact.Id, personAccountId, bay.bayId, now, endTime
        )
        await ensureKioskSession(appointmentId, profile.Id, `${data.firstName} ${data.lastName}`, true)
        const syntheticSession: ScheduledSession = {
          reservationId: appointmentId,
          sessionId: null,
          bayId: bay.bayId,
          bayName: bay.bayName,
          bayLabel: bay.bayLabel,
          startTime: now,
          endTime,
          status: 'Dispatched',
          players: [{
            profileId: profile.Id,
            contactId: contact.Id,
            displayName: `${data.firstName} ${data.lastName}`,
            isGuest: true,
            checkedIn: true,
            pin: null,
          }],
        }
        const syntheticPlayer: ScheduledPlayer = syntheticSession.players[0]
        setWalkInSession(syntheticSession)
        setWalkInPlayer(syntheticPlayer)
        upsertScheduledSession(syntheticSession)
        setScreen('bay-direction')
      } else {
        // All bays occupied — put guest in queue
        const entry: QueueEntry = {
          id: `q-${Date.now()}`,
          displayName: `${data.firstName} ${data.lastName}`,
          contactId: contact.Id,
          profileId: profile.Id,
          skill: data.skill,
          isMember: false,
          joinedAt: Date.now(),
        }
        setBayQueue(prev => [...prev, entry])
        setQueueEntry(entry)
        setScreen('bay-queue')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveGuestIdentity, session.players.length, addPlayer, scheduledSessions, allBays, createWalkInAppointment, ensureKioskSession, upsertScheduledSession])

  // ── Join an in-progress party ──────────────────────────────────────────
  // Reuses the exact same identity-collection screens as a normal walk-in
  // (member-walkin/member-walkin-pin or guest-registration → guest-payment) —
  // this only runs from the guest-payment confirm step, branched on whether
  // selectedJoinSession is set. Records an individual Order for this one
  // player (see createSessionOrder), then calls the join-party Apex endpoint
  // to attach them to the live Golf_Session__c.
  const handleJoinPartyComplete = useCallback(async () => {
    if (!selectedJoinSession) return
    setLoading(true)
    setError(null)
    try {
      let contactId: string
      let accountId: string
      let profileId: string | null
      let displayName: string
      let isGuest: boolean

      if (pendingMember) {
        contactId = pendingMember.contactId
        accountId = pendingMember.accountId
          ?? await resolvePersonAccount(pendingMember.email, pendingMember.firstName, pendingMember.lastName)
        profileId = pendingMember.profileId
        displayName = `${pendingMember.firstName} ${pendingMember.lastName}`
        isGuest = false
      } else if (pendingGuest) {
        const { contact, profile } = await resolveGuestIdentity(pendingGuest)
        contactId = contact.Id
        accountId = contact.AccountId
          ?? await resolvePersonAccount(pendingGuest.email, pendingGuest.firstName, pendingGuest.lastName)
        profileId = profile.Id
        displayName = `${pendingGuest.firstName} ${pendingGuest.lastName}`
        isGuest = true
      } else {
        throw new Error('Missing identity for join request.')
      }

      await createSessionOrder(contactId, accountId, new Date().toISOString())

      const result = await postApexRest<JoinPartyResult>('/FairwaySessionJoin/', {
        sessionId: selectedJoinSession.sessionId,
        golferProfileId: profileId,
        displayName,
        isGuest,
      })

      if (!result.success) {
        setError(result.message)
        return
      }

      const now = new Date().toISOString()
      const syntheticSession: ScheduledSession = {
        reservationId: 'walk-in',
        sessionId: selectedJoinSession.sessionId,
        bayId: '',
        bayName: result.bayName ?? selectedJoinSession.bayName,
        bayLabel: result.bayName ?? selectedJoinSession.bayName,
        startTime: now,
        endTime: now,
        status: 'In Progress',
        players: [{
          profileId, contactId, displayName, isGuest, checkedIn: true, pin: null,
        }],
      }
      setWalkInSession(syntheticSession)
      setWalkInPlayer(syntheticSession.players[0])
      setSelectedJoinSession(null)
      setScreen('bay-direction')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong joining that session.')
    } finally {
      setLoading(false)
    }
  }, [selectedJoinSession, pendingMember, pendingGuest, resolvePersonAccount, resolveGuestIdentity, createSessionOrder, postApexRest])

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
        <WelcomeScreen bayName={null} sessions={scheduledSessions} bays={allBays} onStart={handleStart} />
      )}
      {screen === 'check-in' && (
        <CheckInScreen
          onScan={handleQrCheckIn}
          onNewGuest={() => setScreen('guest-registration')}
          onWalkIn={() => setScreen('scheduled-sessions')}
          onJoinParty={() => setScreen('join-party')}
        />
      )}
      {screen === 'scheduled-sessions' && (
        <ScheduledSessionsScreen
          sessions={scheduledSessions}
          bays={allBays}
          loading={sessionsLoading}
          onSelectPlayer={handleSelectPlayer}
          onMemberWalkIn={() => setScreen('member-walkin')}
          onAddGuest={(s) => {
            setSelectedSession(s)
            setScreen('guest-registration')
          }}
          onBack={() => setScreen('check-in')}
        />
      )}
      {screen === 'join-party' && (
        <JoinPartyScreen
          sessions={liveSessions}
          loading={liveSessionsLoading}
          onSelect={(s) => { setSelectedJoinSession(s); setScreen('member-walkin') }}
          onBack={() => setScreen('check-in')}
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
      {screen === 'bay-direction' && (() => {
        const baySession = walkInSession ?? selectedSession
        const bayPlayer = walkInPlayer ?? currentPlayer
        return baySession && bayPlayer ? (
          <BayDirectionScreen
            session={baySession}
            player={bayPlayer}
            onDone={handleReset}
            fetchGreeting={walkInSession ? undefined : fetchGreeting}
          />
        ) : null
      })()}
      {screen === 'member-walkin' && (
        <MemberWalkInScreen
          onFound={handleMemberWalkInFound}
          onNotFound={() => setScreen('guest-registration')}
          onBack={() => setScreen(selectedJoinSession ? 'join-party' : 'check-in')}
          loading={loading}
          error={error}
          onSearch={handleMemberSearch}
        />
      )}
      {screen === 'member-walkin-pin' && pendingMember && (
        <PinEntryScreen
          player={{ displayName: `${pendingMember.firstName} ${pendingMember.lastName}` }}
          onConfirm={handleMemberWalkInPin}
          onBack={() => { setError(null); setScreen('member-walkin') }}
          loading={loading}
          error={error}
          backLabel="← Back"
        />
      )}
      {screen === 'guest-registration' && (
        <GuestRegistrationScreen
          onComplete={handleGuestRegistered}
          onBack={() => setScreen(selectedJoinSession ? 'join-party' : 'check-in')}
          loading={loading}
        />
      )}
      {screen === 'guest-payment' && (pendingGuest || pendingMember) && (
        <GuestPaymentScreen
          guestName={pendingMember
            ? `${pendingMember.firstName} ${pendingMember.lastName}`
            : `${pendingGuest!.firstName} ${pendingGuest!.lastName}`}
          onConfirm={pendingMember
            ? () => (selectedJoinSession ? handleJoinPartyComplete() : handleMemberWalkInComplete())
            : () => (selectedJoinSession ? handleJoinPartyComplete() : handleGuestComplete(pendingGuest!))}
          onBack={() => pendingMember ? setScreen('member-walkin') : setScreen('guest-registration')}
        />
      )}
      {screen === 'bay-queue' && queueEntry && (
        <BayQueueScreen
          queueInfo={{
            position: bayQueue.findIndex(e => e.id === queueEntry.id) + 1,
            totalInQueue: bayQueue.length,
            displayName: queueEntry.displayName,
            isMember: queueEntry.isMember,
          }}
          sessions={scheduledSessions}
          bays={allBays}
          onDone={handleReset}
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
          isGuest={!!walkInSession}
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
