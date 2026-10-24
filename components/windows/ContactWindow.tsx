'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { RetroScrollArea } from '@/components/RetroScrollArea'
import { CONTACT_LIMITS, ContactSendError, sendContactMessage, validateContactMessage, type ContactErrors } from '@/lib/contact-message'

export function ContactWindow() {
  const formId = useId()
  const pending = useRef(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<ContactErrors>({})
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const result = validateContactMessage({
      email: String(data.get('email') ?? ''),
      message: String(data.get('message') ?? ''),
      website: String(data.get('website') ?? ''),
    })
    setErrors(result.errors)
    if (result.blocked || Object.keys(result.errors).length) {
      setStatus('error')
      setFeedback(result.blocked ? 'MESSAGE FAILED. PLEASE TRY AGAIN.' : 'CHECK YOUR EMAIL AND MESSAGE BELOW.')
      const field = result.errors.email ? 'email' : result.errors.message ? 'message' : null
      if (field) (form.elements.namedItem(field) as HTMLElement | null)?.focus()
      return
    }

    pending.current = true
    setStatus('sending')
    setFeedback('Sending your message...')
    try {
      await sendContactMessage(result.email, result.message)
      if (!form.isConnected) return
      form.reset()
      setStatus('success')
      setFeedback('MESSAGE SENT SUCCESSFULLY!')
    } catch (error) {
      if (!form.isConnected) return
      setStatus('error')
      setFeedback(error instanceof ContactSendError && error.code === 'cooldown'
        ? 'PLEASE WAIT 30 SECONDS BETWEEN SENT MESSAGES.'
        : error instanceof ContactSendError && error.code === 'pending'
          ? 'A MESSAGE IS STILL SENDING. PLEASE WAIT.'
          : 'MESSAGE FAILED. PLEASE TRY AGAIN.')
    } finally {
      pending.current = false
    }
  }

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
        <form className="space-y-3" onSubmit={handleSubmit} noValidate aria-busy={status === 'sending'}>
          <div className="hidden" aria-hidden="true">
            <label htmlFor={`${formId}-website`}>Leave this field empty</label>
            <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <label htmlFor={`${formId}-email`} className="block text-lg">Your email</label>
          <input
            id={`${formId}-email`}
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={CONTACT_LIMITS.email}
            readOnly={status === 'sending'}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${formId}-email-error` : undefined}
            placeholder="Your email"
            className="w-full min-w-0 px-3 py-2 text-xl border border-border bg-window-bg/60 placeholder:text-foreground/60"
          />
          {errors.email && <p id={`${formId}-email-error`} className="text-accent text-base">{errors.email}</p>}
          <label htmlFor={`${formId}-message`} className="block text-lg">Your message</label>
          <textarea
            id={`${formId}-message`}
            name="message"
            required
            minLength={CONTACT_LIMITS.messageMin}
            maxLength={CONTACT_LIMITS.messageMax}
            readOnly={status === 'sending'}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? `${formId}-message-error` : undefined}
            placeholder="Your message"
            rows={3}
            className="w-full min-w-0 px-3 py-2 text-xl border border-border bg-window-bg/60 placeholder:text-foreground/60 resize-y"
          />
          {errors.message && <p id={`${formId}-message-error`} className="text-accent text-base">{errors.message}</p>}
          <button type="submit" className="retro-button w-full" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending...' : 'Send'}
          </button>
          <p role="status" aria-live="polite" aria-atomic="true" className={status === 'idle' ? 'sr-only' : 'text-accent text-base'}>{feedback}</p>
        </form>
      </div>
    </RetroScrollArea>
  )
}
