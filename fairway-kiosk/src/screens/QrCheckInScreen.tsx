import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import GoldButton from '../components/GoldButton'

interface Props {
  // Returns an error message to display, or null on a successful check-in.
  onScan: (appointmentId: string) => Promise<string | null>
  onBack: () => void
}

export default function QrCheckInScreen({ onScan, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const processingRef = useRef(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!videoRef.current) return

    const scanner = new QrScanner(
      videoRef.current,
      async (result) => {
        if (processingRef.current) return
        processingRef.current = true
        setChecking(true)
        setScanError(null)
        try {
          const raw = result.data.trim()
          // QR may encode either the bare 18-char ServiceAppointment Id or a
          // check-in URL ending in the Id — take whatever's after the last slash.
          const appointmentId = raw.includes('/') ? raw.split('/').pop()!.trim() : raw
          const err = await onScan(appointmentId)
          if (err) {
            setScanError(err)
            processingRef.current = false
          }
          // On success the parent navigates away — this component unmounts.
        } catch {
          setScanError('Something went wrong reading that code. Try again.')
          processingRef.current = false
        } finally {
          setChecking(false)
        }
      },
      { highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 4 }
    )
    scannerRef.current = scanner

    scanner.start().catch(() => {
      setCameraError("Couldn't access the camera. Make sure camera permission is allowed for this app.")
    })

    return () => {
      scanner.stop()
      scanner.destroy()
      scannerRef.current = null
    }
  }, [onScan])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-16">
      <div className="text-center">
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.4em] font-medium mb-2">QR Check-In</p>
        <h2 className="text-4xl font-bold text-white">Scan your confirmation code</h2>
        <p className="text-[#666] text-sm mt-2">Hold your reservation QR code up to the camera.</p>
      </div>

      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden border border-[#2A2A2A] bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {checking && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
        )}
      </div>

      {cameraError && <p className="text-red-400 text-sm text-center max-w-sm">{cameraError}</p>}
      {scanError && <p className="text-red-400 text-sm text-center max-w-sm">{scanError}</p>}

      <GoldButton variant="ghost" onClick={onBack}>← Back</GoldButton>
    </div>
  )
}
