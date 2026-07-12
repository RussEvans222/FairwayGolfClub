export interface Bay {
  id: string          // Simulator_Bay__c Id
  name: string        // "Bay Number One"
  bayNumber: string   // "BAY-1"
  resourceId: string  // ServiceResource Id
}

export interface PlayerSession {
  participantId: string
  profileId: string
  displayName: string
  isGuest: boolean
  slotNumber: number
  // Running session stats (from Golf_Shot__c)
  shotCount: number
  lastShot: Shot | null
  clubAverages: ClubAverage[]
  bestCarry: number | null
  // Lifetime rollups sourced from Golfer_Profile__c.
  lifetimeSummary: GolferLifetimeSummary | null
}

export interface Shot {
  id: string
  club: string
  ballSpeed: number | null
  carry: number | null
  total: number | null
  launchAngle: number | null
  spinRate: number | null
  shotShape: string | null
  shotNumber: number
}

export interface ClubAverage {
  club: string
  avgCarry: number
  shotCount: number
  maxCarry: number
}

export interface LastSessionRecap {
  playerName: string
  sessionDate: string   // ISO
  totalShots: number
  topClubs: ClubAverage[]
  bestCarry: number | null
  bestCarryClub: string | null
}

export interface GolferLifetimeSummary {
  lifetimeSessions: number | null
  lifetimeShots: number | null
  avgHandicapTrend: number | null
  averageDriverCarry: number | null
  average7IronCarry: number | null
  favoriteClub: string | null
  currentFocus: string | null
  mostPlayedCourse: string | null
  lastSessionDate: string | null
}

export type Screen = 'login' | 'bay-select' | 'idle' | 'workspace'

export interface ExtendResult {
  success: boolean
  minutesApplied: number
  bayReassigned: boolean
  reassignedBayName: string | null
  message: string
}

export type TelemetryConnectionState = 'waiting' | 'listening' | 'connected' | 'error'

export interface RawTelemetryShot {
  source: string
  shotNumber?: number | null
  timestamp?: string | null
  club?: string | null
  ballSpeed?: number | string | null
  carry?: number | string | null
  total?: number | string | null
  launchAngle?: number | string | null
  spinRate?: number | string | null
  clubSpeed?: number | string | null
  shotShape?: string | null
}

export interface NormalizedTelemetryShot {
  source: string
  shotNumber: number
  capturedAt: string
  club: string | null
  ballSpeed: number | null
  carry: number | null
  total: number | null
  launchAngle: number | null
  spinRate: number | null
  clubSpeed: number | null
  shotShape: string | null
  dataTier: 'Ball Only' | 'Ball + Club'
  raw: RawTelemetryShot
}

export interface SessionTelemetryState {
  connectionState: TelemetryConnectionState
  lastUpdatedAt: string | null
  shots: NormalizedTelemetryShot[]
}
