import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { VT323 } from 'next/font/google'
import { ThemeProvider } from '@/context/ThemeContext'
import { WindowProvider } from '@/context/WindowContext'
import './globals.css'

const vt323 = VT323({
  variable: '--font-vt323',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  title: 'Retro Portfolio',
  description: 'A retro desktop OS-styled portfolio website',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={vt323.variable}>
      <body className={`${vt323.className} antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <WindowProvider>
            {children}
          </WindowProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
