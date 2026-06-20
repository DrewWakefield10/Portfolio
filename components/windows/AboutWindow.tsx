'use client'

import Image from 'next/image'
import { VT323 } from 'next/font/google'

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
})

export function AboutWindow() {
  return (
    <div
      className={`${vt323.className} h-full flex flex-col overflow-hidden bg-window-bg text-foreground`}
    >
      {/* FIXED PROFILE SECTION */}
      <div className="shrink-0 border-b border-accent/30 p-6">
        <div className="flex items-center gap-5">
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-accent">
            <Image
              src="/profile.png"
              alt="Profile"
              fill
              className="object-cover"
            />
          </div>

          <div>
            <h1 className="text-5xl text-accent leading-none">
              Drew Wakefield
            </h1>

            <p className="mt-2 text-2xl text-foreground/90">
              Full-Stack Developer • Web Designer
            </p>

            <p className="text-xl text-foreground/70">
              Building performant web experiences and interactive applications.
            </p>

            <div className="mt-3 text-lg text-accent/80">
              📍 Philippines
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE SECTION ONLY */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8">

        {/* Skills */}
        <section>
          <h2 className="mb-4 text-3xl text-accent">
            SKILLS.EXE
          </h2>

          <div className="grid grid-cols-2 gap-8 text-xl">
            <div>
              <h3 className="mb-2 text-accent/90">
                Frontend
              </h3>

              <ul className="space-y-1">
                <li>► React</li>
                <li>► Next.js</li>
                <li>► TypeScript</li>
                <li>► Tailwind CSS</li>
                <li>► Astro</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-accent/90">
                Backend
              </h3>

              <ul className="space-y-1">
                <li>► Node.js</li>
                <li>► Django</li>
                <li>► PostgreSQL</li>
                <li>► REST APIs</li>
                <li>► Python</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Education */}
        <section>
          <h2 className="mb-4 text-3xl text-accent">
            EDUCATION.DAT
          </h2>

          <div className="border-l-2 border-accent pl-4 text-xl">
            <p>Bachelor of Science in Computer Science</p>

            <p className="text-foreground/70">
              Palawan State University
            </p>

            <p className="text-foreground/50">
              Expected Graduation: 2027
            </p>
          </div>
        </section>

        {/* Languages */}
        <section>
          <h2 className="mb-4 text-3xl text-accent">
            LANGUAGES.SYS
          </h2>

          <div className="space-y-4 text-xl">
            <div>
              <div className="mb-1 flex justify-between">
                <span>English</span>
                <span>90%</span>
              </div>

              <div className="h-3 border border-accent bg-background/40">
                <div className="h-full w-[90%] bg-accent" />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between">
                <span>Filipino</span>
                <span>100%</span>
              </div>

              <div className="h-3 border border-accent bg-background/40">
                <div className="h-full w-full bg-accent" />
              </div>
            </div>
          </div>
        </section>

        {/* Interests */}
        <section>
          <h2 className="mb-4 text-3xl text-accent">
            INTERESTS.INI
          </h2>

          <div className="flex flex-wrap gap-2 text-xl">
            <span className="border border-accent px-3 py-1">
              Linux
            </span>

            <span className="border border-accent px-3 py-1">
              Retro UI
            </span>

            <span className="border border-accent px-3 py-1">
              Game Development
            </span>

            <span className="border border-accent px-3 py-1">
              Open Source
            </span>

            <span className="border border-accent px-3 py-1">
              Web Design
            </span>
          </div>
        </section>

        {/* Extra Content for Testing Scroll */}
        <section>
          <h2 className="mb-4 text-3xl text-accent">
            EXPERIENCE.LOG
          </h2>

          <div className="space-y-4 text-xl">
            <p>Portfolio Development</p>
            <p>Authentication Dashboard</p>
            <p>Retro Desktop Website</p>
            <p>Face Recognition Research</p>
            <p>Game Development Projects</p>
            <p>Open Source Contributions</p>
            <p>Linux Customization</p>
            <p>Web Design Projects</p>
          </div>
        </section>

      </div>
    </div>
  )
}