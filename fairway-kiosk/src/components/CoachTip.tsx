interface Props {
  observation: string
  recommendation: string
  club?: string | null
  confidence?: number | null
}

export default function CoachTip({ observation, recommendation, club, confidence }: Props) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/40 bg-[#C9A84C]/5 p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#C9A84C] text-lg">⛳</span>
          <span className="text-[#C9A84C] text-sm font-semibold uppercase tracking-wide">AI Coach Tip</span>
          {club && <span className="text-[#888] text-xs">· {club}</span>}
        </div>
        {confidence != null && (
          <span className="text-[#888] text-xs">{confidence}% confidence</span>
        )}
      </div>
      <p className="text-white/90 text-sm leading-relaxed">{observation}</p>
      <div className="border-t border-[#C9A84C]/20 pt-3">
        <p className="text-[#C9A84C]/80 text-sm leading-relaxed">{recommendation}</p>
      </div>
    </div>
  )
}
