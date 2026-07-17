import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

// Live camera QR scanner — extracted from the old standalone QrCheckInScreen
// so it can be embedded directly on CheckInScreen instead of living on its
// own full screen. No behavior change from the original: same qr-scanner
// options, same Contact-Id-from-URL parsing, same de-dupe guard.
export function useQrScanner(onScan: (contactId: string) => Promise<string | null>) {
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
          // QR may encode either the bare 18-char Contact Id or a check-in
          // URL ending in the Id — take whatever's after the last slash.
          const contactId = raw.includes('/') ? raw.split('/').pop()!.trim() : raw
          const err = await onScan(contactId)
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

  return { videoRef, cameraError, scanError, checking }
}
