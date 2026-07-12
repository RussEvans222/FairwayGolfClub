import { useState, useEffect, useCallback, useRef } from 'react'
import { useSalesforce, saveAuth, clearAuth } from './hooks/useSalesforce'
import { LoginScreen } from './screens/LoginScreen'
import { BaySelectScreen } from './screens/BaySelectScreen'
import { IdleScreen } from './screens/IdleScreen'
import { SessionWorkspaceScreen } from './screens/SessionWorkspaceScreen'
import { useTelemetrySession } from './hooks/useTelemetrySession'
import type {
  Bay,
  BayOverviewCard,
  PlayerSession,
  Shot,
  ClubAverage,
  Screen,
  GolferLifetimeSummary,
  NormalizedTelemetryShot,
} from './types'

const BAY_ORDINAL_WORDS: Record<string, string> = {
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
}

type CarryShot = { Club__c: string | null; Carry_Distance__c: number | null }

function aggregateClubAverages(shots: CarryShot[]): ClubAverage[] {
  const clubMap = new Map<string, { carries: number[]; max: number }>()
  for (const s of shots) {
    if (!s.Club__c || s.Carry_Distance__c == null) continue
    const entry = clubMap.get(s.Club__c) ?? { carries: [], max: 0 }
    entry.carries.push(s.Carry_Distance__c)
    entry.max = Math.max(entry.max, s.Carry_Distance__c)
    clubMap.set(s.Club__c, entry)
  }
  return Array.from(clubMap.entries())
    .map(([club, { carries, max }]) => ({
      club,
      avgCarry: Math.round(carries.reduce((a, b) => a + b, 0) / carries.length),
      shotCount: carries.length,
      maxCarry: max,
    }))
    .sort((a, b) => b.avgCarry - a.avgCarry)
}

function bestCarryOf(shots: CarryShot[]): { bestCarry: number | null; bestCarryClub: string | null } {
  const bestCarry = shots.reduce<number | null>((best, s) => {
    if (s.Carry_Distance__c == null) return best
    return best == null ? s.Carry_Distance__c : Math.max(best, s.Carry_Distance__c)
  }, null)
  const bestCarryClub = shots.find(s => s.Carry_Distance__c === bestCarry)?.Club__c ?? null
  return { bestCarry, bestCarryClub }
}

function getBayOrdinal(value: string): string | null {
  const digitMatch = value.match(/\d+/)
  if (digitMatch) return digitMatch[0]

  const lower = value.toLowerCase()
  for (const [digit, word] of Object.entries(BAY_ORDINAL_WORDS)) {
    if (lower.includes(word)) return digit
  }

  return null
}

function matchesBayResource(resourceName: string, bayOrdinal: string | null): boolean {
  if (!bayOrdinal) return false
  const lower = resourceName.toLowerCase()
  const word = BAY_ORDINAL_WORDS[bayOrdinal]
  return (
    lower.includes(`bay ${bayOrdinal}`) ||
    lower.includes(`bay number ${bayOrdinal}`) ||
    lower.includes(`bay ${word}`) ||
    lower.includes(`bay number ${word}`) ||
    lower.includes(word) ||
    lower.includes(bayOrdinal)
  )
}

const SF_LOGIN_URL = import.meta.env.VITE_SF_LOGIN_URL as string || 'https://login.salesforce.com'
const SF_CLIENT_ID = import.meta.env.VITE_SF_CLIENT_ID as string

const POLL_INTERVAL_MS = 20_000

