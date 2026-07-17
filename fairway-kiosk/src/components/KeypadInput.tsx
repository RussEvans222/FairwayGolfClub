interface Props {
  value: string
  onChange: (v: string) => void
  maxLength?: number
  masked?: boolean
  label?: string
  disabled?: boolean
}

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function KeypadInput({ value, onChange, maxLength = 4, masked = false, label, disabled = false }: Props) {
  function press(key: string) {
    if (disabled) return
    if (key === '⌫') {
      onChange(value.slice(0, -1))
    } else if (key && value.length < maxLength) {
      onChange(value + key)
    }
  }

  const display = masked ? '●'.repeat(value.length) : value

  return (
    <div className="flex flex-col items-center gap-6">
      {label && <p className="text-[#888] text-sm uppercase tracking-widest">{label}</p>}

      <div className="flex gap-3 h-14 items-center">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-10 h-14 border-b-2 flex items-end justify-center pb-1 text-2xl font-bold transition-colors ${
              i < value.length ? 'border-[#C9A84C] text-white' : 'border-[#333] text-transparent'
            }`}
          >
            {i < display.length ? display[i] : ''}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) => (
          <button
            key={i}
            onClick={() => press(key)}
            disabled={!key}
            className={`w-20 h-16 rounded-xl text-xl font-semibold transition-all active:scale-90 ${
              key === '⌫'
                ? 'text-[#888] hover:text-white bg-[#1A1A1A] hover:bg-[#222]'
                : key
                  ? 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] active:bg-[#333]'
                  : 'invisible'
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}
