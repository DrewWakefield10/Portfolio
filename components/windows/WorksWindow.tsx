'use client'

import { useState } from 'react'

interface Project {
  id: string
  title: string
  description: string
  tech: string[]
  github?: string
  demo?: string
}

const projects: Project[] = [
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
]

export function WorksWindow() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-base">🎮 My Projects</h2>
      
      {selectedProject ? (
        <div className="text-xs space-y-2">
          <button
            onClick={() => setSelectedProject(null)}
            className="retro-button mb-2"
          >
            ← Back
          </button>
          <div>
            <h3 className="font-bold">{selectedProject.title}</h3>
            <p className="text-xs leading-relaxed mt-2">
              {selectedProject.description}
            </p>
          </div>
          <div>
            <span className="font-bold">Tech:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedProject.tech.map((tech) => (
                <span
                  key={tech}
                  className="bg-accent text-foreground px-2 py-0.5 text-xs rounded"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            {selectedProject.github && (
              <a
                href={selectedProject.github}
                target="_blank"
                rel="noopener noreferrer"
                className="retro-button"
              >
                GitHub
              </a>
            )}
            {selectedProject.demo && (
              <a
                href={selectedProject.demo}
                target="_blank"
                rel="noopener noreferrer"
                className="retro-button"
              >
                Demo
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="bg-accent text-foreground p-2 rounded text-xs font-bold hover:bg-accent-hover transition-colors text-center break-words"
              title={project.title}
            >
              {project.title.replace(/\s+/g, '\n')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
