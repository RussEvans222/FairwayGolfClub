import { useState, useCallback, useEffect } from 'react'
import { useSession } from './hooks/useSession'
import { useSalesforce, saveAuth, clearAuth } from './hooks/useSalesforce'
import type {
  Screen, SkillLevel, GolferProfile, Contact,
  ScheduledSession, ScheduledPlayer, QueueEntry,
} from './types'

import WelcomeScreen from './screens/WelcomeScreen'
import ScheduledSessionsScreen from './screens/ScheduledSessionsScreen'
import PinEntryScreen from './screens/PinEntryScreen'
import QrCheckInScreen from './screens/QrCheckInScreen'
import BayDirectionScreen from './screens/BayDirectionScreen'
import PlayerTypeScreen from './screens/PlayerTypeScreen'
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

  // Reload schedule when we navigate to welcome or sessions screen
  useEffect(() => {
    if (screen === 'welcome' || screen === 'scheduled-sessions') loadSchedule()
  }, [screen, loadSchedule])

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
    setScreen('scheduled-sessions')
  }

  function handleReset() {
    reset()
    setError(null)
    setSelectedSession(null)
    setWalkInSession(null)
    setWalkInPlayer(null)
    setPendingGuest(null)
    setPendingMember(null)
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

  // ── Create a real ServiceAppointment in Salesforce for walk-ins ─────────
  // Also opens an Order + OrderItem for the base session fee — a visit can
  // rack up multiple charges (base fee + N extensions), so a single static
  // amount on the appointment can't represent that. The Order is the running
  // tab for this visit; extendSession (session console) adds further
  // OrderItems to the same Order as the golfer extends their time.
  const createWalkInAppointment = useCallback(async (
    contactId: string,
    accountId: string,
    bayResourceId: string,
    startIso: string,
    endIso: string,
  ): Promise<string> => {
    const workTypeId  = import.meta.env.VITE_SF_WALKIN_WORK_TYPE_ID  as string

    const appt = await create<{ id: string }>('ServiceAppointment', {
      ParentRecordId: accountId,
      ContactId:      contactId,
      WorkTypeId:     workTypeId,
      SchedStartTime: startIso,
      SchedEndTime:   endIso,
      Status:         'Dispatched',
      Description:    'Walk-in via kiosk',
    })
    await create('AssignedResource', {
      ServiceAppointmentId: appt.id,
      ServiceResourceId:    bayResourceId,
    })

    const priceEntries = await query<{ Id: string; UnitPrice: number; Pricebook2Id: string }>(
      `SELECT Id, UnitPrice, Pricebook2Id FROM PricebookEntry
       WHERE Product2.Name = 'Walk-In Session Fee' AND Pricebook2.IsStandard = true AND IsActive = true
       LIMIT 1`
    )
    if (priceEntries.length) {
      const pe = priceEntries[0]
      const order = await create<{ id: string }>('Order', {
        AccountId:              accountId,
        EffectiveDate:          startIso.slice(0, 10),
        Status:                 'Draft',
        Pricebook2Id:           pe.Pricebook2Id,
        Service_Appointment__c: appt.id,
      })
      await create('OrderItem', {
        OrderId:          order.id,
        PricebookEntryId: pe.Id,
        Quantity:         1,
        UnitPrice:        pe.UnitPrice,
      })
    }
    // If the "Walk-In Session Fee" product/pricebook entry isn't seeded yet,
    // the appointment still gets created — just without a revenue record.
    // See SESSION_SYNC.md "Revenue tracking" for the seed script.

    return appt.id
  }, [create])

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
    for (const s of scheduledSessions) {
      const playerIndex = s.players.findIndex(p => p.contactId === contactId && !p.checkedIn)
      if (playerIndex === -1) continue
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
          await patch('ServiceAppointment', s.reservationId, { Status: 'Dispatched' })
          setSelectedSession(sel => sel ? { ...sel, status: 'Dispatched' } : sel)
        }
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
  }, [scheduledSessions, patch, query, resolvePersonAccount])

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
  }, [pendingMember, scheduledSessions, allBays, createWalkInAppointment])

  // Walk-in flow handlers

  // Step 1: collect info → hold it, show payment screen
  function handleGuestRegistered(data: { firstName: string; lastName: string; email: string; skill: SkillLevel }) {
    setPendingGuest(data)
    setScreen('guest-payment')
  }

  // Step 2: payment confirmed → create SF records, assign bay
  const handleGuestComplete = useCallback(async (data: {
    firstName: string; lastName: string; email: string; skill: SkillLevel
  }) => {
    setLoading(true)
    setError(null)
    try {
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
  }, [query, create, session.players.length, addPlayer, scheduledSessions, allBays, createWalkInAppointment])

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
      {screen === 'scheduled-sessions' && (
        <ScheduledSessionsScreen
          sessions={scheduledSessions}
          loading={sessionsLoading}
          onSelectPlayer={handleSelectPlayer}
          onWalkIn={() => setScreen('player-type')}
          onQrCheckIn={() => setScreen('qr-checkin')}
          onAddGuest={(s) => {
            setSelectedSession(s)
            setScreen('guest-registration')
          }}
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
      {screen === 'qr-checkin' && (
        <QrCheckInScreen
          onScan={handleQrCheckIn}
          onBack={() => setScreen('scheduled-sessions')}
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
      {screen === 'player-type' && (
        <PlayerTypeScreen
          onGuest={() => setScreen('guest-registration')}
          onMember={() => setScreen('scheduled-sessions')}
          onWalkInMember={() => setScreen('member-walkin')}
          onBack={() => setScreen('scheduled-sessions')}
        />
      )}
      {screen === 'member-walkin' && (
        <MemberWalkInScreen
          onFound={handleMemberWalkInFound}
          onNotFound={() => setScreen('guest-registration')}
          onBack={() => setScreen('player-type')}
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
          onBack={() => setScreen('player-type')}
          loading={loading}
        />
      )}
      {screen === 'guest-payment' && (pendingGuest || pendingMember) && (
        <GuestPaymentScreen
          guestName={pendingMember
            ? `${pendingMember.firstName} ${pendingMember.lastName}`
            : `${pendingGuest!.firstName} ${pendingGuest!.lastName}`}
          onConfirm={pendingMember
            ? () => handleMemberWalkInComplete()
            : () => handleGuestComplete(pendingGuest!)}
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
