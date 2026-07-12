import { useMemo } from 'react'
import type { LiveSession } from '../types'

interface BaySummary {
  bayId: string
  bayName: string
}

interface Props {
  sessions: LiveSession[]
  bays: BaySummary[]
  onStart: () => void
  onSelectSession: (session: LiveSession) => void
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function formatMinutesLeft(endTime: string) {
  const remaining = new Date(endTime).getTime() - Date.now()
  if (remaining <= 0) return 'Ending'
  const minutes = Math.max(1, Math.ceil(remaining / 60_000))
  return `${minutes} min left`
}

function PeopleIcons({ count }: { count: number }) {
  const visible = Math.min(count, 4)
  const extra = count - visible

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: visible }).map((_, index) => (
        <div
          key={index}
          className="flex h-9 w-9 items-center justify-center rounded-full border text-sm"
          style={{
            borderColor: 'rgba(255,255,255,0.16)',
            background: 'rgba(255,255,255,0.08)',
          }}
        >
          👤
        </div>
      ))}
      {extra > 0 ? (
        <div
          className="flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-semibold"
          style={{
            borderColor: 'rgba(201,168,76,0.45)',
            background: 'rgba(201,168,76,0.12)',
            color: 'var(--gold-light)',
          }}
        >
          +{extra}
        </div>
      ) : null}
    </div>
  )
}

