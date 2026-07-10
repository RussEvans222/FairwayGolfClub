import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Renders `value` as a QR code data URL. Used anywhere a permanent check-in
// code needs to be displayed — the modal on the reservations/summary screens,
// and inline on the bay-direction screen right when someone first checks in.
export function useQrCode(value: string): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDataUrl(null)
    QRCode.toDataURL(value, { width: 320, margin: 1, color: { dark: '#0A0A0A', light: '#FFFFFF' } })
      .then((url) => { if (!cancelled) setDataUrl(url) })
      .catch(() => { if (!cancelled) setDataUrl(null) })
    return () => { cancelled = true }
  }, [value])

  return dataUrl
}
