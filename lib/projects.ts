export interface Project {
  id: string
  title: string
  description: string
  tech: readonly string[]
  github?: string
  demo?: string
}

export const projects = [
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
  {
    id: '3',
    title: 'Task Manager',
    description: 'Full-stack task management application with real-time updates',
    tech: ['Next.js', 'PostgreSQL', 'Real-time'],
    github: 'https://github.com',
    demo: 'https://demo.example.com',
  },
  {
    id: '4',
    title: 'Data Dashboard',
    description: 'Analytics dashboard with interactive charts and reports',
    tech: ['React', 'D3.js', 'Node.js'],
    github: 'https://github.com',
    demo: 'https://demo.example.com',
  },
] as const satisfies readonly Project[]

export type ProjectId = (typeof projects)[number]["id"]

export function getProject(id: string | null | undefined): Project | undefined {
  return projects.find(project => project.id === id)
}
