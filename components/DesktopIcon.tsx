'use client'

import Image from 'next/image'
import { useWindowManager } from '@/context/WindowContext'

interface DesktopIconProps {
  id: string
  label: string
  onClick?: () => void
}

const iconMap: Record<string, string> = {
  about: '/profile.png',
  works: '/works.png',
  contact: '/contact.png',
}

export function DesktopIcon({ id, label, onClick }: DesktopIconProps) {
  const { openWindow } = useWindowManager()

  const handleDoubleClick = () => {
    const audio = new Audio('/click.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {})
    openWindow(id)
    onClick?.()
  }

  return (
    <button
      onDoubleClick={handleDoubleClick}
      className="desktop-icon"
    >
      <div className="w-12 h-12 rounded flex items-center justify-center shadow-md overflow-hidden bg-background/80">
        <Image
          src={iconMap[id] ?? '/placeholder.svg'}
          alt={label}
          width={48}
          height={48}
          className="object-cover"
        />
      </div>
      <span className="text-xs text-center break-words w-16">{label}</span>
    </button>
  )
}
