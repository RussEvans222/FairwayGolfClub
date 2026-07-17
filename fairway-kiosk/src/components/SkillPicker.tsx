import type { SkillLevel } from '../types'

const SKILLS: { value: SkillLevel; label: string; sub: string }[] = [
  { value: 'Beginner',     label: 'Beginner',     sub: 'Just starting out' },
  { value: 'Intermediate', label: 'Intermediate', sub: 'Some experience' },
  { value: 'Advanced',     label: 'Advanced',     sub: 'Low handicap' },
  { value: 'Competitive',  label: 'Competitive',  sub: 'Tournament player' },
]

interface Props {
  value: SkillLevel | null
  onChange: (v: SkillLevel) => void
}

export default function SkillPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {SKILLS.map(s => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          className={`rounded-2xl p-5 text-left transition-all active:scale-95 border ${
            value === s.value
              ? 'border-[#C9A84C] bg-[#C9A84C]/10'
              : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#444]'
          }`}
        >
          <p className={`font-semibold text-base ${value === s.value ? 'text-[#C9A84C]' : 'text-white'}`}>
            {s.label}
          </p>
          <p className="text-[#888] text-sm mt-0.5">{s.sub}</p>
        </button>
      ))}
    </div>
  )
}
