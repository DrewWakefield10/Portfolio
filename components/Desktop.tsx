'use client'

import { DesktopIcon } from './DesktopIcon'
import { Taskbar } from './Taskbar'
import { Window } from './Window'
import { AboutWindow } from './windows/AboutWindow'
import { WorksWindow } from './windows/WorksWindow'
import { ContactWindow } from './windows/ContactWindow'

export function Desktop() {
  return (
    <div className="w-full h-screen bg-background text-foreground overflow-hidden flex flex-col">
      {/* Taskbar at Top */}
      <Taskbar />

      {/* Desktop Icons */}
      <div className="flex-1 p-8 overflow-auto pt-16">
        <div className="flex gap-8">
          <DesktopIcon id="about" label="About" />
          <DesktopIcon id="works" label="Works" />
          <DesktopIcon id="contact" label="Contact" />
        </div>
      </div>

      {/* Windows */}
      <Window id="about" title="📄 About.txt">
        <AboutWindow />
      </Window>

      <Window id="works" title="🎮 Works.app">
        <WorksWindow />
      </Window>

      <Window id="contact" title="📞 Contact.app">
        <ContactWindow />
      </Window>
    </div>
  )
}
