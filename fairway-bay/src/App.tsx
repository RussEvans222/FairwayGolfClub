import { useState, useEffect, useCallback, useRef } from 'react'
import { useSalesforce, saveAuth, clearAuth } from './hooks/useSalesforce'
import { LoginScreen } from './screens/LoginScreen'
import { BaySelectScreen } from './screens/BaySelectScreen'
import { IdleScreen } from './screens/IdleScreen'
import { ActiveScreen } from './screens/ActiveScreen'
import type { Bay, PlayerSession, LastSessionRecap, Shot, ClubAverage, Screen, ExtendResult } from './types'

const EXTEND_PROMPT_THRESHOLD_MIN = 10

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

const SF_LOGIN_URL = import.meta.env.VITE_SF_LOGIN_URL as string || 'https://login.salesforce.com'
const SF_CLIENT_ID = import.meta.env.VITE_SF_CLIENT_ID as string

const POLL_INTERVAL_MS = 20_000

export default function App() {
  const { auth, refreshAuth, query, postApexRest } = useSalesforce()
  const [authError, setAuthError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('login')
  const [bays, setBays] = useState<Bay[]>([])
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null)
  const [players, setPlayers] = useState<PlayerSession[]>([])
  const [activePlayerIndex, setActivePlayerIndex] = useState(0)
  const [lastRecap, setLastRecap] = useState<LastSessionRecap | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null)
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null)
  const [showExtendPrompt, setShowExtendPrompt] = useState(false)
  const [extending, setExtending] = useState(false)
  const [extendMessage, setExtendMessage] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const promptedForAppointment = useRef<string | null>(null)

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

  // ── Load bays (Simulator_Bay__c + matching ServiceResource) ──────────
  const loadBays = useCallback(async () => {
    try {
      type BayRow = { Id: string; Name: string; Bay_Number__c: string }
      const simBays = await query<BayRow>(
        `SELECT Id, Name, Bay_Number__c FROM Simulator_Bay__c ORDER BY Bay_Number__c ASC`
      )
      type ResRow = { Id: string; Name: string }
      const resources = await query<ResRow>(
        `SELECT Id, Name FROM ServiceResource ORDER BY Name ASC`
      )
      const mapped: Bay[] = simBays.map((b) => {
        const res = resources.find(r => r.Name.toLowerCase().includes(b.Bay_Number__c === 'BAY-1' ? 'one' : '2'))
        return { id: b.Id, name: b.Name, bayNumber: b.Bay_Number__c, resourceId: res?.Id ?? '' }
      })
      setBays(mapped)
    } catch (e) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') handleSessionExpired()
    }
  }, [query, handleSessionExpired])

  useEffect(() => {
    if (screen === 'bay-select') loadBays()
  }, [screen, loadBays])

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
        setPlayers([])
        setActiveAppointmentId(null)
        setMinutesRemaining(null)
        setShowExtendPrompt(false)
        promptedForAppointment.current = null
        await loadLastRecap(bay)
        return
      }

      setSessionActive(true)
      const appt = appts[0]
      setActiveAppointmentId(appt.Id)

      if (appt.SchedEndTime) {
        const remaining = Math.round((new Date(appt.SchedEndTime).getTime() - Date.now()) / 60000)
        setMinutesRemaining(remaining)
        if (remaining <= EXTEND_PROMPT_THRESHOLD_MIN && promptedForAppointment.current !== appt.Id) {
          promptedForAppointment.current = appt.Id
          setShowExtendPrompt(true)
        }
      } else {
        setMinutesRemaining(null)
      }

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
          lastSessionRecap: null,
        }]
      }

      // Preserve active player index — only reset if player count decreased
      setPlayers(prev => {
        if (prev.length > 0 && builtPlayers.length > prev.length) {
          // New player added silently — don't change index
        }
        return builtPlayers
      })
      setActivePlayerIndex(prev => Math.min(prev, Math.max(0, builtPlayers.length - 1)))

    } catch (e) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') handleSessionExpired()
    }
  }, [query, handleSessionExpired])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Extend the active session by N minutes (10-minutes-out prompt) ─────
  const handleExtend = useCallback(async (minutes: number) => {
    if (!activeAppointmentId || !auth) return
    setExtending(true)
    setExtendMessage(null)
    try {
      const result = await postApexRest<ExtendResult>('/FairwaySessionExtend/', {
        appointmentId: activeAppointmentId,
        minutes,
      })
      setExtendMessage(result.message)
      if (result.success && selectedBay) {
        await pollBay(selectedBay) // refresh minutesRemaining immediately
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') { handleSessionExpired(); return }
      setExtendMessage("Sorry — couldn't extend right now. Please ask staff for help.")
    } finally {
      setExtending(false)
      setShowExtendPrompt(false)
    }
  }, [activeAppointmentId, auth, postApexRest, selectedBay, pollBay, handleSessionExpired])

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
    const lastSessionRecap = profileId ? await loadPlayerRecap(profileId, displayName) : null

    return {
      participantId, profileId, displayName, isGuest, slotNumber,
      shotCount: shots.length, lastShot, clubAverages, bestCarry, lastSessionRecap,
    }
  }

  // A golfer's own last COMPLETED session, on any bay — used to welcome them
  // back on the active screen before they've hit a shot in today's session.
  async function loadPlayerRecap(profileId: string, displayName: string): Promise<LastSessionRecap | null> {
    try {
      type SessRow = { Id: string; Session_End__c: string; Total_Shots__c: number }
      const sessions = await query<SessRow>(
        `SELECT Id, Session_End__c, Total_Shots__c
         FROM Golf_Session__c
         WHERE Status__c = 'Completed'
           AND Id IN (SELECT Golf_Session__c FROM Session_Participant__c WHERE Golfer_Profile__c = '${profileId}')
         ORDER BY Session_End__c DESC LIMIT 1`
      )
      if (!sessions.length) return null
      const sess = sessions[0]

      type PartRow = { Id: string }
      const parts = await query<PartRow>(
        `SELECT Id FROM Session_Participant__c
         WHERE Golf_Session__c = '${sess.Id}' AND Golfer_Profile__c = '${profileId}' LIMIT 1`
      )
      if (!parts.length) return null

      const shots = await query<CarryShot>(
        `SELECT Club__c, Carry_Distance__c FROM Golf_Shot__c
         WHERE Golf_Session__c = '${sess.Id}' AND Session_Participant__c = '${parts[0].Id}'`
      )

      const topClubs = aggregateClubAverages(shots).slice(0, 5)
      const { bestCarry, bestCarryClub } = bestCarryOf(shots)

      return {
        playerName: displayName,
        sessionDate: sess.Session_End__c,
        totalShots: sess.Total_Shots__c,
        topClubs, bestCarry, bestCarryClub,
      }
    } catch {
      return null // recap is nice-to-have — never block the live session on it
    }
  }

  async function loadLastRecap(bay: Bay) {
    try {
      type SessRow = { Id: string; Session_End__c: string; Total_Shots__c: number }
      const sessions = await query<SessRow>(
        `SELECT Id, Session_End__c, Total_Shots__c
         FROM Golf_Session__c
         WHERE Bay__c = '${bay.id}' AND Status__c = 'Completed'
         ORDER BY Session_End__c DESC LIMIT 1`
      )
      if (!sessions.length) { setLastRecap(null); return }
      const sess = sessions[0]

      type PartRow = { Id: string; Display_Name__c: string; Golfer_Profile__c: string }
      const parts = await query<PartRow>(
        `SELECT Id, Display_Name__c, Golfer_Profile__c
         FROM Session_Participant__c
         WHERE Golf_Session__c = '${sess.Id}'
           AND Is_Primary_Booker__c = true LIMIT 1`
      )
      const playerName = parts[0]?.Display_Name__c ?? 'Unknown'
      const partId = parts[0]?.Id

      if (!partId) { setLastRecap(null); return }

      const shots = await query<CarryShot>(
        `SELECT Club__c, Carry_Distance__c
         FROM Golf_Shot__c
         WHERE Golf_Session__c = '${sess.Id}'
           AND Session_Participant__c = '${partId}'`
      )

      const topClubs = aggregateClubAverages(shots).slice(0, 5)
      const { bestCarry, bestCarryClub } = bestCarryOf(shots)

      setLastRecap({
        playerName,
        sessionDate: sess.Session_End__c,
        totalShots: sess.Total_Shots__c,
        topClubs,
        bestCarry,
        bestCarryClub,
      })
    } catch { /* silent — recap is nice-to-have */ }
  }

  // ── Start/stop polling when bay is selected ───────────────────────────
  useEffect(() => {
    if (!selectedBay || screen !== 'idle' && screen !== 'active') return
    pollBay(selectedBay)
    pollRef.current = setInterval(() => pollBay(selectedBay), POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedBay, screen, pollBay])

  // ── Switch idle ↔ active based on session state ───────────────────────
  useEffect(() => {
    if (screen !== 'idle' && screen !== 'active') return
    setScreen(sessionActive ? 'active' : 'idle')
  }, [sessionActive]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectBay(bay: Bay) {
    setSelectedBay(bay)
    setScreen('idle')
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (!auth || screen === 'login') {
    return <LoginScreen onLogin={triggerOAuth} error={authError} />
  }

  if (screen === 'bay-select') {
    return <BaySelectScreen bays={bays} onSelect={selectBay} />
  }

  if (screen === 'idle') {
    return (
      <IdleScreen
        bay={selectedBay!}
        recap={lastRecap}
        onChangeBay={() => setScreen('bay-select')}
      />
    )
  }

  return (
    <ActiveScreen
      bay={selectedBay!}
      players={players}
      activeIndex={activePlayerIndex}
      onChangeIndex={setActivePlayerIndex}
      onChangeBay={() => setScreen('bay-select')}
      minutesRemaining={minutesRemaining}
      showExtendPrompt={showExtendPrompt}
      extending={extending}
      extendMessage={extendMessage}
      onExtend={handleExtend}
      onDismissExtendPrompt={() => { setShowExtendPrompt(false); setExtendMessage(null) }}
    />
  )
}
