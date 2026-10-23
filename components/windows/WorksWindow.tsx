'use client'

import { useWindowManager } from '@/context/WindowContext'
import { projects, getProject } from '@/lib/projects'
import { RetroScrollArea } from '@/components/RetroScrollArea'


export function WorksWindow() {
  const { selectedProjectId, selectProject } = useWindowManager()
  const selectedProject = getProject(selectedProjectId)

  return (
    <RetroScrollArea key={selectedProject?.id ?? 'projects'} contentClassName="space-y-5" label="Work projects">
      <h2 className="window-heading font-bold">My Projects</h2>
      
      {selectedProject ? (
        <div className="space-y-5" data-project-id={selectedProject.id}>
          <button
            onClick={() => selectProject(null)}
            className="retro-button mb-2"
          >
            ← Back
          </button>
          <div>
            <h3 className="window-section-heading font-bold">{selectedProject.title}</h3>
            <p className="leading-relaxed mt-2">
              {selectedProject.detailDescription ?? selectedProject.description}
            </p>
          </div>
          <div>
            <span className="font-bold">Tech:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedProject.tech.map((tech) => (
                <span
                  key={tech}
                  className="border border-accent/50 bg-accent/10 px-2 py-0.5 text-base"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
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
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => selectProject(project.id)}
              className="flex flex-col items-start gap-2 border border-accent/40 bg-accent/5 p-4 hover:bg-accent/15 transition-colors text-left break-words"
              title={project.title}
            >
              <span className="text-2xl leading-tight text-accent font-bold">{project.title}</span>
              <span className="text-foreground/90 leading-snug">{project.description}</span>
              <span className="flex flex-wrap gap-1.5 mt-auto pt-2 text-base">
                {project.tech.map(tech => <span key={tech} className="border border-accent/40 px-1.5">{tech}</span>)}
              </span>
            </button>
          ))}
        </div>
      )}
    </RetroScrollArea>
  )
}
