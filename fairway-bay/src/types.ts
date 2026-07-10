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

export type Screen = 'login' | 'bay-select' | 'idle' | 'active'

export interface ExtendResult {
  success: boolean
  minutesApplied: number
  bayReassigned: boolean
  reassignedBayName: string | null
  message: string
}
