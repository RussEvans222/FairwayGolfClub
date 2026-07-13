import { useMemo } from 'react'
import type { LiveSession } from '../types'
import BackgroundSlideshow from '../components/BackgroundSlideshow'

const SLIDESHOW_IMAGES = [
  '/images/welcome-bg.jpg',
  '/images/welcome-bg-simulator.jpg',
  '/images/welcome-bg-lounge.jpg',
  '/images/welcome-bg-bar.jpg',
]

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
          ? 'rgba(255,255,255,0.10)'
          : 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderColor: occupied ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.16)',
        boxShadow: occupied ? '0 18px 40px rgba(0,0,0,0.25)' : '0 14px 34px rgba(0,0,0,0.22)',
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

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <div className="absolute inset-0">
        <BackgroundSlideshow images={SLIDESHOW_IMAGES} />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3 p-3 md:p-4">
        <div className="absolute left-5 top-5 z-20 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-xl">
          <img src="/images/logo-text.png" alt="Fairway Golf Club" className="hg-logo-white h-8 w-auto" />
        </div>

        <div
          className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-2xl"
          style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
        >
          <div>
            <div className="text-white/40 text-[11px] uppercase tracking-[0.35em]">Welcome screen</div>
            <div className="mt-1 text-lg font-semibold text-white">Tap an occupied bay to join. Start fresh from check-in.</div>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="rounded-2xl px-4 py-3 text-sm font-semibold whitespace-nowrap"
            style={{ background: 'var(--gold)', color: '#111' }}
          >
            Check In / Start Playing
          </button>
        </div>

        <div className="grid flex-1 min-h-0 gap-3 md:grid-cols-2">
          {bayCards.length === 0 ? (
            <div
              className="flex min-h-[180px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/20 bg-white/10 p-6 text-center text-white/70 backdrop-blur-2xl md:col-span-2"
              style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
            >
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
      </div>
    </div>
  )
}
