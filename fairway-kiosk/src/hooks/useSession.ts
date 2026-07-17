import { useState } from 'react'
import type { PlayerSlot, SessionType } from '../types'

export interface SessionState {
  sessionId: string | null
  bayId: string | null
  bayName: string | null
  sessionType: SessionType
  players: PlayerSlot[]
  startTime: Date | null
}

const DEFAULT_STATE: SessionState = {
  sessionId: null,
  bayId: null,
  bayName: null,
  sessionType: 'Practice',
  players: [],
  startTime: null,
}

export function useSession() {
  const [session, setSession] = useState<SessionState>(DEFAULT_STATE)

  function setBay(id: string, name: string) {
    setSession(s => ({ ...s, bayId: id, bayName: name }))
  }

  function setSessionType(type: SessionType) {
    setSession(s => ({ ...s, sessionType: type }))
  }

  function setSessionId(id: string) {
    setSession(s => ({ ...s, sessionId: id, startTime: new Date() }))
  }

  function addPlayer(player: PlayerSlot) {
    setSession(s => ({ ...s, players: [...s.players, player] }))
  }

  function reset() {
    setSession(DEFAULT_STATE)
  }

  return { session, setBay, setSessionType, setSessionId, addPlayer, reset }
}
