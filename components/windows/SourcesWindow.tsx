'use client'

import type { ReactNode } from 'react'
import { RetroScrollArea } from '@/components/RetroScrollArea'
import { catSoundCredit, creativeCredits, interfaceCredits, musicCredits } from '@/lib/credits'

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer"
    className="inline-flex items-center text-accent underline underline-offset-4 break-words">{children}<span className="sr-only"> (opens in a new tab)</span></a>
}

export function SourcesWindow() {
  return (
    <RetroScrollArea contentClassName="space-y-6" label="Sources and credits">
      <div>
        <h2 className="window-heading">Sources &amp; thanks</h2>
        <p className="mt-2">A little recognition for the artists, musicians, and designers who helped give this space its character.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {creativeCredits.map(source => (
          <section key={source.id} aria-labelledby={`credit-${source.id}`} className="border border-accent/30 p-3">
            <h3 id={`credit-${source.id}`} className="text-base text-accent">{source.title}</h3>
            <p className="window-section-heading mt-1">{source.creator}</p>
            <p className="mt-2">{source.description}</p>
            <SourceLink href={source.href}>{source.linkLabel}</SourceLink>
          </section>
        ))}
      </div>

      <section aria-labelledby="credit-music">
        <h3 id="credit-music" className="window-section-heading">SOUNDTRACK.LIST</h3>
        <p className="mt-2">Thank you to the creators of the music playing here. These credits link to original song references, official releases, and the sources used for this soundtrack.</p>
        <ul className="mt-3 space-y-3">
          {musicCredits.map(track => (
            <li key={track.id} data-music-credit={track.id} className="border-l-2 border-accent/40 pl-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h4 className="text-accent">{track.title}</h4>
                <span className="text-sm text-foreground/70">{track.theme}</span>
              </div>
              <p>{track.credit}</p>
              {track.href && <SourceLink href={track.href}>{track.sourceLabel ? `Source: ${track.sourceLabel}` : 'Song reference'}</SourceLink>}
              {track.listenHref && <div><SourceLink href={track.listenHref}>Listen &amp; support the artist</SourceLink></div>}
              {track.note && <p className="text-base text-foreground/80">{track.note}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="credit-interface">
        <h3 id="credit-interface" className="window-section-heading">TYPE &amp; ICONS</h3>
        <ul className="mt-3 space-y-3">
          {interfaceCredits.map(source => (
            <li key={source.creator}>
              <h4 className="text-accent">{source.creator}</h4>
              <p>{source.description}</p>
              <SourceLink href={source.href}>{source.linkLabel}</SourceLink>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-base text-foreground/80">Additional image/icon sources are still being confirmed. Button tones were synthesized for this portfolio.</p>
      </section>

      <section aria-labelledby="credit-cat">
        <h3 id="credit-cat" className="window-section-heading">CAT.MEOW</h3>
        <p className="mt-2">{catSoundCredit.title} by {catSoundCredit.creator}. A natural recording, trimmed, gently filtered, softened, and faded for this portfolio.</p>
        <div className="flex flex-wrap gap-x-4">
          <SourceLink href={catSoundCredit.href}>Original recording</SourceLink>
          <SourceLink href={catSoundCredit.license}>CC0 1.0 public domain</SourceLink>
        </div>
      </section>

      <footer className="border-t border-accent/30 pt-4">
        <p>Artwork and recordings belong to their respective creators and rights holders. Thank you for the inspiration.</p>
        <SourceLink href="mailto:drew.wakefield.10@gmail.com?subject=Portfolio%20credit%20correction">Suggest a credit correction</SourceLink>
      </footer>
    </RetroScrollArea>
  )
}