export default function App() {
  const { auth, refreshAuth, query, create } = useSalesforce()
  const [authError, setAuthError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('login')
  const [bayOverview, setBayOverview] = useState<BayOverviewCard[]>([])
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null)
  const [players, setPlayers] = useState<PlayerSession[]>([])
  const [activePlayerIndex, setActivePlayerIndex] = useState(0)
  const [sessionActive, setSessionActive] = useState(false)
  const [workspaceStarted, setWorkspaceStarted] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previousPlayerCount = useRef(0)

  const handleTelemetryShot = useCallback(async (shot: NormalizedTelemetryShot) => {
    if (!activeSessionId) return
    const activePlayer = players[activePlayerIndex] ?? players[players.length - 1] ?? null
    if (!activePlayer?.participantId) return

    try {
      await create('Golf_Shot__c', {
        Golf_Session__c: activeSessionId,
        Session_Participant__c: activePlayer.participantId,
        Shot_Number__c: shot.shotNumber || activePlayer.shotCount + 1,
        Timestamp__c: shot.capturedAt,
        Data_Tier__c: shot.dataTier,
        Club__c: shot.club ?? undefined,
        Ball_Speed__c: shot.ballSpeed ?? undefined,
        Carry_Distance__c: shot.carry ?? undefined,
        Total_Distance__c: shot.total ?? undefined,
        Launch_Angle__c: shot.launchAngle ?? undefined,
        Spin_Rate__c: shot.spinRate ?? undefined,
        Shot_Shape__c: shot.shotShape ?? undefined,
        Club_Speed__c: shot.clubSpeed ?? undefined,
        Raw_Payload_JSON__c: JSON.stringify(shot.raw),
      })
    } catch (e) {
      console.error('Failed to forward telemetry shot to Salesforce', e)
    }
  }, [activeSessionId, players, activePlayerIndex, create])

  const { telemetry, clearShots } = useTelemetrySession({ onShot: handleTelemetryShot })

  // ── OAuth callback handler ────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const instanceUrl = params.get('instance_url')
    const oauthError = params.get('error_description')
    window.history.replaceState(null, '', window.location.pathname)
    if (oauthError) { setAuthError(decodeURIComponent(oauthError)); return }
    if (accessToken && instanceUrl) {
      saveAuth({ accessToken, instanceUrl: decodeURIComponent(instanceUrl) })
      refreshAuth()
    }
  }, [refreshAuth])

  // ── Move to bay-select once authenticated ─────────────────────────────
  useEffect(() => {
    if (auth && screen === 'login') setScreen('bay-select')
  }, [auth, screen])

  // ── Handle session expired → clear + redirect ─────────────────────────
  const handleSessionExpired = useCallback(() => {
    clearAuth()
    refreshAuth()
    setScreen('login')
  }, [refreshAuth])

  function triggerOAuth() {
    const params = new URLSearchParams({
      response_type: 'token',
      client_id: SF_CLIENT_ID,
      redirect_uri: window.location.origin + window.location.pathname,
    })
    window.location.href = `${SF_LOGIN_URL}/services/oauth2/authorize?${params}`
  }

  function minutesRemainingUntil(endTime: string | null): number | null {
    if (!endTime) return null
    const remaining = new Date(endTime).getTime() - Date.now()
    return Number.isFinite(remaining) ? Math.max(0, Math.ceil(remaining / 60_000)) : null
  }

  // ── Load bay overview (bay metadata + live occupancy) ────────────────
  const loadBayOverview = useCallback(async () => {
    try {
      type BayRow = { Id: string; Name: string; Bay_Number__c: string }
      const simBays = await query<BayRow>(
        `SELECT Id, Name, Bay_Number__c FROM Simulator_Bay__c ORDER BY Bay_Number__c ASC`
      )
      type ResRow = { Id: string; Name: string }
      const resources = await query<ResRow>(
        `SELECT Id, Name FROM ServiceResource WHERE IsActive = true ORDER BY Name ASC`
      )
      const mapped: Bay[] = simBays.map((b) => {
        const bayOrdinal = getBayOrdinal(b.Bay_Number__c) ?? getBayOrdinal(b.Name)
        const res = resources.find(r => matchesBayResource(r.Name, bayOrdinal))
        return { id: b.Id, name: b.Name, bayNumber: b.Bay_Number__c, resourceId: res?.Id ?? '' }
      })

      const resourceIds = mapped.map(bay => bay.resourceId).filter((resourceId): resourceId is string => Boolean(resourceId))
      const bayIds = mapped.map(bay => bay.id)

      type AssignedResourceRow = { ServiceAppointmentId: string; ServiceResourceId: string }
      const assignments = resourceIds.length ? await query<AssignedResourceRow>(
        `SELECT ServiceAppointmentId, ServiceResourceId
         FROM AssignedResource
         WHERE ServiceResourceId IN ('${resourceIds.join("','")}')`
      ) : []

      const appointmentIds = assignments.map(row => row.ServiceAppointmentId)

      type AppointmentRow = { Id: string; SchedEndTime: string | null }
      const activeAppointments = appointmentIds.length ? await query<AppointmentRow>(
        `SELECT Id, SchedEndTime
         FROM ServiceAppointment
         WHERE Status IN ('Dispatched','In Progress')
           AND Id IN ('${appointmentIds.join("','")}')`
      ) : []

      type SessionRow = { Id: string; Bay__c: string | null }
      const sessions = bayIds.length ? await query<SessionRow>(
        `SELECT Id, Bay__c
         FROM Golf_Session__c
         WHERE Bay__c IN ('${bayIds.join("','")}')
           AND Status__c = 'In Progress'
         ORDER BY Session_Start__c DESC`
      ) : []

      const bayToSessionId = new Map<string, string>()
      for (const session of sessions) {
        if (session.Bay__c && !bayToSessionId.has(session.Bay__c)) {
          bayToSessionId.set(session.Bay__c, session.Id)
        }
      }

      const sessionIds = Array.from(new Set(Array.from(bayToSessionId.values())))

      type ParticipantRow = { Golf_Session__c: string }
      const participants = sessionIds.length ? await query<ParticipantRow>(
        `SELECT Golf_Session__c
         FROM Session_Participant__c
         WHERE Golf_Session__c IN ('${sessionIds.join("','")}')`
      ) : []

      type ShotRow = { Golf_Session__c: string; Carry_Distance__c: number | null }
      const shots = sessionIds.length ? await query<ShotRow>(
        `SELECT Golf_Session__c, Carry_Distance__c
         FROM Golf_Shot__c
         WHERE Golf_Session__c IN ('${sessionIds.join("','")}')`
      ) : []

      const participantCounts = new Map<string, number>()
      for (const participant of participants) {
        participantCounts.set(participant.Golf_Session__c, (participantCounts.get(participant.Golf_Session__c) ?? 0) + 1)
      }

      const bestCarries = new Map<string, number>()
      for (const shot of shots) {
        if (shot.Carry_Distance__c == null) continue
        const current = bestCarries.get(shot.Golf_Session__c)
        bestCarries.set(shot.Golf_Session__c, current == null ? shot.Carry_Distance__c : Math.max(current, shot.Carry_Distance__c))
      }

      const appointmentByResource = new Map<string, AppointmentRow>()
      for (const assignment of assignments) {
        const appointment = activeAppointments.find(row => row.Id === assignment.ServiceAppointmentId)
        if (appointment) {
          appointmentByResource.set(assignment.ServiceResourceId, appointment)
        }
      }

      const overview = mapped.map<BayOverviewCard>((bay) => {
        const appointment = bay.resourceId ? appointmentByResource.get(bay.resourceId) ?? null : null
        const sessionId = bayToSessionId.get(bay.id) ?? null
        const participantCount = sessionId ? (participantCounts.get(sessionId) ?? 0) : (appointment ? 1 : 0)
        const bestCarry = sessionId ? (bestCarries.get(sessionId) ?? null) : null
        const isOccupied = Boolean(appointment || sessionId)

        return {
          bay,
          isOccupied,
          participantCount,
          minutesRemaining: minutesRemainingUntil(appointment?.SchedEndTime ?? null),
          bestCarry,
          statusLabel: isOccupied
            ? participantCount > 1
              ? `${participantCount} players in use`
              : 'Session in use'
            : 'Available',
        }
      })

      setBayOverview(overview)
    } catch (e) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') handleSessionExpired()
    }
  }, [query, handleSessionExpired])

  useEffect(() => {
    if (screen !== 'bay-select') return
    loadBayOverview()
    const interval = setInterval(loadBayOverview, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [screen, loadBayOverview])

  // ── Poll: load active session + last recap for selected bay ───────────
  const pollBay = useCallback(async (bay: Bay) => {
    try {
      // 1. Find active ServiceAppointment on this bay
      type ApptRow = {
        Id: string
        Status: string
        ContactId: string | null
        Contact: { FirstName: string; LastName: string } | null
        SchedEndTime: string | null
      }
      const appts = await query<ApptRow>(
        `SELECT Id, Status, ContactId, Contact.FirstName, Contact.LastName, SchedEndTime
         FROM ServiceAppointment
         WHERE Status IN ('Dispatched','In Progress')
           AND Id IN (SELECT ServiceAppointmentId FROM AssignedResource WHERE ServiceResourceId = '${bay.resourceId}')
         ORDER BY SchedStartTime DESC LIMIT 1`
      )

      if (!appts.length) {
        // No active session — load last completed session recap
        setSessionActive(false)
        setActiveSessionId(null)
        setPlayers([])
        return
      }

      setSessionActive(true)
      const appt = appts[0]

      // 2. Find all Golf_Session__c records for today on this bay (active or recent)
      const today = new Date().toISOString().slice(0, 10)
      type SessRow = { Id: string; Status__c: string; Session_Start__c: string }
      const sessions = await query<SessRow>(
        `SELECT Id, Status__c, Session_Start__c
         FROM Golf_Session__c
         WHERE Bay__c = '${bay.id}'
           AND Session_Start__c >= ${today}T00:00:00Z
           AND Status__c IN ('In Progress','Completed')
         ORDER BY Session_Start__c DESC LIMIT 1`
      )

      // 3. Load participants for this session (or fall back to appointment contact)
      let builtPlayers: PlayerSession[] = []

      if (sessions.length) {
        const sessId = sessions[0].Id
        setActiveSessionId(sessId)
        type PartRow = {
          Id: string
          Golfer_Profile__c: string
          Display_Name__c: string
          Guest_Flag__c: boolean
          Simulator_Player_Slot__c: number
        }
        const participants = await query<PartRow>(
          `SELECT Id, Golfer_Profile__c, Display_Name__c, Guest_Flag__c, Simulator_Player_Slot__c
           FROM Session_Participant__c
           WHERE Golf_Session__c = '${sessId}'
           ORDER BY Simulator_Player_Slot__c ASC`
        )

        builtPlayers = await Promise.all(
          participants.map(async (p) => buildPlayerStats(p.Id, p.Golfer_Profile__c, p.Display_Name__c, p.Guest_Flag__c, p.Simulator_Player_Slot__c, sessId))
        )
      } else {
        // Session not in Golf_Session__c yet — show name from appointment only
        const name = appt.Contact
          ? `${appt.Contact.FirstName ?? ''} ${appt.Contact.LastName ?? ''}`.trim()
          : 'Guest'
        builtPlayers = [{
          participantId: appt.Id,
          profileId: '',
          displayName: name,
          isGuest: !appt.ContactId,
          slotNumber: 1,
          shotCount: 0,
          lastShot: null,
          clubAverages: [],
          bestCarry: null,
          lifetimeSummary: null,
        }]
      }

      const playerCountIncreased = builtPlayers.length > previousPlayerCount.current
      previousPlayerCount.current = builtPlayers.length

      setPlayers(builtPlayers)
      setActivePlayerIndex(prev => {
        if (builtPlayers.length === 0) return 0
        if (playerCountIncreased) {
          return builtPlayers.length - 1
        }
        return Math.min(prev, builtPlayers.length - 1)
      })

    } catch (e) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') handleSessionExpired()
    }
  }, [query, handleSessionExpired])  // eslint-disable-line react-hooks/exhaustive-deps

  async function buildPlayerStats(
    participantId: string,
    profileId: string,
    displayName: string,
    isGuest: boolean,
    slotNumber: number,
    sessionId: string,
  ): Promise<PlayerSession> {
    type ShotRow = {
      Id: string
      Shot_Number__c: number
      Club__c: string
      Ball_Speed__c: number | null
      Carry_Distance__c: number | null
      Total_Distance__c: number | null
      Launch_Angle__c: number | null
      Spin_Rate__c: number | null
      Shot_Shape__c: string | null
    }
    const shots = await query<ShotRow>(
      `SELECT Id, Shot_Number__c, Club__c, Ball_Speed__c, Carry_Distance__c, Total_Distance__c,
              Launch_Angle__c, Spin_Rate__c, Shot_Shape__c
       FROM Golf_Shot__c
       WHERE Session_Participant__c = '${participantId}'
         AND Golf_Session__c = '${sessionId}'
       ORDER BY Shot_Number__c ASC`
    )

    const lastShot: Shot | null = shots.length ? {
      id: shots[shots.length - 1].Id,
      club: shots[shots.length - 1].Club__c,
      ballSpeed: shots[shots.length - 1].Ball_Speed__c,
      carry: shots[shots.length - 1].Carry_Distance__c,
      total: shots[shots.length - 1].Total_Distance__c,
      launchAngle: shots[shots.length - 1].Launch_Angle__c,
      spinRate: shots[shots.length - 1].Spin_Rate__c,
      shotShape: shots[shots.length - 1].Shot_Shape__c,
      shotNumber: shots[shots.length - 1].Shot_Number__c,
    } : null

    const clubAverages = aggregateClubAverages(shots)
    const { bestCarry } = bestCarryOf(shots)
    const lifetimeSummary = profileId ? await loadLifetimeSummary(profileId) : null

    return {
      participantId, profileId, displayName, isGuest, slotNumber,
      shotCount: shots.length, lastShot, clubAverages, bestCarry, lifetimeSummary,
    }
  }

  async function loadLifetimeSummary(profileId: string): Promise<GolferLifetimeSummary | null> {
    try {
      type ProfileRow = {
        Lifetime_Sessions__c: number | null
        Lifetime_Shots__c: number | null
        Avg_Handicap_Trend__c: number | null
        Average_Driver_Carry__c: number | null
        Average_7_Iron_Carry__c: number | null
        Favorite_Club__c: string | null
        Current_Focus__c: string | null
        Most_Played_Course__c: string | null
        Last_Session_Date__c: string | null
      }
      const profiles = await query<ProfileRow>(
        `SELECT Lifetime_Sessions__c, Lifetime_Shots__c, Avg_Handicap_Trend__c,
                Average_Driver_Carry__c, Average_7_Iron_Carry__c, Favorite_Club__c,
                Current_Focus__c, Most_Played_Course__c, Last_Session_Date__c
         FROM Golfer_Profile__c
         WHERE Id = '${profileId}'
         LIMIT 1`
      )
      if (!profiles.length) return null
      const profile = profiles[0]
      const summary: GolferLifetimeSummary = {
        lifetimeSessions: profile.Lifetime_Sessions__c,
        lifetimeShots: profile.Lifetime_Shots__c,
        avgHandicapTrend: profile.Avg_Handicap_Trend__c,
        averageDriverCarry: profile.Average_Driver_Carry__c,
        average7IronCarry: profile.Average_7_Iron_Carry__c,
        favoriteClub: profile.Favorite_Club__c,
        currentFocus: profile.Current_Focus__c,
        mostPlayedCourse: profile.Most_Played_Course__c,
        lastSessionDate: profile.Last_Session_Date__c,
      }

      if (
        summary.lifetimeSessions != null ||
        summary.lifetimeShots != null ||
        summary.avgHandicapTrend != null ||
        summary.averageDriverCarry != null ||
        summary.average7IronCarry != null ||
        summary.favoriteClub != null ||
        summary.currentFocus != null ||
        summary.mostPlayedCourse != null ||
        summary.lastSessionDate != null
      ) {
        return summary
      }

      type SessionRow = {
        Id: string
        Session_End__c: string | null
        Course_Played__c: string | null
      }
      const sessions = await query<SessionRow>(
        `SELECT Id, Session_End__c, Course_Played__c
         FROM Golf_Session__c
         WHERE Id IN (SELECT Golf_Session__c FROM Session_Participant__c WHERE Golfer_Profile__c = '${profileId}')
           AND Status__c = 'Completed'
         ORDER BY Session_End__c DESC`
      )

      type ShotRow = {
        Club__c: string | null
        Carry_Distance__c: number | null
      }
      const shots = await query<ShotRow>(
        `SELECT Club__c, Carry_Distance__c
         FROM Golf_Shot__c
         WHERE Session_Participant__r.Golfer_Profile__c = '${profileId}'`
      )

      const clubCounts = new Map<string, { carryTotal: number; carryCount: number; shotCount: number }>()
      const courseCounts = new Map<string, number>()
      let driverCarryTotal = 0
      let driverCarryCount = 0
      let sevenCarryTotal = 0
      let sevenCarryCount = 0

      for (const shot of shots) {
        if (shot.Club__c) {
          const existing = clubCounts.get(shot.Club__c) ?? { carryTotal: 0, carryCount: 0, shotCount: 0 }
          existing.shotCount += 1
          if (shot.Carry_Distance__c != null) {
            existing.carryTotal += shot.Carry_Distance__c
            existing.carryCount += 1
          }
          clubCounts.set(shot.Club__c, existing)

          if (shot.Club__c === 'Driver' && shot.Carry_Distance__c != null) {
            driverCarryTotal += shot.Carry_Distance__c
            driverCarryCount += 1
          }
          if (shot.Club__c === '7-Iron' && shot.Carry_Distance__c != null) {
            sevenCarryTotal += shot.Carry_Distance__c
            sevenCarryCount += 1
          }
        }
      }

      for (const session of sessions) {
        if (!session.Course_Played__c) continue
        courseCounts.set(session.Course_Played__c, (courseCounts.get(session.Course_Played__c) ?? 0) + 1)
      }

      const mostPlayedClub = Array.from(clubCounts.entries())
        .sort((a, b) => b[1].shotCount - a[1].shotCount)[0]?.[0] ?? null
      const mostPlayedCourse = Array.from(courseCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      const lastSessionDate = sessions[0]?.Session_End__c ?? null

      return {
        lifetimeSessions: sessions.length || null,
        lifetimeShots: shots.length || null,
        avgHandicapTrend: summary.avgHandicapTrend,
        averageDriverCarry: summary.averageDriverCarry ?? (driverCarryCount ? Math.round(driverCarryTotal / driverCarryCount) : null),
        average7IronCarry: summary.average7IronCarry ?? (sevenCarryCount ? Math.round(sevenCarryTotal / sevenCarryCount) : null),
        favoriteClub: summary.favoriteClub ?? mostPlayedClub,
        currentFocus: summary.currentFocus,
        mostPlayedCourse: summary.mostPlayedCourse ?? mostPlayedCourse,
        lastSessionDate: summary.lastSessionDate ?? lastSessionDate,
      }
    } catch {
      return null // profile stats are nice-to-have — never block the live session on them
    }
  }

  // ── Start/stop polling when bay is selected ───────────────────────────
  useEffect(() => {
    if (!selectedBay || screen !== 'idle' && screen !== 'workspace') return
    pollBay(selectedBay)
    pollRef.current = setInterval(() => pollBay(selectedBay), POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedBay, screen, pollBay])

  // ── Switch idle ↔ workspace based on session state ───────────────────
  useEffect(() => {
    if (screen !== 'idle' && screen !== 'workspace') return
    setScreen(sessionActive || workspaceStarted ? 'workspace' : 'idle')
  }, [sessionActive, workspaceStarted, screen])

  function selectBay(bay: Bay) {
    setSelectedBay(bay)
    setPlayers([])
    setSessionActive(false)
    setWorkspaceStarted(false)
    setActiveSessionId(null)
    setActivePlayerIndex(0)
    previousPlayerCount.current = 0
    clearShots()
    setScreen('idle')
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (!auth || screen === 'login') {
    return <LoginScreen onLogin={triggerOAuth} error={authError} />
  }

  if (screen === 'bay-select') {
    return <BaySelectScreen bayCards={bayOverview} onSelect={selectBay} />
  }

  if (screen === 'idle') {
    return (
      <IdleScreen
        bay={selectedBay!}
        onStartPlaying={() => {
          setWorkspaceStarted(true)
          setScreen('workspace')
        }}
        onChangeBay={() => setScreen('bay-select')}
      />
    )
  }

  return (
    <SessionWorkspaceScreen
      bay={selectedBay!}
      players={players}
      activeIndex={activePlayerIndex}
      telemetry={telemetry}
      onChangeIndex={setActivePlayerIndex}
      onChangeBay={() => setScreen('bay-select')}
      onStartPlaying={() => setWorkspaceStarted(true)}
    />
  )
}
