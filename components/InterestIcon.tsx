import type { InterestId } from '@/lib/about'

// Original, flat pixel-grid symbols; shared by launch buttons and information windows.
const pixels: Record<InterestId, string> = {
  linux: 'M9 2h6v2h2v3h2v9h2v4h-7v-2h-4v2H3v-4h2V7h2V4h2z M9 6v2h2V6z M13 6v2h2V6z M8 10v6h8v-6z',
  'retro-ui': 'M2 3h16v4h4v14H6v-4H2z M4 7v8h2V7z M8 11v8h12v-8z M8 9h12V7H8z',
  'game-development': 'M5 6h14v2h2v3h1v8h-5v-3H7v3H2v-8h1V8h2z M6 9v2H4v2h2v2h2v-2h2v-2H8V9z M15 10v2h2v-2z M18 13v2h2v-2z',
  'open-source': 'M3 2h6v6H7v3h10V8h-2V2h6v6h-2v5h-6v3h2v6H9v-6h2v-3H5V8H3z M5 4v2h2V4z M17 4v2h2V4z M11 18v2h2v-2z',
  'web-design': 'M2 3h20v18H2z M4 5v3h16V5z M4 10v9h16v-9z M8 11h2v2H8v2h2v2H8v-2H6v-2h2z M14 11h2v2h2v2h-2v2h-2v-2h2v-2h-2z',
}

export function InterestIcon({ id, size = 28 }: { id: InterestId; size?: number }) {
  return <svg className="interest-icon shrink-0" width={size} height={size} viewBox="0 0 24 24"
    fill="currentColor" fillRule="evenodd" shapeRendering="crispEdges" aria-hidden="true">
    <path d={pixels[id]} fill="var(--interest-icon-color)" stroke="var(--accent)" strokeWidth="0.6" />
  </svg>
}
