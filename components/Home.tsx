'use client'

import Image from 'next/image'
import { useTheme } from '@/context/ThemeContext'
import { useWindowManager } from '@/context/WindowContext'
import { AboutWindow } from './windows/AboutWindow'
import { WorksWindow } from './windows/WorksWindow'
import { ContactWindow } from './windows/ContactWindow'
import { ThemeToggle } from './ThemeToggle'
import { AudioPlayer } from './AudioPlayer'
import { Window } from './Window'

export function Home() {
  const { theme } = useTheme()
  const { openWindow } = useWindowManager()

  const backgroundImage = theme === 'light'
    ? '/background light.jpg'
    : '/background dark.jpg'

  const handleOpen = (id: string) => {
    const audio = new Audio('/click.mp3')
    audio.volume = 0.25
    audio.play().catch(() => {})
    openWindow(id)
  }

  return (
    <div
      className="relative w-full h-screen text-foreground overflow-hidden flex flex-col"
      style={{
        backgroundImage: `url('${backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.45s ease-in-out, filter 0.45s ease-in-out',
      }}
    >
      <div className="absolute inset-0 bg-background/20" />
      {/* Top Bar */}
      <div className="relative flex-shrink-0 px-4 py-3 flex items-center gap-4 bg-transparent">
        <ThemeToggle />
        <AudioPlayer />
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl border-2 border-accent rounded-lg overflow-hidden shadow-2xl bg-window-bg/90">
          {/* Window Header */}
          <div className="bg-accent text-background px-4 py-2 font-arcade text-sm font-bold">
            home
          </div>

          {/* Window Body */}
          <div className="min-h-96 flex flex-col items-center justify-center p-8 text-center gap-10">
            <h1 className="font-arcade text-4xl md:text-5xl leading-tight text-accent break-words">
              hi! i&apos;m Drew
            </h1>
            <p className="text-base md:text-lg">
              coder and developer
            </p>

            <div className="flex gap-6 justify-center flex-wrap">
              <button
                onClick={() => handleOpen('about')}
                className="group flex flex-col items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:-translate-y-1 hover:bg-accent/10 hover:text-accent"
              >
                <div className="w-16 h-16 border-2 border-current flex items-center justify-center overflow-hidden rounded bg-background/80 transition-all duration-200 group-hover:border-accent group-hover:bg-accent/10 group-hover:shadow-[0_0_18px_rgba(0,255,255,0.18)]">
                  <Image src="/profile.png" alt="About" width={72} height={72} className="object-cover" />
                </div>
                <span className="text-base transition-colors duration-200 group-hover:text-accent">about</span>
              </button>

              <button
                onClick={() => handleOpen('works')}
                className="group flex flex-col items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:-translate-y-1 hover:bg-accent/10 hover:text-accent"
              >
                <div className="w-16 h-16 border-2 border-current flex items-center justify-center overflow-hidden rounded bg-background/80 transition-all duration-200 group-hover:border-accent group-hover:bg-accent/10 group-hover:shadow-[0_0_18px_rgba(0,255,255,0.18)]">
                  <Image src="/works.png" alt="Work" width={72} height={72} className="object-cover" />
                </div>
                <span className="text-base transition-colors duration-200 group-hover:text-accent">work</span>
              </button>

              <button
                onClick={() => handleOpen('contact')}
                className="group flex flex-col items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:-translate-y-1 hover:bg-accent/10 hover:text-accent"
              >
                <div className="w-16 h-16 border-2 border-current flex items-center justify-center overflow-hidden rounded bg-background/80 transition-all duration-200 group-hover:border-accent group-hover:bg-accent/10 group-hover:shadow-[0_0_18px_rgba(0,255,255,0.18)]">
                  <Image src="/contact.png" alt="Contact" width={72} height={72} className="object-cover" />
                </div>
                <span className="text-base transition-colors duration-200 group-hover:text-accent">contact</span>
              </button>
            </div>
          </div>
        </div>

        {/* Draggable Windows */}
        <Window id="about" title="About.txt">
          <AboutWindow />
        </Window>

        <Window id="works" title="Works.app">
          <WorksWindow />
        </Window>

        <Window id="contact" title="Contact.app">
          <ContactWindow />
        </Window>
      </div>

      {/* Footer */}
      <div className="relative flex-shrink-0 px-4 py-3 text-center text-xs text-foreground/70 font-mono bg-transparent">
        © 2026 Drew Wakefield. all rights reserved.
      </div>
    </div>
  )
}
