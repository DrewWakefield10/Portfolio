'use client'

import Image from 'next/image'
import { useTheme } from '@/context/ThemeContext'
import { useWindowManager } from '@/context/WindowContext'
import { AboutWindow } from './windows/AboutWindow'
import { WorksWindow } from './windows/WorksWindow'
import { ContactWindow } from './windows/ContactWindow'
import { InterestWindows } from './windows/InterestWindows'
import { ThemeToggle } from './ThemeToggle'
import { AudioPlayer } from './AudioPlayer'
import { Window } from './Window'
import { Wallpaper } from './Wallpaper'
import { StoreHotspots } from './StoreHotspots'

export function Home() {
  const { theme } = useTheme()
  const { openWindow } = useWindowManager()

  const handleOpen = (id: string) => {
    openWindow(id)
  }

  return (
    <div
      className="relative w-full h-dvh text-foreground overflow-hidden flex flex-col"
    >
      <Wallpaper />
      <div className="absolute inset-0 bg-background/20 pointer-events-none" />
      <StoreHotspots />
      {/* Top Bar */}
      <div className="desktop-navigation relative z-20 flex-shrink-0 px-4 py-3 flex flex-wrap items-start gap-3 bg-transparent" role="toolbar" aria-label="Desktop controls">
        <ThemeToggle />
        <AudioPlayer />
      </div>

      {/* Main Content */}
      <div className="relative min-h-0 flex-1 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
        <Window id="home" title="Home" size="launcher" returnFocusId="store-pc">
          {/* Window Body */}
          <div className="home-launcher-body flex flex-col items-center justify-center px-4 py-5 sm:px-6 sm:py-6 text-center gap-3">
            <h1 className="font-arcade text-3xl sm:text-4xl leading-tight text-accent break-words">
              hi! i&apos;m Drew
            </h1>
            <p className="text-base md:text-lg">
              coder and developer
            </p>

            <div className="flex gap-3 sm:gap-6 justify-center mt-2">
              <button
                aria-label="Open About"
                onClick={() => handleOpen('about')}
                className="group flex flex-col items-center gap-2 p-2 transition-all duration-200 hover:-translate-y-1 hover:bg-accent/10 hover:text-accent"
              >
                <div className="launcher-icon w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center overflow-hidden">
                  <Image src={theme === 'light' ? '/profile light.png' : '/profile dark.png'} alt="About" width={72} height={72} className="object-cover" />
                </div>
                <span className="text-base transition-colors duration-200 group-hover:text-accent">about</span>
              </button>

              <button
                aria-label="Open Work"
                onClick={() => handleOpen('works')}
                className="group flex flex-col items-center gap-2 p-2 transition-all duration-200 hover:-translate-y-1 hover:bg-accent/10 hover:text-accent"
              >
                <div className="launcher-icon w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center overflow-hidden">
                  <Image src={theme === 'light' ? '/works light.png' : '/works dark.png'} alt="Work" width={72} height={72} className="object-cover" />
                </div>
                <span className="text-base transition-colors duration-200 group-hover:text-accent">work</span>
              </button>

              <button
                aria-label="Open Contact"
                onClick={() => handleOpen('contact')}
                className="group flex flex-col items-center gap-2 p-2 transition-all duration-200 hover:-translate-y-1 hover:bg-accent/10 hover:text-accent"
              >
                <div className="launcher-icon w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center overflow-hidden">
                  <Image src={theme === 'light' ? '/contact light.png' : '/contact dark.png'} alt="Contact" width={72} height={72} className="object-cover" />
                </div>
                <span className="text-base transition-colors duration-200 group-hover:text-accent">contact</span>
              </button>
            </div>
            <p className="text-xs text-foreground/70">© 2026 Drew Wakefield. all rights reserved.</p>
          </div>
        </Window>

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
        <InterestWindows />
      </div>

    </div>
  )
}
