import type { Bay, BayOverviewCard } from '../types'

interface Props {
  bayCards: BayOverviewCard[]
  onSelect: (bay: Bay) => void
}

function PeopleIcons({ count }: { count: number }) {
  const visibleCount = Math.min(count, 4)
  const extraCount = count - visibleCount

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: visibleCount }).map((_, index) => (
        <div
          key={index}
          className="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold"
          style={{
            borderColor: 'rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.08)',
          }}
        >
          👤
        </div>
      ))}
      {extraCount > 0 ? (
        <div
          className="flex h-10 min-w-10 items-center justify-center rounded-full border px-2 text-sm font-semibold"
          style={{
            borderColor: 'rgba(201,168,76,0.45)',
            background: 'rgba(201,168,76,0.12)',
            color: 'var(--gold-light)',
          }}
        >
          +{extraCount}
        </div>
      ) : null}
    </div>
  )
}

function formatMinutes(minutesRemaining: number | null) {
  if (minutesRemaining == null) return '—'
  if (minutesRemaining <= 0) return 'Ending'
  return `${minutesRemaining} min left`
}

function formatCarry(bestCarry: number | null) {
  if (bestCarry == null) return 'No shot yet'
  return `${bestCarry} yd farthest`
}

export function BaySelectScreen({ bayCards, onSelect }: Props) {
  const occupiedCount = bayCards.filter(card => card.isOccupied).length
  const availableCount = bayCards.length - occupiedCount
  const currentBestCarry = bayCards.reduce<number | null>((best, card) => {
    if (card.bestCarry == null) return best
    return best == null ? card.bestCarry : Math.max(best, card.bestCarry)
  }, null)

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden bg-[var(--dark)] p-5 md:p-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(17,17,17,0.98),rgba(10,10,10,0.98))] p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <img src="/images/logo-text.png" alt="Fairway Golf Club" className="bay-logo-white h-24 w-auto md:h-28" />
            <div className="mt-3 text-xs uppercase tracking-[0.42em] text-white/40">Bay overview</div>
            <div className="mt-2 max-w-3xl text-2xl font-black tracking-tight text-white md:text-4xl">
              Tap a bay to view the session. Occupied bays open the join flow.
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
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {bayCards.map(card => (
                <button
                  key={card.bay.id}
                  onClick={() => onSelect(card.bay)}
                  className="group flex min-h-[220px] flex-col justify-between rounded-[1.75rem] border p-5 text-left transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                  style={{
                    background: card.isOccupied
                      ? 'linear-gradient(180deg, rgba(31,31,31,0.98), rgba(16,16,16,0.98))'
                      : 'linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,11,0.98))',
                    borderColor: card.isOccupied ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.10)',
                    boxShadow: card.isOccupied
                      ? '0 18px 40px rgba(201,168,76,0.10)'
                      : '0 14px 34px rgba(0,0,0,0.35)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.35em] text-white/35">Bay</div>
                      <div className="mt-2 text-3xl font-black tracking-tight text-white">{card.bay.name}</div>
                      <div className="mt-1 text-sm text-white/45">{card.bay.bayNumber}</div>
                    </div>

                    <div
                      className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]"
                      style={{
                        borderColor: card.isOccupied ? 'rgba(201,168,76,0.35)' : 'rgba(76,201,115,0.30)',
                        background: card.isOccupied ? 'rgba(201,168,76,0.12)' : 'rgba(76,201,115,0.12)',
                        color: card.isOccupied ? 'var(--gold-light)' : '#8AF0A0',
                      }}
                    >
                      {card.statusLabel}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.3em] text-white/35">Players</div>
                        <div className="mt-2">
                          {card.isOccupied ? (
                            <PeopleIcons count={Math.max(card.participantCount, 1)} />
                          ) : (
                            <div className="text-2xl font-bold text-white/15">Empty</div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.3em] text-white/35">Time</div>
                        <div className="mt-2 text-xl font-bold text-white">
                          {formatMinutes(card.minutesRemaining)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="text-xs uppercase tracking-[0.3em] text-white/35">Current farthest shot</div>
                      <div className="mt-2 text-2xl font-black text-white">
                        {formatCarry(card.bestCarry)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-white/45">
                        {card.isOccupied
                          ? 'Tap to join the active party.'
                          : 'Tap to claim this bay.'}
                      </div>
                      <div
                        className="rounded-full px-4 py-2 text-sm font-semibold"
                        style={{
                          background: card.isOccupied ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                          color: card.isOccupied ? '#111' : '#fff',
                        }}
                      >
                        {card.isOccupied ? 'Join Party' : 'Open Bay'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col gap-4 rounded-[2rem] border border-white/10 bg-[rgba(17,17,17,0.92)] p-5">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-white/35">Display</div>
            <div className="mt-2 text-2xl font-black text-white">Privacy first</div>
            <div className="mt-3 text-sm leading-6 text-white/60">
              This overview shows only occupancy, player count, time remaining, and the longest shot.
              No member names appear here.
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-white/35">Legend</div>
            <div className="mt-4 space-y-3 text-sm">
              <LegendRow tone="available" label="Available" detail="Bay is open and ready." />
              <LegendRow tone="occupied" label="In use" detail="Tap to join the active session." />
              <LegendRow tone="accent" label="Longest shot" detail="Best carry recorded in the current session." />
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-white/35">Interaction</div>
            <div className="mt-3 text-sm leading-6 text-white/60">
              Large touch targets are tuned for kiosk and iPad-style use. Occupied bays route into the join party flow.
            </div>
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