function BayCard({
  bayName,
  session,
  onOccupiedSelect,
  onOpenBay,
}: {
  bayName: string
  session: LiveSession | null
  onOccupiedSelect: (session: LiveSession) => void
  onOpenBay: () => void
}) {
  const occupied = !!session

  return (
    <button
      type="button"
      onClick={occupied ? () => onOccupiedSelect(session) : onOpenBay}
      className="flex min-h-[220px] flex-col justify-between rounded-[1.75rem] border p-5 text-left transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
      style={{
        background: occupied
          ? 'linear-gradient(180deg, rgba(31,31,31,0.98), rgba(16,16,16,0.98))'
          : 'linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,11,0.98))',
        borderColor: occupied ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.10)',
        boxShadow: occupied ? '0 18px 40px rgba(201,168,76,0.10)' : '0 14px 34px rgba(0,0,0,0.35)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/35">Bay</div>
          <div className="mt-2 text-3xl font-black tracking-tight text-white">{bayName}</div>
        </div>
        <div
          className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]"
          style={{
            borderColor: occupied ? 'rgba(201,168,76,0.35)' : 'rgba(76,201,115,0.30)',
            background: occupied ? 'rgba(201,168,76,0.12)' : 'rgba(76,201,115,0.12)',
            color: occupied ? 'var(--gold-light)' : '#8AF0A0',
          }}
        >
          {occupied ? 'In Use' : 'Available'}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/35">Players</div>
            <div className="mt-2">
              {occupied ? <PeopleIcons count={Math.max(session.participantCount, 1)} /> : <div className="text-2xl font-bold text-white/15">Open</div>}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.3em] text-white/35">Time</div>
            <div className="mt-2 text-xl font-bold text-white">
              {occupied ? formatMinutesLeft(session.endTime) : '—'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-white/35">Current farthest shot</div>
          <div className="mt-2 text-2xl font-black text-white">
            {occupied ? (session.bestCarry == null ? 'No shot yet' : `${session.bestCarry} yd`) : '—'}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-white/45">
            {occupied ? 'Tap to join this party.' : 'Tap check-in to start a new session.'}
          </div>
          <div
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: occupied ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
              color: occupied ? '#111' : '#fff',
            }}
          >
            {occupied ? 'Join Party' : 'Open Bay'}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function WelcomeScreen({ sessions, bays, onStart, onSelectSession }: Props) {
  const bayCards = useMemo(() => {
    return bays.map(bay => {
      const session = sessions.find(item => normalizeName(item.bayName) === normalizeName(bay.bayName)) ?? null
      return { ...bay, session }
    })
  }, [bays, sessions])

  const occupiedCount = bayCards.filter(card => card.session).length
  const availableCount = bayCards.length - occupiedCount
  const currentBestCarry = bayCards.reduce<number | null>((best, card) => {
    const carry = card.session?.bestCarry
    if (carry == null) return best
    return best == null ? carry : Math.max(best, carry)
  }, null)

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden bg-[var(--dark)] p-5 md:p-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(17,17,17,0.98),rgba(10,10,10,0.98))] p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <img src="/images/logo-text.png" alt="Fairway Golf Club" className="hg-logo-white h-20 w-auto md:h-24" />
            <div className="mt-3 text-xs uppercase tracking-[0.42em] text-white/40">Welcome screen</div>
            <div className="mt-2 max-w-3xl text-2xl font-black tracking-tight text-white md:text-4xl">
              Tap an occupied bay to join the party. Use check-in to start a new session.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <StatCard label="In use" value={`${occupiedCount}`} tone="occupied" />
            <StatCard label="Available" value={`${availableCount}`} tone="available" />
            <StatCard label="Longest shot" value={currentBestCarry == null ? '—' : `${currentBestCarry} yd`} tone="accent" />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-h-0 overflow-y-auto rounded-[2rem] border border-white/10 bg-[rgba(17,17,17,0.92)] p-4 md:p-5">
          {bayCards.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-white/45">
              Loading bays…
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {bayCards.map(card => (
                <BayCard
                  key={card.bayId}
                  bayName={card.bayName}
                  session={card.session}
                  onOccupiedSelect={onSelectSession}
                  onOpenBay={onStart}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col gap-4 rounded-[2rem] border border-white/10 bg-[rgba(17,17,17,0.92)] p-5">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-white/35">Privacy first</div>
            <div className="mt-2 text-2xl font-black text-white">No names shown</div>
            <div className="mt-3 text-sm leading-6 text-white/60">
              This overview only shows occupancy, player count, time remaining, and the farthest shot.
              Member identity stays hidden until the party flow opens.
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-white/35">Legend</div>
            <div className="mt-4 space-y-3 text-sm">
              <LegendRow tone="available" label="Available" detail="Bay is open and ready." />
              <LegendRow tone="occupied" label="In use" detail="Tap to join the active party." />
              <LegendRow tone="accent" label="Longest shot" detail="Best carry recorded in the current session." />
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-white/35">New session</div>
            <div className="mt-3 text-sm leading-6 text-white/60">
              Use this when you want to start fresh at an open bay.
            </div>
            <button
              type="button"
              onClick={onStart}
              className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold"
              style={{ background: 'var(--gold)', color: '#111' }}
            >
              Check In / Start Playing
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'available' | 'occupied' | 'accent'
}) {
  const styles: Record<typeof tone, { border: string; background: string; value: string }> = {
    available: {
      border: 'rgba(76,201,115,0.24)',
      background: 'rgba(76,201,115,0.10)',
      value: '#8AF0A0',
    },
    occupied: {
      border: 'rgba(201,168,76,0.28)',
      background: 'rgba(201,168,76,0.10)',
      value: 'var(--gold-light)',
    },
    accent: {
      border: 'rgba(255,255,255,0.14)',
      background: 'rgba(255,255,255,0.05)',
      value: '#fff',
    },
  }

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: styles[tone].border,
        background: styles[tone].background,
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">{label}</div>
      <div className="mt-2 text-2xl font-black" style={{ color: styles[tone].value }}>
        {value}
      </div>
    </div>
  )
}

function LegendRow({
  tone,
  label,
  detail,
}: {
  tone: 'available' | 'occupied' | 'accent'
  label: string
  detail: string
}) {
  const dot =
    tone === 'available'
      ? '#8AF0A0'
      : tone === 'occupied'
        ? 'var(--gold-light)'
        : '#ffffff'

  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 h-3 w-3 rounded-full" style={{ background: dot }} />
      <div>
        <div className="font-semibold text-white">{label}</div>
        <div className="text-white/55">{detail}</div>
      </div>
    </div>
  )
}
