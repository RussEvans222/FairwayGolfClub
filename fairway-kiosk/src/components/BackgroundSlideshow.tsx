import { useEffect, useState } from 'react'

interface Props {
  images: string[]
  intervalMs?: number
}

// Pre-mounts every image so the browser decodes/caches each once up front —
// with only a handful of 1920px-wide JPEGs this is cheap, and avoids any
// flash-to-black a two-image-swap approach could introduce if a crossfade
// and an index-advance land on the same tick.
export default function BackgroundSlideshow({ images, intervalMs = 9000 }: Props) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const t = setInterval(() => setCurrent(i => (i + 1) % images.length), intervalMs)
    return () => clearInterval(t)
  }, [images.length, intervalMs])

  return (
    <>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </>
  )
}
