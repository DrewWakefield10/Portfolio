'use client'

import dynamic from 'next/dynamic'

const TaskbarClient = dynamic(
  () => import('./TaskbarClient').then(mod => ({ default: mod.TaskbarClient })),
  { ssr: false }
)

export function Taskbar() {
  return (
    <div className="taskbar fixed top-0 left-0 right-0 z-50">
      <TaskbarClient />
    </div>
  )
}
