import emailjs from '@emailjs/browser'

export const CONTACT_LIMITS = { email: 254, messageMin: 10, messageMax: 5000, cooldown: 30_000 } as const

export interface ContactFields {
  email: string
  message: string
  website: string
}

export type ContactErrors = Partial<Record<'email' | 'message', string>>

export function validateContactMessage(fields: ContactFields) {
  const email = fields.email.trim()
  const message = fields.message.trim()
  const errors: ContactErrors = {}
  if (!email || email.length > CONTACT_LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address (up to 254 characters).'
  }
  if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) {
    errors.message = 'Enter a message between 10 and 5,000 characters.'
  }
  return { email, message, errors, blocked: Boolean(fields.website.trim()) }
}

export class ContactSendError extends Error {
  constructor(public readonly code: 'configuration' | 'pending' | 'cooldown') {
    super(code)
  }
}

// Survive closing/reopening Contact.app; store only a timestamp, never visitor input.
const cooldownKey = 'portfolio-contact-last-success'
let sending = false
let lastSuccess = 0

function successfulSendTime() {
  try {
    const saved = Number(window.localStorage.getItem(cooldownKey))
    if (Number.isFinite(saved) && saved > 0 && saved <= Date.now()) return Math.max(saved, lastSuccess)
  } catch { /* Storage can be blocked; the in-memory cooldown still applies. */ }
  return lastSuccess
}

export async function sendContactMessage(email: string, message: string): Promise<void> {
  if (sending) throw new ContactSendError('pending')
  if (Date.now() - successfulSendTime() < CONTACT_LIMITS.cooldown) throw new ContactSendError('cooldown')

  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID?.trim()
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID?.trim()
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY?.trim()
  if (!serviceId || !templateId || !publicKey) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Contact.app: configure NEXT_PUBLIC_EMAILJS_SERVICE_ID, NEXT_PUBLIC_EMAILJS_TEMPLATE_ID and NEXT_PUBLIC_EMAILJS_PUBLIC_KEY in .env.local, then restart Next.js.')
    }
    throw new ContactSendError('configuration')
  }

  sending = true
  try {
    await emailjs.send(serviceId, templateId, {
      from_name: 'Portfolio Visitor',
      reply_to: email,
      message,
    }, {
      publicKey,
      // SDK throttling also deters repeated failed requests; success has a 30s cooldown.
      limitRate: { id: 'portfolio-contact', throttle: 10_000 },
    })
    lastSuccess = Date.now()
    try { window.localStorage.setItem(cooldownKey, String(lastSuccess)) } catch { /* Optional persistence. */ }
  } finally {
    sending = false
  }
}
