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
      className="flex min-h-[190px] flex-col justify-between rounded-[1.5rem] border p-4 text-left transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
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

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/35">Players</div>
            <div className="mt-2">
              {occupied ? <PeopleIcons count={Math.max(session.participantCount, 1)} /> : <div className="text-xl font-bold text-white/15">Open</div>}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.3em] text-white/35">Time</div>
            <div className="mt-2 text-lg font-bold text-white">
              {occupied ? formatMinutesLeft(session.endTime) : '—'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <div className="text-xs uppercase tracking-[0.3em] text-white/35">Current farthest shot</div>
          <div className="mt-2 text-xl font-black text-white">
            {occupied ? (session.bestCarry == null ? 'No shot yet' : `${session.bestCarry} yd`) : '—'}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
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
      const session = sessions.find(item => item.resourceId === bay.bayId) ?? sessions.find(item => normalizeName(item.bayName) === normalizeName(bay.bayName)) ?? null
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
    <div className="grid h-full min-h-0 grid-rows-[auto,minmax(0,1fr)] gap-3 overflow-hidden bg-[var(--dark)] p-3 md:p-4">
      <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(17,17,17,0.98),rgba(10,10,10,0.98))] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <img src="/images/logo-text.png" alt="Fairway Golf Club" className="hg-logo-white h-12 w-auto md:h-14" />
            <div className="mt-2 text-[10px] uppercase tracking-[0.42em] text-white/40">Welcome</div>
            <div className="mt-2 max-w-3xl text-xl font-black tracking-tight text-white md:text-3xl">
              Tap an occupied bay to join.
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[320px]">
            <StatCard label="In use" value={`${occupiedCount}`} tone="occupied" />
            <StatCard label="Available" value={`${availableCount}`} tone="available" />
            <StatCard label="Longest shot" value={currentBestCarry == null ? '—' : `${currentBestCarry} yd`} tone="accent" />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="grid min-h-0 gap-3 md:grid-cols-2">
          {bayCards.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-white/45">
              Loading bays…
            </div>
          ) : (
            bayCards.map(card => (
              <BayCard
                key={card.bayId}
                bayName={card.bayName}
                session={card.session}
                onOccupiedSelect={onSelectSession}
                onOpenBay={onStart}
              />
            ))
          )}
        </div>

        <aside className="flex min-h-0 flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-[rgba(17,17,17,0.92)] p-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-white/35">New session</div>
            <div className="mt-2 text-xs leading-5 text-white/60">
              Use this when you want to start fresh at an open bay.
            </div>
            <button
              type="button"
              onClick={onStart}
              className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold"
              style={{ background: 'var(--gold)', color: '#111' }}
            >
              Check In / Start Playing
            </button>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-[11px] uppercase tracking-[0.28em] text-white/40">
            Live feed
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
