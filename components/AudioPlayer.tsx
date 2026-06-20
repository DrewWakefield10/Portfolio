'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

export function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const clickRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!musicRef.current) return

    musicRef.current.volume = 0.18
    musicRef.current.loop = true
  }, [])

  useEffect(() => {
    if (!musicRef.current) return

    if (isPlaying) {
      musicRef.current.play().catch(() => {})
    } else {
      musicRef.current.pause()
    }
  }, [isPlaying])

  const toggleAudio = () => {
    clickRef.current?.play().catch(() => {})
    setIsPlaying((prev) => !prev)
  }

  return (
    <>
      <audio ref={musicRef} src="/music.mp3" />
      <audio ref={clickRef} src="/click.mp3" />
      <button
        onClick={toggleAudio}
        className="retro-button flex items-center justify-center"
        title={isPlaying ? 'Stop music' : 'Play music'}
        aria-label={isPlaying ? 'Stop music' : 'Play music'}
      >
        <Image
          src="/radio-waves.png"
          alt={isPlaying ? 'Music on' : 'Music off'}
          width={18}
          height={18}
          className={isPlaying ? 'object-contain' : 'object-contain opacity-50'}
        />
      </button>
    </>
  )
}
