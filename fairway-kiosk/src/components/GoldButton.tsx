interface Props {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function GoldButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
}: Props) {
  const base = 'rounded-xl font-semibold tracking-wide transition-all active:scale-95 touch-manipulation'

  const sizes = {
    sm: 'px-5 py-3 text-sm',
    md: 'px-8 py-4 text-base',
    lg: 'px-10 py-5 text-lg',
  }

  const variants = {
    primary: disabled
      ? 'bg-[#3a3428] text-[#6b5e38] cursor-not-allowed'
      : 'bg-[#C9A84C] text-black hover:bg-[#E8C96A] active:bg-[#b8963e]',
    secondary: 'border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10',
    ghost: 'text-[#888] hover:text-white',
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
