import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import GoldButton from './GoldButton'

interface Props {
  value: string
  title: string
  subtitle?: string
  onClose: () => void
}

export default function QrCodeModal({ value, title, subtitle, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: 320, margin: 1, color: { dark: '#0A0A0A', light: '#FFFFFF' } })
      .then((url) => { if (!cancelled) setDataUrl(url) })
      .catch(() => { if (!cancelled) setDataUrl(null) })
    return () => { cancelled = true }
  }, [value])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-8">
      <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-8 flex flex-col items-center gap-5 max-w-sm w-full">
        <div className="text-center">
          <p className="text-white text-lg font-bold">{title}</p>
          {subtitle && <p className="text-[#666] text-sm mt-1">{subtitle}</p>}
        </div>

        <div className="w-64 h-64 rounded-xl overflow-hidden bg-white flex items-center justify-center">
          {dataUrl
            ? <img src={dataUrl} alt="Check-in QR code" className="w-full h-full" />
            : <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />}
        </div>

        <p className="text-[#555] text-xs text-center">Scan this at the kiosk to check in without a PIN.</p>

        <GoldButton onClick={onClose} size="sm">Done</GoldButton>
      </div>
    </div>
  )
}
