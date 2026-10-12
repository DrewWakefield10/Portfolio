'use client'

import Image from 'next/image'
import { VT323 } from 'next/font/google'
import { useTheme } from '@/context/ThemeContext'
import { RetroScrollArea } from '@/components/RetroScrollArea'
import { InterestIcon } from '@/components/InterestIcon'
import { useWindowManager } from '@/context/WindowContext'
import { interests, interestWindowId, experienceLog, type InterestId } from '@/lib/about'
import { getProject } from '@/lib/projects'

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
})

export function AboutWindow() {
  const { theme } = useTheme()
  const { openWindow, openProject, getWindow } = useWindowManager()

  const openInterest = (interestId: InterestId) => {
    const id = interestWindowId(interestId)
    const alreadyOpen = getWindow(id)?.isOpen
    openWindow(id)
    if (alreadyOpen) document.getElementById(`desktop-window-${id}`)?.focus()
  }

  return (
    <div
      className={`${vt323.className} about-window h-full min-h-0 flex flex-col overflow-hidden text-foreground`}
    >
      {/* FIXED PROFILE SECTION */}
      <div className="about-profile shrink-0 border-b border-accent/30 p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="relative shrink-0 w-16 h-16 sm:w-28 sm:h-28 overflow-hidden border-2 border-accent">
            <Image
              src={theme === 'light' ? '/profile.jpg' : '/profile.jpg'}
              alt="Profile"
              fill
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl text-accent leading-none">
              Drew Wakefield
            </h1>

            <p className="mt-2 text-xl sm:text-2xl text-foreground/90">
              Full-Stack Developer • Web Designer
            </p>

            <p className="text-xl text-foreground/90 leading-snug">
              Building performant web experiences and interactive applications.
            </p>

            <div className="mt-2 flex items-center gap-0 text-lg text-accent/80">
              <Image
                src="/philippine flag.png"
                alt="Philippines flag"
                width={22}
                height={16}
                className="object-contain"
              />
              <span>Philippines</span>
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE SECTION ONLY */}
      <RetroScrollArea contentClassName="space-y-7 text-[22px]" label="About details">

        {/* Skills */}
        <section>
          <h2 className="mb-4 text-3xl text-accent">
            SKILLS.EXE
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:gap-8">
            <div>
              <h3 className="mb-2 text-accent/90">
                Frontend
              </h3>

              <ul className="space-y-1">
                {[
                  'React',
                  'Next.js',
                  'TypeScript',
                  'Tailwind CSS',
                  'Astro',
                ].map((skill) => (
                  <li key={skill} className="skill-item group flex items-center gap-2" tabIndex={0} data-hover-sound="skill">
                    <Image
                      src={theme === 'light' ? '/pointer light.png' : '/pointer dark.png'}
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                    />
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-accent/90">
                Backend
              </h3>

              <ul className="space-y-1">
                {[
                  'Node.js',
                  'Django',
                  'PostgreSQL',
                  'REST APIs',
                  'Python',
                ].map((skill) => (
                  <li key={skill} className="skill-item group flex items-center gap-2" tabIndex={0} data-hover-sound="skill">
                    <Image
                      src={theme === 'light' ? '/pointer light.png' : '/pointer dark.png'}
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                    />
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Education */}
        <section>
          <h2 className="mb-4 text-3xl text-accent">
            EDUCATION.DAT
          </h2>

          <div className="border-l-2 border-accent pl-4">
            <p>Bachelor of Science in Computer Science</p>

            <p className="text-foreground/90">
              Palawan State University
            </p>

            <p className="text-lg text-foreground/80">
              Graduated: 2026
            </p>
          </div>
        </section>

        {/* Languages */}
        <section>
          <h2 className="mb-4 text-3xl text-accent">
            LANGUAGES.SYS
          </h2>

          <div className="space-y-4">
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

          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <button
                key={interest.id}
                id={`interest-trigger-${interest.id}`}
                type="button"
                className="interest-button inline-flex items-center justify-center gap-2"
                aria-label={`Open ${interest.title} information`}
                aria-controls={`desktop-window-${interestWindowId(interest.id)}`}
                aria-expanded={getWindow(interestWindowId(interest.id))?.isOpen ?? false}
                onClick={() => openInterest(interest.id)}
              >
                <InterestIcon id={interest.id} />
                <span>{interest.title}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Experience Log */}
        <section>
          <h2 className="mb-4 text-3xl text-accent">
            EXPERIENCE.LOG
          </h2>

          <RetroScrollArea className="experience-scroll-area" contentClassName="space-y-2" label="Experience entries">
            {experienceLog.map((entry) => {
              const project = getProject(entry.projectId)
              const content = (
                <>
                  <span className="experience-title text-accent">
                    <span aria-hidden="true" className="experience-arrow">&gt;</span> {entry.title}
                  </span>
                  <span className="block text-xl text-foreground/90">{entry.detail}</span>
                  <span className="block mt-1 text-base text-accent/80">
                    {project ? `Open ${project.title}` : 'Project details not added yet'}
                  </span>
                </>
              )
              return project && entry.projectId ? (
                <button
                  key={entry.id}
                  type="button"
                  className="experience-entry experience-link"
                  data-experience-id={entry.id}
                  onClick={() => openProject(entry.projectId!)}
                  aria-label={`${entry.title}: open ${project.title}`}
                >
                  {content}
                </button>
              ) : (
                <article key={entry.id} className="experience-entry" data-experience-id={entry.id}>
                  {content}
                </article>
              )
            })}
          </RetroScrollArea>
        </section>

      </RetroScrollArea>
    </div>
  )
}
