'use client'

import { useId } from 'react'
import { RetroScrollArea } from '@/components/RetroScrollArea'

export function ContactWindow() {
  const formId = useId()
  const contacts = [
    {
      label: 'Email',
      value: 'drew.wakefield.10@gmail.com',
      href: 'mailto:drew.wakefield.10@gmail.com',
    },
    {
      label: 'GitHub',
      value: 'https://github.com/DrewWakefield10',
      href: 'https://github.com/DrewWakefield10',
    },
    {
      label: 'LinkedIn',
      value: 'https://www.linkedin.com/in/drew-wakefield-479738333/',
      href: 'https://www.linkedin.com/in/drew-wakefield-479738333/',
    },
    {
      label: 'Discord',
      value: 'drew2004mist',
      href: 'https://discord.com',
    },
  ]

  return (
    <RetroScrollArea contentClassName="space-y-5" label="Contact information">
      <div>
        <h2 className="window-heading font-bold mb-3">Get In Touch</h2>
        <p className="leading-relaxed mb-4">
          I&apos;d love to hear from you! Feel free to reach out through any of these channels.
        </p>
      </div>

      <div className="space-y-2">
        {contacts.map((contact) => (
          <a
            key={contact.label}
            href={contact.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded hover:bg-accent/20 transition-colors"
          >
            <div className="min-w-0">
              <div className="text-lg font-bold text-accent">{contact.label}</div>
              <div className="text-foreground/90 break-all">{contact.value}</div>
            </div>
          </a>
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="window-section-heading font-bold mb-3">Quick Message</h3>
        <form className="space-y-3">
          <label htmlFor={`${formId}-email`} className="block text-lg">Your email</label>
          <input
            id={`${formId}-email`}
            type="email"
            placeholder="Your email"
            className="w-full min-w-0 px-3 py-2 text-xl border border-border bg-window-bg/60 placeholder:text-foreground/60"
          />
          <label htmlFor={`${formId}-message`} className="block text-lg">Your message</label>
          <textarea
            id={`${formId}-message`}
            placeholder="Your message"
            rows={3}
            className="w-full min-w-0 px-3 py-2 text-xl border border-border bg-window-bg/60 placeholder:text-foreground/60 resize-y"
          />
          <button type="submit" className="retro-button w-full">
            Send
          </button>
        </form>
      </div>
    </RetroScrollArea>
  )
}
