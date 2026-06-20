'use client'

export function ContactWindow() {
  const contacts = [
    {
      icon: '📧',
      label: 'Email',
      value: 'hello@example.com',
      href: 'mailto:hello@example.com',
    },
    {
      icon: '🐙',
      label: 'GitHub',
      value: 'github.com/yourname',
      href: 'https://github.com',
    },
    {
      icon: '💼',
      label: 'LinkedIn',
      value: 'linkedin.com/in/yourname',
      href: 'https://linkedin.com',
    },
    {
      icon: '💬',
      label: 'Discord',
      value: 'your_discord_tag',
      href: 'https://discord.com',
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-base mb-3">📞 Get In Touch</h2>
        <p className="text-xs leading-relaxed mb-4">
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
            <span className="text-sm">{contact.icon}</span>
            <div className="text-xs">
              <div className="font-bold">{contact.label}</div>
              <div className="text-foreground/70">{contact.value}</div>
            </div>
          </a>
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="font-bold text-xs mb-2">Quick Message</h3>
        <form className="space-y-2">
          <input
            type="email"
            placeholder="Your email"
            className="w-full px-2 py-1 text-xs border border-border rounded bg-window-bg"
          />
          <textarea
            placeholder="Your message"
            rows={3}
            className="w-full px-2 py-1 text-xs border border-border rounded bg-window-bg resize-none"
          />
          <button type="submit" className="retro-button w-full text-xs">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
