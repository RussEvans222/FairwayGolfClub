import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NormalizedTelemetryShot, RawTelemetryShot, SessionTelemetryState, TelemetryConnectionState } from '../types'
import { normalizeTelemetryShot } from '../telemetry/normalize'

interface TelemetryBridgeEnvelope {
  kind: 'shot' | 'status'
  payload: RawTelemetryShot | { connectionState: TelemetryConnectionState }
}

interface Options {
  onShot?: (shot: NormalizedTelemetryShot) => void | Promise<void>
}

const BROADCAST_CHANNEL = 'fairway-telemetry'

export function useTelemetrySession({ onShot }: Options = {}) {
  const [state, setState] = useState<SessionTelemetryState>({
    connectionState: 'waiting',
    lastUpdatedAt: null,
    shots: [],
  })

  const ingestShot = useCallback(async (raw: RawTelemetryShot) => {
    const shot = normalizeTelemetryShot(raw)
    setState(prev => ({
      connectionState: 'connected',
      lastUpdatedAt: shot.capturedAt,
      shots: [...prev.shots, shot],
    }))
    await onShot?.(shot)
  }, [onShot])

  const updateStatus = useCallback((connectionState: TelemetryConnectionState) => {
    setState(prev => ({
      ...prev,
      connectionState,
    }))
  }, [])

  useEffect(() => {
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(BROADCAST_CHANNEL) : null

    function handleEnvelope(envelope: TelemetryBridgeEnvelope) {
      if (envelope.kind === 'shot') {
        void ingestShot(envelope.payload as RawTelemetryShot)
        return
      }
      updateStatus((envelope.payload as { connectionState: TelemetryConnectionState }).connectionState)
    }

    function handleMessage(event: MessageEvent) {
      const data = event.data as TelemetryBridgeEnvelope | undefined
      if (!data || typeof data !== 'object' || !('kind' in data)) return
      handleEnvelope(data)
    }

    window.addEventListener('message', handleMessage)
    channel?.addEventListener('message', event => {
      const data = event.data as TelemetryBridgeEnvelope | undefined
      if (!data || typeof data !== 'object' || !('kind' in data)) return
      handleEnvelope(data)
    })

    setState(prev => ({ ...prev, connectionState: prev.connectionState === 'waiting' ? 'listening' : prev.connectionState }))

    return () => {
      window.removeEventListener('message', handleMessage)
      channel?.close()
    }
  }, [ingestShot, updateStatus])

  const clearShots = useCallback(() => {
    setState({
      connectionState: 'listening',
      lastUpdatedAt: null,
      shots: [],
    })
  }, [])

  const latestShot = useMemo(() => state.shots[state.shots.length - 1] ?? null, [state.shots])

  return {
    telemetry: state,
    latestShot,
    clearShots,
    ingestShot,
    setConnectionState: updateStatus,
  }
}
