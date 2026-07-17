interface Props {
  label: string
  value: string | number | null
  unit?: string
  highlight?: boolean
}

export default function StatCard({ label, value, unit, highlight = false }: Props) {
  return (
    <div className={`rounded-2xl p-6 flex flex-col gap-1 ${highlight ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/30' : 'bg-[#1A1A1A]'}`}>
      <p className="text-[#888] text-xs uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${highlight ? 'text-[#C9A84C]' : 'text-white'}`}>
          {value ?? '—'}
        </span>
        {unit && <span className="text-[#888] text-sm">{unit}</span>}
      </div>
    </div>
  )
}
