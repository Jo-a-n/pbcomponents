'use client'
import { useState } from 'react'
import type { ComponentGroup } from '@/lib/component-selection/types'

interface ComponentTreeProps {
  selectedComponent: string | null
  setSelectedComponent: (component: string | null) => void
  navigateDown?: (component: string) => void
  components: ComponentGroup[]
  onCreateComponent?: () => Promise<string>
  onDeleteComponent?: (component: string) => Promise<void>
}

export function ComponentTree({
  selectedComponent,
  setSelectedComponent,
  navigateDown,
  components,
  onCreateComponent,
  onDeleteComponent,
}: ComponentTreeProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [deletingComponent, setDeletingComponent] = useState<string | null>(null)
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

  const isGeneratedComponent = (componentName: string) => /^Div\d{3}$/.test(componentName)

  const handleDeleteComponent = async (componentName: string) => {
    if (!onDeleteComponent || deletingComponent) return
    if (!window.confirm(`Delete ${componentName} and its files?`)) return

    setDeletingComponent(componentName)
    setCreateMessage('')
    try {
      await onDeleteComponent(componentName)
      setCreateMessage(`Deleted ${componentName}`)
      setSelectedComponent(null)
    } catch (error) {
      console.error(error)
      setCreateMessage(`Failed to delete ${componentName}`)
    } finally {
      setDeletingComponent(null)
    }
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 overflow-y-auto border-r border-zinc-200 bg-white p-4 shadow-lg">
      <div className="sticky top-0 mb-4 flex items-center bg-white py-2">
        <h2 className="text-xl font-bold">Component Tree</h2>
        <button
          className="ml-auto h-8 w-8 rounded border border-zinc-300 text-lg leading-none text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleCreateComponent}
          disabled={!onCreateComponent || isCreating}
          title="Create a new component"
          aria-label="Create a new component"
        >
          +
        </button>
      </div>

      {createMessage && (
        <p className="mb-3 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
          {createMessage}
        </p>
      )}

      <div className="space-y-1">
        {components.map((comp) => (
          <div key={comp.name}>
            <div
              className={`flex items-center p-2 rounded cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                selectedComponent === comp.name ? 'bg-zinc-100' : ''
              }`}
              onClick={() => setSelectedComponent(comp.name)}
              onDoubleClick={() => navigateDown && navigateDown(comp.name)}
            >
              <span className="mr-2 text-sm">📁</span>
              <span className="text-sm font-medium">{comp.name}</span>
              {isGeneratedComponent(comp.name) && (
                <button
                  className="ml-auto mr-2 h-5 w-5 rounded border border-red-300 text-xs leading-none text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleDeleteComponent(comp.name)
                  }}
                  disabled={!onDeleteComponent || deletingComponent === comp.name}
                  title={`Delete ${comp.name}`}
                  aria-label={`Delete ${comp.name}`}
                >
                  {deletingComponent === comp.name ? '…' : '×'}
                </button>
              )}
              <button
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedGroups((prev) => ({ ...prev, [comp.name]: !(prev[comp.name] ?? true) }))
                }}
              >
                {(expandedGroups[comp.name] ?? true) ? '▼' : '▶'}
              </button>
            </div>

            {(expandedGroups[comp.name] ?? true) && (
              <div className="ml-4 space-y-1">
                {comp.children.map((child) => (
                  <div
                    key={child}
                  className={`flex items-center p-2 rounded cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      selectedComponent === child ? 'bg-zinc-100' : ''
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
        className="mt-4 w-full rounded bg-[#6b7280] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5f6673]"
        onClick={() => setSelectedComponent(null)}
      >
        Show All
      </button>
    </div>
  )
}
