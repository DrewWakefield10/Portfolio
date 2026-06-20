'use client'

import Image from 'next/image'
import { useTheme } from '@/context/ThemeContext'
import { useWindowManager } from '@/context/WindowContext'

interface DesktopIconProps {
  id: string
  label: string
  onClick?: () => void
}

const iconMap: Record<string, { light: string; dark: string }> = {
  about: {
    light: '/profile light.png',
    dark: '/profile dark.png',
  },
  works: {
    light: '/works light.png',
    dark: '/works dark.png',
  },
  contact: {
    light: '/contact light.png',
    dark: '/contact dark.png',
  },
}

export function DesktopIcon({ id, label, onClick }: DesktopIconProps) {
  const { theme } = useTheme()
  const { openWindow } = useWindowManager()

  const handleDoubleClick = () => {
    const audio = new Audio('/click.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {})
    openWindow(id)
    onClick?.()
  }

  const icon = iconMap[id] ?? {
    light: '/placeholder.svg',
    dark: '/placeholder.svg',
  }

  return (
    <button
      onDoubleClick={handleDoubleClick}
      className="desktop-icon"
    >
      <div className="w-12 h-12 rounded flex items-center justify-center shadow-md overflow-hidden bg-background/80">
        <Image
          src={theme === 'light' ? icon.light : icon.dark}
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
