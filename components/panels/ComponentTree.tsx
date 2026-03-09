'use client'
import { useState } from 'react'
import type { ComponentGroup } from '@/lib/component-selection/types'

interface ComponentTreeProps {
  selectedComponent: string | null
  setSelectedComponent: (component: string | null) => void
  navigateDown?: (component: string) => void
  components: ComponentGroup[]
  onCreateComponent?: () => Promise<string>
}

export function ComponentTree({
  selectedComponent,
  setSelectedComponent,
  navigateDown,
  components,
  onCreateComponent,
}: ComponentTreeProps) {
  const [expanded, setExpanded] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [createMessage, setCreateMessage] = useState('')

  const handleCreateComponent = async () => {
    if (!onCreateComponent || isCreating) return

    setIsCreating(true)
    setCreateMessage('')
    try {
      const componentName = await onCreateComponent()
      setCreateMessage(`Created ${componentName}`)
    } catch (error) {
      console.error(error)
      setCreateMessage('Failed to create component')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 shadow-lg">
      <div className="mb-4 sticky top-0 flex items-center bg-white py-2 dark:bg-zinc-900">
        <h2 className="text-xl font-bold">Component Tree</h2>
        <button
          className="ml-auto h-8 w-8 rounded border border-zinc-300 text-lg leading-none text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={handleCreateComponent}
          disabled={!onCreateComponent || isCreating}
          title="Create a new component"
          aria-label="Create a new component"
        >
          +
        </button>
      </div>

      {createMessage && (
        <p className="mb-3 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          {createMessage}
        </p>
      )}

      <div className="space-y-1">
        {components.map((comp) => (
          <div key={comp.name}>
            <div
              className={`flex items-center p-2 rounded cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                selectedComponent === comp.name ? 'bg-blue-100 dark:bg-blue-900' : ''
              }`}
              onClick={() => setSelectedComponent(comp.name)}
              onDoubleClick={() => navigateDown && navigateDown(comp.name)}
            >
              <span className="mr-2 text-sm">📁</span>
              <span className="text-sm font-medium">{comp.name}</span>
              <button
                className="ml-auto text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(!expanded)
                }}
              >
                {expanded ? '▼' : '▶'}
              </button>
            </div>

            {expanded && (
              <div className="ml-4 space-y-1">
                {comp.children.map((child) => (
                  <div
                    key={child}
                    className={`flex items-center p-2 rounded cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      selectedComponent === child ? 'bg-blue-100 dark:bg-blue-900' : ''
                    }`}
                    onClick={() => setSelectedComponent(child)}
                    onDoubleClick={() => navigateDown && navigateDown(child)}
                  >
                    <span className="mr-2 text-sm">📄</span>
                    <span className="text-sm">{child}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium transition"
        onClick={() => setSelectedComponent(null)}
      >
        Show All
      </button>
    </div>
  )
}
