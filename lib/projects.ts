export interface Project {
  id: string
  title: string
  description: string
  detailDescription?: string
  tech: readonly string[]
  github?: string
  demo?: string
}

export const projects = [
  {
    id: 'lakbay',
    title: 'Lakbay',
    description: 'Discover Philippine destinations, cafés, and food spots and plan personalized itineraries.',
    detailDescription: 'Lakbay helps travelers explore destinations across the Philippines and organize them into personalized itineraries. It combines destination discovery, category-based recommendations, saved places, and travel videos to help users decide where to go.',
    tech: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
    github: 'https://github.com/DrewWakefield10/Itenerary-Planner',
    demo: 'https://lakbay-itinerary-planner-psi.vercel.app/',
  },
  {
    id: '1',
    title: 'Retro Arcade',
    description: 'A nostalgic arcade game collection built with React and Canvas API',
    tech: ['React', 'TypeScript', 'Canvas'],
    github: 'https://github.com',
    demo: 'https://demo.example.com',
  },
  {
    id: '2',
    title: 'Portfolio Website',
    description: 'This very portfolio - a retro desktop OS aesthetic',
    tech: ['Next.js', 'React', 'Tailwind CSS'],
    github: 'https://github.com',
    demo: 'https://example.com',
  },
] as const satisfies readonly Project[]

export type ProjectId = (typeof projects)[number]["id"]

export function getProject(id: string | null | undefined): Project | undefined {
  return projects.find(project => project.id === id)
}
