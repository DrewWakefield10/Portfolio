import type { ProjectId } from './projects'

export type InterestId = 'linux' | 'retro-ui' | 'game-development' | 'open-source' | 'web-design'
export interface Interest {
  id: InterestId
  title: string
  description: string
  keywords: readonly string[]
}

export const interests: readonly Interest[] = [
  { id: 'linux', title: 'Linux',
    description: 'Interested in Linux operating systems, desktop customization, and exploring different distributions. Enjoy experimenting with terminal tools and system configurations to improve development workflows.',
    keywords: ['Linux', 'Terminal', 'Customization'] },
  { id: 'retro-ui', title: 'Retro UI',
    description: 'Interested in the character of classic desktop interfaces, pixel art, and terminal-inspired design. Enjoy exploring how familiar windows and small interactions can make a website feel playful and personal.',
    keywords: ['Pixel art', 'Desktop interfaces', 'Interaction'] },
  { id: 'game-development', title: 'Game Development',
    description: 'Interested in interactive games, gameplay mechanics, and exploring game engines such as Godot. Enjoy the combination of programming, visual design, and creativity involved in building playful experiences.',
    keywords: ['Gameplay', 'Godot', 'Creative coding'] },
  { id: 'open-source', title: 'Open Source',
    description: 'Interested in open-source software, community-driven development, and accessible technology. Enjoy exploring collaborative projects and tools that developers can freely use, learn from, and improve.',
    keywords: ['Community', 'Collaboration', 'Accessible tools'] },
  { id: 'web-design', title: 'Web Design',
    description: 'Interested in clear layouts, readable typography, and thoughtful interactions on the web. Enjoy exploring how visual design and responsive interfaces can make sites welcoming and easy to use.',
    keywords: ['Typography', 'Responsive design', 'Accessibility'] },
]

export const interestWindowId = (id: InterestId) => `interest-${id}`

export interface ExperienceEntry {
  id: string
  title: string
  detail: string
  projectId?: ProjectId
}

export const experienceLog: readonly ExperienceEntry[] = [
  { id: 'portfolio-development', title: 'Portfolio Development',
    detail: 'Built a retro desktop portfolio with immersive interactions and a nostalgic shell.', projectId: '2' },
  { id: 'authentication-dashboard', title: 'Authentication Dashboard',
    detail: 'Shaped secure admin flows with polished UI and stateful interactions.' },
  { id: 'retro-desktop-website', title: 'Retro Desktop Website',
    detail: 'Crafted a fully themed experience with windows, icons, and command-like sections.', projectId: '2' },
  { id: 'face-recognition-research', title: 'Face Recognition Research',
    detail: 'Explored intelligent systems and interactive visual interfaces.' },
  { id: 'game-development-projects', title: 'Game Development Projects',
    detail: 'Experimented with playful mechanics and experimental world-building.', projectId: '1' },
]
