import type { NormalizedTelemetryShot, RawTelemetryShot } from '../types'

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeTelemetryShot(raw: RawTelemetryShot): NormalizedTelemetryShot {
  const hasClubData = toNumber(raw.clubSpeed) != null

  return {
    source: raw.source,
    shotNumber: toNumber(raw.shotNumber) ?? 0,
    capturedAt: raw.timestamp ?? new Date().toISOString(),
    club: raw.club ?? null,
    ballSpeed: toNumber(raw.ballSpeed),
    carry: toNumber(raw.carry),
    total: toNumber(raw.total),
    launchAngle: toNumber(raw.launchAngle),
    spinRate: toNumber(raw.spinRate),
    clubSpeed: toNumber(raw.clubSpeed),
    shotShape: raw.shotShape ?? null,
    dataTier: hasClubData ? 'Ball + Club' : 'Ball Only',
    raw,
  }
}
