'use client'

import { ThemeToggle } from './ThemeToggle'
import { AudioPlayer } from './AudioPlayer'

export function TaskbarClient() {
  return (
    <div className="flex items-center justify-between w-full px-2">
      <div className="text-xs font-bold">Retro Portfolio</div>
      <div className="flex items-center gap-2">
        <AudioPlayer />
        <ThemeToggle />
      </div>
    </div>
  )
}
