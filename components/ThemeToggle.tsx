'use client'

import Image from 'next/image'
import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  const handleToggle = () => {
    const audio = new Audio('/click.mp3')
    audio.volume = 0.35
    audio.play().catch(() => {})
    toggleTheme()
  }

  return (
    <button
      onClick={handleToggle}
      className="retro-button"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <Image
        src={theme === 'light' ? '/moon.png' : '/sun.png'}
        alt={theme === 'light' ? 'Dark mode' : 'Light mode'}
        width={18}
        height={18}
        className="object-contain"
      />
    </button>
  )
}
