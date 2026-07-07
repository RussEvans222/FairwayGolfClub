export interface SalesforceConfig {
  instanceUrl: string
  accessToken: string
  refreshToken: string
  clientId: string
}

export interface GolferProfile {
  Id: string
  Name: string
  Handicap__c: number | null
  Skill_Segment__c: string
  AI_Coaching_Enabled__c: boolean
  Current_Focus__c: string | null
  Average_7_Iron_Carry__c: number | null
  Average_Driver_Carry__c: number | null
}

export interface Contact {
  Id: string
  FirstName: string
  LastName: string
  Email: string
  Phone: string | null
}

export interface SimulatorBay {
  Id: string
  Name: string
  Bay_Number__c: string
  Status__c: string
  Launch_Monitor_Type__c: string
}

export interface PlayerSlot {
  slot: number
  contact: Contact | null
  profile: GolferProfile | null
  displayName: string
  isGuest: boolean
}

export interface ScheduledPlayer {
  profileId: string | null
  contactId: string | null
  displayName: string | null
  isGuest: boolean
  checkedIn: boolean
  pin?: string | null
}

export interface ScheduledSession {
  reservationId: string
  sessionId: string | null
  bayId: string
  bayName: string
  bayLabel: string
  startTime: string
  endTime: string
  status: string
  players: ScheduledPlayer[]
}

export type Screen =
  | 'welcome'
  | 'scheduled-sessions'
  | 'pin-entry'
  | 'pin-setup'
  | 'bay-direction'
  | 'player-type'
  | 'guest-registration'
  | 'session-active'
  | 'session-summary'

export type SessionType = 'Practice' | 'Round' | 'Game'
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Competitive'
